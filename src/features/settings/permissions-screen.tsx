import { useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/back-header';
import { PaceButton } from '@/components/pace-button';
import { PaceDisclosure } from '@/components/pace-disclosure';
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
  const [locationReady, setLocationReady] = useState(false);
  const locationAction = Platform.OS === 'web' ? '앱 전용' : '설정';
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
      <View style={styles.intro}>
        <Text style={styles.title}>러닝할 준비가 됐나요?</Text>
        <Text style={styles.body}>권한은 필요할 때 선택해도 괜찮아요.</Text>
      </View>
      <View style={styles.options}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.heading}>위치</Text>
            <Text style={styles.body}>달린 거리와 경로를 기록해요.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="위치 접근 설정"
            disabled={busy || locationReady || Platform.OS === 'web'}
            style={styles.rowAction}
          onPress={() => { void act(async () => {
            const permission = await Location.requestForegroundPermissionsAsync();
            setLocationReady(permission.granted);
            const deniedMessage = permission.canAskAgain
              ? '위치 접근을 허용하지 않았어요. 러닝 시작 시 다시 선택할 수 있어요.'
              : '위치 접근이 꺼져 있어요. 기기 설정 → PACE → 위치에서 변경해 주세요.';
            setMessage(permission.granted ? '위치 접근을 허용했어요. 러닝을 시작할 수 있어요.' : deniedMessage);
          }); }}>
            <Text style={styles.actionText}>{locationReady ? '허용됨' : locationAction}</Text>
          </Pressable>
        </View>
        <View style={[styles.row, styles.rowBorder]}>
          <View style={styles.copy}>
            <Text style={styles.heading}>Apple 건강 <Text style={styles.optional}>선택</Text></Text>
            <Text style={styles.body}>걸음 수와 운동을 함께 확인해요.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Apple 건강 살펴보기"
            disabled={busy} style={styles.rowAction} onPress={() => router.push('/health')}>
            <Text style={styles.actionText}>보기</Text>
          </Pressable>
        </View>
      </View>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.body}>{message}</Text> : null}
      <Text style={styles.caption}>Face ID는 로그인 후 설정에서 켤 수 있어요.{'\n'}선택하지 않아도 PACE를 시작할 수 있어요.</Text>
      <View style={styles.actions}>
        <PaceButton label={from === 'settings' ? '설정으로 돌아가기' : '계속하기'} loading={busy} onPress={() => { void finish(); }} />
        {from !== 'settings' ? <Pressable accessibilityRole="button" disabled={busy}
          onPress={() => { void finish(); }} style={styles.skip}>
          <Text style={styles.body}>지금은 건너뛰기</Text>
        </Pressable> : null}
      </View>
      <PaceDisclosure title="권한과 데이터 사용 안내">
        <Text style={styles.body}>위치는 GPS 러닝 중 화면이 잠겨도 기록하며 종료하면 수집을 중단해요. 로그인하면 러닝·GPS 경로가 서버에 동기화돼요.</Text>
        <Text style={styles.body}>Apple 건강은 iPhone에서만 지원해요. 건강 원본은 서버·크루 순위에 보내지 않아요. Face ID는 별도 PIN 없이 기기 암호로도 인증할 수 있어요.</Text>
        <Text style={styles.body}>실시간 러닝 현황은 러닝 시작 시 iOS에서 표시 권한을 물을 수 있어요. 푸시 발송은 준비 중이며 사진 권한은 사진을 선택할 때만 요청해요.</Text>
        {Platform.OS !== 'web' ? <PaceButton label="기기 설정 열기" variant="secondary" disabled={busy}
          onPress={() => { void act(() => Linking.openSettings()); }} /> : null}
        <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} style={styles.skip}>
          <Text style={styles.body}>개인정보 처리방침</Text>
        </Pressable>
      </PaceDisclosure>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, paddingBottom: 40, gap: 24 },
  intro: { paddingTop: 12, gap: 12 },
  title: { color: C.text, fontSize: 25, fontWeight: '700' },
  heading: { color: C.text, fontSize: 15, fontWeight: '600' },
  body: { color: C.muted, fontSize: 13, lineHeight: 22 },
  options: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 18 },
  row: { minHeight: 94, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  copy: { flex: 1, gap: 6 },
  optional: { color: C.subtle, fontSize: 11 },
  rowAction: { minWidth: 52, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  caption: { color: C.muted, fontSize: 12, lineHeight: 21 },
  actions: { gap: 4 },
  skip: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
});
