import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

import {
  onboardingSlides,
  type OnboardingSlide,
} from './onboarding-content';
import { OnboardingArt } from './onboarding-art';

type OnboardingSlideContentProps = {
  page: number;
  slide: OnboardingSlide;
  artWidth: number;
  compact: boolean;
  wide: boolean;
  narrow: boolean;
  onCopyLayout: (event: LayoutChangeEvent) => void;
};

export function OnboardingSlideContent({
  page,
  slide,
  artWidth,
  compact,
  wide,
  narrow,
  onCopyLayout,
}: OnboardingSlideContentProps) {
  return (
    <>
      <View
        style={[
          styles.visualSection,
          compact && !wide && styles.compactVisual,
          wide && styles.wideVisual,
        ]}>
        <OnboardingArt page={page} width={artWidth} />
        <Text style={styles.previewNote}>PACE 미리보기 · 예시 데이터</Text>
      </View>

      <View
        style={[styles.copy, wide && styles.wideCopy]}
        onLayout={onCopyLayout}>
        <View style={[styles.chapter, compact && styles.compactChapter]}>
          <Text style={styles.chapterNumber}>
            {String(page + 1).padStart(2, '0')}
          </Text>
          <View style={styles.chapterLine} />
          <Text style={styles.chapterLabel}>{slide.label}</Text>
        </View>

        <View
          accessibilityLiveRegion="polite"
          accessible
          accessibilityLabel={`${page + 1} / ${onboardingSlides.length}. ${slide.title.replace('\n', ' ')} ${slide.description.replace('\n', ' ')}`}>
          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              compact && styles.smallTitle,
              narrow && styles.smallTitle,
              wide && styles.wideTitle,
            ]}>
            {slide.title}
          </Text>
          <Text
            style={[
              styles.description,
              compact && styles.compactDescription,
            ]}>
            {slide.description}
          </Text>
        </View>

        <View style={[styles.keywordRow, compact && styles.compactKeywordRow]}>
          <View style={styles.keywordIcon}>
            <Text style={styles.check}>✓</Text>
          </View>
          <Text style={styles.keyword}>{slide.keyword}</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  visualSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 29,
  },
  compactVisual: {
    marginBottom: 12,
  },
  wideVisual: {
    flex: 1,
    marginBottom: 0,
  },
  previewNote: {
    color: C.subtle,
    fontSize: 9,
    letterSpacing: 0.4,
    marginTop: 15,
  },
  copy: {
    paddingHorizontal: 28,
  },
  wideCopy: {
    flex: 1,
    paddingHorizontal: 0,
  },
  chapter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 19,
  },
  compactChapter: {
    marginBottom: 12,
  },
  chapterNumber: {
    color: C.accent,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  chapterLine: {
    width: 23,
    height: 1,
    backgroundColor: '#4A5239',
  },
  chapterLabel: {
    color: C.accent,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '600',
  },
  title: {
    color: C.text,
    fontSize: 28,
    lineHeight: 39,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  smallTitle: {
    fontSize: 24,
    lineHeight: 35,
  },
  wideTitle: {
    fontSize: 34,
    lineHeight: 47,
    letterSpacing: -1.5,
  },
  description: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 23,
    marginTop: 15,
    letterSpacing: -0.2,
  },
  compactDescription: {
    marginTop: 10,
  },
  keywordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 20,
  },
  compactKeywordRow: {
    marginTop: 12,
  },
  keywordIcon: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#252E1B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: C.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  keyword: {
    color: '#C8CCBF',
    fontSize: 11,
    flexShrink: 1,
  },
});
