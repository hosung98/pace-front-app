import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { getCompletedRun } from '@/data/completed-runs-repository';
import type { CompletedRun } from '@/features/running/types';
import {
  formatDateTime,
  formatDuration,
  formatKm,
  formatPace,
  formatSpeedKmh,
} from '@/lib/format';

import { toRouteCoordinates } from './route-geometry';
import { RunRouteMap } from './run-route-map';

const MAP_HEIGHT = 240;

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; runId: string; run: CompletedRun | null };

export function RunDetailScreen() {
  const { runId } = useLocalSearchParams<{ runId?: string }>();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    getCompletedRun(runId)
      .then((run) => {
        if (!cancelled) setState({ status: 'loaded', runId, run });
      })
      .catch((error: unknown) => {
        console.error('Unable to load the run detail.', error);
        if (!cancelled) setState({ status: 'loaded', runId, run: null });
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const isLoading = Boolean(runId) && (state.status === 'loading' || state.runId !== runId);
  const run = !isLoading && state.status === 'loaded' ? state.run : null;

  if (!run) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.fixedContent}>
          <BackHeader backLabel="기록 목록으로 돌아가기" />
          <View style={[styles.mapPlaceholder, styles.missing]}>
            <Text style={styles.mapIcon}>⌁</Text>
            <Text style={styles.mapTitle}>
              {isLoading ? '기록을 불러오는 중' : '기록을 찾을 수 없어요'}
            </Text>
            {!isLoading ? (
              <Text style={styles.mapCaption}>삭제되었거나 이 기기에 없는 기록이에요.</Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const routeCoordinates = toRouteCoordinates(run.routePoints);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.fixedContent}>
        <BackHeader backLabel="기록 목록으로 돌아가기" />
        <Text style={styles.eyebrow}>RUN DETAIL</Text>
        <Text style={styles.title}>GPS 러닝 기록</Text>
        <Text style={styles.date}>{formatDateTime(run.startedAt)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {routeCoordinates.length >= 2 ? (
          <View style={styles.mapWrap}>
            <RunRouteMap coordinates={routeCoordinates} height={MAP_HEIGHT} />
          </View>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapIcon}>⌁</Text>
            <Text style={styles.mapTitle}>표시할 경로가 없어요</Text>
            <Text style={styles.mapCaption}>
              GPS 지점이 2개 이상 기록되면 달린 경로를 지도에 보여드려요.
            </Text>
          </View>
        )}
        <View style={styles.primaryMetric}>
          <Text style={styles.distance}>
            {formatKm(run.distanceMeters)}<Text style={styles.unit}> km</Text>
          </Text>
          <Text style={styles.metricLabel}>총 거리</Text>
        </View>
        <View style={styles.metricGrid}>
          <Metric label="러닝 시간" value={formatDuration(run.durationSeconds)} />
          <Metric label="평균 페이스" value={`${formatPace(run.averagePaceSecondsPerKm)} /km`} />
          <Metric label="평균 속도" value={formatSpeedKmh(run.distanceMeters, run.durationSeconds)} />
          <Metric
            label="GPS 포인트"
            value={run.routePoints.length > 0 ? `${run.routePoints.length}개` : '—'}
          />
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
  eyebrow: { marginTop: 23, color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 1.7 },
  title: { marginTop: 8, color: C.text, fontSize: 23, fontWeight: '700' },
  date: { marginTop: 5, color: C.muted, fontSize: 10 },
  mapWrap: { marginTop: 19 },
  missing: { marginTop: 40 },
  mapPlaceholder: { height: MAP_HEIGHT, marginTop: 19, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#20251B', borderWidth: 1, borderColor: '#303A22' },
  mapIcon: { color: C.accent, fontSize: 37 },
  mapTitle: { marginTop: 7, color: C.text, fontSize: 12, fontWeight: '600' },
  mapCaption: { marginTop: 4, paddingHorizontal: 24, color: C.muted, fontSize: 9, textAlign: 'center' },
  primaryMetric: { marginTop: 22, alignItems: 'center' },
  distance: { color: C.text, fontSize: 42, lineHeight: 48, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { color: C.muted, fontSize: 14, fontWeight: '500' },
  metricLabel: { color: C.subtle, fontSize: 9 },
  metricGrid: { marginTop: 20, paddingVertical: 16, flexDirection: 'row', flexWrap: 'wrap', rowGap: 20, borderRadius: 17, backgroundColor: C.surface },
  metric: { width: '50%', paddingHorizontal: 17, gap: 6 },
  metricValue: { color: C.text, fontSize: 13, fontWeight: '600' },
  note: { marginTop: 19, color: C.subtle, fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
