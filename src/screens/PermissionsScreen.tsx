import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const PERMISSIONS_DONE_KEY = '@redash_permissions_done';

interface PermissionItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  required: boolean;
  status: 'idle' | 'granted' | 'denied';
}

interface Props {
  onComplete: () => void;
}

export default function PermissionsScreen({ onComplete }: Props) {
  const [permissions, setPermissions] = useState<PermissionItem[]>([
    {
      id: 'location',
      title: 'Precise Location',
      description: 'Required to scan and connect to the Tripper Dash WiFi network on Android.',
      icon: 'map-marker',
      color: '#4CAF50',
      required: true,
      status: 'idle',
    },
    {
      id: 'nearby_wifi',
      title: 'Nearby WiFi Devices',
      description: 'Needed on Android 13+ to detect and connect to RE_* networks without sharing full location.',
      icon: 'wifi',
      color: '#2196F3',
      required: true,
      status: 'idle',
    },
    {
      id: 'camera',
      title: 'Camera',
      description: 'Lets you view your Tripper Dash on-screen during the connection setup.',
      icon: 'camera',
      color: '#FF5722',
      required: false,
      status: 'idle',
    },
  ]);

  const [allRequired, setAllRequired] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(40))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const requiredItems = permissions.filter((p) => p.required);
    setAllRequired(requiredItems.every((p) => p.status === 'granted'));
  }, [permissions]);

  const setPermStatus = (id: string, status: 'granted' | 'denied') => {
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
  };

  const requestPermission = async (item: PermissionItem) => {
    if (Platform.OS !== 'android') {
      setPermStatus(item.id, 'granted');
      return;
    }

    try {
      if (item.id === 'location') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setPermStatus(item.id, status === 'granted' ? 'granted' : 'denied');

      } else if (item.id === 'nearby_wifi') {
        // On Android 13+ use NEARBY_WIFI_DEVICES; on older use ACCESS_FINE_LOCATION
        if (Platform.Version >= 33) {
          const result = await PermissionsAndroid.request(
            'android.permission.NEARBY_WIFI_DEVICES' as any,
            {
              title: 'Nearby WiFi Devices',
              message: 'Redash needs this permission to scan for RE_* Tripper Dash networks.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            }
          );
          setPermStatus(item.id, result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied');
        } else {
          // Android < 13: CHANGE_WIFI_STATE doesn't need a runtime grant, auto-grant it
          setPermStatus(item.id, 'granted');
        }

      } else if (item.id === 'camera') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Access',
            message: 'Redash uses the camera to show a live preview of your Tripper Dash during setup.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        setPermStatus(item.id, result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied');
      }
    } catch (err) {
      console.warn(`[Permissions] Request error for ${item.id}:`, err);
      setPermStatus(item.id, 'denied');
    }
  };

  const requestAll = async () => {
    for (const perm of permissions) {
      if (perm.status !== 'granted') {
        await requestPermission(perm);
      }
    }
  };

  const handleContinue = async () => {
    await AsyncStorage.setItem(PERMISSIONS_DONE_KEY, 'true');
    onComplete();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="shield-check" size={48} color="#FF5722" />
          </View>
          <Text style={styles.title}>App Permissions</Text>
          <Text style={styles.subtitle}>
            Grant the permissions below so Redash can connect to your Tripper Dash and track your rides.
          </Text>
        </Animated.View>

        {/* Permission Cards */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {permissions.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                item.status === 'granted' && styles.cardGranted,
                item.status === 'denied' && styles.cardDenied,
              ]}
            >
              {/* Left icon */}
              <View style={[styles.cardIconWrap, { backgroundColor: item.color + '22' }]}>
                <MaterialCommunityIcons name={item.icon as any} size={26} color={item.color} />
              </View>

              {/* Text */}
              <View style={styles.cardText}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredBadgeText}>REQUIRED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </View>

              {/* Status / Button */}
              <View style={styles.cardAction}>
                {item.status === 'granted' ? (
                  <View style={styles.grantedBadge}>
                    <MaterialCommunityIcons name="check-circle" size={22} color="#4CAF50" />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.allowBtn,
                      item.status === 'denied' && styles.allowBtnDenied,
                    ]}
                    onPress={() => requestPermission(item)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.allowBtnText}>
                      {item.status === 'denied' ? 'Retry' : 'Allow'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Allow All shortcut */}
        <TouchableOpacity style={styles.allowAllBtn} onPress={requestAll} activeOpacity={0.8}>
          <MaterialCommunityIcons name="shield-plus" size={18} color="#FF5722" style={{ marginRight: 8 }} />
          <Text style={styles.allowAllText}>Allow All at Once</Text>
        </TouchableOpacity>

        {/* Status hint */}
        {!allRequired && (
          <Text style={styles.hintText}>
            ⚠️ Location and Nearby WiFi are required to connect to your Tripper Dash.
          </Text>
        )}
      </ScrollView>

      {/* Continue button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, !allRequired && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!allRequired}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="arrow-right-circle"
            size={22}
            color={allRequired ? '#fff' : '#555'}
            style={{ marginRight: 10 }}
          />
          <Text style={[styles.continueBtnText, !allRequired && styles.continueBtnTextDisabled]}>
            Continue to App
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Export helper so other screens can check if permissions have been granted */
export const hasCompletedPermissions = async (): Promise<boolean> => {
  try {
    const val = await AsyncStorage.getItem(PERMISSIONS_DONE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FF572218',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF572233',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 12,
  },
  cardGranted: {
    borderColor: '#2E7D3266',
    backgroundColor: '#0F1A0F',
  },
  cardDenied: {
    borderColor: '#7D2E2E66',
    backgroundColor: '#1A0F0F',
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  requiredBadge: {
    backgroundColor: '#FF572222',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FF572244',
  },
  requiredBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF5722',
    letterSpacing: 0.8,
  },
  cardDescription: {
    fontSize: 12,
    color: '#777',
    lineHeight: 17,
  },
  cardAction: {
    flexShrink: 0,
  },
  grantedBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowBtn: {
    backgroundColor: '#FF5722',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  allowBtnDenied: {
    backgroundColor: '#B71C1C',
  },
  allowBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  allowAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF572244',
    backgroundColor: '#FF572210',
  },
  allowAllText: {
    color: '#FF5722',
    fontWeight: '700',
    fontSize: 14,
  },
  hintText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 36,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  continueBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF5722',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  continueBtnDisabled: {
    backgroundColor: '#1E1E1E',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  continueBtnTextDisabled: {
    color: '#444',
  },
});
