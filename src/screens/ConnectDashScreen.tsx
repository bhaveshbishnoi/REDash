import React, { useState, useEffect, useRef } from 'react';
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
  openWifiSettingsAndPoll,
  getCurrentTripperSsid,
  bindCurrentWifi,
} from '../services/wifiService';
import { k1gProtocol } from '../services/k1gProtocol';
import { launchCameraAsync, MediaTypeOptions, requestCameraPermissionsAsync } from 'expo-image-picker';

type Step = 'idle' | 'scanning_wifi' | 'wifi' | 'waiting_manual' | 'dash' | 'done' | 'error';

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
  const [manualCountdown, setManualCountdown] = useState(60);

  // WiFi scan state
  const [showWifiList, setShowWifiList] = useState(false);
  const [wifiNetworks, setWifiNetworks] = useState<string[]>([]);
  const [scanningWifi, setScanningWifi] = useState(false);

  // Camera
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    
    // Check if already connected manually on load
    const checkCurrentWifi = async () => {
      try {
        const ssid = await getCurrentTripperSsid();
        if (ssid) {
          console.log(`[WiFi] Initial load detected manual connection to: ${ssid}`);
          setConnectedSsid(ssid);
        }
      } catch {}
    };
    checkCurrentWifi();
  }, []);

  useEffect(() => {
    if (step === 'wifi' || step === 'dash' || step === 'waiting_manual') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [step]);

  // Countdown timer during manual WiFi wait
  useEffect(() => {
    if (step === 'waiting_manual') {
      setManualCountdown(60);
      countdownRef.current = setInterval(() => {
        setManualCountdown((c) => {
          if (c <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [step]);

  // ─── Step indicators (with bug-fixed logic) ──────────────────────────────

  const getStep1Status = (): 'waiting' | 'active' | 'done' | 'error' => {
    if (step === 'idle') return 'waiting';
    if (step === 'wifi' || step === 'scanning_wifi' || step === 'waiting_manual') return 'active';
    if (step === 'error' && !connectedSsid) return 'error';
    if (step === 'dash' || step === 'done' || (step === 'error' && connectedSsid)) return 'done';
    return 'waiting';
  };

  const getStep2Status = (): 'waiting' | 'active' | 'done' | 'error' => {
    if (step === 'idle' || step === 'wifi' || step === 'scanning_wifi' || step === 'waiting_manual') return 'waiting';
    if (step === 'dash') return 'active';
    if (step === 'error') return 'error'; // Always error on step 2 if overall failed
    if (step === 'done') return 'done';
    return 'waiting';
  };

  const getStep3Status = (): 'waiting' | 'active' | 'done' | 'error' => {
    return step === 'done' ? 'done' : 'waiting';
  };

  const steps: StepInfo[] = [
    {
      label: 'Connect to Tripper WiFi',
      detail:
        step === 'wifi' ? 'Check for Android popup → tap Connect' :
        step === 'scanning_wifi' ? 'Scanning for RE_* networks…' :
        step === 'waiting_manual' ? `Waiting for manual connect… ${manualCountdown}s` :
        connectedSsid ? `Connected: ${connectedSsid}` : 'Waiting',
      status: getStep1Status(),
    },
    {
      label: 'Reach Tripper Dash',
      detail:
        step === 'dash' ? 'Probing 192.168.1.1:2002…' :
        step === 'done' ? 'Dash online' : 'Waiting',
      status: getStep2Status(),
    },
    {
      label: 'Session Ready',
      detail: step === 'done' ? 'Ride data streaming active' : 'Waiting',
      status: getStep3Status(),
    },
  ];

  // ─── Connection helpers ───────────────────────────────────────────────────

  const runDashProbe = async (ssid: string) => {
    setConnectedSsid(ssid);
    setStep('dash');
    const dashConnected = await k1gProtocol.initializeConnection();
    dispatch(setK1gConnected(dashConnected));
    dispatch(setBikeConnected({ ssid }));
    setStep('done');
    if (!dashConnected) {
      Alert.alert(
        'WiFi Connected ✓',
        'The Tripper Dash WiFi is active.\n\nThe control port (192.168.1.1:2002) did not respond — this is normal if the bike is not fully powered. GPS ride tracking will work normally.',
        [{ text: 'Continue Riding' }]
      );
    }
  };

  /** Auto-connect — Android system popup appears, user taps "Connect" */
  const handleConnect = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('iOS Not Supported', 'Direct WiFi requires Android 10+.');
      return;
    }
    setStep('wifi');
    setErrorMsg('');
    setConnectedSsid('');
    try {
      // Check if already connected manually to an RE_ network!
      const currentSsid = await getCurrentTripperSsid();
      if (currentSsid) {
        console.log(`[WiFi] Already connected to: ${currentSsid}. Direct binding.`);
        const bound = await bindCurrentWifi();
        if (bound) {
          await runDashProbe(currentSsid);
          return;
        }
      }

      const ssid = await connectToTripper();
      if (!ssid) {
        setStep('error');
        setErrorMsg(
          'Android system dialog timed out or was dismissed.\n\n' +
          'Try "Manual WiFi Connect" below — it opens your phone\'s WiFi settings where you can tap RE_* directly.'
        );
        return;
      }
      await runDashProbe(ssid);
    } catch (error: any) {
      setStep('error');
      setErrorMsg(error?.message || 'An unexpected error occurred.');
    }
  };

  /** Scan RE_* networks and let user pick */
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
    } catch {
      setWifiNetworks([]);
    } finally {
      setScanningWifi(false);
    }
  };

  /** Connect to specific SSID from the scan list */
  const handleSelectSsid = async (ssid: string) => {
    setShowWifiList(false);
    setStep('wifi');
    setErrorMsg('');
    setConnectedSsid('');
    try {
      const connected = await connectToSsidDirectly(ssid);
      if (!connected) {
        // Fall through to manual settings approach
        setStep('error');
        setErrorMsg(
          `Android popup for "${ssid}" was dismissed or timed out.\n\nUse "Manual WiFi Connect" — opens your phone WiFi settings, tap ${ssid}, then come back.`
        );
        return;
      }
      await runDashProbe(connected);
    } catch (error: any) {
      setStep('error');
      setErrorMsg(error?.message || 'Connection failed. Try Manual WiFi Connect below.');
    }
  };

  /** Open Android WiFi settings and poll for RE_* connection */
  const handleManualWifi = () => {
    setStep('waiting_manual');
    setErrorMsg('');
    setConnectedSsid('');

    openWifiSettingsAndPoll(
      async (ssid) => {
        // Successfully detected manual connection
        await runDashProbe(ssid);
      },
      () => {
        // Timeout after 60 seconds
        setStep('error');
        setErrorMsg(
          'Timed out waiting for WiFi connection.\n\n' +
          'In your phone WiFi settings, tap "RE_NN9M_XXXXXX" and wait for "Connected" to appear, then tap Try Again.'
        );
      },
      60_000
    );
  };

  const handleReset = () => {
    setStep('idle');
    setErrorMsg('');
    setConnectedSsid('');
    setCameraImage(null);
    setCameraOpen(false);
    k1gProtocol.disconnect();
  };

  // ─── Camera ───────────────────────────────────────────────────────────────

  const handleOpenCamera = async () => {
    const { status } = await requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission',
        'Grant camera permission to take a photo of the Tripper Dash screen to verify the WiFi icon is visible.',
        [{ text: 'OK' }]
      );
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

  const isConnecting = step === 'wifi' || step === 'dash' || step === 'scanning_wifi' || step === 'waiting_manual';

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
          <TouchableOpacity style={styles.cameraBtn} onPress={handleOpenCamera} activeOpacity={0.8}>
            <MaterialCommunityIcons name="camera" size={16} color="#FF5722" />
            <Text style={styles.cameraBtnText}>Verify Dash Screen</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Camera image card */}
        {cameraOpen && cameraImage && (
          <View style={styles.cameraCard}>
            <View style={styles.cameraCardHeader}>
              <MaterialCommunityIcons name="camera" size={16} color="#FF5722" />
              <Text style={styles.cameraCardTitle}>Dash Screen Verification</Text>
              <TouchableOpacity onPress={() => { setCameraOpen(false); setCameraImage(null); }}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#555" />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: cameraImage }} style={styles.cameraImage} resizeMode="cover" />
            <View style={styles.cameraHintRow}>
              <MaterialCommunityIcons name="wifi" size={14} color="#FF5722" />
              <Text style={styles.cameraHint}>
                Look for the WiFi icon on the Tripper Dash screen. If not visible, hold the right joystick for 3 seconds.
              </Text>
            </View>
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
              { icon: 'gesture-tap-hold', text: 'Hold the right joystick for 3 sec on the dash → WiFi icon appears' },
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
                    name={s.status === 'done' ? 'check' : s.status === 'error' ? 'close' : 'circle-outline'}
                    size={16}
                    color={s.status === 'waiting' ? '#444' : '#fff'}
                  />
                )}
              </Animated.View>
              <View style={styles.stepTextContainer}>
                <Text style={[
                  styles.stepLabel,
                  s.status === 'waiting' && styles.stepLabelMuted,
                  s.status === 'done' && styles.stepLabelDone,
                  s.status === 'error' && styles.stepLabelError,
                ]}>
                  {s.label}
                </Text>
                <Text style={[
                  styles.stepDetail,
                  s.status === 'active' && styles.stepDetailActive,
                ]}>
                  {s.detail}
                </Text>
              </View>
              {i < steps.length - 1 && (
                <View style={[styles.stepConnector, s.status === 'done' && styles.stepConnectorDone]} />
              )}
            </View>
          ))}
        </View>

        {/* Android popup reminder — shown during wifi step */}
        {step === 'wifi' && (
          <View style={styles.popupReminderCard}>
            <MaterialCommunityIcons name="cellphone" size={20} color="#FFB300" />
            <View style={{ flex: 1 }}>
              <Text style={styles.popupReminderTitle}>Watch for Android popup!</Text>
              <Text style={styles.popupReminderText}>
                Android will show a system dialog at the bottom of your screen — tap <Text style={{ fontWeight: 'bold', color: '#FFB300' }}>"Connect"</Text> when it appears.
              </Text>
            </View>
          </View>
        )}

        {/* Manual waiting card */}
        {step === 'waiting_manual' && (
          <View style={styles.manualWaitCard}>
            <MaterialCommunityIcons name="wifi-settings" size={24} color="#2196F3" />
            <View style={{ flex: 1 }}>
              <Text style={styles.manualWaitTitle}>Connect in WiFi Settings</Text>
              <Text style={styles.manualWaitText}>
                In the WiFi Settings that opened, find <Text style={{ color: '#fff', fontWeight: '700' }}>RE_NN9M_260505</Text> (or similar RE_* name) and tap it to connect.
              </Text>
              <Text style={styles.manualWaitText}>
                The app will detect the connection automatically. ({manualCountdown}s remaining)
              </Text>
            </View>
          </View>
        )}

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
        {step !== 'done' && !isConnecting && (
          <View style={styles.actionRow}>

            {/* 1. Auto-connect */}
            <TouchableOpacity
              onPress={step === 'error' ? handleReset : handleConnect}
              style={[styles.connectButton, step === 'error' && styles.connectButtonRetry]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={step === 'error' ? 'refresh' : 'wifi'}
                size={20} color="#fff" style={{ marginRight: 8 }}
              />
              <Text style={styles.connectButtonText}>
                {step === 'error' ? 'Try Auto-Connect Again' : 'Auto-Connect'}
              </Text>
            </TouchableOpacity>

            {/* 2. Scan & pick */}
            <TouchableOpacity onPress={handleScanNetworks} style={styles.scanButton} activeOpacity={0.8}>
              <MaterialCommunityIcons name={'wifi-find' as any} size={18} color="#FF5722" />
              <Text style={styles.scanButtonText}>Scan Networks</Text>
            </TouchableOpacity>

            {/* 3. Manual via Settings (most reliable) */}
            <TouchableOpacity onPress={handleManualWifi} style={styles.manualButton} activeOpacity={0.8}>
              <MaterialCommunityIcons name="cog-outline" size={18} color="#2196F3" />
              <Text style={styles.manualButtonText}>Manual WiFi Connect (Most Reliable)</Text>
            </TouchableOpacity>

          </View>
        )}

        {/* Connecting spinner row */}
        {isConnecting && (
          <View style={styles.connectingRow}>
            <ActivityIndicator color="#FF5722" />
            <Text style={styles.connectingText}>
              {step === 'wifi' ? 'Waiting for Android popup confirmation…' :
               step === 'waiting_manual' ? 'Watching for RE_* connection…' :
               'Probing Tripper Dash…'}
            </Text>
          </View>
        )}

        {/* iOS note */}
        {Platform.OS === 'ios' && (
          <View style={styles.platformNote}>
            <MaterialCommunityIcons name="apple" size={16} color="#888" />
            <Text style={styles.platformNoteText}>
              iOS direct WiFi is in development. Android required for live dash sync.
            </Text>
          </View>
        )}

        {/* Success */}
        {step === 'done' && (
          <View style={styles.successCard}>
            <MaterialCommunityIcons name="check-circle" size={44} color="#4CAF50" />
            <Text style={styles.successTitle}>Connected!</Text>
            <Text style={styles.successSub}>
              {connectedSsid && `Network: ${connectedSsid}\n`}Tripper Dash is ready.
            </Text>
            <TouchableOpacity onPress={handleReset} style={styles.disconnectBtn}>
              <MaterialCommunityIcons name="wifi-off" size={15} color="#666" style={{ marginRight: 6 }} />
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── WiFi Network List Modal ── */}
      <Modal visible={showWifiList} animationType="slide" transparent onRequestClose={() => setShowWifiList(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>RE_* Networks Nearby</Text>
              <TouchableOpacity onPress={() => setShowWifiList(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Tap a network → Android will show a popup. Tap <Text style={{ color: '#fff', fontWeight: '700' }}>"Connect"</Text> on the popup.
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
                  Make sure ignition is ON and joystick was held for 3 seconds. Or use "Manual WiFi Connect" to open system settings.
                </Text>
                <TouchableOpacity style={styles.rescanBtn} onPress={handleScanNetworks}>
                  <MaterialCommunityIcons name="refresh" size={16} color="#FF5722" style={{ marginRight: 6 }} />
                  <Text style={styles.rescanBtnText}>Scan Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rescanBtn, { marginTop: 8, borderColor: '#2196F355', backgroundColor: '#2196F310' }]}
                  onPress={() => { setShowWifiList(false); handleManualWifi(); }}
                >
                  <MaterialCommunityIcons name="cog-outline" size={16} color="#2196F3" style={{ marginRight: 6 }} />
                  <Text style={[styles.rescanBtnText, { color: '#2196F3' }]}>Manual WiFi Connect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <FlatList
                  data={wifiNetworks}
                  keyExtractor={(item) => item}
                  style={{ marginTop: 4 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.ssidRow} onPress={() => handleSelectSsid(item)} activeOpacity={0.75}>
                      <View style={styles.ssidIconWrap}>
                        <MaterialCommunityIcons name="wifi" size={22} color="#FF5722" />
                      </View>
                      <View style={styles.ssidTextWrap}>
                        <Text style={styles.ssidName}>{item}</Text>
                        <Text style={styles.ssidHint}>Tap → accept Android popup to connect</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#444" />
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={styles.ssidSeparator} />}
                />
                <TouchableOpacity style={styles.rescanBtn} onPress={handleScanNetworks}>
                  <MaterialCommunityIcons name="refresh" size={16} color="#FF5722" style={{ marginRight: 6 }} />
                  <Text style={styles.rescanBtnText}>Scan Again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1 },
  content: { padding: 22, paddingTop: 52, paddingBottom: 40 },

  // Header
  header: { alignItems: 'center', marginBottom: 22 },
  bikeIconWrap: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#FF572215', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 1, borderColor: '#FF572230',
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  subtitle: { fontSize: 12, color: '#888', marginTop: 4, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
  cameraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#FF572244', backgroundColor: '#FF572212',
  },
  cameraBtnText: { color: '#FF5722', fontSize: 13, fontWeight: '600' },

  // Camera card
  cameraCard: {
    backgroundColor: '#141414', borderRadius: 16, overflow: 'hidden',
    marginBottom: 18, borderWidth: 1, borderColor: '#2A2A2A',
  },
  cameraCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  cameraCardTitle: { color: '#FF5722', fontSize: 13, fontWeight: '700', flex: 1, textTransform: 'uppercase', letterSpacing: 0.8 },
  cameraImage: { width: '100%', height: 200 },
  cameraHintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 10 },
  cameraHint: { color: '#666', fontSize: 12, flex: 1, lineHeight: 17 },

  // Instructions
  instructionsCard: {
    backgroundColor: '#141414', borderRadius: 14, padding: 16,
    marginBottom: 18, borderWidth: 1, borderColor: '#222',
  },
  instructionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  instructionsTitle: { color: '#FF5722', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  instructionsList: { gap: 10 },
  instructionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  instructionText: { color: '#bbb', fontSize: 13, flex: 1, lineHeight: 18 },

  // Steps
  stepsCard: {
    backgroundColor: '#141414', borderRadius: 14, padding: 20,
    marginBottom: 14, borderWidth: 1, borderColor: '#222', gap: 4,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, position: 'relative' },
  stepIcon: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#242424',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
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
  stepDetailActive: { color: '#FFB300' },
  stepConnector: { position: 'absolute', left: 16, bottom: -4, width: 2, height: 8, backgroundColor: '#242424' },
  stepConnectorDone: { backgroundColor: '#2E7D32' },

  // Android popup reminder
  popupReminderCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#1A1600', borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#FFB30044',
  },
  popupReminderTitle: { color: '#FFB300', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  popupReminderText: { color: '#aaa', fontSize: 13, lineHeight: 19 },

  // Manual wait card
  manualWaitCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#0A1220', borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#2196F344',
  },
  manualWaitTitle: { color: '#2196F3', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  manualWaitText: { color: '#aaa', fontSize: 13, lineHeight: 19, marginBottom: 4 },

  // SSID Badge
  ssidBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0F1A0F', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14,
    borderWidth: 1, borderColor: '#2E7D3266', alignSelf: 'center',
  },
  ssidBadgeText: { color: '#66BB6A', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },

  // Error
  errorCard: {
    backgroundColor: '#1A0A0A', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#5D1010',
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  errorText: { color: '#EF9A9A', fontSize: 13, flex: 1, lineHeight: 20 },

  // Buttons
  actionRow: { gap: 10, marginBottom: 14 },
  connectButton: {
    flexDirection: 'row', paddingVertical: 17, backgroundColor: '#FF5722',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF5722', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  connectButtonRetry: { backgroundColor: '#B71C1C', shadowColor: '#B71C1C' },
  connectButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  scanButton: {
    flexDirection: 'row', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FF572255', backgroundColor: '#FF572210', gap: 8,
  },
  scanButtonText: { color: '#FF5722', fontWeight: '700', fontSize: 15 },
  manualButton: {
    flexDirection: 'row', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#2196F355', backgroundColor: '#2196F310', gap: 8,
  },
  manualButtonText: { color: '#2196F3', fontWeight: '700', fontSize: 14 },
  connectingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    justifyContent: 'center', paddingVertical: 14,
    backgroundColor: '#141414', borderRadius: 12,
    marginBottom: 14, borderWidth: 1, borderColor: '#222',
  },
  connectingText: { color: '#aaa', fontSize: 13 },

  // Platform note
  platformNote: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 4 },
  platformNoteText: { color: '#444', fontSize: 12, flex: 1, textAlign: 'center' },

  // Success
  successCard: {
    alignItems: 'center', backgroundColor: '#0F1A0F',
    borderRadius: 16, padding: 28, borderWidth: 1, borderColor: '#2E7D3255', gap: 8,
  },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: '#66BB6A' },
  successSub: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },
  disconnectBtn: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8,
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#333',
  },
  disconnectText: { color: '#666', fontSize: 13 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '80%', borderWidth: 1, borderColor: '#222',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalSubtitle: { color: '#666', fontSize: 12, marginBottom: 14, lineHeight: 18 },
  modalLoading: { alignItems: 'center', paddingVertical: 40, gap: 14 },
  modalLoadingText: { color: '#888', fontSize: 13 },
  modalEmpty: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  modalEmptyTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalEmptyText: { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  ssidRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  ssidIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FF572215', alignItems: 'center', justifyContent: 'center',
  },
  ssidTextWrap: { flex: 1 },
  ssidName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ssidHint: { color: '#555', fontSize: 11, marginTop: 2 },
  ssidSeparator: { height: 1, backgroundColor: '#1E1E1E', marginLeft: 56 },
  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 14, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#FF572233', backgroundColor: '#FF572210',
  },
  rescanBtnText: { color: '#FF5722', fontWeight: '700', fontSize: 14 },
});
