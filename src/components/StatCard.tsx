import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatCardProps {
  label: string;
  value: string | number;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 15,
    width: '45%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
});
