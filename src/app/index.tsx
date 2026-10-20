import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { OnboardingScreen } from '@/features/onboarding/onboarding-screen';
import { PaceSplash } from '@/features/onboarding/pace-splash';

export default function IndexScreen() {
  const [showSplash, setShowSplash] = useState(true);

  const finishSplash = useCallback(() => setShowSplash(false), []);

  if (Platform.OS === 'web') return <OnboardingScreen />;

  return showSplash ? <PaceSplash onFinish={finishSplash} /> : <OnboardingScreen />;
}
