import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/back-header';
import { PaceButton } from '@/components/pace-button';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { errorMessage } from '@/lib/api-transport';
import { applyAppUpdate, downloadAppUpdate, getAppUpdateInfo } from './app-update-service';

export function AppUpdateScreen() {
  const info = getAppUpdateInfo();
  const sourceLabel = info.embedded ? '앱에 포함된 기본 코드' : '다운로드한 업데이트';
  const [busy, setBusy] = useState(false);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const operating = useRef(false);
  const act = async (operation: () => Promise<void>) => {
    if (operating.current) return;
    operating.current = true;
    setBusy(true);
    setFailure(null);
    try { await operation(); }
    catch (error) {
      console.error('앱 업데이트 실패', error);
      setFailure(errorMessage(error, '업데이트를 완료하지 못했어요. 연결 상태를 확인해 주세요.'));
    } finally { operating.current = false; setBusy(false); }
  };
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <BackHeader />
      <Text style={styles.title}>앱 정보 · 업데이트</Text>
      <Text style={styles.body}>현재 이 기기에서 실행 중인 버전이에요.</Text>
      <View style={styles.card}>
        <Text style={styles.version}>PACE {info.version}{info.build ? ` (${info.build})` : ''}</Text>
        <Text style={styles.label}>실행 코드</Text>
        <Text selectable style={styles.body}>{info.enabled ? sourceLabel : '개발 실행 · OTA 비활성'}</Text>
        <Text selectable style={styles.identifier}>{info.updateId ?? '업데이트 ID 없음 · 개발 실행'}</Text>
        <Text style={styles.body}>채널 {info.channel ?? '없음'} · 런타임 {info.runtime ?? '없음'}</Text>
      </View>
      {info.emergency ? <Text accessibilityRole="alert" style={styles.warning}>
        업데이트 시작에 문제가 생겨 기본 코드로 실행했어요. 이 화면을 캡처해 도움말의 문의 주소로 보내 주세요.
      </Text> : null}
      {info.enabled ? <>
        <PaceButton label={downloadedId ? '업데이트 적용하고 다시 시작' : '업데이트 확인'}
          loading={busy} onPress={() => { void act(async () => {
            if (downloadedId) { await applyAppUpdate(); return; }
            setMessage('업데이트를 확인하고 다운로드하고 있어요.');
            const id = await downloadAppUpdate();
            setDownloadedId(id);
            setMessage(id ? '다운로드했어요. 아래 버튼을 누르면 앱이 다시 시작돼요.'
              : '현재 설치 버전에 제공되는 새 업데이트가 없어요. 화면이 여전히 다르면 이 앱 정보를 문의해 주세요.');
          }); }} />
        {downloadedId ? <Text selectable style={styles.identifier}>다운로드한 ID {downloadedId}</Text> : null}
      </> : <Text style={styles.body}>웹·개발 실행에서는 앱 OTA를 적용할 수 없어요. TestFlight의 설치 앱에서 확인해 주세요.</Text>}
      {failure ? <Text accessibilityRole="alert" style={styles.warning}>{failure}</Text> : null}
      {!failure && message ? <Text accessibilityLiveRegion="polite" style={styles.body}>{message}</Text> : null}
      <Text style={styles.body}>진행 중인 러닝이 있으면 적용을 막아요. 앱 삭제는 미동기화 기록을 지울 수 있으니 업데이트 문제로 앱을 먼저 삭제하지 마세요.</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, gap: 20, paddingBottom: 40 },
  title: { color: C.text, fontSize: 24, fontWeight: '700' },
  version: { color: C.text, fontSize: 20, fontWeight: '600' },
  label: { color: C.muted, fontSize: 12, marginTop: 8 },
  body: { color: C.muted, fontSize: 13, lineHeight: 22 },
  identifier: { color: C.muted, fontSize: 11, lineHeight: 18 },
  warning: { color: '#FFB4A9', fontSize: 13, lineHeight: 22 },
  card: { backgroundColor: C.surface, borderRadius: 18, padding: 20, gap: 8 },
});
