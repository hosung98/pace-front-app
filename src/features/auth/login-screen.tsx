import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceMark } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { PaceErrorDialog } from '@/components/pace-feedback';
import { API_BASE_URL } from '@/constants/api';
import { claimGuestRuns, syncCompletedRuns } from '@/data/completed-runs-repository';
import { readActiveRun } from '@/data/active-run-store';
import { errorMessage, requestJson } from '@/lib/api-transport';
import { googleIdToken } from './google-login';
import { acceptSession, useSession, type AuthTokens } from './session-store';

export function LoginScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const signIn = async () => {
    setBusy(true);
    try {
      if (await readActiveRun()) throw new Error('러닝을 종료하고 저장한 뒤 로그인해 주세요.');
      if (!session) {
        const idToken = await googleIdToken();
        if (!idToken) return;
        const tokens = await requestJson<AuthTokens>(API_BASE_URL, '/auth/google', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
        });
        await acceptSession(tokens);
      }
      try {
        await claimGuestRuns();
        await syncCompletedRuns();
      } catch (error) {
        console.warn('로그인 후 기기 기록 동기화 실패', error);
        setFailure(`로그인은 완료했어요. 기기 기록은 보관 중이며 기록 화면에서 다시 동기화할 수 있어요. ${errorMessage(error, '')}`);
        return;
      }
      router.replace('/main');
    } catch (error) {
      console.error('로그인 실패', error);
      setFailure(errorMessage(error, 'Google 로그인에 실패했어요. 다시 시도해 주세요.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <BackHeader />

          <View style={styles.intro}>
            <View style={styles.markFrame}>
              <PaceMark size={36} />
            </View>
            <Text style={styles.eyebrow}>YOUR PACE, YOUR WAY</Text>
            <Text style={styles.title}>나만의 페이스로,{'\n'}함께 달려요.</Text>
            <Text style={styles.description}>
              Google 계정으로 로그인하고 러닝 기록을 이어가세요.
            </Text>
          </View>

          <View style={styles.loginOptions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Google로 계속하기"
                disabled={busy}
                accessibilityState={{ disabled: busy }}
                onPress={() => { void signIn(); }}
                style={({ pressed }) => [
                  styles.providerButton,
                  styles.google,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.providerText,
                    styles.googleText,
                  ]}>
                  {busy ? '로그인 중…' : 'Google로 계속하기'}
                </Text>
              </Pressable>
            <Text
              accessibilityLiveRegion="polite"
              style={styles.statusMessage}>
              현재 Google 로그인은 iOS 앱에서 지원해요.{'\n'}카카오·Apple 로그인은 준비 중이에요.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => router.push('/main')}
            style={({ pressed }) => [
              styles.previewButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.previewButtonText}>{session ? '메인 화면으로' : '로그인 없이 기기에서 사용하기'}</Text>
            <Text style={styles.previewButtonArrow}>→</Text>
          </Pressable>

          <Text style={styles.legalNotice}>
            로그인하면 이 기기의 미연결 러닝 기록과 GPS 경로를 해당 계정의 서버에 전송해요.
            개발 API는 Tailscale 연결이 필요해요. 정식 출시 전 이용약관·개인정보 처리방침이 제공될 예정이에요.
          </Text>
        </View>
      </ScrollView>
      <PaceErrorDialog message={failure} onClose={() => {
        setFailure(null);
        if (session) router.replace('/main');
      }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  intro: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 42,
  },
  markFrame: {
    width: 72,
    height: 72,
    marginBottom: 28,
    borderRadius: 24,
    backgroundColor: C.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  eyebrow: {
    color: C.accent,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2.4,
  },
  title: {
    marginTop: 16,
    color: C.text,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 43,
    letterSpacing: -1.2,
    textAlign: 'center',
  },
  description: {
    marginTop: 12,
    color: C.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  loginOptions: {
    gap: 12,
  },
  providerButton: {
    minHeight: 56,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  google: {
    backgroundColor: '#F4F5F0',
  },
  googleText: {
    color: '#202124',
  },
  statusMessage: {
    minHeight: 18,
    marginTop: 6,
    color: C.subtle,
    fontSize: 11,
    textAlign: 'center',
  },
  previewButton: {
    minHeight: 48,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewButtonText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  previewButtonArrow: {
    color: C.accent,
    fontSize: 17,
  },
  legalNotice: {
    marginTop: 32,
    color: C.subtle,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
