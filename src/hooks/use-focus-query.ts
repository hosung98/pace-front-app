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
 * Refreshes on focus without replacing loaded content with a loading screen.
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
  const [snapshot, setSnapshot] = useState({ userId, load, data: initialData });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const resolved = useRef<{ userId: string | undefined; load: () => Promise<T> } | null>(null);

  const run = useCallback(
    async (isActive: () => boolean) => {
      const version = ++requestVersion.current;
      const isCurrent = () => requestVersion.current === version
        && isActive() && getSessionState().session?.user.id === userId;
      setIsLoading(resolved.current?.userId !== userId || resolved.current?.load !== load);
      if (resolved.current?.userId !== userId || resolved.current?.load !== load) resolved.current = null;
      setSnapshot((current) => current.userId === userId && current.load === load
        ? current : { userId, load, data: initial });
      setErrorMessage(null);
      try {
        const result = await load();
        if (isCurrent()) {
          resolved.current = { userId, load };
          setSnapshot({ userId, load, data: result });
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
    data: snapshot.userId === userId && snapshot.load === load ? snapshot.data : initial,
    isLoading: snapshot.userId !== userId || snapshot.load !== load || isLoading,
    errorMessage: snapshot.userId === userId && snapshot.load === load ? errorMessage : null,
    setData: useCallback((update: T | ((current: T) => T)) => {
      setSnapshot((current) => ({
        userId,
        load,
        data: typeof update === 'function'
          ? (update as (value: T) => T)(current.userId === userId && current.load === load ? current.data : initial)
          : update,
      }));
    }, [userId, load, initial]),
    clearError: useCallback(() => setErrorMessage(null), []),
    reload: useCallback(() => run(() => true), [run]),
  };
}
