import { useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/back-header';
import { PaceButton } from '@/components/pace-button';
import { PaceDisclosure } from '@/components/pace-disclosure';
import { PaceText as Text } from '@/components/pace-text';
import { PaceQueryState } from '@/components/pace-feedback';
import { PaceColors as C } from '@/constants/pace';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { errorMessage } from '@/lib/api-transport';
import { formatDateTime, formatDuration } from '@/lib/format';
import { connectHealth, disconnectHealth, isHealthConnected, readHealthSummary, supportsHealth, type HealthSummary } from './health-service';

async function loadHealthScreen() {
  const connected = await isHealthConnected();
  try {
    return { connected, summary: connected ? await readHealthSummary() : null, issue: null };
  } catch (error) {
    console.error('건강 데이터 조회 실패', error);
    return { connected, summary: null, issue: errorMessage(error, '건강 데이터를 조회하지 못했어요.') };
  }
}

function HealthDataCards({ summary }: Readonly<{ summary: HealthSummary }>) {
  return <>
    <View style={styles.card}>
      <Text style={styles.heading}>오늘 걸음 수</Text>
      <Text style={styles.title}>{summary.steps === null ? '표시할 데이터 없음' : `${Math.round(summary.steps).toLocaleString()} 걸음`}</Text>
    </View>
    <Text style={styles.heading}>최근 운동 · 기기 전용</Text>
    {summary.workouts.length ? summary.workouts.map((workout) => <View key={workout.id} style={styles.card}>
      <Text style={styles.heading}>{workout.running ? '러닝' : '운동'} · {formatDuration(workout.durationSeconds)}</Text>
      <Text style={styles.description}>{formatDateTime(workout.startedAt)}</Text>
    </View>) : <Text style={styles.description}>최근에 조회할 운동이 없어요. 데이터가 없거나 읽기 권한이 허용되지 않았을 수 있어요.</Text>}
  </>;
}

export function HealthScreen() {
  const [busy, setBusy] = useState(false);
  const operating = useRef(false);
  const [failure, setFailure] = useState<string | null>(null);
  const query = useFocusQuery(loadHealthScreen, null, '건강 데이터를 불러오지 못했어요. 권한과 기기 잠금을 확인해 주세요.');
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
  const canDisconnect = data?.connected || query.errorMessage;
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <BackHeader />
      <View style={styles.intro}>
        <Text style={styles.title}>Apple 건강</Text>
        <Text style={styles.description}>러닝과 건강 기록을 한곳에서.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.status}>{data?.connected ? '연동 사용 중' : '선택 연동'}</Text>
        <Text style={styles.heading}>오늘의 걸음과 최근 운동</Text>
        <Text style={styles.description}>걸음 수·운동을 확인하고, 완료한 PACE 러닝을 건강 앱에 저장해요.</Text>
        <Text style={styles.description}>건강 원본은 이 기기에서만 사용해요.</Text>
      </View>
      {!supportsHealth ? <View style={styles.card}><Text style={styles.description}>Apple 건강 연동은 iPhone 전용이에요. 웹·Android에서는 기존 PACE 러닝 기록을 그대로 사용할 수 있어요.</Text></View> : <>
        {query.isLoading || query.errorMessage ? <PaceQueryState loading={query.isLoading} message={query.errorMessage}
          onRetry={() => { void query.reload(); }} /> : null}
        {data?.issue ? <View style={styles.card}>
          <Text accessibilityRole="alert" style={styles.description}>{data.issue}</Text>
          <PaceButton label="데이터 다시 불러오기" variant="secondary" disabled={busy}
            onPress={() => { void query.reload(); }} />
        </View> : null}
        <Text style={styles.description}>읽기·쓰기 권한은 직접 선택할 수 있어요.{'\n'}허용하지 않아도 PACE는 사용할 수 있어요.</Text>
        <PaceButton label={data?.connected ? '건강 데이터 새로고침' : '동의하고 연결하기'}
          disabled={query.isLoading} loading={busy} onPress={() => {
            if (data?.connected) void query.reload();
            else void act(connectHealth);
          }} />
        {data?.summary ? <HealthDataCards summary={data.summary} /> : null}
      </>}
      {failure ? <Text accessibilityRole="alert" style={styles.description}>{failure}</Text> : null}
      <PaceDisclosure title="연동 범위와 개인정보">
        <Text style={styles.description}>오늘 걸음 수·최근 30일 운동을 최대 20개 조회해요. 건강 원본은 서버로 전송하거나 크루·대결 순위에 반영하지 않아요.</Text>
        <Text style={styles.description}>PACE 러닝의 거리·시작·종료 시각을 저장하며 GPS 경로·심박·칼로리는 보내지 않아요. 건강 운동 시간에는 일시 정지가 포함돼 PACE 실제 러닝 시간과 다를 수 있어요.</Text>
        <Text style={styles.description}>연동 후 완료한 러닝만 자동 저장해요. 기존 기록·저장 실패는 러닝 상세에서 다시 저장할 수 있어요.</Text>
      </PaceDisclosure>
      <PaceDisclosure title="권한 설정 · 연동 해제">
        <Text style={styles.description}>Apple은 읽기 권한 거부 여부를 앱에 알려주지 않아요. 연동 사용 중이어도 모든 권한을 허용한 것은 아니에요. 건강 앱 → 프로필 → 앱 → PACE에서 변경해 주세요.</Text>
        {supportsHealth ? <>
        <PaceButton label="건강 권한 다시 요청" variant="secondary"
          disabled={query.isLoading} loading={busy} onPress={() => { void act(connectHealth); }} />
        <PaceButton label="iPhone 설정 열기" variant="secondary" disabled={busy}
          onPress={() => {
            void Linking.openSettings().catch((error: unknown) => {
              console.error('iPhone 설정 열기 실패', error);
              setFailure('설정을 열지 못했어요. iPhone 설정에서 PACE를 찾아 주세요.');
            });
          }} />
        {canDisconnect ? <PaceButton label="연동 끄기" variant="secondary" loading={busy}
          onPress={() => { void act(disconnectHealth); }} /> : null}
        </> : null}
        <Text style={styles.description}>연동을 끄면 이후 조회·저장만 중단해요. 이미 저장된 운동은 건강 앱에서 직접 삭제해야 해요. PACE 기록 삭제·탈퇴로 건강 앱의 운동이 삭제되지는 않아요.</Text>
      </PaceDisclosure>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, gap: 18, paddingBottom: 40 },
  title: { color: C.text, fontSize: 24, fontWeight: '700' },
  intro: { gap: 10, paddingTop: 12, paddingBottom: 6 },
  status: { color: C.accent, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  heading: { color: C.text, fontSize: 14, fontWeight: '600' },
  description: { color: C.muted, fontSize: 12, lineHeight: 20 },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 20, gap: 10 },
});
