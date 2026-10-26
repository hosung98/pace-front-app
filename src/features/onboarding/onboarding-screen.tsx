import { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaceColors as C } from '@/constants/pace';
import { completeOnboarding } from '@/data/onboarding-repository';
import { PaceErrorDialog } from '@/components/pace-feedback';

import { onboardingSlides } from './onboarding-content';
import { OnboardingFooter } from './onboarding-footer';
import { OnboardingHeader } from './onboarding-header';
import { OnboardingSlideContent } from './onboarding-slide-content';
import { useOnboardingPager } from './use-onboarding-pager';

export function OnboardingScreen() {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(height - 240);
  const [copyHeight, setCopyHeight] = useState(230);
  const {
    advancePage,
    drag,
    entrance,
    isLastSlide,
    page,
    scrollRef,
    setPage,
    skipToLastPage,
    swipePanHandlers,
  } = useOnboardingPager();

  const isWideLayout = width >= 900;
  const isCompactLayout = contentHeight < 540;
  const availableArtHeight =
    contentHeight - 24 - (isCompactLayout ? 42 : 59) - copyHeight;
  const artHeight = Math.max(72, availableArtHeight);
  const mobileArtWidth = Math.min(400, (artHeight * 360) / 390);
  const artWidth = Math.min(
    width - 32,
    isWideLayout ? 410 : mobileArtWidth,
  );
  const needsScroll = !isWideLayout && availableArtHeight < 72;
  const slide = onboardingSlides[page];

  const handleAdvance = async () => {
    if (saving.current) return;
    if (isLastSlide) {
      saving.current = true;
      setBusy(true);
      try {
        await completeOnboarding();
        router.replace('/permissions');
      } catch (error) {
        console.error('온보딩 완료 저장 실패', error);
        setFailure('시작 정보를 저장하지 못했어요. 다시 시도해 주세요.');
      } finally { saving.current = false; setBusy(false); }
      return;
    }

    advancePage();
  };

  return (
    <SafeAreaView
      style={styles.screen}
      edges={
        Platform.OS === 'web'
          ? ['top', 'right', 'left']
          : ['top', 'right', 'bottom', 'left']
      }>
      <View style={[styles.shell, isWideLayout && styles.wideShell]}>
        <OnboardingHeader
          isLastSlide={isLastSlide}
          onSkip={skipToLastPage}
        />

        <View
          {...swipePanHandlers}
          style={styles.swipeArea}
          testID="onboarding-swipe-area"
          onLayout={({ nativeEvent }) =>
            setContentHeight(nativeEvent.layout.height)
          }>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            scrollEnabled={needsScroll}
            bounces={false}
            showsVerticalScrollIndicator={false}
            testID="onboarding-content">
            <Animated.View
              style={[
                styles.content,
                isWideLayout && styles.wideContent,
                {
                  opacity: entrance,
                  transform: [
                    { translateX: drag },
                    {
                      translateY: entrance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                },
              ]}>
              <OnboardingSlideContent
                page={page}
                slide={slide}
                artWidth={artWidth}
                compact={isCompactLayout}
                wide={isWideLayout}
                narrow={width < 360}
                onCopyLayout={({ nativeEvent }) =>
                  setCopyHeight(nativeEvent.layout.height)
                }
              />
            </Animated.View>
          </ScrollView>
        </View>

        <OnboardingFooter
          busy={busy}
          page={page}
          isLastSlide={isLastSlide}
          wide={isWideLayout}
          onSelectPage={setPage}
          onAdvance={() => { void handleAdvance(); }}
        />
      </View>
      <PaceErrorDialog message={failure} onClose={() => setFailure(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  wideShell: {
    maxWidth: 1120,
  },
  scroll: {
    flex: 1,
  },
  swipeArea: {
    flex: 1,
    overflow: 'hidden',
    touchAction: 'pan-y',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 12,
  },
  wideContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 62,
    paddingVertical: 32,
    paddingHorizontal: 28,
  },
});
