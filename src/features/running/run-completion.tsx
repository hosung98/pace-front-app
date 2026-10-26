import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BackHeader } from '@/components/back-header';
import { PaceText as Text } from '@/components/pace-text';
import { PaceButton } from '@/components/pace-button';
import { PaceQueryState } from '@/components/pace-feedback';
import { PaceColors as C } from '@/constants/pace';
import { getRunningProgress } from '@/data/running-progress-repository';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { formatDuration, formatKm } from '@/lib/format';
import { RunShareCard } from '@/features/runs/run-share-card';
import type { CompletedRun } from './types';
import type { RunningProgress } from './progress';
import { recordsEarnedByRun } from './personal-records';
import { PersonalRecordCelebration } from './personal-record-celebration';
import { BadgeEmblem } from './badge-emblem';

export function RunCompletion({ run, message, onDone }: Readonly<{
  run: CompletedRun; message: string; onDone: () => void;
}>) {
  const router = useRouter();
  const [dismissedRecord, setDismissedRecord] = useState(false);
  const query = useFocusQuery<RunningProgress | null>(getRunningProgress, null, '성취를 확인하지 못했어요. 러닝은 기기에 보관되어 있어요.');
  const badges = query.data?.badges.filter((badge) => badge.earnedAt
    && Date.parse(badge.earnedAt) >= run.startedAt && Date.parse(badge.earnedAt) <= run.endedAt) ?? [];
  const records = recordsEarnedByRun(query.data?.personalBests ?? [], run);
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><BackHeader />
      <Text style={styles.eyebrow}>RUN COMPLETE</Text>
      <Text style={styles.title}>오늘도 나의 페이스로!</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.metric}>{formatKm(run.distanceMeters)} km</Text>
      <Text style={styles.caption}>{formatDuration(run.durationSeconds)} 달렸어요. 수고했어요.</Text>
      <Text style={styles.caption}>{message}</Text>
      {query.isLoading || query.errorMessage ? <PaceQueryState loading={query.isLoading}
        message={query.errorMessage} onRetry={() => { void query.reload(); }} /> : <>
        {badges.map((badge) => <View key={badge.id} style={styles.badge}>
          <BadgeEmblem id={badge.id} earned />
          <Text style={styles.eyebrow}>NEW BADGE</Text>
          <Text style={styles.title}>{badge.title}</Text>
          <Text style={styles.caption}>{badge.description}</Text>
        </View>)}
        {records.map((record) => <View key={record.id} style={styles.badge}>
          <Text style={styles.eyebrow}>PERSONAL RECORD</Text>
          <Text style={styles.title}>{record.title}</Text>
          <Text style={styles.metric}>{record.unit === 'km' ? `${record.value.toFixed(2)} km` : `${formatDuration(Math.round(record.value))} /km`}</Text>
        </View>)}
        <Text style={styles.caption}>이번 주 {query.data?.weeklyDistanceKm.toFixed(1)} / {query.data?.weeklyGoalKm} km</Text>
      </>}
      <PaceButton label="컨디션 기록 · 러닝 상세" onPress={() => router.replace({
        pathname: '/run-detail', params: { runId: run.id },
      })} />
      <PaceButton label="배지 컬렉션 보기" variant="secondary" onPress={() => router.push('/achievements')} />
      <RunShareCard run={run} ready={!query.isLoading}
        badgeTitles={[...badges.map((badge) => badge.title), ...records.map((record) => `PR · ${record.title}`)]} />
      <PaceButton label="러닝 준비 화면으로" variant="secondary" onPress={onDone} />
    </ScrollView>
    <PersonalRecordCelebration records={records} visible={!dismissedRecord && records.length > 0}
      onClose={() => setDismissedRecord(true)} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 24, paddingBottom: 16, gap: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  content: { padding: 24, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  eyebrow: { color: C.accent, fontSize: 11, letterSpacing: 2 },
  title: { color: C.text, fontSize: 24, fontWeight: '700' },
  metric: { color: C.accent, fontSize: 40, fontWeight: '700' },
  caption: { color: C.muted, fontSize: 13, lineHeight: 21 },
  badge: { backgroundColor: C.surface, padding: 20, borderRadius: 18, gap: 10 },
});
