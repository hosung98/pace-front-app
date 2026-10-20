import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_WEEKLY_GOAL_KM,
  MAX_WEEKLY_GOAL_KM,
  MIN_WEEKLY_GOAL_KM,
} from './run-insights';

const WEEKLY_GOAL_KEY = '@pace/weekly-goal-km';

export async function readWeeklyGoalKm(): Promise<number> {
  const stored = await AsyncStorage.getItem(WEEKLY_GOAL_KEY);
  if (stored === null) return DEFAULT_WEEKLY_GOAL_KM;

  const goal = Number(stored);
  if (
    !Number.isInteger(goal) ||
    goal < MIN_WEEKLY_GOAL_KM ||
    goal > MAX_WEEKLY_GOAL_KM
  ) {
    throw new Error('Stored weekly running goal is invalid.');
  }
  return goal;
}

export async function saveWeeklyGoalKm(goalKm: number): Promise<void> {
  if (
    !Number.isInteger(goalKm) ||
    goalKm < MIN_WEEKLY_GOAL_KM ||
    goalKm > MAX_WEEKLY_GOAL_KM
  ) {
    throw new RangeError('Weekly running goal must be between 5 and 100 km.');
  }
  await AsyncStorage.setItem(WEEKLY_GOAL_KEY, String(goalKm));
}
