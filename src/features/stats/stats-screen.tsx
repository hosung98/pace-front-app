import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PaceErrorDialog } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { TabScreenShell, tabScreenStyles } from '@/features/navigation/tab-screen-shell';
import { getStatsData } from '@/data/insights-repository';
import { useSession } from '@/features/auth/session-store';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { formatPace } from '@/lib/format';

type Period = '주간' | '월간';

export function StatsScreen() {
  const [period, setPeriod] = useState<Period>('주간');
  const { session } = useSession();
  const load = useCallback(() => getStatsData(period === '주간' ? 'week' : 'month'), [period]);
  const { data, errorMessage, clearError } = useFocusQuery(
    load,
    { distanceKm: 0, values: [] as number[], labels: [] as string[], allTime: { distanceKm: 0, runCount: 0, averagePaceSecondsPerKm: null as number | null, longestRunKm: 0 } },
    '러닝 통계를 불러오지 못했어요. 연결 상태를 확인해 주세요.',
  );
  const { allTime, values, labels, distanceKm } = data;
  const maxValue = Math.max(...values, 1);

  return (
    <TabScreenShell
      eyebrow="YOUR PROGRESS"
      title="꾸준함이 만든 변화"
      description="완료한 러닝 기록으로 나의 습관을 확인해요."
      badge={session ? '계정 연결' : '기기 모드'}
      disclaimer={session ? '서버에 저장된 기록을 한국 시간 기준으로 집계합니다.' : '로그인 전에는 기기 기록을 기준으로 계산합니다.'}>
      <View style={styles.segment}>
        {(['주간', '월간'] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: period === item }}
            onPress={() => setPeriod(item)}
            style={[styles.segmentButton, period === item && styles.segmentActive]}>
            <Text style={[styles.segmentText, period === item && styles.segmentTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={tabScreenStyles.card}>
        <Text style={styles.chartTitle}>{period === '주간' ? '이번 주 거리' : '이번 달 거리'}</Text>
        <Text style={styles.distance}>{distanceKm.toFixed(2)}<Text style={styles.distanceUnit}> km</Text></Text>
        <View style={styles.chart}>
          {values.map((value, index) => (
            <View key={labels[index]} style={styles.chartColumn}>
              <View style={styles.barTrack}>
                <View style={[
                  styles.bar,
                  { height: `${value > 0 ? Math.max(8, (value / maxValue) * 100) : 4}%` },
                  value > 0 && styles.barActive,
                ]} />
              </View>
              <Text style={styles.chartLabel}>{labels[index]}</Text>
            </View>
          ))}
        </View>
        {allTime.runCount === 0 ? (
          <Text style={styles.emptyHint}>
            첫 러닝을 완료하면 실제 기록이 차트와 요약에 표시됩니다.
          </Text>
        ) : null}
      </View>
      <Text style={styles.sectionTitle}>전체 러닝 요약</Text>
      <View style={styles.statsGrid}>
        <StatCard label="총 러닝 거리" value={allTime.distanceKm.toFixed(1)} unit="km" detail="완료한 러닝 기록" />
        <StatCard label="총 러닝 횟수" value={String(allTime.runCount)} unit="회" detail="완료한 GPS 러닝" />
        <StatCard label="평균 페이스" value={formatPace(allTime.averagePaceSecondsPerKm)} unit="/km" detail="전체 거리 가중 평균" />
        <StatCard label="최장 거리" value={allTime.longestRunKm.toFixed(2)} unit="km" detail="저장된 기록 중 최장" />
      </View>
      <PaceErrorDialog
        message={errorMessage}
        onClose={clearError}
      />
    </TabScreenShell>
  );
}

function StatCard({ label, value, unit, detail }: { label: string; value: string; unit: string; detail: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}<Text style={styles.statUnit}> {unit}</Text></Text>
      <Text style={styles.statDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { marginTop: 8, padding: 4, flexDirection: 'row', borderRadius: 12, backgroundColor: C.surface },
  segmentButton: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  segmentActive: { backgroundColor: C.raised },
  segmentText: { color: C.subtle, fontSize: 11, fontWeight: '600' },
  segmentTextActive: { color: C.accent },
  chartTitle: { color: C.muted, fontSize: 11 },
  distance: { marginTop: 7, color: C.text, fontSize: 34, fontWeight: '700' },
  distanceUnit: { color: C.muted, fontSize: 13, fontWeight: '500' },
  chart: { height: 138, marginTop: 18, flexDirection: 'row', gap: 10 },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  barTrack: { width: '100%', height: 106, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '58%', minHeight: 5, borderRadius: 5, backgroundColor: C.raised },
  barActive: { backgroundColor: C.accent },
  chartLabel: { color: C.subtle, fontSize: 9 },
  emptyHint: { marginTop: 12, color: C.subtle, fontSize: 10, lineHeight: 15 },
  sectionTitle: { marginTop: 26, marginBottom: 2, color: C.text, fontSize: 16, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 116, marginTop: 10, padding: 14, borderRadius: 17, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  statLabel: { color: C.muted, fontSize: 10 },
  statValue: { marginTop: 11, color: C.text, fontSize: 21, fontWeight: '700' },
  statUnit: { color: C.muted, fontSize: 10, fontWeight: '500' },
  statDetail: { marginTop: 5, color: C.subtle, fontSize: 9 },
});
