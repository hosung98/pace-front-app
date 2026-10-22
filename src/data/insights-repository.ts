import { getSessionState } from '@/features/auth/session-store';
import {
  getAllTimeInsights, getLatestRun, getMonthlyInsights, getTodayDistanceKm,
  getWeeklyInsights, getWeekStart,
  WEEKDAY_LABELS,
} from '@/features/running/run-insights';
import type { CompletedRun } from '@/features/running/types';
import { api } from '@/lib/api';
import { listCompletedRuns, syncCompletedRuns } from './completed-runs-repository';
import { getWeeklyGoalKm } from './weekly-goal-repository';

export async function getHomeData() {
  if (!getSessionState().session) {
    const [runs, goalKm] = await Promise.all([listCompletedRuns(), getWeeklyGoalKm()]);
    return { weekly: getWeeklyInsights(runs), todayKm: getTodayDistanceKm(runs),
      recent: getLatestRun(runs), weekStart: getWeekStart(new Date()), goalKm };
  }
  await syncCompletedRuns();
  const data = await api<{
    today: { distanceMeters: number };
    week: { from: string; goalMeters: number; distanceMeters: number; runCount: number; dailyDistances: number[] };
    recentRun: { id: string; startedAt: string; distanceMeters: number; durationSeconds: number; averagePaceSecondsPerKm: number | null } | null;
  }>('/dashboard?timeZone=Asia%2FSeoul');
  const recent: CompletedRun | null = data.recentRun ? {
    ...data.recentRun, serverId: data.recentRun.id,
    startedAt: Date.parse(data.recentRun.startedAt), endedAt: Date.parse(data.recentRun.startedAt),
    routePoints: [],
  } : null;
  return {
    weekly: { distanceKm: data.week.distanceMeters / 1000, runCount: data.week.runCount,
      dailyDistancesKm: data.week.dailyDistances.map((value) => value / 1000) },
    todayKm: data.today.distanceMeters / 1000, recent,
    weekStart: new Date(`${data.week.from}T00:00:00+09:00`), goalKm: data.week.goalMeters / 1000,
  };
}

export async function getStatsData(period: 'week' | 'month') {
  if (!getSessionState().session) {
    const runs = await listCompletedRuns();
    const insights = period === 'week' ? getWeeklyInsights(runs) : getMonthlyInsights(runs);
    const values = 'dailyDistancesKm' in insights ? insights.dailyDistancesKm : insights.weeklyDistancesKm;
    return {
      distanceKm: insights.distanceKm,
      values,
      labels: period === 'week' ? [...WEEKDAY_LABELS] : values.map((_, index) => `${index + 1}주`),
      allTime: getAllTimeInsights(runs),
    };
  }
  await syncCompletedRuns();
  // 전체 최장 거리는 현재 통계 응답에 없어 요약 목록에서 구합니다. GPS 경로는 조회하지 않습니다.
  const [stats, runs] = await Promise.all([
    api<{ totals: { distanceMeters: number }; buckets: { label: string; distanceMeters: number }[];
      allTime: { distanceMeters: number; runCount: number; averagePaceSecondsPerKm: number | null } }>(
      `/stats/running?period=${period}&timeZone=Asia%2FSeoul`,
    ),
    listCompletedRuns(),
  ]);
  return { distanceKm: stats.totals.distanceMeters / 1000,
    values: stats.buckets.map((bucket) => bucket.distanceMeters / 1000),
    labels: stats.buckets.map((bucket) => bucket.label),
    allTime: { distanceKm: stats.allTime.distanceMeters / 1000,
      runCount: stats.allTime.runCount, averagePaceSecondsPerKm: stats.allTime.averagePaceSecondsPerKm,
      longestRunKm: runs.reduce((max, run) => Math.max(max, run.distanceMeters), 0) / 1000 } };
}
