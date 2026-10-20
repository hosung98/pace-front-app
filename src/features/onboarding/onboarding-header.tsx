import { Pressable, StyleSheet, View } from 'react-native';

import { PaceBrand } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

type OnboardingHeaderProps = {
  isLastSlide: boolean;
  onSkip: () => void;
};

export function OnboardingHeader({
  isLastSlide,
  onSkip,
}: OnboardingHeaderProps) {
  return (
    <View style={styles.header}>
      <PaceBrand />
      {isLastSlide ? (
        <View style={styles.headerNote}>
          <View style={styles.tinyDot} />
          <Text style={styles.headerNoteText}>YOUR PACE, YOUR WAY</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="온보딩 건너뛰고 마지막 화면 보기"
          onPress={onSkip}
          style={({ pressed }) => [
            styles.textButton,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 8,
    minHeight: 68,
    gap: 12,
  },
  textButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  skipText: {
    color: C.muted,
    fontSize: 12,
  },
  headerNote: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexShrink: 1,
  },
  tinyDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
  },
  headerNoteText: {
    color: C.muted,
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.65,
  },
});
