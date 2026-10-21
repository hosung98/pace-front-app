import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

type ChoiceChipsProps<T extends string | number> = Readonly<{
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Single scrollable row instead of wrapping (for long lists such as regions). */
  scrollable?: boolean;
  size?: 'regular' | 'small';
  style?: StyleProp<ViewStyle>;
}>;

export function ChoiceChips<T extends string | number>({
  options,
  value,
  onChange,
  scrollable = false,
  size = 'regular',
  style,
}: ChoiceChipsProps<T>) {
  const chips = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={String(option.value)}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        onPress={() => onChange(option.value)}
        style={({ pressed }) => [
          styles.chip,
          size === 'small' && styles.chipSmall,
          selected && styles.chipActive,
          pressed && !selected && styles.pressed,
        ]}>
        <Text style={[styles.text, size === 'small' && styles.textSmall, selected && styles.textActive]}>
          {option.label}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="radiogroup"
        style={style}
        contentContainerStyle={styles.row}>
        {chips}
      </ScrollView>
    );
  }

  return (
    <View accessibilityRole="radiogroup" style={[styles.wrap, style]}>
      {chips}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipSmall: { minHeight: 34, paddingHorizontal: 13, borderRadius: 10 },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  pressed: { opacity: 0.75 },
  text: { color: C.muted, fontSize: 13, fontWeight: '600' },
  textSmall: { fontSize: 12 },
  textActive: { color: C.accentInk },
});
