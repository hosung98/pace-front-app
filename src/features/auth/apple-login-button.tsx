import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { isAppleLoginAvailable } from './apple-login';
import { ProviderLoginButton } from './provider-login-button';

export function AppleLoginButton({ disabled, loading, onPress, onError }: Readonly<{
  disabled: boolean; loading: boolean; onPress: () => void; onError: (error: unknown) => void;
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
  return <ProviderLoginButton provider="apple" disabled={disabled} loading={loading} onPress={onPress} />;
}
