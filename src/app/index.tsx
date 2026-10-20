import { useCallback, useState } from 'react';

import { OnboardingScreen } from '@/features/onboarding/onboarding-screen';
import { PaceSplash } from '@/features/onboarding/pace-splash';

export default function IndexScreen() {
  const [showSplash, setShowSplash] = useState(true);

  const finishSplash = useCallback(() => setShowSplash(false), []);

  return showSplash ? <PaceSplash onFinish={finishSplash} /> : <OnboardingScreen />;
}
