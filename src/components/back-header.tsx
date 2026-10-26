import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PaceBrand } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

/** Back button · PACE logo row used at the top of stack (non-tab) screens. */
export function BackHeader({ backLabel = '이전 화면으로 돌아가기' }: { backLabel?: string }) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      {router.canGoBack() ? <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <Text style={styles.backArrow}>‹</Text>
      </Pressable> : <View style={styles.spacer} />}
      <PaceBrand />
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { color: C.text, fontSize: 31, lineHeight: 34 },
  spacer: { width: 42 },
  pressed: { opacity: 0.6 },
});
