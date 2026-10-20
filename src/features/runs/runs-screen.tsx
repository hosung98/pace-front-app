import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { PaceErrorDialog, PaceLoadingState } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { TabScreenShell, tabScreenStyles } from '@/features/navigation/tab-screen-shell';
import { formatDuration, readCompletedRuns, type CompletedRun } from '@/features/running/run-storage';

const runs = [
  { id: 'sample-run-123', date: '10월 18일 · 토요일', distance: '5.24', duration: '32:29', pace: "6'12''", note: '한강 저녁 러닝' },
  { id: 'sample-run-122', date: '10월 15일 · 수요일', distance: '4.36', duration: '27:48', pace: "6'22''", note: '가볍게 리커버리' },
  { id: 'sample-run-121', date: '10월 13일 · 월요일', distance: '2.80', duration: '18:10', pace: "6'29''", note: '동네 한 바퀴' },
];

function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm === null) return '--:--';
  return `${Math.floor(secondsPerKm / 60)}'${String(secondsPerKm % 60).padStart(2, '0')}''`;
}

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

  return (
    <TabScreenShell
      eyebrow="RUN HISTORY"
      title="나의 러닝 기록"
      description="달려온 시간과 거리를 차곡차곡 모아봐요.">
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryValue}>12.40<Text style={styles.summaryUnit}> km</Text></Text>
          <Text style={tabScreenStyles.muted}>이번 주 누적 거리</Text>
        </View>
        <View style={styles.summaryCount}>
          <Text style={styles.countValue}>3회</Text>
          <Text style={tabScreenStyles.muted}>이번 주 러닝</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>최근 기록</Text>
      {isLoading && showSkeleton ? (
        <PaceLoadingState label="러닝 기록을 불러오는 중" />
      ) : (
        [...completedRuns.map((run) => ({
        id: run.id,
        date: formatRunDate(run.startedAt),
        distance: (run.distanceMeters / 1000).toFixed(2),
        duration: formatDuration(run.durationSeconds),
        pace: formatPace(run.averagePaceSecondsPerKm),
        note: 'GPS 러닝 기록',
        startedAt: String(run.startedAt),
        durationSeconds: String(run.durationSeconds),
      })), ...runs.map((run) => ({
        ...run,
        startedAt: '',
        durationSeconds: '',
      }))].map((run) => (
        <Pressable
          key={run.id}
          accessibilityRole="button"
          onPress={() => router.push({
            pathname: '/run-detail',
            params: {
              runId: run.id,
              title: run.note,
              startedAt: run.startedAt,
              distance: run.distance,
              duration: run.duration,
              pace: run.pace,
              durationSeconds: run.durationSeconds,
            },
          })}
          style={({ pressed }) => [tabScreenStyles.card, pressed && styles.pressed]}>
          <View style={styles.runHeader}>
            <View>
              <Text style={styles.runDate}>{run.date}</Text>
              <Text style={styles.runNote}>{run.note}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
          <View style={tabScreenStyles.divider} />
          <View style={styles.metrics}>
            <Metric label="거리" value={run.distance} unit="km" />
            <Metric label="시간" value={run.duration} />
            <Metric label="평균 페이스" value={run.pace} unit="/km" />
          </View>
        </Pressable>
      )))}
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
