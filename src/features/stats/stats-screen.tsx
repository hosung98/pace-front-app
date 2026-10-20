import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { TabScreenShell, tabScreenStyles } from '@/features/navigation/tab-screen-shell';

const weeklyValues = [2.8, 0, 4.36, 0, 0, 5.24, 0];
const monthlyValues = [8.2, 12.4, 9.6, 12.4];

export function StatsScreen() {
  const [period, setPeriod] = useState<'주간' | '월간'>('주간');
  const values = period === '주간' ? weeklyValues : monthlyValues;
  const labels = period === '주간'
    ? ['월', '화', '수', '목', '금', '토', '일']
    : ['1주', '2주', '3주', '4주'];

  return (
    <TabScreenShell
      eyebrow="YOUR PROGRESS"
      title="꾸준함이 만든 변화"
      description="나의 페이스와 러닝 습관을 한눈에 확인해요.">
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
        <Text style={styles.distance}>12.4<Text style={styles.distanceUnit}> km</Text></Text>
        <View style={styles.chart}>
          {values.map((value, index) => (
            <View key={labels[index]} style={styles.chartColumn}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: `${Math.max(value === 0 ? 5 : 18, (value / 14) * 100)}%` }, value > 0 && styles.barActive]} />
              </View>
              <Text style={styles.chartLabel}>{labels[index]}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.sectionTitle}>러닝 요약</Text>
      <View style={styles.statsGrid}>
        <StatCard label="총 러닝 거리" value="86.4" unit="km" detail="지난달보다 12% 더 달렸어요" />
        <StatCard label="총 러닝 횟수" value="18" unit="회" detail="평균 주 4회 러닝" />
        <StatCard label="평균 페이스" value="6'18''" unit="/km" detail="조금씩 빨라지고 있어요" />
        <StatCard label="최장 거리" value="10.2" unit="km" detail="10월 12일 기록" />
      </View>
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
  sectionTitle: { marginTop: 26, marginBottom: 2, color: C.text, fontSize: 16, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 116, marginTop: 10, padding: 14, borderRadius: 17, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  statLabel: { color: C.muted, fontSize: 10 },
  statValue: { marginTop: 11, color: C.text, fontSize: 21, fontWeight: '700' },
  statUnit: { color: C.muted, fontSize: 10, fontWeight: '500' },
  statDetail: { marginTop: 5, color: C.subtle, fontSize: 9 },
});
