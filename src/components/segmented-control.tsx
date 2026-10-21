import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

type SegmentedControlProps<T extends string> = Readonly<{
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}>;

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.segment, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.button, selected && styles.active]}>
            <Text style={[styles.text, selected && styles.activeText]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { padding: 4, flexDirection: 'row', borderRadius: 12, backgroundColor: C.surface },
  button: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  active: { backgroundColor: C.raised },
  text: { color: C.subtle, fontSize: 12, fontWeight: '600' },
  activeText: { color: C.accent },
});
