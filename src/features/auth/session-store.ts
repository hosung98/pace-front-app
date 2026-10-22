import { useSyncExternalStore } from 'react';

import { API_BASE_URL } from '@/constants/api';
import { ApiError, requestJson } from '@/lib/api-transport';
import { readSession, removeSession, writeSession } from './session-storage';

export type SessionUser = { id: string; nickname: string; profileImageUrl: string | null };
export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  user: SessionUser;
  isNewUser: boolean;
};
type Session = AuthTokens & { expiresAt: number };
type State = { ready: boolean; session: Session | null; error: string | null };
let state: State = { ready: false, session: null, error: null };
const listeners = new Set<() => void>();
let initialization: Promise<void> | null = null;
let refresh: { session: Session; promise: Promise<Session> } | null = null;
let revision = 0;
let persistence = Promise.resolve();

function publish(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

function persist(operation: () => Promise<void>) {
  const result = persistence.then(operation);
  persistence = result.catch(() => {});
  return result;
}

function validate(value: AuthTokens): void {
  if (!value || typeof value.accessToken !== 'string' || typeof value.refreshToken !== 'string'
      || !value.user || typeof value.user.id !== 'string' || typeof value.user.nickname !== 'string'
      || !Number.isFinite(value.accessTokenExpiresIn) || value.accessTokenExpiresIn <= 0) {
    throw new Error('인증 응답이 올바르지 않아요. 다시 로그인해 주세요.');
  }
}

export function initializeSession(): Promise<void> {
  initialization ??= (async () => {
    try {
      const stored = await readSession();
      const session: Session | null = stored ? JSON.parse(stored) : null;
      if (session) {
        validate(session);
        if (!Number.isFinite(session.expiresAt)) throw new Error('저장된 로그인 정보가 올바르지 않아요.');
      }
      publish({ ready: true, session, error: null });
    } catch (error) {
      console.error('로그인 정보 복원 실패', error);
      publish({ ready: true, session: null, error: '로그인 정보를 불러오지 못했어요. 다시 로그인해 주세요.' });
    }
  })();
  return initialization;
}

export const getSessionState = () => state;
export const subscribeSession = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const useSession = () => useSyncExternalStore(subscribeSession, getSessionState, getSessionState);

export async function acceptSession(tokens: AuthTokens): Promise<void> {
  validate(tokens);
  const session = { ...tokens, expiresAt: Date.now() + tokens.accessTokenExpiresIn * 1000 };
  const expected = ++revision;
  try {
    await persist(() => writeSession(JSON.stringify(session)));
  } catch (error) {
    if (revision === expected) {
      revision++;
      publish({ ready: true, session: null, error: null });
      await persist(removeSession);
    }
    throw error;
  }
  if (revision !== expected) throw new Error('로그인 상태가 변경됐어요. 다시 로그인해 주세요.');
  publish({ ready: true, session, error: null });
}

export async function clearSession(error: string | null = null): Promise<void> {
  const expected = ++revision;
  publish({ ready: true, session: null, error });
  try {
    await persist(removeSession);
  } catch (error) {
    if (revision === expected) {
      publish({ ready: true, session: null, error: '기기에 저장된 로그인 정보를 지우지 못했어요. 앱을 다시 열기 전에 저장 공간을 확인해 주세요.' });
    }
    throw error;
  }
}

export function requireUserId(): string {
  const id = state.session?.user.id;
  if (!id) throw new ApiError('로그인이 필요해요.', 401, 'UNAUTHORIZED');
  return id;
}

export async function accessToken(force = false): Promise<string> {
  await initializeSession();
  const current = state.session;
  if (!current) throw new ApiError('다시 로그인해 주세요.', 401, 'UNAUTHORIZED');
  if (refresh?.session === current) return (await refresh.promise).accessToken;
  if (!force && current.expiresAt > Date.now() + 60_000) return current.accessToken;
  const expectedRevision = revision;
  const operation = (async () => {
    let receivedTokens = false;
    try {
      const tokens = await requestJson<AuthTokens>(API_BASE_URL, '/auth/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      receivedTokens = true;
      validate(tokens);
      if (revision !== expectedRevision) throw new Error('로그인 상태가 변경됐어요. 다시 시도해 주세요.');
      await acceptSession(tokens);
      const session = state.session;
      if (!session) throw new Error('로그인이 종료됐어요.');
      return session;
    } catch (error) {
      if (revision === expectedRevision && (receivedTokens || (error instanceof ApiError && error.status === 401))) {
        await clearSession();
      }
      throw error;
    } finally {
      if (refresh?.session === current) refresh = null;
    }
  })();
  refresh = { session: current, promise: operation };
  return (await operation).accessToken;
}
