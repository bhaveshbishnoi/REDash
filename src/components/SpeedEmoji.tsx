import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { getSpeedEmoji } from '../utils/calculations';

interface SpeedEmojiProps {
  speed: number;
  size?: number;
}

export default function SpeedEmoji({ speed, size = 60 }: SpeedEmojiProps) {
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const prevEmoji = useRef(getSpeedEmoji(speed));

  const currentEmoji = getSpeedEmoji(speed);

  useEffect(() => {
    // Trigger bounce animation if emoji changes
    if (prevEmoji.current !== currentEmoji) {
      prevEmoji.current = currentEmoji;
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
        Animated.spring(bounceAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true })
      ]).start();
    }
  }, [currentEmoji, bounceAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
      <Text style={[styles.emoji, { fontSize: size }]}>{currentEmoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  emoji: {
    textAlign: 'center',
    marginVertical: 10,
  },
});
