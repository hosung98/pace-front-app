import {
  DEFAULT_WEEKLY_GOAL_KM,
  isValidWeeklyGoalKm,
  MAX_WEEKLY_GOAL_KM,
  MIN_WEEKLY_GOAL_KM,
} from '@/features/running/weekly-goal';

import { readJson, STORAGE_KEYS, writeJson } from './storage';

/*
 * Weekly goal repository (device storage).
 * Backend: GET/PATCH /users/me/settings (weeklyGoalKm).
 */

export async function getWeeklyGoalKm(): Promise<number> {
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
  await writeJson(STORAGE_KEYS.weeklyGoalKm, goalKm);
}
