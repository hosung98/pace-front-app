import { API_BASE_URL } from '@/constants/api';
import { accessToken, clearSession, getSessionState, requireUserId } from '@/features/auth/session-store';
import { ApiError, requestJson } from './api-transport';

function assertAccount(userId: string) {
  if (getSessionState().session?.user.id !== userId) throw new Error('계정이 변경됐어요. 다시 시도해 주세요.');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const userId = requireUserId();
  const send = (token: string) => requestJson<T>(API_BASE_URL, path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  let token = await accessToken();
  assertAccount(userId);
  try {
    const result = await send(token);
    assertAccount(userId);
    return result;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    assertAccount(userId);
    // 다른 요청이 이미 토큰을 회전했다면 새 토큰을 재사용합니다.
    const latest = await accessToken();
    token = latest === token ? await accessToken(true) : latest;
    assertAccount(userId);
    try {
      const result = await send(token);
      assertAccount(userId);
      return result;
    } catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401 && getSessionState().session?.user.id === userId) await clearSession();
      throw retryError;
    }
  }
}
