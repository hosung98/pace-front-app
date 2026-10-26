import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import { PaceText as Text } from '@/components/pace-text';
import { PaceBrand } from '@/components/pace-brand';
import { PaceButton } from '@/components/pace-button';
import { PaceColors as C } from '@/constants/pace';
import { formatDuration, formatKm, formatPace } from '@/lib/format';
import { errorMessage } from '@/lib/api-transport';
import type { CompletedRun } from '@/features/running/types';
import { shareRouteSegments } from './share-route';
import { captureRunCardImage, releaseRunCardImage, shareRunCardImage } from './share-card-export';

export function RunShareCard({ run, badgeTitles = [], ready = true }: Readonly<{
  run: CompletedRun; badgeTitles?: string[]; ready?: boolean;
}>) {
  const ref = useRef<View>(null);
  const [hide, setHide] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [laidOut, setLaidOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [imageRevision, setImageRevision] = useState('');
  const image = useRef<{ uri: string; revision: string } | null>(null);
  const segments = useMemo(() => shareRouteSegments(run.routePoints, hide), [run.routePoints, hide]);
  const revision = JSON.stringify([run.id, run.startedAt, run.distanceMeters, run.durationSeconds,
    run.averagePaceSecondsPerKm, hide, badgeTitles, segments]);
  useEffect(() => {
    if (Platform.OS === 'web' || !laidOut || !ready || busy || image.current?.revision === revision) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      void captureRunCardImage(ref).then((uri) => {
        if (cancelled) { releaseRunCardImage(uri); return; }
        const previous = image.current;
        image.current = { uri, revision };
        setImageRevision(revision);
        setFailure(null);
        if (previous) releaseRunCardImage(previous.uri);
      }).catch((error: unknown) => {
        console.error('러닝 카드 자동 생성 실패', error);
        if (!cancelled) setFailure(errorMessage(error, '카드 이미지를 만들지 못했어요. 다시 시도해 주세요.'));
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [revision, laidOut, ready, busy, attempt]);
  useEffect(() => () => {
    if (image.current) releaseRunCardImage(image.current.uri);
  }, []);
  const generated = imageRevision === revision;
  return <View style={styles.section}>
    <Text style={styles.title}>오늘의 러닝, 한 장으로</Text>
    <View ref={ref} collapsable={false} onLayout={() => setLaidOut(true)} style={styles.card}>
      <Text style={styles.certificate}>RUN CERTIFICATE</Text>
      <PaceBrand />
      <Text style={styles.date}>{new Date(run.startedAt).toLocaleDateString('ko-KR')}</Text>
      <View accessible={false} style={styles.route}>
        {segments.length ? segments.map((segment) => <View key={segment.id} style={[styles.line, {
          left: segment.x, top: segment.y, width: segment.length, transform: [{ rotate: segment.angle }],
        }]} />) : <Text style={styles.caption}>{hide ? '출발·도착 부근을 숨겼어요' : '표시할 경로가 없어요'}</Text>}
      </View>
      <Text style={styles.distance}>{formatKm(run.distanceMeters)} km</Text>
      <View style={styles.metricsRow}>
        <View style={styles.metric}><Text style={styles.metricLabel}>TIME</Text><Text style={styles.metrics}>{formatDuration(run.durationSeconds)}</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>PACE</Text><Text style={styles.metrics}>{formatPace(run.averagePaceSecondsPerKm)} /km</Text></View>
      </View>
      {badgeTitles.map((title) => <Text key={title} style={styles.earned}>◆ {title}</Text>)}
      <Text style={styles.caption}>{hide ? '출발·도착 반경 200m 숨김 · 경로 개요' : '전체 경로 개요'}</Text>
    </View>
    <View style={styles.row}>
      <Text style={[styles.caption, styles.label]}>출발·도착 부근 숨기기</Text>
      <Switch accessibilityLabel="공유 이미지에서 출발·도착 반경 200미터 숨기기" value={hide}
        disabled={busy} onValueChange={setHide} trackColor={{ true: C.accent, false: C.border }} />
    </View>
    <Text style={styles.caption}>공유 전 경로를 확인해 주세요. 다른 위치 정보만으로도 장소가 추정될 수 있어요.</Text>
    <PaceButton label={Platform.OS === 'web' ? '이미지 공유는 앱에서 가능해요' : generated ? '인스타그램 · 카카오톡 등에 공유' : '카드 이미지를 만드는 중…'}
      disabled={Platform.OS === 'web' || !ready || !generated} loading={busy} variant="secondary" onPress={() => {
        const prepared = image.current;
        if (prepared?.revision !== revision) {
          setFailure('현재 카드 이미지가 준비된 뒤 다시 시도해 주세요.');
          return;
        }
        setBusy(true);
        setFailure(null);
        void shareRunCardImage(prepared.uri).catch((error: unknown) => {
          console.error('러닝 카드 공유 실패', error);
          setFailure(errorMessage(error, '이미지를 공유하지 못했어요.'));
        }).finally(() => setBusy(false));
      }} />
    {failure ? <>
      <Text accessibilityLiveRegion="polite" style={styles.caption}>{failure}</Text>
      {!generated && Platform.OS !== 'web' ? <PaceButton label="카드 이미지 다시 만들기" variant="secondary"
        disabled={busy} onPress={() => { setFailure(null); setAttempt((value) => value + 1); }} /> : null}
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { marginTop: 24, gap: 12 },
  title: { color: C.text, fontSize: 16, fontWeight: '600' },
  card: { paddingVertical: 24, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#17191C', alignItems: 'center', gap: 12 },
  date: { color: C.muted, fontSize: 12 },
  certificate: { color: C.accent, fontSize: 9, letterSpacing: 3 },
  route: { width: 240, height: 160, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  line: { position: 'absolute', height: 3, backgroundColor: C.accent, borderRadius: 2 },
  distance: { color: C.text, fontSize: 34, fontWeight: '700' },
  metrics: { color: C.text, fontSize: 14 },
  metricsRow: { flexDirection: 'row', gap: 28, paddingVertical: 12 },
  metric: { alignItems: 'center', gap: 6 },
  metricLabel: { color: C.subtle, fontSize: 9, letterSpacing: 2 },
  earned: { color: C.accent, fontSize: 13 },
  caption: { color: C.muted, fontSize: 12, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { flex: 1 },
});
