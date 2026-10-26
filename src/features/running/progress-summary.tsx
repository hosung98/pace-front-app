import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PaceText as Text } from '@/components/pace-text';
import { PaceButton } from '@/components/pace-button';
import { PaceQueryState } from '@/components/pace-feedback';
import { PaceColors as C } from '@/constants/pace';
import { getRunningProgress } from '@/data/running-progress-repository';
import { useFocusQuery } from '@/hooks/use-focus-query';
import type { RunningProgress } from './progress';
import { BadgeEmblem } from './badge-emblem';

export function ProgressSummary() {
  const router = useRouter();
  const query = useFocusQuery<RunningProgress | null>(getRunningProgress, null, '배지 정보를 불러오지 못했어요.');
  const data = query.data;
  const earned = data?.badges.filter((badge) => badge.earnedAt) ?? [];
  const representative = earned.find((badge) => badge.id === data?.representativeBadgeId);
  const next = data?.badges.find((badge) => !badge.earnedAt);
  return <View style={styles.card}>
    <View style={styles.headingRow}>
      {representative ? <BadgeEmblem id={representative.id} earned size={48} /> : null}
      <Text style={styles.heading}>{representative?.title ?? '나의 러닝 컬렉션'}</Text>
    </View>
    {query.isLoading || query.errorMessage ? <PaceQueryState loading={query.isLoading}
      message={query.errorMessage} onRetry={() => { void query.reload(); }} /> : <>
      <Text style={styles.caption}>배지 {earned.length}개 · 누적 {data?.totalDistanceKm.toFixed(1)}km</Text>
      {next ? <Text style={styles.caption}>다음 성취 · {next.title} ({Number(next.progress.toFixed(1))}/{next.target})</Text>
        : <Text style={styles.caption}>차곡차곡 쌓은 나만의 성취를 확인해요.</Text>}
    </>}
    <PaceButton label="배지 · 개인 최고 기록 보기" variant="secondary" onPress={() => router.push('/achievements')} />
  </View>;
}

const styles = StyleSheet.create({
  card: { marginTop: 20, marginBottom: 12, padding: 18, gap: 12, borderRadius: 18, backgroundColor: C.surface },
  heading: { color: C.accent, fontSize: 16, fontWeight: '600' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  caption: { color: C.muted, fontSize: 12, lineHeight: 19 },
});
