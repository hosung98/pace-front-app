import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaceBrand, PaceMark } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

const loginProviders = [
  {
    id: 'google',
    label: 'Google로 계속하기',
    buttonStyle: 'google' as const,
    textStyle: 'googleText' as const,
  },
  {
    id: 'kakao',
    label: '카카오로 계속하기',
    buttonStyle: 'kakao' as const,
    textStyle: 'kakaoText' as const,
  },
  {
    id: 'apple',
    label: 'Apple로 계속하기',
    buttonStyle: 'apple' as const,
    textStyle: 'appleText' as const,
  },
] as const;

type LoginProvider = (typeof loginProviders)[number]['id'];

const providerNames: Record<LoginProvider, string> = {
  google: 'Google',
  kakao: '카카오',
  apple: 'Apple',
};

export function LoginScreen() {
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] =
    useState<LoginProvider | null>(null);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 화면으로 돌아가기"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
            <PaceBrand />
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.intro}>
            <View style={styles.markFrame}>
              <PaceMark size={36} />
            </View>
            <Text style={styles.eyebrow}>YOUR PACE, YOUR WAY</Text>
            <Text style={styles.title}>나만의 페이스로,{'\n'}함께 달려요.</Text>
            <Text style={styles.description}>
              간편하게 로그인하고 PACE를 시작해 보세요.
            </Text>
          </View>

          <View style={styles.loginOptions}>
            {loginProviders.map((provider) => (
              <Pressable
                key={provider.id}
                accessibilityRole="button"
                accessibilityLabel={provider.label}
                onPress={() => setSelectedProvider(provider.id)}
                style={({ pressed }) => [
                  styles.providerButton,
                  styles[provider.buttonStyle],
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.providerText,
                    styles[provider.textStyle],
                  ]}>
                  {provider.label}
                </Text>
              </Pressable>
            ))}
            <Text
              accessibilityLiveRegion="polite"
              style={styles.statusMessage}>
              {selectedProvider
                ? `${providerNames[selectedProvider]} 로그인은 아직 연결되지 않았어요.`
                : 'Google, 카카오, Apple 계정으로 간편하게'}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/main')}
            style={({ pressed }) => [
              styles.previewButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.previewButtonText}>메인 화면 미리보기</Text>
            <Text style={styles.previewButtonArrow}>→</Text>
          </Pressable>

          <Text style={styles.legalNotice}>
            계속 진행하면 PACE의 이용약관 및 개인정보 처리방침에 동의한
            것으로 간주됩니다.
          </Text>
        </View>
      </ScrollView>
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
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  backArrow: {
    color: C.text,
    fontSize: 36,
    lineHeight: 40,
  },
  headerSpacer: {
    width: 44,
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
  kakao: {
    backgroundColor: '#FEE500',
  },
  kakaoText: {
    color: '#191600',
  },
  apple: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  appleText: {
    color: C.text,
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
