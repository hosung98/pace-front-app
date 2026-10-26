import type { CompletedRun } from './types';
import { fastestKilometer } from './personal-records';

export type RunningBadge = {
  id: string; title: string; description: string;
  target: number; progress: number; earnedAt: string | null;
};
export type RunningProgress = {
  totalDistanceKm: number; totalRuns: number; weeklyDistanceKm: number; weeklyRuns: number;
  weeklyGoalKm: number; representativeBadgeId: string | null; badges: RunningBadge[];
  personalBests: PersonalRecord[];
};
export type PersonalRecord = {
  id: string; title: string; value: number; unit: 'km' | 'seconds'; achievedAt: string; runId?: string;
};

function dayKey(time: number) {
  return new Date(time + 9 * 3_600_000).toISOString().slice(0, 10);
}

function weekKey(time: number) {
  const date = new Date(`${dayKey(time)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}

/** Guest progress uses PACE records only, in the same Asia/Seoul calendar as the server. */
export function computeRunningProgress(runs: CompletedRun[], weeklyGoalKm: number, now = Date.now()): RunningProgress {
  const ordered = [...new Map(runs.map((run) => [run.clientRunId ?? run.id, run])).values()]
    .filter((run) => Number.isFinite(run.endedAt) && run.endedAt <= now && run.distanceMeters > 0 && run.durationSeconds > 0)
    .sort((a, b) => a.endedAt - b.endedAt);
  const weeks = new Map<string, Set<string>>();
  const months = new Map<string, number>();
  let distance = 0;
  let longest = 0;
  let maxDays = 0;
  let maxMonthly = 0;
  const catalog: [string, string, string, number][] = [
    ['first-run', '첫 발걸음', '첫 러닝 완료', 1],
    ['single3k', '첫 3K', '한 번에 3km 달리기', 3],
    ['single5k', '첫 5K', '한 번에 5km 달리기', 5],
    ['single10k', '첫 10K', '한 번에 10km 달리기', 10],
    ['total30k', '30km 클럽', '누적 30km 달리기', 30],
    ['total100k', '100km 클럽', '누적 100km 달리기', 100],
    ['total300k', '300km 클럽', '누적 300km 달리기', 300],
    ['weekly3days', '이번 주도 달렸다', '한 주에 서로 다른 3일 러닝', 3],
    ['monthly10runs', '이달의 러너', '한 달에 10회 러닝', 10],
  ];
  const earned = new Map<string, string>();
  const values = () => [ordered.length ? 1 : 0, longest, longest, longest, distance, distance, distance, maxDays, maxMonthly];
  for (const run of ordered) {
    distance += run.distanceMeters / 1000;
    longest = Math.max(longest, run.distanceMeters / 1000);
    const days = weeks.get(weekKey(run.startedAt)) ?? new Set<string>();
    days.add(dayKey(run.startedAt));
    weeks.set(weekKey(run.startedAt), days);
    maxDays = Math.max(maxDays, days.size);
    const month = dayKey(run.startedAt).slice(0, 7);
    const count = (months.get(month) ?? 0) + 1;
    months.set(month, count);
    maxMonthly = Math.max(maxMonthly, count);
    catalog.forEach(([id, , , target], index) => {
      if (!earned.has(id) && values()[index] >= target) earned.set(id, new Date(run.endedAt).toISOString());
    });
  }
  const weekly = ordered.filter((run) => weekKey(run.startedAt) === weekKey(now));
  const best = ordered.reduce<CompletedRun | null>((current, run) =>
    !current || current.distanceMeters < run.distanceMeters ? run : current, null);
  let fastest: { run: CompletedRun; seconds: number } | null = null;
  for (const run of ordered) {
    const seconds = fastestKilometer(run.routePoints);
    if (seconds !== null && (!fastest || seconds < fastest.seconds)) fastest = { run, seconds };
  }
  const personalBests: PersonalRecord[] = best ? [{
    id: 'longest-run', title: '가장 멀리 달린 날', value: best.distanceMeters / 1000,
    unit: 'km', achievedAt: new Date(best.endedAt).toISOString(), runId: best.id,
  }] : [];
  if (fastest) personalBests.push({
    id: 'fastest-1km', title: '가장 빠른 1km', value: fastest.seconds, unit: 'seconds',
    achievedAt: new Date(fastest.run.endedAt).toISOString(), runId: fastest.run.id,
  });
  return {
    totalDistanceKm: distance, totalRuns: ordered.length,
    weeklyDistanceKm: weekly.reduce((sum, run) => sum + run.distanceMeters / 1000, 0),
    weeklyRuns: weekly.length, weeklyGoalKm, representativeBadgeId: null,
    badges: catalog.map(([id, title, description, target], index) => ({
      id, title, description, target, progress: Math.min(values()[index], target), earnedAt: earned.get(id) ?? null,
    })),
    personalBests,
  };
}
