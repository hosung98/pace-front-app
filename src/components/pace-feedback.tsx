import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { PaceBrand, PaceMark } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

type PaceLoadingStateProps = Readonly<{ label?: string }>;

export function PaceLoadingState({ label = '불러오는 중' }: PaceLoadingStateProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const logoStyle = {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
    transform: [
      {
        scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
      },
    ],
  };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.loading}>
      <Animated.View style={[styles.loadingLogo, logoStyle]}>
        <PaceBrand />
      </Animated.View>
      <Text style={styles.loadingLabel}>{label}</Text>
      <View style={styles.skeletonCard}>
        <SkeletonLine width="44%" height={12} />
        <SkeletonLine width="72%" height={24} style={styles.skeletonGap} />
        <View style={styles.skeletonMetrics}>
          <SkeletonLine width="25%" height={34} />
          <SkeletonLine width="25%" height={34} />
          <SkeletonLine width="25%" height={34} />
        </View>
      </View>
      <View style={styles.skeletonCard}>
        <SkeletonLine width="38%" height={12} />
        <SkeletonLine width="88%" height={10} style={styles.skeletonGap} />
        <SkeletonLine width="63%" height={10} style={styles.skeletonGapSmall} />
      </View>
    </View>
  );
}

export function SkeletonLine({
  width,
  height,
  style,
}: Readonly<{
  width: `${number}%`;
  height: number;
  style?: ViewStyle;
}>) {
  return <View style={[styles.skeletonLine, { width, height }, style]} />;
}

export function PaceErrorDialog({
  message,
  onClose,
  title = '문제가 발생했어요',
}: Readonly<{
  message: string | null;
  onClose: () => void;
  title?: string;
}>) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={message !== null}>
      <View style={styles.backdrop}>
        <View accessibilityRole="alert" style={styles.dialog}>
          <View style={styles.errorMark}>
            <PaceMark size={24} />
          </View>
          <Text style={styles.errorTitle}>{title}</Text>
          <Text style={styles.errorMessage}>{message}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <Text style={styles.closeButtonText}>확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loading: { gap: 13 },
  loadingLogo: { alignSelf: 'center' },
  loadingLabel: { color: C.muted, fontSize: 11, textAlign: 'center' },
  skeletonCard: {
    marginTop: 3,
    padding: 18,
    borderRadius: 18,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  skeletonLine: { borderRadius: 8, backgroundColor: C.raised },
  skeletonGap: { marginTop: 16 },
  skeletonGapSmall: { marginTop: 9 },
  skeletonMetrics: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backdrop: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000AA',
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: 24,
    borderRadius: 22,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  errorMark: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#252E1B',
  },
  errorTitle: { marginTop: 16, color: C.text, fontSize: 16, fontWeight: '700' },
  errorMessage: {
    marginTop: 8,
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
  closeButton: {
    minWidth: 120,
    minHeight: 46,
    marginTop: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: C.accent,
  },
  closeButtonText: { color: C.accentInk, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
