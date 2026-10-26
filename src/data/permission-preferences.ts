import { readJson, STORAGE_KEYS, writeJson } from './storage';

export async function hasSeenPermissionIntro(): Promise<boolean> {
  const value = await readJson(STORAGE_KEYS.permissionIntro, false);
  if (typeof value !== 'boolean') throw new Error('저장된 권한 안내 상태가 올바르지 않아요.');
  return value;
}
export const completePermissionIntro = () => writeJson(STORAGE_KEYS.permissionIntro, true);
