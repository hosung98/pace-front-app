import { useRef, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/back-header';
import { PaceButton } from '@/components/pace-button';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { completePermissionIntro } from '@/data/permission-preferences';
import { useSession } from '@/features/auth/session-store';
import { errorMessage } from '@/lib/api-transport';

export function PermissionsScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const act = async (operation: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try { await operation(); }
    catch (error) {
      console.error('앱 권한 설정 실패', error);
      setMessage(errorMessage(error, '설정을 완료하지 못했어요. 다시 시도해 주세요.'));
    } finally { running.current = false; setBusy(false); }
  };
  const finish = () => act(async () => {
    await completePermissionIntro();
    const destination = session ? '/main' : '/login';
    router.replace(from === 'settings' ? '/settings' : destination);
  });
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <BackHeader />
      <Text style={styles.eyebrow}>YOUR CHOICE</Text>
      <Text style={styles.title}>내가 선택하는 앱 권한</Text>
      <Text style={styles.body}>한꺼번에 허용하지 않아도 괜찮아요. 필요한 기능을 사용할 때만 요청하며, 설정에서 언제든 바꿀 수 있어요.</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>위치 · 러닝 기록에 필요</Text>
        <Text style={styles.body}>GPS 거리·페이스·경로를 기록해요. 러닝 중 화면을 잠가도 위치를 수집하고, 종료하면 수집을 중단해요. 로그인한 기록은 경로와 함께 서버에 동기화돼요.</Text>
        <PaceButton label="위치 접근 설정" variant="secondary" disabled={busy || Platform.OS === 'web'}
          onPress={() => { void act(async () => {
            const permission = await Location.requestForegroundPermissionsAsync();
            setMessage(permission.granted ? '위치 접근을 허용했어요. 러닝을 시작할 수 있어요.'
              : permission.canAskAgain ? '위치 접근을 허용하지 않았어요. 러닝 시작 시 다시 선택할 수 있어요.'
                : '위치 접근이 꺼져 있어요. 기기 설정 → PACE → 위치에서 변경해 주세요.');
          }); }} />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Apple 건강 · 선택</Text>
        <Text style={styles.body}>걸음 수·운동을 기기에서 조회하고 PACE 러닝을 건강 앱에 저장해요. 건강 데이터는 서버·순위에 전송하지 않아요. iPhone에서만 지원해요.</Text>
        <PaceButton label="Apple 건강 살펴보기" variant="secondary" disabled={busy}
          onPress={() => router.push('/health')} />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Face ID · 선택</Text>
        <Text style={styles.body}>로그인한 뒤 앱 설정에서 켤 수 있어요. 켜면 앱 시작·5분 이상 이탈 후에만 인증해요. 별도 PIN은 만들지 않고 기기 암호를 사용할 수 있어요.</Text>
        <Text style={styles.heading}>실시간 러닝 현황 · 선택</Text>
        <Text style={styles.body}>러닝을 시작하면 iOS가 잠금화면·Dynamic Island 표시 허용 여부를 물을 수 있어요. 허용하지 않아도 러닝 기록은 가능해요.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>알림과 사진</Text>
        <Text style={styles.body}>현재 푸시 알림 발송은 준비 중이라 여기서 권한을 요청하지 않아요. 사진은 사진 선택 기능을 사용할 때만 요청해요.</Text>
      </View>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.body}>{message}</Text> : null}
      <PaceButton label="선택한 설정으로 계속하기" loading={busy} onPress={() => { void finish(); }} />
      <PaceButton label="지금은 건너뛰기" variant="secondary" disabled={busy} onPress={() => { void finish(); }} />
      {Platform.OS !== 'web' ? <PaceButton label="기기 설정 열기" variant="secondary" disabled={busy}
        onPress={() => { void act(() => Linking.openSettings()); }} /> : null}
      <PaceButton label="개인정보 처리방침" variant="secondary" disabled={busy} onPress={() => router.push('/privacy')} />
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, paddingBottom: 40, gap: 18 },
  eyebrow: { color: C.accent, fontSize: 10, letterSpacing: 2 },
  title: { color: C.text, fontSize: 25, fontWeight: '700' },
  heading: { color: C.text, fontSize: 15, fontWeight: '600' },
  body: { color: C.muted, fontSize: 13, lineHeight: 22 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, gap: 14 },
});
