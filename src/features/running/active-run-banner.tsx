import { router } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Animated, AppState, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import {
  getActiveRunSnapshot,
  refreshActiveRunSnapshot,
  subscribeToActiveRun,
} from '@/data/active-run-store';
import { formatDuration, formatKm } from '@/lib/format';

import { getElapsedMilliseconds } from './run-session';

function refresh(): void {
  refreshActiveRunSnapshot().catch((error: unknown) => {
    console.error('Unable to refresh the active run.', error);
  });
}

/** Shows an in-progress run above the tab bar so it stays visible on every tab. */
export function ActiveRunBanner() {
  const { run } = useSyncExternalStore(
    subscribeToActiveRun,
    getActiveRunSnapshot,
    getActiveRunSnapshot,
  );
  const [now, setNow] = useState(() => Date.now());
  const [pulse] = useState(() => new Animated.Value(0));
  const hasRun = run !== null;
  const isRunning = run?.status === 'running';

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!hasRun) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (AppState.currentState === 'active') refresh();
    }, 1000);
    return () => clearInterval(timer);
  }, [hasRun]);

  useEffect(() => {
    if (!isRunning) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [isRunning, pulse]);

  if (!run) return null;

  const elapsedSeconds = Math.floor(getElapsedMilliseconds(run, Math.max(now, run.segmentStartedAt)) / 1000);
  const statusLabel = isRunning ? '러닝 중' : '일시 정지';
  const distance = `${formatKm(run.distanceMeters)} km`;
  const duration = formatDuration(elapsedSeconds);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${statusLabel}, ${distance}, ${duration}. 러닝 화면으로 이동`}
      onPress={() => router.push('/run-tracking')}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}>
      <Animated.View
        style={[
          styles.dot,
          !isRunning && styles.dotPaused,
          isRunning && { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) },
        ]}
      />
      <Text style={styles.status}>{statusLabel}</Text>
      <View style={styles.metrics}>
        <Text style={styles.metric}>{distance}</Text>
        <Text style={styles.separator}>·</Text>
        <Text style={styles.metric}>{duration}</Text>
      </View>
      <Text style={styles.action}>열기 ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 44,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: C.accent,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accentInk },
  dotPaused: { opacity: 0.4 },
  status: { color: C.accentInk, fontSize: 13, fontWeight: '700' },
  metrics: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metric: { color: C.accentInk, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  separator: { color: C.accentInk, opacity: 0.5, fontSize: 13 },
  action: { color: C.accentInk, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
