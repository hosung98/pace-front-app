import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { TabScreenShell, tabScreenStyles } from '@/features/navigation/tab-screen-shell';

const runs = [
  { id: 'run_123', date: '10월 18일 · 토요일', distance: '5.24', duration: '32:29', pace: "6'12''", note: '한강 저녁 러닝' },
  { id: 'run_122', date: '10월 15일 · 수요일', distance: '4.36', duration: '27:48', pace: "6'22''", note: '가볍게 리커버리' },
  { id: 'run_121', date: '10월 13일 · 월요일', distance: '2.80', duration: '18:10', pace: "6'29''", note: '동네 한 바퀴' },
];

export function RunsScreen() {
  const router = useRouter();

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
      {runs.map((run) => (
        <Pressable
          key={run.id}
          accessibilityRole="button"
          onPress={() => router.push('/run-detail')}
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
      ))}
    </TabScreenShell>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
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
