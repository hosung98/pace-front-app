import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { PaceIcon } from '@/components/pace-icon';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

/** Search-bar–looking button that opens a dedicated search screen. */
export function SearchEntry({
  label,
  onPress,
  style,
}: Readonly<{ label: string; onPress: () => void; style?: StyleProp<ViewStyle> }>) {
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.entry, pressed && styles.pressed, style]}>
      <PaceIcon name="search" color={C.subtle} size={18} />
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  entry: {
    minHeight: 48,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 15,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  pressed: { opacity: 0.8 },
  label: { flex: 1, color: C.subtle, fontSize: 13 },
  chevron: { color: C.subtle, fontSize: 20, lineHeight: 22 },
});
