import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  type ScrollView,
} from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

import { onboardingSlides } from './onboarding-content';

export function useOnboardingPager() {
  const [page, setPage] = useState(0);
  const reduceMotion = useReducedMotion() !== false;
  const [entrance] = useState(() => new Animated.Value(1));
  const [drag] = useState(() => new Animated.Value(0));
  const scrollRef = useRef<ScrollView>(null);
  const isLastSlide = page === onboardingSlides.length - 1;

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    drag.setValue(0);

    if (reduceMotion) {
      entrance.setValue(1);
      return;
    }

    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();

    return () => animation.stop();
  }, [page, reduceMotion, entrance, drag]);

  const swipePanHandlers = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dx) > 18 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
        onPanResponderGrant: () => drag.stopAnimation(),
        onPanResponderMove: (_, gesture) => {
          if (!reduceMotion) {
            drag.setValue(Math.max(-90, Math.min(90, gesture.dx * 0.35)));
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (
            Math.abs(gesture.dx) > 50 &&
            Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5
          ) {
            setPage((currentPage) =>
              Math.max(
                0,
                Math.min(
                  onboardingSlides.length - 1,
                  currentPage + (gesture.dx < 0 ? 1 : -1),
                ),
              ),
            );
          }

          Animated.timing(drag, {
            toValue: 0,
            duration: reduceMotion ? 0 : 180,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        },
        onPanResponderTerminate: () => drag.setValue(0),
      }).panHandlers,
    [drag, reduceMotion],
  );

  const advancePage = () => {
    setPage((currentPage) =>
      currentPage === onboardingSlides.length - 1 ? 0 : currentPage + 1,
    );
  };

  const skipToLastPage = () => {
    setPage(onboardingSlides.length - 1);
  };

  return {
    advancePage,
    drag,
    entrance,
    isLastSlide,
    page,
    scrollRef,
    setPage,
    skipToLastPage,
    swipePanHandlers,
  };
}
