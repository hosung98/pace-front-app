import { Pressable, StyleSheet, View } from 'react-native';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

import { onboardingSlides } from './onboarding-content';

type OnboardingFooterProps = {
  page: number;
  isLastSlide: boolean;
  wide: boolean;
  onSelectPage: (page: number) => void;
  onAdvance: () => void;
};

export function OnboardingFooter({
  page,
  isLastSlide,
  wide,
  onSelectPage,
  onAdvance,
}: OnboardingFooterProps) {
  return (
    <View style={[styles.footer, wide && styles.wideFooter]}>
      <View style={styles.paginationRow}>
        <View
          style={styles.dots}
          accessibilityRole="tablist"
          accessibilityLabel="온보딩 페이지">
          {onboardingSlides.map((slide, index) => (
            <Pressable
              key={slide.label}
              accessibilityRole="tab"
              accessibilityLabel={`${index + 1}번째 온보딩: ${slide.label}`}
              accessibilityState={{ selected: index === page }}
              onPress={() => onSelectPage(index)}
              style={styles.dotTarget}>
              <View
                style={[
                  styles.dot,
                  index === page && styles.activeDot,
                ]}
              />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isLastSlide ? '온보딩 처음부터 다시 보기' : '다음 온보딩'
          }
          onPress={onAdvance}
          style={({ pressed }) => [
            styles.nextButton,
            isLastSlide && styles.replayButton,
            pressed && styles.pressed,
          ]}>
          <Text
            style={[
              styles.nextText,
              isLastSlide && styles.replayText,
            ]}>
            {isLastSlide ? '처음부터 다시 보기' : '다음'}
          </Text>
          <Text
            style={[
              styles.nextArrow,
              isLastSlide && styles.replayText,
            ]}>
            {isLastSlide ? '↺' : '→'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.footerNote}>
        {isLastSlide ? '우리의 첫 러닝, 곧 만나요.' : 'EVERY PACE MATTERS.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 20,
    paddingTop: 4,
  },
  wideFooter: {
    width: 420,
    alignSelf: 'flex-end',
    marginRight: 10,
  },
  paginationRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotTarget: {
    minWidth: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 5,
    width: 5,
    borderRadius: 3,
    backgroundColor: '#3F4447',
  },
  activeDot: {
    width: 22,
    backgroundColor: C.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  nextButton: {
    flex: 1,
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 16,
    backgroundColor: C.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  nextText: {
    color: C.accentInk,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  nextArrow: {
    color: C.accentInk,
    fontSize: 22,
    lineHeight: 24,
  },
  replayButton: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  replayText: {
    color: C.text,
  },
  footerNote: {
    color: C.subtle,
    fontSize: 8,
    letterSpacing: 1.8,
    textAlign: 'center',
    marginTop: 17,
    marginBottom: 7,
  },
  pressed: {
    opacity: 0.65,
  },
});
