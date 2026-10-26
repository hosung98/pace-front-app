import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
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
      {loading ? <ActivityIndicator size="small" color="#000000" /> : (
        <Image source={provider === 'apple' ? require('@/assets/images/apple-login-logo.svg')
          : require('@/assets/images/google-logo.png')}
        style={provider === 'apple' ? styles.appleIcon : styles.googleIcon}
        contentFit="contain" accessible={false} />
      )}
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  touchTarget: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center' },
  button: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center' },
  appleIcon: { width: 31, height: 44 },
  googleIcon: { width: 24, height: 24 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
