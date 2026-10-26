import { api } from '@/lib/api';
import { accessToken, clearSession, getSessionState } from '@/features/auth/session-store';
import { removeAccountRunCache } from './completed-runs-repository';

export type Me = {
  id: string; nickname: string; handle: string | null; bio: string | null;
  profileImageUrl: string | null; profileVisibility: 'public' | 'private';
  linkedProviders: string[]; counts: { runs: number };
};
export type Settings = {
  weeklyGoalMeters: number;
  distanceUnit: 'km' | 'mi';
  timeZone: string;
  profileVisibility: 'public' | 'private';
  notifications: { runReminder: boolean; weeklySummary: boolean; runReminderTime: string; race: boolean; crew: boolean };
};
export type SettingsPatch = Partial<Omit<Settings, 'notifications'>> & {
  notifications?: Partial<Settings['notifications']>;
};

export const getMe = () => api<Me>('/users/me');
export const getSettings = () => api<Settings>('/users/me/settings');
export const patchSettings = (value: SettingsPatch) =>
  api<Settings>('/users/me/settings', { method: 'PATCH', body: JSON.stringify(value) });
export const patchProfile = (value: { nickname?: string; handle?: string | null; bio?: string | null }) =>
  api<Me>('/users/me', { method: 'PATCH', body: JSON.stringify(value) });

export async function logout(): Promise<void> {
  await accessToken();
  const refreshToken = getSessionState().session?.refreshToken;
  if (refreshToken) {
    await api<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  }
  await clearSession();
}

export async function deleteAccount(apple?: { appleAuthorizationCode: string; appleNonce: string }): Promise<void> {
  await api<void>('/users/me', { method: 'DELETE', ...(apple ? { body: JSON.stringify(apple) } : {}) });
  let cleanupError: string | null = null;
  try {
    await removeAccountRunCache();
  } catch (error) {
    console.error('탈퇴 후 기기 캐시 정리 실패', error);
    cleanupError = '서버에 탈퇴를 요청했지만 기기의 러닝 캐시를 지우지 못했어요. 기기 저장 공간을 확인해 주세요.';
  }
  await clearSession(cleanupError);
}
