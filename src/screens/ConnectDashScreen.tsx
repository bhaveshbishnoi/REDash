import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { setBikeConnected, setK1gConnected } from '../store/bikeSlice';
import { connectToTripper } from '../services/wifiService';
import { k1gProtocol } from '../services/k1gProtocol';

type Step = 'idle' | 'wifi' | 'dash' | 'done' | 'error';

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

  const steps: StepInfo[] = [
    {
      label: 'Connect to Tripper WiFi',
      detail: step === 'wifi' ? 'Scanning for RE_* network…' : connectedSsid ? `Connected: ${connectedSsid}` : 'Waiting',
      status: step === 'idle' ? 'waiting' : step === 'wifi' ? 'active' : (step === 'error' && !connectedSsid) ? 'error' : 'done',
    },
    {
      label: 'Reach Tripper Dash',
      detail: step === 'dash' ? 'Probing 192.168.1.1:2002…' : step === 'done' ? 'Dash online' : 'Waiting',
      status: step === 'idle' || step === 'wifi' ? 'waiting' : step === 'dash' ? 'active' : step === 'error' && connectedSsid ? 'error' : 'done',
    },
    {
      label: 'Session Ready',
      detail: step === 'done' ? 'Ride data streaming active' : 'Waiting',
      status: step === 'done' ? 'done' : 'waiting',
    },
  ];

  const handleConnect = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'iOS Not Supported',
        'Direct WiFi connection to the Tripper Dash requires Android 10+. iOS support is in development.',
      );
      return;
    }

    setStep('wifi');
    setErrorMsg('');
    setConnectedSsid('');

    try {
      // Step 1: Connect to Tripper WiFi via native Android module
      const ssid = await connectToTripper();
      if (!ssid) {
        setStep('error');
        setErrorMsg(
          'Could not connect to the Tripper Dash WiFi.\n\n' +
          'Make sure:\n• Ignition is ON\n• Hold joystick 3 sec to activate WiFi\n• You are within 5m of the bike',
        );
        return;
      }

      setConnectedSsid(ssid);

      // Step 2: Probe dash at 192.168.1.1:2002
      setStep('dash');
      const dashConnected = await k1gProtocol.initializeConnection();
      dispatch(setK1gConnected(dashConnected));
      dispatch(setBikeConnected({ ssid }));

      if (!dashConnected) {
        // WiFi is up but dash not responding on port 2002 — could be firmware diff
        // Still allow riding — GPS tracking will work
        setStep('done');
        dispatch(setBikeConnected({ ssid }));
        Alert.alert(
          'Partially Connected',
          'WiFi connected, but the Tripper Dash control port did not respond.\n\nGPS ride tracking will work normally. Live dash sync requires the bike ignition to be fully on.',
          [{ text: 'Continue Riding' }],
        );
      } else {
        setStep('done');
      }
    } catch (error: any) {
      setStep('error');
      setErrorMsg(error?.message || 'An unexpected error occurred. Please try again.');
    }
  };

  const handleReset = () => {
    setStep('idle');
    setErrorMsg('');
    setConnectedSsid('');
    k1gProtocol.disconnect();
  };

  const isConnecting = step === 'wifi' || step === 'dash';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollEnabled={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="motorbike" size={52} color="#FF5722" />
        <Text style={styles.title}>Guerrilla 450</Text>
        <Text style={styles.subtitle}>Tripper Dash Connection</Text>
      </View>

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
            <View style={[
              styles.stepIcon,
              s.status === 'done' && styles.stepIconDone,
              s.status === 'active' && styles.stepIconActive,
              s.status === 'error' && styles.stepIconError,
            ]}>
              {s.status === 'active' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons
                  name={
                    s.status === 'done' ? 'check' :
                    s.status === 'error' ? 'close' :
                    'circle-outline'
                  }
                  size={16}
                  color={s.status === 'waiting' ? '#444' : '#fff'}
                />
              )}
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={[
                styles.stepLabel,
                s.status === 'waiting' && styles.stepLabelMuted,
                s.status === 'done' && styles.stepLabelDone,
                s.status === 'error' && styles.stepLabelError,
              ]}>
                {s.label}
              </Text>
              <Text style={styles.stepDetail}>{s.detail}</Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[
                styles.stepConnector,
                s.status === 'done' && styles.stepConnectorDone,
              ]} />
            )}
          </View>
        ))}
      </View>

      {/* Error message */}
      {step === 'error' && errorMsg !== '' && (
        <View style={styles.errorCard}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF5722" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Connect button */}
      {step !== 'done' && (
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
                size={22}
                color="#fff"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.connectButtonText}>
                {step === 'error' ? 'Try Again' : 'Connect to Tripper Dash'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* iOS / platform note */}
      {Platform.OS === 'ios' && (
        <View style={styles.platformNote}>
          <MaterialCommunityIcons name="apple" size={16} color="#888" />
          <Text style={styles.platformNoteText}>
            iOS direct WiFi connection is in development. Android required for live dash sync.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  instructionsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
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
    fontSize: 13,
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
  stepsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepIconDone: {
    backgroundColor: '#2E7D32',
  },
  stepIconActive: {
    backgroundColor: '#FF5722',
  },
  stepIconError: {
    backgroundColor: '#B71C1C',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepLabelMuted: {
    color: '#555',
  },
  stepLabelDone: {
    color: '#66BB6A',
  },
  stepLabelError: {
    color: '#EF5350',
  },
  stepDetail: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  stepConnector: {
    position: 'absolute',
    left: 15,
    bottom: -4,
    width: 2,
    height: 8,
    backgroundColor: '#2A2A2A',
  },
  stepConnectorDone: {
    backgroundColor: '#2E7D32',
  },
  errorCard: {
    backgroundColor: '#1A0A0A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#5D1010',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  errorText: {
    color: '#EF9A9A',
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  connectButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    backgroundColor: '#FF5722',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  connectButtonDisabled: {
    backgroundColor: '#333',
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
    fontSize: 17,
  },
  platformNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
  },
  platformNoteText: {
    color: '#555',
    fontSize: 12,
    flex: 1,
    textAlign: 'center',
  },
});
