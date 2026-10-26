import { useCallback, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/back-header';
import { PaceButton } from '@/components/pace-button';
import { PaceText as Text } from '@/components/pace-text';
import { PaceQueryState } from '@/components/pace-feedback';
import { PaceConfirmDialog } from '@/components/pace-confirm-dialog';
import { PaceColors as C } from '@/constants/pace';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { errorMessage } from '@/lib/api-transport';
import { formatDateTime, formatDuration } from '@/lib/format';
import { connectHealth, disconnectHealth, isHealthConnected, readHealthSummary, supportsHealth } from './health-service';

export function HealthScreen() {
  const [busy, setBusy] = useState(false);
  const operating = useRef(false);
  const [confirm, setConfirm] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const load = useCallback(async () => {
    const connected = await isHealthConnected();
    return { connected, summary: connected ? await readHealthSummary() : null };
  }, []);
  const query = useFocusQuery(load, null, '건강 데이터를 불러오지 못했어요. 권한과 기기 잠금을 확인해 주세요.');
  const act = async (operation: () => Promise<void>) => {
    if (operating.current) return;
    operating.current = true;
    setBusy(true);
    setFailure(null);
    try { await operation(); await query.reload(); }
    catch (error) {
      console.error('건강 연동 변경 실패', error);
      setFailure(errorMessage(error, '건강 연동을 변경하지 못했어요.'));
    } finally { operating.current = false; setBusy(false); }
  };
  const data = query.data;
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <BackHeader />
      <Text style={styles.title}>Apple 건강</Text>
      <Text style={styles.description}>오늘 걸음 수와 최근 30일 운동(최대 20개)을 이 기기에서만 확인해요. 건강 원본은 서버로 전송하지 않으며 PACE 기록·크루 순위에 합산하지 않아요.</Text>
      <Text style={styles.description}>연동하면 이후 완료한 PACE 러닝을 건강 앱에 자동 저장해요. 기존 기록·실패한 저장은 러닝 상세에서 다시 저장할 수 있어요. GPS 경로·심박·칼로리는 전송하지 않아요.</Text>
      <Text style={styles.description}>건강 앱의 운동 시간은 시작부터 종료까지(일시 정지 포함)예요. PACE의 실제 러닝 시간과 다를 수 있어요.</Text>
      {!supportsHealth ? <View style={styles.card}><Text style={styles.description}>Apple 건강 연동은 iPhone 전용이에요. 웹·Android에서는 기존 PACE 러닝 기록을 그대로 사용할 수 있어요.</Text></View> : <>
        {query.isLoading || query.errorMessage ? <PaceQueryState loading={query.isLoading} message={query.errorMessage}
          onRetry={() => { void query.reload(); }} /> : null}
        {data?.summary ? <>
          <View style={styles.card}>
            <Text style={styles.heading}>오늘 걸음 수</Text>
            <Text style={styles.title}>{data.summary.steps === null ? '표시할 데이터 없음' : `${Math.round(data.summary.steps).toLocaleString()} 걸음`}</Text>
          </View>
          <Text style={styles.heading}>최근 운동 · 기기 전용</Text>
          {data.summary.workouts.length ? data.summary.workouts.map((workout) => <View key={workout.id} style={styles.card}>
            <Text style={styles.heading}>{workout.running ? '러닝' : '운동'} · {formatDuration(workout.durationSeconds)}</Text>
            <Text style={styles.description}>{formatDateTime(workout.startedAt)}</Text>
          </View>) : <Text style={styles.description}>최근에 조회할 운동이 없어요. 데이터가 없거나 읽기 권한이 허용되지 않았을 수 있어요.</Text>}
        </> : null}
        <Text style={styles.description}>Apple은 읽기 권한 거부 여부를 앱에 알려주지 않아요. 연동 켜짐은 모든 권한이 허용됐다는 의미가 아니에요. 건강 앱 → 프로필 → 앱 → PACE에서 권한을 변경할 수 있어요.</Text>
        <PaceButton label={data?.connected ? '권한 다시 요청' : 'Apple 건강 연동하기'} loading={busy}
          onPress={() => setConfirm(true)} />
        {data?.connected || query.errorMessage ? <PaceButton label="연동 끄기" variant="secondary" loading={busy}
          onPress={() => { void act(disconnectHealth); }} /> : null}
        {data?.connected ? <PaceButton label="새로고침" variant="secondary" disabled={busy} onPress={() => { void query.reload(); }} /> : null}
        <PaceButton label="iPhone 설정 열기" variant="secondary" disabled={busy}
          onPress={() => { void act(() => Linking.openSettings()); }} />
      </>}
      {failure ? <Text accessibilityRole="alert" style={styles.description}>{failure}</Text> : null}
      <Text style={styles.description}>연동을 끄면 이후 조회·저장만 중단해요. 이미 건강 앱에 저장된 운동은 남으며, 건강 앱에서 직접 삭제할 수 있어요. PACE 기록 삭제·탈퇴와 건강 앱의 기록 삭제는 별개예요.</Text>
    </ScrollView>
    <PaceConfirmDialog visible={confirm} title="Apple 건강과 연동할까요?"
      message="걸음 수·운동 읽기와 PACE 러닝 쓰기 권한을 선택할 수 있어요. 건강 원본은 이 기기 안에서만 사용하며, 연동 후 완료한 러닝만 자동 저장해요."
      onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); void act(connectHealth); }} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, gap: 18, paddingBottom: 40 },
  title: { color: C.text, fontSize: 24, fontWeight: '700' },
  heading: { color: C.text, fontSize: 14, fontWeight: '600' },
  description: { color: C.muted, fontSize: 12, lineHeight: 20 },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 20, gap: 10 },
});
