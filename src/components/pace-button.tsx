import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

type PaceButtonProps = Readonly<{
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}>;

export function PaceButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  accessibilityHint,
}: PaceButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        inactive && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? C.accentInk : C.text} />
      ) : (
        <Text style={[styles.label, variant === 'primary' ? styles.primaryLabel : variant === 'danger' ? styles.dangerLabel : null]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  primary: { backgroundColor: C.accent },
  secondary: { backgroundColor: C.raised, borderWidth: 1, borderColor: C.border },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#4A2B2B' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  label: { color: C.text, fontSize: 14, fontWeight: '700' },
  primaryLabel: { color: C.accentInk },
  dangerLabel: { color: '#FF8A80' },
});
