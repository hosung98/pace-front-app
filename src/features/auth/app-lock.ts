import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const key = (userId: string) => `pace.lock.v1.${encodeURIComponent(userId)}`;
let authenticating = false;
export const isDeviceAuthenticationInProgress = () => authenticating;
export const supportsAppLock = Platform.OS === 'ios';
export async function isAppLockEnabled(userId: string): Promise<boolean> {
  if (!supportsAppLock) return false;
  const value = await SecureStore.getItemAsync(key(userId));
  if (value !== null && value !== 'enabled') throw new Error('앱 잠금 설정이 올바르지 않아요.');
  return value === 'enabled';
}
export async function authenticateDevice(): Promise<void> {
  if (!supportsAppLock) throw new Error('앱 잠금은 iPhone에서 사용할 수 있어요.');
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) {
    throw new Error('iPhone 설정에서 기기 암호 또는 Face ID·Touch ID를 먼저 설정해 주세요.');
  }
  if (authenticating) throw new Error('인증이 진행 중이에요. 잠시 후 다시 시도해 주세요.');
  authenticating = true;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'PACE 잠금 해제',
      cancelLabel: '취소',
      fallbackLabel: '기기 암호 사용',
      disableDeviceFallback: false,
    });
    if (!result.success) throw new Error('잠금을 해제하지 못했어요. 다시 인증하거나 기기 암호를 사용해 주세요.');
  } finally { authenticating = false; }
}
export async function setAppLockEnabled(userId: string, enabled: boolean): Promise<void> {
  await authenticateDevice();
  if (enabled) await SecureStore.setItemAsync(key(userId), 'enabled');
  else await SecureStore.deleteItemAsync(key(userId));
}
