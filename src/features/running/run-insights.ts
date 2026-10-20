import type { CompletedRun } from './run-storage';

export const DEFAULT_WEEKLY_GOAL_KM = 20;
export const MIN_WEEKLY_GOAL_KM = 5;
export const MAX_WEEKLY_GOAL_KM = 100;

export type WeeklyInsights = {
  distanceKm: number;
  runCount: number;
  dailyDistancesKm: number[];
};

export type MonthlyInsights = {
  distanceKm: number;
  runCount: number;
  weeklyDistancesKm: number[];
};

export type AllTimeInsights = {
  distanceKm: number;
  runCount: number;
  averagePaceSecondsPerKm: number | null;
  longestRunKm: number;
};

function getCalendarDayOrdinal(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

export function getWeekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export function getWeeklyInsights(
  runs: CompletedRun[],
  now = new Date(),
): WeeklyInsights {
  const start = getWeekStart(now);
  const dailyDistancesKm = Array.from({ length: 7 }, () => 0);
  let runCount = 0;

  for (const run of runs) {
    const runDate = new Date(run.startedAt);
    const dayOffset = getCalendarDayOrdinal(runDate) - getCalendarDayOrdinal(start);
    if (dayOffset < 0 || dayOffset > 6 || run.startedAt > now.getTime()) continue;
    dailyDistancesKm[dayOffset] += run.distanceMeters / 1000;
    runCount += 1;
  }

  return {
    distanceKm: dailyDistancesKm.reduce((total, distance) => total + distance, 0),
    runCount,
    dailyDistancesKm,
  };
}

export function getMonthlyInsights(
  runs: CompletedRun[],
  now = new Date(),
): MonthlyInsights {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const firstWeekStart = getWeekStart(monthStart);
  const weekCount = Math.ceil(
    (getCalendarDayOrdinal(getWeekStart(new Date(nextMonthStart.getTime() - 1))) -
      getCalendarDayOrdinal(firstWeekStart)) / 7,
  ) + 1;
  const weeklyDistancesKm = Array.from({ length: weekCount }, () => 0);
  let runCount = 0;

  for (const run of runs) {
    const runDate = new Date(run.startedAt);
    if (
      runDate < monthStart ||
      runDate >= nextMonthStart ||
      run.startedAt > now.getTime()
    ) continue;
    const weekIndex = Math.floor(
      (getCalendarDayOrdinal(getWeekStart(runDate)) -
        getCalendarDayOrdinal(firstWeekStart)) / 7,
    );
    weeklyDistancesKm[weekIndex] += run.distanceMeters / 1000;
    runCount += 1;
  }

  return {
    distanceKm: weeklyDistancesKm.reduce((total, distance) => total + distance, 0),
    runCount,
    weeklyDistancesKm,
  };
}

export function getAllTimeInsights(runs: CompletedRun[]): AllTimeInsights {
  const distanceMeters = runs.reduce((total, run) => total + run.distanceMeters, 0);
  const durationSeconds = runs.reduce((total, run) => total + run.durationSeconds, 0);
  return {
    distanceKm: distanceMeters / 1000,
    runCount: runs.length,
    averagePaceSecondsPerKm:
      distanceMeters > 0 ? durationSeconds / (distanceMeters / 1000) : null,
    longestRunKm:
      runs.reduce((longest, run) => Math.max(longest, run.distanceMeters), 0) /
      1000,
  };
}

export function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm === null || !Number.isFinite(secondsPerKm)) return '—';
  const roundedSeconds = Math.round(secondsPerKm);
  return `${Math.floor(roundedSeconds / 60)}'${String(roundedSeconds % 60).padStart(2, '0')}''`;
}
