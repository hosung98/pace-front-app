import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaceBrand } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

export function RunDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    runId?: string;
    title?: string;
    startedAt?: string;
    distance?: string;
    duration?: string;
    pace?: string;
    durationSeconds?: string;
    routePointCount?: string;
  }>();
  const isRecordedRun = Boolean(params.startedAt);
  const distanceKmParam = Number(params.distance ?? 0);
  const distanceKm = Number.isFinite(distanceKmParam) && distanceKmParam > 0
    ? distanceKmParam
    : 0;
  const distance = distanceKm.toFixed(2);
  const duration = params.duration ?? '--:--';
  const pace = params.pace ?? '—';
  const routePointCount = Number(params.routePointCount ?? 0);
  const startedAt = params.startedAt
    ? new Date(Number(params.startedAt)).toLocaleString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '10월 18일 토요일 · 오후 6:42';

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
        <Text style={styles.eyebrow}>{isRecordedRun ? 'RUN DETAIL · DEVICE' : 'RUN DETAIL · PREVIEW'}</Text>
        <Text style={styles.title}>{params.title ?? '러닝 기록'}</Text>
        <Text style={styles.date}>{startedAt}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>⌁</Text>
          <Text style={styles.mapTitle}>러닝 경로 미리보기</Text>
          <Text style={styles.mapCaption}>
            {isRecordedRun && routePointCount > 0
              ? `GPS 경로 ${routePointCount}개 지점이 기기에 저장되어 있어요.`
              : 'GPS 경로를 지도에 표시하는 기능은 추후 추가될 예정이에요.'}
          </Text>
        </View>
        <View style={styles.primaryMetric}>
          <Text style={styles.distance}>{distance}<Text style={styles.unit}> km</Text></Text>
          <Text style={styles.metricLabel}>총 거리</Text>
        </View>
        <View style={styles.metricGrid}>
          <Metric label="러닝 시간" value={duration} />
          <Metric label="평균 페이스" value={`${pace} /km`} />
          <Metric
            label="평균 속도"
            value={params.durationSeconds &&
              Number.isFinite(Number(params.durationSeconds)) &&
              Number(params.durationSeconds) > 0
              ? `${((distanceKm * 3600) / Number(params.durationSeconds)).toFixed(1)} km/h`
              : '—'}
          />
          <Metric label="GPS 포인트" value={routePointCount > 0 ? `${routePointCount}개` : '—'} />
        </View>
        <Text style={styles.note}>
          거리와 페이스는 이 기기에 저장된 GPS 기록을 기준으로 표시합니다.
        </Text>
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
  note: { marginTop: 19, color: C.subtle, fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
