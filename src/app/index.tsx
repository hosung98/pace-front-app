import { useCallback, useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { OnboardingScreen } from '@/features/onboarding/onboarding-screen';
import { PaceSplash } from '@/features/onboarding/pace-splash';
import { completeOnboarding, hasCompletedOnboarding } from '@/data/onboarding-repository';
import { useSession } from '@/features/auth/session-store';
import { PaceQueryState } from '@/components/pace-feedback';

export default function IndexScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const { session } = useSession();
  const [attempt, setAttempt] = useState(0);
  const userId = session?.user.id;
  useEffect(() => {
    let active = true;
    hasCompletedOnboarding()
      .then(async (value) => {
        if (userId && !value) await completeOnboarding();
        if (active) setCompleted(value || Boolean(userId));
      })
      .catch((error: unknown) => {
        console.error('온보딩 상태 조회 실패', error);
        if (active) setFailure('시작 정보를 불러오지 못했어요. 다시 시도해 주세요.');
      });
    return () => { active = false; };
  }, [attempt, userId]);

  const finishSplash = useCallback(() => setShowSplash(false), []);

  if (showSplash) return <PaceSplash onFinish={finishSplash} />;
  if (completed === null) return <View style={{ flex: 1, padding: 24, backgroundColor: '#0C0D0F' }}>
    <PaceQueryState loading={!failure} message={failure} onRetry={() => { setFailure(null); setAttempt((value) => value + 1); }} />
  </View>;
  if (session) return <Redirect href="/main" />;
  return completed ? <Redirect href="/login" /> : <OnboardingScreen />;
}
