import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { PaceBrand, PaceMark } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

type PaceLoadingStateProps = Readonly<{ label?: string }>;

const MIN_LOADING_OFFSET = 24;

/** Logo + label placed at the vertical center of the window, wherever the state is rendered. */
export function PaceLoadingState({ label = '불러오는 중' }: PaceLoadingStateProps) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();
  const [top, setTop] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const paddingTop = top === null
    ? MIN_LOADING_OFFSET
    : Math.max(MIN_LOADING_OFFSET, windowHeight / 2 - top - contentHeight / 2);

  const measureTop = () => {
    containerRef.current?.measureInWindow((_x, y) => setTop(y));
  };

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 160);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      ref={containerRef}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      onLayout={measureTop}
      style={[styles.loading, { paddingTop }]}>
      <View style={{ opacity: visible ? 1 : 0 }} onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}>
        <View style={styles.loadingLogo}>
          <PaceBrand />
        </View>
        <Text style={styles.loadingLabel}>{label}</Text>
      </View>
    </View>
  );
}

export function PaceQueryState({ loading, message, onRetry }: Readonly<{
  loading: boolean;
  message: string | null;
  onRetry: () => void;
}>) {
  if (loading) return <PaceLoadingState />;
  return (
    <View style={styles.queryError}>
      <Text style={styles.errorTitle}>정보를 불러오지 못했어요</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>다시 시도</Text>
      </Pressable>
    </View>
  );
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
  queryError: { marginTop: 20, padding: 24, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center' },
  loading: { paddingBottom: MIN_LOADING_OFFSET },
  loadingLogo: { alignSelf: 'center' },
  loadingLabel: { marginTop: 13, color: C.muted, fontSize: 11, textAlign: 'center' },
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
