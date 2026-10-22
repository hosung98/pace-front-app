import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

import { getHomeData } from '@/data/insights-repository';
import { PaceErrorDialog } from '@/components/pace-feedback';
import { useSession } from '@/features/auth/session-store';
import { errorMessage } from '@/lib/api-transport';
import { formatPace } from '@/lib/format';

import type { CompletedRun } from './types';

const BUTTON_SIZE = 168;
const PULSE_DURATION = 2600;

type Summary = {
  weeklyKm: number;
  weeklyRuns: number;
  goalKm: number;
  lastRun: CompletedRun | null;
};

export function RunReadyView({
  busy,
  onStart,
}: {
  busy: boolean;
  onStart: () => void;
}) {
  const { summary, error, clearError } = useRunSummary();
  const reduceMotion = useReducedMotion();

  const handleStart = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onStart();
  };

  const progress = summary && summary.goalKm > 0
    ? Math.min(summary.weeklyKm / summary.goalKm, 1)
    : 0;

  return (
    <View>
      <Text style={styles.eyebrow}>READY TO RUN</Text>
      <Text style={styles.title}>
        나만의 페이스로,{'\n'}
        <Text style={styles.titleAccent}>지금 달려볼까요?</Text>
      </Text>

      <View style={styles.hero}>
        {!reduceMotion && (
          <>
            <PulseRing delay={0} />
            <PulseRing delay={PULSE_DURATION / 2} />
          </>
        )}
        <View style={styles.orbitRing} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="러닝 시작"
          accessibilityHint="위치 권한을 확인한 뒤 GPS 기록을 시작해요"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={handleStart}
          style={({ pressed }) => [
            styles.startButton,
            busy && styles.startButtonBusy,
            pressed && styles.startButtonPressed,
          ]}>
          <Text style={styles.startLabel}>{busy ? '준비 중' : 'START'}</Text>
          <Text style={styles.startCaption}>{busy ? 'GPS 연결 중…' : '러닝 시작'}</Text>
        </Pressable>
      </View>

      <View style={styles.weekCard}>
        <View style={styles.weekHeader}>
          <Text style={styles.cardLabel}>이번 주 목표</Text>
          <Text style={styles.weekRuns}>
            {summary ? `${summary.weeklyRuns}회 달림` : ' '}
          </Text>
        </View>
        <Text style={styles.weekDistance}>
          {summary ? summary.weeklyKm.toFixed(1) : '0.0'}
          <Text style={styles.weekGoal}>
            {' '}/ {summary ? summary.goalKm : '—'} km
          </Text>
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        {summary?.lastRun ? (
          <View style={styles.lastRun}>
            <Text style={styles.lastRunLabel}>최근 러닝</Text>
            <Text style={styles.lastRunValue}>
              {formatRelativeDay(summary.lastRun.startedAt)} ·{' '}
              {(summary.lastRun.distanceMeters / 1000).toFixed(2)} km ·{' '}
              {formatPace(summary.lastRun.averagePaceSecondsPerKm)}
            </Text>
          </View>
        ) : (
          <Text style={styles.firstRun}>첫 러닝을 기록하고 이번 주 목표를 채워 보세요.</Text>
        )}
      </View>

      <View style={styles.features}>
        <Feature symbol="⌖" title="정밀 GPS" caption="거리·페이스 실시간" />
        <Feature symbol="◐" title="잠금 중 기록" caption="화면을 꺼도 계속" />
        <Feature symbol="◇" title="기기 우선 저장" caption="로그인 시 계정 동기화" />
      </View>
      <PaceErrorDialog message={error} onClose={clearError} />
    </View>
  );
}

function PulseRing({ delay }: { delay: number }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: PULSE_DURATION, easing: Easing.out(Easing.quad) }),
        -1,
      ),
    );
  }, [delay, pulse]);

  const style = usePulseStyle(pulse);
  return <Animated.View pointerEvents="none" style={[styles.pulseRing, style]} />;
}

function usePulseStyle(pulse: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.55 }],
  }));
}

function Feature({ symbol, title, caption }: { symbol: string; title: string; caption: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureSymbol}>{symbol}</Text>
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureCaption}>{caption}</Text>
    </View>
  );
}

function useRunSummary() {
  const [result, setResult] = useState<{ userId: string | undefined; summary: Summary } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { session } = useSession();
  const userId = session?.user.id;

  useEffect(() => {
    let cancelled = false;
    getHomeData()
      .then((data) => {
        if (cancelled) return;
        setResult({ userId, summary: {
          weeklyKm: data.weekly.distanceKm,
          weeklyRuns: data.weekly.runCount,
          goalKm: data.goalKm,
          lastRun: data.recent,
        } });
      })
      .catch((error: unknown) => {
        console.error('Unable to load run summary.', error);
        if (!cancelled) setError(errorMessage(error, '러닝 요약을 불러오지 못했어요.'));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { summary: result?.userId === userId ? result?.summary ?? null : null, error, clearError: () => setError(null) };
}

function formatRelativeDay(timestamp: number): string {
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(timestamp))) / 86_400_000);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return new Date(timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: 22, color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 1.8 },
  title: { marginTop: 10, color: C.text, fontSize: 27, lineHeight: 35, fontWeight: '700' },
  titleAccent: { color: C.accent },
  hero: {
    height: BUTTON_SIZE + 112,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 2,
    borderColor: C.accent,
  },
  orbitRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 36,
    height: BUTTON_SIZE + 36,
    borderRadius: (BUTTON_SIZE + 36) / 2,
    borderWidth: 1,
    borderColor: 'rgba(213, 250, 91, 0.18)',
    backgroundColor: 'rgba(213, 250, 91, 0.04)',
  },
  startButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  startButtonBusy: { opacity: 0.6 },
  startButtonPressed: { transform: [{ scale: 0.96 }] },
  startLabel: { color: C.accentInk, fontSize: 30, fontWeight: '800', letterSpacing: 2 },
  startCaption: { marginTop: 4, color: C.accentInk, fontSize: 12, fontWeight: '600', opacity: 0.75 },
  weekCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: C.muted, fontSize: 10, fontWeight: '600' },
  weekRuns: { color: C.subtle, fontSize: 10 },
  weekDistance: {
    marginTop: 8,
    color: C.text,
    fontSize: 26,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  weekGoal: { color: C.subtle, fontSize: 13, fontWeight: '500' },
  progressTrack: {
    height: 6,
    marginTop: 12,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: C.raised,
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: C.accent },
  lastRun: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  lastRunLabel: { color: C.subtle, fontSize: 10 },
  lastRunValue: { flexShrink: 1, color: C.text, fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'] },
  firstRun: { marginTop: 12, color: C.subtle, fontSize: 10 },
  features: { marginTop: 12, flexDirection: 'row', gap: 8 },
  feature: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: C.surface,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(213, 250, 91, 0.12)',
  },
  featureSymbol: { color: C.accent, fontSize: 14 },
  featureTitle: { marginTop: 8, color: C.text, fontSize: 10, fontWeight: '600' },
  featureCaption: { marginTop: 3, color: C.subtle, fontSize: 8, textAlign: 'center' },
});
