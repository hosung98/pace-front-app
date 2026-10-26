import { useCallback, useRef, useState } from 'react';
import { AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/back-header';
import { PaceButton } from '@/components/pace-button';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { completePermissionIntro } from '@/data/permission-preferences';
import { useSession } from '@/features/auth/session-store';
import { errorMessage } from '@/lib/api-transport';
import { checkLocationPermission } from './location-permission';

export function PermissionsScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const applyPermission = useCallback((permission: Awaited<ReturnType<typeof checkLocationPermission>>) => {
    setLocationReady(permission.granted);
    setCanAskAgain(permission.canAskAgain);
    if (permission.granted) setMessage(null);
    if (!permission.granted && permission.status !== 'undetermined') {
      setMessage(permission.canAskAgain ? '위치 접근을 허용하지 않아도 둘러볼 수 있어요. 러닝 시작 시 다시 선택할 수 있어요.'
        : '위치 접근이 꺼져 있어요. 기기 설정 → PACE → 위치에서 변경해 주세요.');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    let checking = false;
    let checked = false;
    const start = () => {
      if (checking || AppState.currentState !== 'active') return;
      checking = true;
      running.current = true;
      setBusy(true);
      const request = from === 'settings' || checked ? 'never' : 'initial';
      checked = true;
      void checkLocationPermission(request)
        .then((permission) => { if (active) applyPermission(permission); })
        .catch((error: unknown) => {
          console.error('위치 권한 확인 실패', error);
          if (active) setMessage(errorMessage(error, '위치 권한을 확인하지 못했어요. 다시 시도해 주세요.'));
        })
        .finally(() => { checking = false; running.current = false; if (active) setBusy(false); });
    };
    start();
    const subscription = AppState.addEventListener('change', start);
    return () => { active = false; subscription.remove(); };
  }, [from, applyPermission]));

  const act = async (operation: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage(null);
    try { await operation(); }
    catch (error) {
      console.error('앱 권한 설정 실패', error);
      setMessage(errorMessage(error, '설정을 완료하지 못했어요. 다시 시도해 주세요.'));
    } finally { running.current = false; setBusy(false); }
  };
  const finish = () => act(async () => {
    await completePermissionIntro();
    router.replace(from === 'settings' ? '/settings' : session ? '/main' : '/login');
  });
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><BackHeader /></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.intro}>
        <Text style={styles.title}>PACE 접근 권한 안내</Text>
        <Text style={styles.body}>러닝에 필요한 권한과 사용 목적을 알려드려요.</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.heading}>필수 접근 권한</Text>
        <Text style={styles.body}>필수 접근 권한 없음</Text>
        <Text style={styles.caption}>권한을 허용하지 않아도 앱을 둘러볼 수 있어요.</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.heading}>선택 접근 권한</Text>
        <PermissionRow icon="↗" title="위치" detail="GPS 러닝의 거리·경로 기록과 내 동네 찾기에 사용해요.">
          <Pressable accessibilityRole="button" accessibilityLabel="위치 접근 설정"
            disabled={busy || locationReady || Platform.OS === 'web'} style={styles.rowAction}
            onPress={() => { void act(async () => {
              if (!canAskAgain) await Linking.openSettings();
              else applyPermission(await checkLocationPermission('retry'));
            }); }}>
            <Text style={styles.actionText}>{Platform.OS === 'web' ? '앱 전용' : locationReady ? '허용됨' : canAskAgain ? '허용' : '설정'}</Text>
          </Pressable>
        </PermissionRow>
        <PermissionRow icon="♡" title="Apple 건강" detail="오늘 걸음 수·최근 운동 조회와 PACE 러닝 저장에 사용해요. 원본은 서버에 보내지 않아요.">
          <Pressable accessibilityRole="button" accessibilityLabel="Apple 건강 연동 안내"
            disabled={busy || Platform.OS !== 'ios'} style={styles.rowAction} onPress={() => router.push('/health')}>
            <Text style={styles.actionText}>{Platform.OS === 'ios' ? '연동' : 'iPhone 전용'}</Text>
          </Pressable>
        </PermissionRow>
        <PermissionRow icon="◎" title="Face ID · 기기 암호" detail="로그인 후 앱 잠금을 직접 켰을 때만 사용해요. 생체정보는 PACE에 저장하지 않아요." />
        <Text style={styles.caption}>선택 권한을 거부해도 해당 기능 외에는 이용할 수 있어요. 백그라운드 위치는 러닝 시작 시 별도로 요청하며, 러닝을 종료하면 위치 수집을 중단해요.</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.heading}>접근 권한 변경 방법</Text>
        <Text style={styles.body}>기기 설정 → 앱 → PACE에서 변경할 수 있어요. 건강 권한은 건강 앱에서 관리해 주세요.</Text>
        {Platform.OS !== 'web' ? <Pressable accessibilityRole="button" disabled={busy} style={styles.settingsLink}
          onPress={() => { void act(() => Linking.openSettings()); }}>
          <Text style={styles.actionText}>기기 설정 열기 ›</Text>
        </Pressable> : null}
        <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} style={styles.settingsLink}>
          <Text style={styles.caption}>개인정보 처리방침 ›</Text>
        </Pressable>
      </View>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
    </ScrollView>
    <View style={styles.footer}>
      <PaceButton label={from === 'settings' ? '확인' : '확인하고 계속하기'} loading={busy} onPress={() => { void finish(); }} />
    </View>
  </SafeAreaView>;
}

function PermissionRow({ icon, title, detail, children }: Readonly<{
  icon: string; title: string; detail: string; children?: React.ReactNode;
}>) {
  return <View style={styles.row}>
    <View style={styles.icon}><Text accessible={false} style={styles.iconText}>{icon}</Text></View>
    <View style={styles.copy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.body}>{detail}</Text></View>
    {children}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  header: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 20 },
  intro: { paddingVertical: 20, gap: 10 },
  title: { color: C.text, fontSize: 24, fontWeight: '700', lineHeight: 33 },
  heading: { color: C.text, fontSize: 17, fontWeight: '700' },
  body: { color: C.muted, fontSize: 13, lineHeight: 21 },
  caption: { color: C.subtle, fontSize: 12, lineHeight: 20 },
  section: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingVertical: 20, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#252E1B', alignItems: 'center', justifyContent: 'center' },
  iconText: { color: C.accent, fontSize: 22 },
  copy: { flex: 1, gap: 4 },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: '600' },
  rowAction: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  settingsLink: { minHeight: 44, justifyContent: 'center' },
  message: { color: C.muted, fontSize: 13, lineHeight: 22 },
  footer: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
});
