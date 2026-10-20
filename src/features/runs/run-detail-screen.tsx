import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaceBrand } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

const splits = [
  { km: '1 km', pace: "6'05''", duration: '06:05' },
  { km: '2 km', pace: "6'14''", duration: '12:19' },
  { km: '3 km', pace: "6'18''", duration: '18:37' },
  { km: '4 km', pace: "6'10''", duration: '24:47' },
  { km: '5 km', pace: "6'05''", duration: '30:52' },
  { km: '0.24 km', pace: "6'31''", duration: '32:29' },
];

export function RunDetailScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.fixedContent}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="기록 목록으로 돌아가기" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <PaceBrand />
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.eyebrow}>RUN DETAIL · SAMPLE</Text>
        <Text style={styles.title}>한강 저녁 러닝</Text>
        <Text style={styles.date}>10월 18일 토요일 · 오후 6:42</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>⌁</Text>
          <Text style={styles.mapTitle}>러닝 경로 미리보기</Text>
          <Text style={styles.mapCaption}>실제 경로는 GPS 기록 연동 후 표시됩니다.</Text>
        </View>
        <View style={styles.primaryMetric}>
          <Text style={styles.distance}>5.24<Text style={styles.unit}> km</Text></Text>
          <Text style={styles.metricLabel}>총 거리</Text>
        </View>
        <View style={styles.metricGrid}>
          <Metric label="러닝 시간" value="32:29" />
          <Metric label="평균 페이스" value={"6'12'' /km"} />
          <Metric label="평균 속도" value="9.7 km/h" />
          <Metric label="소모 칼로리" value="342 kcal" />
        </View>
        <Text style={styles.sectionTitle}>구간별 페이스</Text>
        <View style={styles.splits}>
          {splits.map((split, index) => (
            <View key={`${split.km}-${index}`} style={styles.splitRow}>
              <Text style={styles.splitKm}>{split.km}</Text>
              <View style={styles.splitBarTrack}>
                <View style={[styles.splitBar, { width: `${Math.max(32, 100 - index * 7)}%` }]} />
              </View>
              <Text style={styles.splitPace}>{split.pace}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>이 화면은 샘플 기록입니다. 상세 API는 docs/API_REQUIREMENTS.md를 참고하세요.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  fixedContent: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 36 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { color: C.text, fontSize: 31, lineHeight: 34 },
  headerSpacer: { width: 42 },
  eyebrow: { marginTop: 23, color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 1.7 },
  title: { marginTop: 8, color: C.text, fontSize: 23, fontWeight: '700' },
  date: { marginTop: 5, color: C.muted, fontSize: 10 },
  mapPlaceholder: { height: 177, marginTop: 19, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#20251B', borderWidth: 1, borderColor: '#303A22' },
  mapIcon: { color: C.accent, fontSize: 37 },
  mapTitle: { marginTop: 7, color: C.text, fontSize: 12, fontWeight: '600' },
  mapCaption: { marginTop: 4, color: C.muted, fontSize: 9 },
  primaryMetric: { marginTop: 22, alignItems: 'center' },
  distance: { color: C.text, fontSize: 42, lineHeight: 48, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { color: C.muted, fontSize: 14, fontWeight: '500' },
  metricLabel: { color: C.subtle, fontSize: 9 },
  metricGrid: { marginTop: 20, paddingVertical: 16, flexDirection: 'row', flexWrap: 'wrap', rowGap: 20, borderRadius: 17, backgroundColor: C.surface },
  metric: { width: '50%', paddingHorizontal: 17, gap: 6 },
  metricValue: { color: C.text, fontSize: 13, fontWeight: '600' },
  sectionTitle: { marginTop: 25, color: C.text, fontSize: 15, fontWeight: '700' },
  splits: { marginTop: 8, paddingHorizontal: 15, borderRadius: 17, backgroundColor: C.surface },
  splitRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 10 },
  splitKm: { width: 48, color: C.muted, fontSize: 10 },
  splitBarTrack: { flex: 1, height: 5, borderRadius: 4, backgroundColor: C.raised, overflow: 'hidden' },
  splitBar: { height: '100%', borderRadius: 4, backgroundColor: C.accent },
  splitPace: { width: 47, color: C.text, fontSize: 10, textAlign: 'right', fontVariant: ['tabular-nums'] },
  note: { marginTop: 19, color: C.subtle, fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
