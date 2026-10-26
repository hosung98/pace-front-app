import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { PaceText as Text } from '@/components/pace-text';
import { PaceQueryState } from '@/components/pace-feedback';
import { PaceColors as C } from '@/constants/pace';
import { getHomeData } from '@/data/insights-repository';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { formatPace } from '@/lib/format';

export function RunReadyView({ children }: Readonly<{ children: ReactNode }>) {
  const query = useFocusQuery<Awaited<ReturnType<typeof getHomeData>> | null>(
    getHomeData, null, '이번 주 러닝 요약을 불러오지 못했어요.',
  );
  const data = query.data;
  const progress = data ? Math.min(1, data.weekly.distanceKm / Math.max(1, data.goalKm)) : 0;
  return <View>
    {children}

    <View style={styles.weekCard}>
      <View style={styles.weekHeading}>
        <Text style={styles.cardTitle}>이번 주의 발걸음</Text>
        <Text style={styles.weekTag}>WEEKLY</Text>
      </View>
      {query.isLoading || query.errorMessage || !data ? <PaceQueryState loading={query.isLoading}
        message={query.errorMessage} onRetry={() => { void query.reload(); }} /> : <>
        <Text style={styles.distance}>{data.weekly.distanceKm.toFixed(1)}
          <Text style={styles.distanceGoal}> / {data.goalKm} km</Text>
        </Text>
        <View accessibilityRole="progressbar" accessibilityLabel="이번 주 러닝 목표"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.caption}>{progress >= 1 ? '이번 주 목표 달성! 충분한 휴식도 챙겨요.' : `${data.weekly.runCount}회 달렸어요. 조금씩 쌓아가요.`}</Text>
        {data.recent ? <View style={styles.recent}>
          <Text style={styles.caption}>최근 러닝</Text>
          <Text style={styles.recentValue}>{(data.recent.distanceMeters / 1000).toFixed(2)} km · {formatPace(data.recent.averagePaceSecondsPerKm)} /km</Text>
        </View> : null}
      </>}
    </View>
    <Text style={styles.footnote}>러닝을 시작하면 GPS로 거리와 페이스를 기록해요.{'\n'}화면을 잠가도 기록은 이어집니다.</Text>
  </View>;
}

const styles = StyleSheet.create({
  weekCard: { padding: 18, borderRadius: 20, backgroundColor: C.surface, gap: 12 },
  weekHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '600' },
  weekTag: { color: C.subtle, fontSize: 9, letterSpacing: 1.5 },
  distance: { color: C.text, fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  distanceGoal: { color: C.muted, fontSize: 13, fontWeight: '400' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: C.border },
  fill: { height: '100%', backgroundColor: C.accent, borderRadius: 3 },
  caption: { color: C.muted, fontSize: 12, lineHeight: 19 },
  recent: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  recentValue: { color: C.text, fontSize: 12, fontWeight: '600' },
  footnote: { marginTop: 18, color: C.subtle, fontSize: 11, lineHeight: 18 },
});
