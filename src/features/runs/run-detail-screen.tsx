import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { RunReflection } from './run-reflection';
import { RunShareCard } from './run-share-card';
import { errorMessage } from '@/lib/api-transport';
import { useSession } from '@/features/auth/session-store';
import { PaceButton } from '@/components/pace-button';
import { exportHealthRun, supportsHealth } from '@/features/health/health-service';

const MAP_HEIGHT = 240;

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; runId: string; run: CompletedRun | null; error?: string };

export function RunDetailScreen() {
  const { session } = useSession();
  return <AccountRunDetail key={session?.user.id ?? 'guest'} />;
}

function AccountRunDetail() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [healthMessage, setHealthMessage] = useState<string | null>(null);
  const { runId } = useLocalSearchParams<{ runId?: string }>();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const { session } = useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    getCompletedRun(runId)
      .then((run) => {
        if (!cancelled) setState({ status: 'loaded', runId, run });
      })
      .catch((error: unknown) => {
        console.error('Unable to load the run detail.', error);
        if (!cancelled) setState({ status: 'loaded', runId, run: null, error: errorMessage(error, '기록을 불러오지 못했어요.') });
      });
    return () => {
      cancelled = true;
    };
  }, [runId, userId]);

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
              <Text style={styles.mapCaption}>{state.status === 'loaded' && state.error ? state.error : '삭제되었거나 현재 계정·기기에 없는 기록이에요.'}</Text>
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
          {session ? '계정에 저장된 러닝과 GPS 경로입니다.' : '기기에 저장된 GPS 기록입니다.'}
        </Text>
        <RunReflection key={`${userId ?? 'guest'}:${run.id}`} run={run} />
        <RunShareCard run={run} />
        {supportsHealth ? <>
          <PaceButton label="Apple 건강에 저장 · 다시 시도" loading={exporting} variant="secondary"
            onPress={() => {
              setExporting(true);
              void exportHealthRun(run).then((saved) => {
                setHealthMessage(saved ? '건강 앱에 저장했어요. 같은 러닝은 중복 저장하지 않아요.' : '앱 설정에서 Apple 건강 연동을 먼저 켜 주세요.');
              }).catch((error: unknown) => {
                console.error('건강 앱 저장 재시도 실패', error);
                setHealthMessage(errorMessage(error, '건강 앱에 저장하지 못했어요.'));
              }).finally(() => setExporting(false));
            }} />
          <PaceButton label="Apple 건강 연동 설정" variant="secondary" onPress={() => router.push('/health')} />
          <Text style={styles.note}>건강 앱에는 일시 정지를 포함한 시작~종료 시간으로 저장돼요. GPS 경로는 보내지 않아요.</Text>
        </> : null}
        {healthMessage ? <Text accessibilityLiveRegion="polite" style={styles.note}>{healthMessage}</Text> : null}
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
