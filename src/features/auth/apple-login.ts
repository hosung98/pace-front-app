import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

export const isAppleLoginAvailable = AppleAuthentication.isAvailableAsync;
export async function appleCredential() {
  const nonce = Crypto.randomUUID();
  const state = Crypto.randomUUID();
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce),
      state,
    });
    if (credential.state !== state || !credential.identityToken) {
      throw new Error('Apple 인증 응답을 확인하지 못했어요. 다시 로그인해 주세요.');
    }
    const name = credential.fullName
      ? [credential.fullName.familyName, credential.fullName.givenName].filter(Boolean).join('').slice(0, 20)
      : undefined;
    const nickname = name && name.trim().length >= 2 ? name.trim() : undefined;
    return { idToken: credential.identityToken, nonce, nickname,
      appleUserId: credential.user, authorizationCode: credential.authorizationCode };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') return null;
    throw error;
  }
}
