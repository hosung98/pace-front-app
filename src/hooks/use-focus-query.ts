import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

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
 * `load` must be a stable reference — pass a module-level function.
 */
export function useFocusQuery<T>(
  load: () => Promise<T>,
  initialData: T,
  failureMessage: string,
): FocusQuery<T> {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const run = useCallback(
    async (isActive: () => boolean) => {
      setIsLoading(true);
      try {
        const result = await load();
        if (isActive()) {
          setData(result);
          setErrorMessage(null);
        }
      } catch (error) {
        console.error(failureMessage, error);
        if (isActive()) setErrorMessage(failureMessage);
      } finally {
        if (isActive()) setIsLoading(false);
      }
    },
    [load, failureMessage],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void run(() => active);
      return () => {
        active = false;
      };
    }, [run]),
  );

  return {
    data,
    isLoading,
    errorMessage,
    setData,
    clearError: useCallback(() => setErrorMessage(null), []),
    reload: useCallback(() => run(() => true), [run]),
  };
}
