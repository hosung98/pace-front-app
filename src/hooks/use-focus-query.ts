import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSessionState, useSession } from '@/features/auth/session-store';
import { ApiError } from '@/lib/api-transport';

type FocusQuery<T> = {
  data: T;
  isLoading: boolean;
  errorMessage: string | null;
  setData: (update: T | ((current: T) => T)) => void;
  clearError: () => void;
  reload: () => Promise<void>;
};

/**
 * Loads data every time the screen gains focus (so edits made on other screens show up).
 * `load` must be stable — use a module-level function or useCallback for query parameters.
 */
export function useFocusQuery<T>(
  load: () => Promise<T>,
  initialData: T,
  failureMessage: string,
): FocusQuery<T> {
  const { session } = useSession();
  const userId = session?.user.id;
  const [initial] = useState(() => initialData);
  const [snapshot, setSnapshot] = useState({ userId, data: initialData });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const run = useCallback(
    async (isActive: () => boolean) => {
      const version = ++requestVersion.current;
      const isCurrent = () => requestVersion.current === version
        && isActive() && getSessionState().session?.user.id === userId;
      setIsLoading(true);
      setSnapshot({ userId, data: initial });
      try {
        const result = await load();
        if (isCurrent()) {
          setSnapshot({ userId, data: result });
          setErrorMessage(null);
        }
      } catch (error) {
        console.error(failureMessage, error);
        if (isCurrent()) setErrorMessage(error instanceof ApiError ? error.message : failureMessage);
      } finally {
        if (isCurrent()) setIsLoading(false);
      }
    },
    [load, failureMessage, userId, initial],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void run(() => active);
      return () => {
        active = false;
        requestVersion.current += 1;
      };
    }, [run]),
  );

  return {
    data: snapshot.userId === userId ? snapshot.data : initial,
    isLoading: snapshot.userId !== userId || isLoading,
    errorMessage: snapshot.userId === userId ? errorMessage : null,
    setData: useCallback((update: T | ((current: T) => T)) => {
      setSnapshot((current) => ({
        userId,
        data: typeof update === 'function'
          ? (update as (value: T) => T)(current.userId === userId ? current.data : initial)
          : update,
      }));
    }, [userId, initial]),
    clearError: useCallback(() => setErrorMessage(null), []),
    reload: useCallback(() => run(() => true), [run]),
  };
}
