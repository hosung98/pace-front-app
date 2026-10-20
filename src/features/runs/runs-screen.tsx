import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { PaceErrorDialog, PaceLoadingState } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { TabScreenShell, tabScreenStyles } from '@/features/navigation/tab-screen-shell';
import {
  formatPace,
  getWeeklyInsights,
} from '@/features/running/run-insights';
import { formatDuration, readCompletedRuns, type CompletedRun } from '@/features/running/run-storage';

function formatRunDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function RunsScreen() {
  const router = useRouter();
  const [completedRuns, setCompletedRuns] = useState<CompletedRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setIsLoading(true);
      setErrorMessage(null);
      const skeletonTimer = setTimeout(() => {
        if (isActive) setShowSkeleton(true);
      }, 200);

      readCompletedRuns()
        .then((items) => {
          if (isActive) setCompletedRuns(items);
        })
        .catch((error: unknown) => {
          console.error('Unable to load completed runs.', error);
          if (isActive) {
            setErrorMessage('러닝 기록을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.');
          }
        })
        .finally(() => {
          if (isActive) {
            clearTimeout(skeletonTimer);
            setIsLoading(false);
            setShowSkeleton(false);
          }
        });
      return () => {
        isActive = false;
        clearTimeout(skeletonTimer);
      };
    }, []),
  );
  const weeklyInsights = getWeeklyInsights(completedRuns);

  return (
    <TabScreenShell
      eyebrow="RUN HISTORY"
      title="나의 러닝 기록"
      description="달려온 시간과 거리를 차곡차곡 모아봐요."
      disclaimer="러닝 기록은 이 기기에 저장됩니다. 계정 동기화는 서버 연동 후 제공돼요.">
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryValue}>{weeklyInsights.distanceKm.toFixed(2)}<Text style={styles.summaryUnit}> km</Text></Text>
          <Text style={tabScreenStyles.muted}>이번 주 누적 거리</Text>
        </View>
        <View style={styles.summaryCount}>
          <Text style={styles.countValue}>{weeklyInsights.runCount}회</Text>
          <Text style={tabScreenStyles.muted}>이번 주 러닝</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>최근 기록</Text>
      {isLoading ? (
        showSkeleton ? <PaceLoadingState label="러닝 기록을 불러오는 중" /> : null
      ) : completedRuns.length === 0 ? (
        <View style={[tabScreenStyles.card, styles.emptyCard]}>
          <Text style={styles.emptyTitle}>아직 러닝 기록이 없어요</Text>
          <Text style={styles.emptyDescription}>
            GPS 러닝을 완료하면 저장된 기록과 페이스를 여기서 확인할 수 있어요.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/run-tracking')}
            style={({ pressed }) => [styles.emptyAction, pressed && styles.pressed]}>
            <Text style={styles.emptyActionText}>첫 러닝 시작하기</Text>
          </Pressable>
        </View>
      ) : completedRuns.map((run) => (
        <Pressable
          key={run.id}
          accessibilityRole="button"
          onPress={() => router.push({
            pathname: '/run-detail',
            params: {
              runId: run.id,
              title: 'GPS 러닝 기록',
              startedAt: String(run.startedAt),
              distance: String(run.distanceMeters / 1000),
              duration: formatDuration(run.durationSeconds),
              pace: formatPace(run.averagePaceSecondsPerKm),
              durationSeconds: String(run.durationSeconds),
              routePointCount: String(run.routePoints.length),
            },
          })}
          style={({ pressed }) => [tabScreenStyles.card, pressed && styles.pressed]}>
          <View style={styles.runHeader}>
            <View>
              <Text style={styles.runDate}>{formatRunDate(run.startedAt)}</Text>
              <Text style={styles.runNote}>GPS 러닝 기록</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
          <View style={tabScreenStyles.divider} />
          <View style={styles.metrics}>
            <Metric label="거리" value={(run.distanceMeters / 1000).toFixed(2)} unit="km" />
            <Metric label="시간" value={formatDuration(run.durationSeconds)} />
            <Metric label="평균 페이스" value={formatPace(run.averagePaceSecondsPerKm)} unit="/km" />
          </View>
        </Pressable>
      ))}
      <PaceErrorDialog
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />
    </TabScreenShell>
  );
}

function Metric({
  label,
  value,
  unit,
}: Readonly<{ label: string; value: string; unit?: string }>) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}{unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginTop: 8,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 20,
    backgroundColor: '#20251B',
  },
  summaryValue: { color: C.accent, fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  summaryUnit: { color: C.accent, fontSize: 13, fontWeight: '500' },
  summaryCount: { alignItems: 'flex-end', justifyContent: 'center' },
  countValue: { color: C.text, fontSize: 20, fontWeight: '700' },
  sectionTitle: { marginTop: 28, color: C.text, fontSize: 16, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingVertical: 28 },
  emptyTitle: { color: C.text, fontSize: 13, fontWeight: '700' },
  emptyDescription: { marginTop: 8, color: C.muted, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  emptyAction: { minHeight: 40, marginTop: 15, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: C.accent },
  emptyActionText: { color: C.accentInk, fontSize: 10, fontWeight: '700' },
  runHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  runDate: { color: C.text, fontSize: 12, fontWeight: '600' },
  runNote: { marginTop: 4, color: C.muted, fontSize: 10 },
  chevron: { color: C.subtle, fontSize: 25 },
  metrics: { paddingTop: 14, flexDirection: 'row' },
  metric: { flex: 1, gap: 6 },
  metricLabel: { color: C.subtle, fontSize: 9 },
  metricValue: { color: C.text, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  metricUnit: { color: C.muted, fontSize: 9, fontWeight: '400' },
  pressed: { opacity: 0.75 },
});
