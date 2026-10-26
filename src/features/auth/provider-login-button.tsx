import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

export function ProviderLoginButton({ provider, disabled, loading, onPress }: Readonly<{
  provider: 'google' | 'apple';
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}>) {
  const label = `${provider === 'apple' ? 'Apple' : 'Google'}로 계속하기`;
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled, busy: loading }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.touchTarget, pressed && styles.pressed]}>
    <View style={[styles.button, disabled && !loading && styles.disabled]}>
      <View style={styles.statusSlot} />
      <View style={styles.content}>
        <Image source={provider === 'apple' ? require('@/assets/images/apple-login-logo.svg')
          : require('@/assets/images/google-logo.png')}
        style={provider === 'apple' ? styles.appleIcon : styles.googleIcon}
        contentFit="contain" accessible={false} />
        <Text style={styles.title}>{label}</Text>
      </View>
      <View style={styles.statusSlot}>
        {loading ? <ActivityIndicator size="small" color="#000000" /> : null}
      </View>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  touchTarget: { minHeight: 48, justifyContent: 'center', paddingVertical: 4 },
  button: { minHeight: 40, paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexShrink: 1 },
  title: { color: '#000000', fontSize: 17, fontWeight: '400', lineHeight: 22, flexShrink: 1, paddingVertical: 8 },
  appleIcon: { width: 40 * 31 / 44, height: 40 },
  googleIcon: { width: 20, height: 20, marginHorizontal: (40 * 31 / 44 - 20) / 2 },
  statusSlot: { width: 24, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
