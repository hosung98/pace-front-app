import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { clearSession, getSessionState, useSession } from './session-store';

export function AppleSessionGuard() {
  const { session } = useSession();
  const appleUserId = session?.provider === 'apple' ? session.appleUserId : undefined;
  const accountId = session?.user.id;
  useEffect(() => {
    if (Platform.OS !== 'ios' || !appleUserId) return;
    let active = true;
    const revoke = async () => {
      if (!active || getSessionState().session?.user.id !== accountId
          || getSessionState().session?.appleUserId !== appleUserId) return;
      await clearSession('Apple 계정 연결이 해제됐어요. 다시 로그인해 주세요.');
    };
    const check = async () => {
      try {
        const state = await AppleAuthentication.getCredentialStateAsync(appleUserId);
        if (state === AppleAuthentication.AppleAuthenticationCredentialState.REVOKED
            || state === AppleAuthentication.AppleAuthenticationCredentialState.NOT_FOUND
            || state === AppleAuthentication.AppleAuthenticationCredentialState.TRANSFERRED) await revoke();
      } catch (error) {
        console.error('Apple 계정 연결 상태 확인 실패', error);
      }
    };
    void check();
    const subscription = AppleAuthentication.addRevokeListener(() => {
      void revoke().catch((error: unknown) => { console.error('Apple 연결 해제 후 세션 정리 실패', error); });
    });
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') void check(); });
    return () => { active = false; subscription.remove(); appState.remove(); };
  }, [appleUserId, accountId]);
  return null;
}
