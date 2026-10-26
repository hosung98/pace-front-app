import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { isAppleLoginAvailable } from './apple-login';

export function AppleLoginButton({ disabled, onPress, onError }: Readonly<{
  disabled: boolean; onPress: () => void; onError: (error: unknown) => void;
}>) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    if (Platform.OS === 'ios') {
      isAppleLoginAvailable().then((value) => { if (active) setAvailable(value); })
        .catch((error: unknown) => { if (active) onError(error); });
    }
    return () => { active = false; };
  }, [onError]);
  if (!available) return null;
  return <View pointerEvents={disabled ? 'none' : 'auto'} accessibilityState={{ disabled }}>
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={14} style={{ width: '100%', height: 56, opacity: disabled ? 0.4 : 1 }}
      onPress={onPress} />
  </View>;
}
