import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../styles/theme';

interface ScoreBarProps {
  label: string;
  score: number; // 0-100
}

export default function ScoreBar({ label, score }: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{clamped}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${clamped}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    marginBottom: Theme.spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  value: {
    color: Theme.colors.textPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  barBg: {
    width: '100%',
    height: 5,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.round,
  },
});
