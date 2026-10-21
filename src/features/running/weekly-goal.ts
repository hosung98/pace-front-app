export const DEFAULT_WEEKLY_GOAL_KM = 20;
export const MIN_WEEKLY_GOAL_KM = 5;
export const MAX_WEEKLY_GOAL_KM = 100;
export const WEEKLY_GOAL_STEP_KM = 5;

export function isValidWeeklyGoalKm(goalKm: number): boolean {
  return (
    Number.isInteger(goalKm) &&
    goalKm >= MIN_WEEKLY_GOAL_KM &&
    goalKm <= MAX_WEEKLY_GOAL_KM
  );
}
