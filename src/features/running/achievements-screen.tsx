import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/back-header';
import { PaceText as Text } from '@/components/pace-text';
import { PaceButton } from '@/components/pace-button';
import { PaceErrorDialog, PaceQueryState } from '@/components/pace-feedback';
import { PaceColors as C } from '@/constants/pace';
import { getRunningProgress, setRepresentativeBadge } from '@/data/running-progress-repository';
import { useSession } from '@/features/auth/session-store';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { errorMessage } from '@/lib/api-transport';
import { formatDuration } from '@/lib/format';
import type { RunningProgress } from './progress';
import { BadgeEmblem } from './badge-emblem';

export function AchievementsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const query = useFocusQuery<RunningProgress | null>(getRunningProgress, null, '러닝 성취를 불러오지 못했어요.');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const data = query.data;
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><BackHeader />
    <View style={styles.headingBlock}>
      <Text style={styles.eyebrow}>MY RUNNING JOURNEY</Text>
      <Text style={styles.title}>나의 러닝 컬렉션</Text>
      <Text style={styles.caption}>{session ? 'PACE에 저장한 러닝으로 모은 성취예요.' : '기기 기록 기준이에요. 로그인하면 기록을 연결해 계정에 보관할 수 있어요.'}</Text>
    </View>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {query.isLoading || query.errorMessage || !data ? <PaceQueryState loading={query.isLoading}
        message={query.errorMessage} onRetry={() => { void query.reload(); }} /> : <>
        <View style={styles.card}>
          <Text style={styles.heading}>이번 주 {data.weeklyDistanceKm.toFixed(1)} / {data.weeklyGoalKm} km</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, data.weeklyDistanceKm / Math.max(1, data.weeklyGoalKm) * 100)}%` }]} /></View>
          <Text style={styles.caption}>{data.weeklyDistanceKm >= data.weeklyGoalKm ? '이번 주 목표 달성! 충분한 휴식도 챙겨요.' : `${data.weeklyRuns}회 달렸어요. 나만의 속도로 이어가요.`}</Text>
          <PaceButton label="주간 목표 변경" variant="secondary" onPress={() => router.push('/weekly-goal')} />
        </View>
        <Text style={styles.heading}>배지 {data.badges.filter((badge) => badge.earnedAt).length} / {data.badges.length}</Text>
        <View style={styles.badgeGrid}>
        {data.badges.map((badge) => <View key={badge.id} style={[styles.badgeCard, badge.earnedAt && styles.earnedCard]}>
          <View style={styles.emblem}><BadgeEmblem id={badge.id} earned={Boolean(badge.earnedAt)} /></View>
          <Text style={styles.badgeName}>{badge.title}</Text>
          <Text style={styles.badgeStatus}>{data.representativeBadgeId === badge.id ? '대표 배지' : badge.earnedAt ? '획득 완료' : '도전 중'}</Text>
          <Text style={styles.caption}>{badge.description}</Text>
          {!badge.earnedAt ? <View accessibilityRole="progressbar" accessibilityLabel={`${badge.title} 진행률`}
            accessibilityValue={{ min: 0, max: badge.target, now: Math.min(badge.target, Math.max(0, badge.progress)) }}
            style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, Math.max(0, badge.progress) / Math.max(1, badge.target) * 100)}%` }]} /></View> : null}
          <Text style={styles.caption}>{badge.earnedAt ? `${new Date(badge.earnedAt).toLocaleDateString('ko-KR')} 획득` : `${Number(badge.progress.toFixed(1))} / ${badge.target}`}</Text>
          {session && badge.earnedAt ? <PaceButton variant="secondary" disabled={busy} loading={busy}
            label={data.representativeBadgeId === badge.id ? '대표 해제' : '대표로 설정'}
            onPress={() => {
              setBusy(true);
              void setRepresentativeBadge(data.representativeBadgeId === badge.id ? null : badge.id)
                .then(() => query.reload()).catch((error: unknown) => {
                  console.error('대표 배지 저장 실패', error);
                  setFailure(errorMessage(error, '대표 배지를 저장하지 못했어요.'));
                }).finally(() => setBusy(false));
            }} /> : null}
        </View>)}
        </View>
        <Text style={styles.heading}>개인 최고 기록</Text>
        {data.personalBests.length ? data.personalBests.map((best) => <View key={best.id} style={styles.card}>
          <Text style={styles.heading}>{best.title}</Text>
          <Text style={styles.badge}>{best.unit === 'km' ? `${best.value.toFixed(2)} km` : formatDuration(best.value)}</Text>
          <Text style={styles.caption}>{new Date(best.achievedAt).toLocaleDateString('ko-KR')}</Text>
        </View>) : <Text style={styles.caption}>첫 러닝을 마치면 나만의 최고 기록이 시작돼요.</Text>}
        <Text style={styles.caption}>주·월 집계는 한국 시간 기준이에요. 건강 앱에서 읽은 운동은 별도로 더하지 않아요. 1km 기록은 연속 GPS 구간의 실제 경과 시간이며 짧은 정지가 포함될 수 있어요. 30초 초과 GPS 공백이나 부정확한 구간은 인정하지 않아요. 5K·10K 기록을 평균 페이스로 환산하지 않아요.</Text>
      </>}
    </ScrollView>
    <PaceErrorDialog message={failure} onClose={() => setFailure(null)} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  headingBlock: { gap: 8, paddingTop: 12, paddingBottom: 16 },
  content: { padding: 24, paddingTop: 8, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center', paddingBottom: 40 },
  eyebrow: { color: C.accent, fontSize: 10, letterSpacing: 2 },
  title: { color: C.text, fontSize: 25, fontWeight: '700' },
  heading: { color: C.text, fontSize: 16, fontWeight: '600' },
  caption: { color: C.muted, fontSize: 12, lineHeight: 20 },
  card: { backgroundColor: C.surface, padding: 18, borderRadius: 18, gap: 10, borderWidth: 1, borderColor: C.border },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: { flexBasis: '46%', flexGrow: 1, padding: 14, borderRadius: 20, gap: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  earnedCard: { borderColor: '#46513A' },
  emblem: { alignItems: 'center', paddingVertical: 10 },
  badgeName: { color: C.text, fontSize: 15, fontWeight: '700' },
  badgeStatus: { color: C.muted, fontSize: 10, fontWeight: '600' },
  badge: { color: C.accent, fontSize: 20, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.accent },
});
