import AsyncStorage from '@react-native-async-storage/async-storage';

/** Keys are persisted on users' devices — never rename them without a migration. */
export const STORAGE_KEYS = {
  activeRun: '@pace/active-run',
  completedRuns: '@pace/completed-runs',
  weeklyGoalKm: '@pace/weekly-goal-km',
  runSync: '@pace/run-sync-v1',
  onboarding: '@pace/onboarding-completed-v1',
  healthEnabled: '@pace/health-enabled-v1',
  permissionIntro: '@pace/permission-intro-v1',
  runReflections: '@pace/run-reflections-v1',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export async function readJson<T>(key: StorageKey, fallback: T): Promise<T> {
  const stored = await AsyncStorage.getItem(key);
  return stored === null ? fallback : (JSON.parse(stored) as T);
}

export async function writeJson(key: StorageKey, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key: StorageKey): Promise<void> {
  await AsyncStorage.removeItem(key);
}
