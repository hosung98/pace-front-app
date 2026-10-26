import { readJson, STORAGE_KEYS, writeJson } from './storage';

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await readJson(STORAGE_KEYS.onboarding, false);
  if (typeof value !== 'boolean') throw new Error('저장된 온보딩 상태가 올바르지 않아요.');
  return value;
}
export const completeOnboarding = () => writeJson(STORAGE_KEYS.onboarding, true);
