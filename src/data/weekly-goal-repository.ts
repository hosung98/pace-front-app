import {
  DEFAULT_WEEKLY_GOAL_KM,
  isValidWeeklyGoalKm,
  MAX_WEEKLY_GOAL_KM,
  MIN_WEEKLY_GOAL_KM,
} from '@/features/running/weekly-goal';

import { readJson, STORAGE_KEYS, writeJson } from './storage';
import { getSessionState } from '@/features/auth/session-store';
import { getSettings, patchSettings } from './account-repository';

export async function getWeeklyGoalKm(): Promise<number> {
  if (getSessionState().session) return (await getSettings()).weeklyGoalMeters / 1000;
  const goal = Number(
    await readJson<number | string>(STORAGE_KEYS.weeklyGoalKm, DEFAULT_WEEKLY_GOAL_KM),
  );
  if (!isValidWeeklyGoalKm(goal)) {
    throw new Error('Stored weekly running goal is invalid.');
  }
  return goal;
}

export async function saveWeeklyGoalKm(goalKm: number): Promise<void> {
  if (!isValidWeeklyGoalKm(goalKm)) {
    throw new RangeError(
      `Weekly running goal must be between ${MIN_WEEKLY_GOAL_KM} and ${MAX_WEEKLY_GOAL_KM} km.`,
    );
  }
  if (getSessionState().session) {
    await patchSettings({ weeklyGoalMeters: goalKm * 1000 });
    return;
  }
  await writeJson(STORAGE_KEYS.weeklyGoalKm, goalKm);
}
