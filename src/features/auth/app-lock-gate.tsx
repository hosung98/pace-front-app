import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PaceBrand } from '@/components/pace-brand';
import { PaceButton } from '@/components/pace-button';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { authenticateDevice, isAppLockEnabled, isDeviceAuthenticationInProgress, supportsAppLock } from './app-lock';
import { errorMessage } from '@/lib/api-transport';

export function AppLockGate({ userId, children }: Readonly<{ userId?: string; children: ReactNode }>) {
  if (!supportsAppLock) return <>{children}</>;
  return <AccountLock key={userId ?? 'guest'} userId={userId}>{children}</AccountLock>;
}

function AccountLock({ userId, children }: Readonly<{ userId?: string; children: ReactNode }>) {
  const [checked, setChecked] = useState(!userId);
  const [locked, setLocked] = useState(Boolean(userId));
  const [admitted, setAdmitted] = useState(!userId);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const prompting = useRef(false);
  const mounted = useRef(true);
  const checks = useRef({ version: 0 });
  useEffect(() => {
    mounted.current = true;
    let active = true;
    let away = false;
    const checkState = checks.current;
    const check = async () => {
      const version = ++checkState.version;
      try {
        const enabled = userId ? await isAppLockEnabled(userId) : false;
        if (active && version === checkState.version) {
          setLocked(enabled);
          if (!enabled) setAdmitted(true);
          setChecked(true);
          setFailure(null);
        }
      } catch (error) {
        console.error('앱 잠금 설정 조회 실패', error);
        if (active && version === checkState.version) {
          setLocked(true);
          setChecked(false);
          setFailure('잠금 설정을 불러오지 못했어요. 다시 확인해 주세요.');
        }
      }
    };
    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (!userId) return;
      if (state !== 'active') {
        if (prompting.current || isDeviceAuthenticationInProgress()) return;
        away = true;
        checkState.version++;
        setLocked(true);
      } else if (away) { away = false; void check(); }
    });
    return () => {
      active = false;
      mounted.current = false;
      checkState.version++;
      subscription.remove();
    };
  }, [userId, attempt]);
  const unlock = async () => {
    if (prompting.current || !checked) return;
    prompting.current = true;
    setBusy(true);
    try {
      await authenticateDevice();
      if (mounted.current) {
        checks.current.version++;
        setLocked(false);
        setAdmitted(true);
        setFailure(null);
      }
    } catch (error) {
      if (mounted.current) setFailure(errorMessage(error, '잠금 해제에 실패했어요.'));
    } finally {
      prompting.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <View style={styles.root}>
      {admitted ? children : null}
      <Modal visible={locked} animationType="none" presentationStyle="fullScreen" onRequestClose={() => {}}>
        <SafeAreaView style={styles.root}>
          <View style={styles.content}>
            <PaceBrand />
            <Text style={styles.title}>나의 PACE 잠금 해제</Text>
            <Text style={styles.description}>Face ID·Touch ID 또는 iPhone 기기 암호로 계정을 보호해요. 로그아웃하거나 세션이 만료되면 소셜 로그인이 필요해요.</Text>
            {failure ? <Text accessibilityRole="alert" style={styles.description}>{failure}</Text> : null}
            <PaceButton label={checked ? '잠금 해제' : failure ? '잠금 설정 다시 확인' : '잠금 설정 확인 중'}
              disabled={!checked && !failure} loading={busy}
              onPress={() => {
                if (checked) void unlock();
                else { setFailure(null); setAttempt((value) => value + 1); }
              }} />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  content: { flex: 1, justifyContent: 'center', gap: 24, padding: 28, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { color: C.text, fontSize: 24, fontWeight: '700' },
  description: { color: C.muted, fontSize: 13, lineHeight: 22 },
});
