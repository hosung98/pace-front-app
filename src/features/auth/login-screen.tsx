import { useCallback, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceBrand } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { PaceErrorDialog } from '@/components/pace-feedback';
import { API_BASE_URL } from '@/constants/api';
import { claimGuestRuns, syncCompletedRuns } from '@/data/completed-runs-repository';
import { readActiveRun } from '@/data/active-run-store';
import { errorMessage, requestJson } from '@/lib/api-transport';
import { googleIdToken } from './google-login';
import { GoogleWebButton } from './google-web-button';
import { acceptSession, useSession, type AuthTokens } from './session-store';
import { appleCredential } from './apple-login';
import { AppleLoginButton } from './apple-login-button';
import { ProviderLoginButton } from './provider-login-button';

export function LoginScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [activeProvider, setActiveProvider] = useState<'google' | 'apple' | null>(null);
  const busy = activeProvider !== null;
  const [failure, setFailure] = useState<string | null>(null);
  const signingIn = useRef(false);
  const appleError = useCallback((error: unknown) => {
    console.error('Apple 로그인 지원 확인 실패', error);
    setFailure('Apple 로그인을 사용할 수 있는지 확인하지 못했어요.');
  }, []);
  const signIn = async (webIdToken?: string, provider: 'google' | 'apple' = 'google') => {
    if (signingIn.current) return;
    signingIn.current = true;
    setActiveProvider(provider);
    try {
      if (await readActiveRun()) throw new Error('러닝을 종료하고 저장한 뒤 로그인해 주세요.');
      if (!session) {
        const apple = provider === 'apple' ? await appleCredential() : null;
        if (provider === 'apple' && !apple) return;
        const credential = apple
          ? { idToken: apple.idToken, nonce: apple.nonce, nickname: apple.nickname }
          : { idToken: webIdToken ?? await googleIdToken() };
        if (!credential?.idToken) return;
        const tokens = await requestJson<AuthTokens>(API_BASE_URL, `/auth/${provider}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credential),
        });
        await acceptSession(tokens, { provider, appleUserId: apple?.appleUserId });
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
      setFailure(errorMessage(error, '로그인에 실패했어요. 다시 시도해 주세요.'));
    } finally {
      signingIn.current = false;
      setActiveProvider(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <BackHeader showBrand={false} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.intro}>
            <View style={styles.brandStage}>
              <View pointerEvents="none" accessible={false} style={styles.trackArt}>
                <View style={styles.outerTrack} />
                <View style={styles.innerTrack} />
                <View style={styles.trackAccent} />
              </View>
              <PaceBrand large />
            </View>
            <Text style={styles.eyebrow}>YOUR PACE, YOUR RUN.</Text>
            <Text style={styles.title}>시작은 가볍게,{'\n'}페이스는 나답게.</Text>
            <Text style={styles.description}>
              오늘의 러닝을 기록하고{'\n'}함께 달리는 즐거움을 만나보세요.
            </Text>
          </View>

          <View style={styles.signInSection}>
          <View style={styles.sectionHeading}>
            <View style={styles.rule} />
            <Text style={styles.sectionLabel}>간편하게 시작하기</Text>
            <View style={styles.rule} />
          </View>
          <View style={styles.loginOptions}>
            {Platform.OS === 'web' && !session ? (
              <GoogleWebButton disabled={busy} onCredential={(idToken) => { void signIn(idToken); }} />
            ) : (
              <ProviderLoginButton provider="google" disabled={busy} loading={activeProvider === 'google'}
                onPress={() => { void signIn(); }} />
            )}
            {Platform.OS === 'ios' && !session ? <AppleLoginButton disabled={busy} loading={activeProvider === 'apple'}
              onPress={() => { void signIn(undefined, 'apple'); }} onError={appleError} /> : null}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => router.push('/main')}
            style={({ pressed }) => [
              styles.previewButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.previewButtonText}>{session ? '메인 화면으로' : '로그인 없이 시작하기'}</Text>
          </Pressable>
          </View>

          <View style={styles.footer}>
          <Text style={styles.legalNotice}>
            로그인 시 기기 러닝·GPS 경로가 해당 계정에 동기화돼요.{'\n'}Google과 Apple 계정은 각각 별도로 관리돼요.
          </Text>
          <View style={styles.legalLinks}>
            <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} style={styles.legalLink}>
              <Text style={styles.legalLinkText}>개인정보 처리방침</Text>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => router.push('/terms')} style={styles.legalLink}>
              <Text style={styles.legalLinkText}>이용약관</Text>
            </Pressable>
          </View>
          <View style={styles.supportLinks}>
            <Pressable accessibilityRole="link" onPress={() => router.push('/support')} style={styles.legalLink}>
              <Text style={styles.versionLink}>도움말 · 문의</Text>
            </Pressable>
            <Text accessible={false} style={styles.linkDot}>·</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/app-update')} style={styles.legalLink}>
              <Text style={styles.versionLink}>앱 정보 · 업데이트</Text>
            </Pressable>
          </View>
          </View>
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
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  header: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24 },
  intro: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 32,
  },
  brandStage: { width: '100%', height: 152, alignItems: 'center', justifyContent: 'center' },
  trackArt: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  outerTrack: { position: 'absolute', width: 270, height: 132, borderRadius: 70, borderWidth: 1,
    borderColor: '#23291C', transform: [{ rotate: '-18deg' }] },
  innerTrack: { position: 'absolute', width: 234, height: 96, borderRadius: 52, borderWidth: 1,
    borderColor: '#1C2118', transform: [{ rotate: '-18deg' }] },
  trackAccent: { position: 'absolute', width: 28, height: 3, borderRadius: 2, backgroundColor: C.accent,
    top: 22, right: 44, transform: [{ rotate: '-18deg' }] },
  eyebrow: { marginTop: 8, color: C.accent, fontSize: 10, fontWeight: '600', letterSpacing: 2 },
  title: {
    marginTop: 18,
    color: C.text,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 41,
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
    gap: 4,
  },
  signInSection: { width: '100%' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  sectionLabel: { color: C.muted, fontSize: 11 },
  footer: { marginTop: 24, alignItems: 'center' },
  supportLinks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 8 },
  linkDot: { color: C.subtle, fontSize: 11 },
  versionLink: { color: C.subtle, fontSize: 11, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 8 },
  legalLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  legalLinkText: { color: C.muted, fontSize: 11 },
  previewButton: {
    minHeight: 48,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewButtonText: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  legalNotice: {
    color: C.subtle,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
