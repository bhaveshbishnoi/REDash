import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LiveSpeedometerProps {
  speed: number;
  maxSpeed: number;
}

export default function LiveSpeedometer({ speed, maxSpeed }: LiveSpeedometerProps) {
  const normalizedSpeed = Math.min(speed, 180);
  const fillPercentage = normalizedSpeed / 180;
  
  // Choose theme color based on speed range
  let speedColor = '#00E676'; // green
  if (speed > 80) speedColor = '#FF9100'; // orange
  if (speed > 110) speedColor = '#FF3D00'; // red/fire

  return (
    <View style={styles.container}>
      <View style={[styles.outerRing, { borderColor: '#1E1E1E' }]}>
        <View style={[styles.innerRing, { shadowColor: speedColor }]}>
          <Text style={[styles.speedText, { color: speedColor }]}>
            {speed}
          </Text>
          <Text style={styles.unitText}>km/h</Text>
          
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>MAX</Text>
            <Text style={styles.statValue}>{maxSpeed} km/h</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  outerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
  },
  innerRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#262626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  speedText: {
    fontSize: 64,
    fontWeight: '900',
    fontFamily: 'System',
    includeFontPadding: false,
  },
  unitText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase',
    marginTop: -5,
    letterSpacing: 2,
  },
  statsRow: {
    marginTop: 15,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: 'bold',
  },
});
