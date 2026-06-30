import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { setBikeConnected, setK1gConnected } from '../store/bikeSlice';
import {
  connectToTripper,
  connectToSsidDirectly,
  scanTripperNetworks,
} from '../services/wifiService';
import { k1gProtocol } from '../services/k1gProtocol';
import { launchCameraAsync, MediaTypeOptions, requestCameraPermissionsAsync } from 'expo-image-picker';

type Step = 'idle' | 'scanning_wifi' | 'wifi' | 'dash' | 'done' | 'error';

interface StepInfo {
  label: string;
  detail: string;
  status: 'waiting' | 'active' | 'done' | 'error';
}

export default function ConnectDashScreen() {
  const dispatch = useDispatch();
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [connectedSsid, setConnectedSsid] = useState('');

  // WiFi scan state
  const [showWifiList, setShowWifiList] = useState(false);
  const [wifiNetworks, setWifiNetworks] = useState<string[]>([]);
  const [scanningWifi, setScanningWifi] = useState(false);

  // Camera state — we use expo-image-picker to launch camera
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (step === 'wifi' || step === 'dash') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [step]);

  const steps: StepInfo[] = [
    {
      label: 'Connect to Tripper WiFi',
      detail:
        step === 'wifi' || step === 'scanning_wifi'
          ? 'Connecting to RE_* network…'
          : connectedSsid
          ? `Connected: ${connectedSsid}`
          : 'Waiting',
      status:
        step === 'idle'
          ? 'waiting'
          : step === 'wifi' || step === 'scanning_wifi'
          ? 'active'
          : step === 'error' && !connectedSsid
          ? 'error'
          : 'done',
    },
    {
      label: 'Reach Tripper Dash',
      detail:
        step === 'dash'
          ? 'Probing 192.168.1.1:2002…'
          : step === 'done'
          ? 'Dash online'
          : 'Waiting',
      status:
        step === 'idle' || step === 'wifi' || step === 'scanning_wifi'
          ? 'waiting'
          : step === 'dash'
          ? 'active'
          : step === 'error' && connectedSsid
          ? 'error'
          : 'done',
    },
    {
      label: 'Session Ready',
      detail: step === 'done' ? 'Ride data streaming active' : 'Waiting',
      status: step === 'done' ? 'done' : 'waiting',
    },
  ];

  // ─── Connect helpers ──────────────────────────────────────────────────────

  const runDashProbe = async (ssid: string) => {
    setConnectedSsid(ssid);
    setStep('dash');

    const dashConnected = await k1gProtocol.initializeConnection();
    dispatch(setK1gConnected(dashConnected));
    dispatch(setBikeConnected({ ssid }));

    if (!dashConnected) {
      setStep('done');
      Alert.alert(
        'Partially Connected',
        'WiFi connected ✓\n\nThe Tripper Dash control port (192.168.1.1:2002) did not respond yet. ' +
          'GPS ride tracking will work normally. Live dash sync needs the bike ignition fully on.',
        [{ text: 'Continue Riding' }]
      );
    } else {
      setStep('done');
    }
  };

  /** Auto-connect using the system WiFi picker (scans for any RE_* network) */
  const handleConnect = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'iOS Not Supported',
        'Direct WiFi connection to the Tripper Dash requires Android 10+. iOS support is in development.'
      );
      return;
    }

    setStep('wifi');
    setErrorMsg('');
    setConnectedSsid('');

    try {
      const ssid = await connectToTripper();
      if (!ssid) {
        setStep('error');
        setErrorMsg(
          'Could not connect to the Tripper Dash WiFi.\n\n' +
            'Make sure:\n• Ignition is ON\n• Hold joystick 3 sec to activate WiFi\n• You are within 5m of the bike\n\n' +
            'Or tap "Scan Networks" to pick manually.'
        );
        return;
      }
      await runDashProbe(ssid);
    } catch (error: any) {
      setStep('error');
      setErrorMsg(error?.message || 'An unexpected error occurred. Please try again.');
    }
  };

  /** Scan for available RE_* networks and show picker */
  const handleScanNetworks = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Network scanning requires Android 10+.');
      return;
    }

    setScanningWifi(true);
    setShowWifiList(true);
    setWifiNetworks([]);

    try {
      const nets = await scanTripperNetworks();
      setWifiNetworks(nets);
    } catch (err) {
      console.warn('[Scan] Error:', err);
      setWifiNetworks([]);
    } finally {
      setScanningWifi(false);
    }
  };

  /** Connect to a specific SSID chosen from the scan list */
  const handleSelectSsid = async (ssid: string) => {
    setShowWifiList(false);
    setStep('wifi');
    setErrorMsg('');
    setConnectedSsid('');

    try {
      const connected = await connectToSsidDirectly(ssid);
      if (!connected) {
        setStep('error');
        setErrorMsg(
          `Could not connect to "${ssid}".\n\nMake sure the bike ignition is ON and you are within 5m.`
        );
        return;
      }
      await runDashProbe(connected);
    } catch (error: any) {
      setStep('error');
      setErrorMsg(error?.message || 'Connection failed. Please try again.');
    }
  };

  const handleReset = () => {
    setStep('idle');
    setErrorMsg('');
    setConnectedSsid('');
    setCameraImage(null);
    k1gProtocol.disconnect();
  };

  // ─── Camera ───────────────────────────────────────────────────────────────

  const handleOpenCamera = async () => {
    const { status } = await requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission', 'Please grant camera permission in app settings.');
      return;
    }
    const result = await launchCameraAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setCameraImage(result.assets[0].uri);
      setCameraOpen(true);
    }
  };

  const isConnecting = step === 'wifi' || step === 'dash' || step === 'scanning_wifi';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.bikeIconWrap}>
            <MaterialCommunityIcons name="motorbike" size={46} color="#FF5722" />
          </View>
          <Text style={styles.title}>Guerrilla 450</Text>
          <Text style={styles.subtitle}>Tripper Dash Connection</Text>

          {/* Camera button in header */}
          <TouchableOpacity style={styles.cameraBtn} onPress={handleOpenCamera} activeOpacity={0.8}>
            <MaterialCommunityIcons name="camera" size={18} color="#FF5722" />
            <Text style={styles.cameraBtnText}>Open Camera</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Camera image card */}
        {cameraOpen && cameraImage && (
          <View style={styles.cameraCard}>
            <View style={styles.cameraCardHeader}>
              <MaterialCommunityIcons name="camera-outline" size={16} color="#FF5722" />
              <Text style={styles.cameraCardTitle}>Camera Preview</Text>
              <TouchableOpacity onPress={() => { setCameraOpen(false); setCameraImage(null); }}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#555" />
              </TouchableOpacity>
            </View>
            <Image
              source={{ uri: cameraImage }}
              style={styles.cameraImage}
              resizeMode="cover"
            />
            <Text style={styles.cameraHint}>
              Verify the Tripper Dash WiFi icon is visible on the screen
            </Text>
          </View>
        )}

        {/* Instructions card */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionsRow}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#FF5722" />
            <Text style={styles.instructionsTitle}>Before connecting</Text>
          </View>
          <View style={styles.instructionsList}>
            {[
              { icon: 'key', text: 'Turn ignition ON' },
              { icon: 'gesture-tap-hold', text: 'Hold the right joystick for 3 seconds on the dash to activate WiFi' },
              { icon: 'wifi', text: 'Keep phone within 5m of the bike' },
            ].map((item, i) => (
              <View key={i} style={styles.instructionItem}>
                <MaterialCommunityIcons name={item.icon as any} size={16} color="#aaa" />
                <Text style={styles.instructionText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Step indicators */}
        <View style={styles.stepsCard}>
          {steps.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <Animated.View
                style={[
                  styles.stepIcon,
                  s.status === 'done' && styles.stepIconDone,
                  s.status === 'active' && styles.stepIconActive,
                  s.status === 'error' && styles.stepIconError,
                  s.status === 'active' && { transform: [{ scale: pulseAnim }] },
                ]}
              >
                {s.status === 'active' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons
                    name={
                      s.status === 'done'
                        ? 'check'
                        : s.status === 'error'
                        ? 'close'
                        : 'circle-outline'
                    }
                    size={16}
                    color={s.status === 'waiting' ? '#444' : '#fff'}
                  />
                )}
              </Animated.View>
              <View style={styles.stepTextContainer}>
                <Text
                  style={[
                    styles.stepLabel,
                    s.status === 'waiting' && styles.stepLabelMuted,
                    s.status === 'done' && styles.stepLabelDone,
                    s.status === 'error' && styles.stepLabelError,
                  ]}
                >
                  {s.label}
                </Text>
                <Text style={styles.stepDetail}>{s.detail}</Text>
              </View>
              {i < steps.length - 1 && (
                <View
                  style={[styles.stepConnector, s.status === 'done' && styles.stepConnectorDone]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Connected SSID badge */}
        {connectedSsid !== '' && (
          <View style={styles.ssidBadge}>
            <MaterialCommunityIcons name="wifi-check" size={18} color="#4CAF50" />
            <Text style={styles.ssidBadgeText}>{connectedSsid}</Text>
          </View>
        )}

        {/* Error message */}
        {step === 'error' && errorMsg !== '' && (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF5722" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Action buttons */}
        {step !== 'done' && (
          <View style={styles.actionRow}>
            {/* Primary: Auto-connect */}
            <TouchableOpacity
              onPress={step === 'error' ? handleReset : handleConnect}
              disabled={isConnecting}
              style={[
                styles.connectButton,
                isConnecting && styles.connectButtonDisabled,
                step === 'error' && styles.connectButtonRetry,
              ]}
              activeOpacity={0.8}
            >
              {isConnecting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={step === 'error' ? 'refresh' : 'wifi'}
                    size={20}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.connectButtonText}>
                    {step === 'error' ? 'Try Again' : 'Auto-Connect'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Secondary: Manual scan */}
            {!isConnecting && (
              <TouchableOpacity
                onPress={handleScanNetworks}
                style={styles.scanButton}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name={"wifi-find" as any} size={20} color="#FF5722" />
                <Text style={styles.scanButtonText}>Scan Networks</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* iOS note */}
        {Platform.OS === 'ios' && (
          <View style={styles.platformNote}>
            <MaterialCommunityIcons name="apple" size={16} color="#888" />
            <Text style={styles.platformNoteText}>
              iOS direct WiFi connection is in development. Android required for live dash sync.
            </Text>
          </View>
        )}

        {/* Success state */}
        {step === 'done' && (
          <View style={styles.successCard}>
            <MaterialCommunityIcons name="check-circle" size={40} color="#4CAF50" />
            <Text style={styles.successTitle}>Connected!</Text>
            <Text style={styles.successSub}>Tripper Dash is live and streaming ride data.</Text>
            <TouchableOpacity onPress={handleReset} style={styles.disconnectBtn}>
              <MaterialCommunityIcons name="wifi-off" size={16} color="#888" style={{ marginRight: 6 }} />
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── WiFi Network List Modal ── */}
      <Modal
        visible={showWifiList}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWifiList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Available RE_* Networks</Text>
              <TouchableOpacity onPress={() => setShowWifiList(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              These are the Tripper Dash hotspots detected nearby. Tap one to connect.
            </Text>

            {scanningWifi ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#FF5722" />
                <Text style={styles.modalLoadingText}>Scanning for RE_* networks…</Text>
              </View>
            ) : wifiNetworks.length === 0 ? (
              <View style={styles.modalEmpty}>
                <MaterialCommunityIcons name="wifi-off" size={48} color="#333" />
                <Text style={styles.modalEmptyTitle}>No Tripper networks found</Text>
                <Text style={styles.modalEmptyText}>
                  Make sure the bike ignition is ON and you've held the joystick for 3 seconds to activate WiFi.
                </Text>
                <TouchableOpacity style={styles.rescanBtn} onPress={handleScanNetworks}>
                  <MaterialCommunityIcons name="refresh" size={16} color="#FF5722" style={{ marginRight: 6 }} />
                  <Text style={styles.rescanBtnText}>Scan Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={wifiNetworks}
                keyExtractor={(item) => item}
                style={{ marginTop: 8 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.ssidRow}
                    onPress={() => handleSelectSsid(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.ssidIconWrap}>
                      <MaterialCommunityIcons name="wifi" size={22} color="#FF5722" />
                    </View>
                    <View style={styles.ssidTextWrap}>
                      <Text style={styles.ssidName}>{item}</Text>
                      <Text style={styles.ssidHint}>Tap to connect</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#444" />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.ssidSeparator} />}
              />
            )}

            {/* Rescan button when results shown */}
            {!scanningWifi && wifiNetworks.length > 0 && (
              <TouchableOpacity style={styles.rescanBtn} onPress={handleScanNetworks}>
                <MaterialCommunityIcons name="refresh" size={16} color="#FF5722" style={{ marginRight: 6 }} />
                <Text style={styles.rescanBtnText}>Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 22,
    paddingTop: 52,
    paddingBottom: 40,
  },
  // ── Header ──
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bikeIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FF572215',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FF572230',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF572244',
    backgroundColor: '#FF572212',
  },
  cameraBtnText: {
    color: '#FF5722',
    fontSize: 13,
    fontWeight: '600',
  },
  // ── Camera Card ──
  cameraCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cameraCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  cameraCardTitle: {
    color: '#FF5722',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cameraImage: {
    width: '100%',
    height: 200,
  },
  cameraHint: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    padding: 10,
  },
  // ── Instructions ──
  instructionsCard: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#222',
  },
  instructionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  instructionsTitle: {
    color: '#FF5722',
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  instructionsList: {
    gap: 10,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  instructionText: {
    color: '#bbb',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  // ── Steps ──
  stepsCard: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
    gap: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepIconDone: { backgroundColor: '#2E7D32' },
  stepIconActive: { backgroundColor: '#FF5722' },
  stepIconError: { backgroundColor: '#B71C1C' },
  stepTextContainer: { flex: 1 },
  stepLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  stepLabelMuted: { color: '#444' },
  stepLabelDone: { color: '#66BB6A' },
  stepLabelError: { color: '#EF5350' },
  stepDetail: { color: '#555', fontSize: 12, marginTop: 2 },
  stepConnector: {
    position: 'absolute',
    left: 16,
    bottom: -4,
    width: 2,
    height: 8,
    backgroundColor: '#242424',
  },
  stepConnectorDone: { backgroundColor: '#2E7D32' },
  // ── SSID Badge ──
  ssidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F1A0F',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2E7D3266',
    alignSelf: 'center',
  },
  ssidBadgeText: {
    color: '#66BB6A',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  // ── Error ──
  errorCard: {
    backgroundColor: '#1A0A0A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#5D1010',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  errorText: { color: '#EF9A9A', fontSize: 13, flex: 1, lineHeight: 20 },
  // ── Action Buttons ──
  actionRow: {
    gap: 10,
    marginBottom: 14,
  },
  connectButton: {
    flexDirection: 'row',
    paddingVertical: 17,
    backgroundColor: '#FF5722',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  connectButtonDisabled: {
    backgroundColor: '#2A2A2A',
    shadowOpacity: 0,
    elevation: 0,
  },
  connectButtonRetry: {
    backgroundColor: '#B71C1C',
    shadowColor: '#B71C1C',
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scanButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FF572255',
    backgroundColor: '#FF572210',
    gap: 8,
  },
  scanButtonText: {
    color: '#FF5722',
    fontWeight: '700',
    fontSize: 15,
  },
  // ── Platform Note ──
  platformNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
  },
  platformNoteText: { color: '#444', fontSize: 12, flex: 1, textAlign: 'center' },
  // ── Success Card ──
  successCard: {
    alignItems: 'center',
    backgroundColor: '#0F1A0F',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#2E7D3255',
    gap: 10,
  },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: '#66BB6A' },
  successSub: { fontSize: 13, color: '#888', textAlign: 'center' },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  disconnectText: { color: '#666', fontSize: 13 },
  // ── WiFi Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: '#222',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#666',
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 18,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 14,
  },
  modalLoadingText: { color: '#888', fontSize: 13 },
  modalEmpty: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  modalEmptyTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalEmptyText: { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  ssidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  ssidIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FF572215',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ssidTextWrap: { flex: 1 },
  ssidName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ssidHint: { color: '#555', fontSize: 11, marginTop: 2 },
  ssidSeparator: { height: 1, backgroundColor: '#1E1E1E', marginLeft: 56 },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF572233',
    backgroundColor: '#FF572210',
  },
  rescanBtnText: { color: '#FF5722', fontWeight: '700', fontSize: 14 },
});
