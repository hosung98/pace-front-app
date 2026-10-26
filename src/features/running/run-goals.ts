import type { ActiveRun, RunGoal } from './types';
import { getElapsedMilliseconds } from './run-session';

export const RUN_GOALS: { label: string; value: RunGoal }[] = [
  { label: '자유 러닝', value: null },
  { label: '3km', value: { kind: 'distance', target: 3000 } },
  { label: '5km', value: { kind: 'distance', target: 5000 } },
  { label: '10km', value: { kind: 'distance', target: 10000 } },
  { label: '30분', value: { kind: 'duration', target: 1800 } },
];

export function runGoalProgress(run: ActiveRun, now: number) {
  if (!run.goal) return null;
  const value = run.goal.kind === 'distance' ? run.distanceMeters : getElapsedMilliseconds(run, now) / 1000;
  return { reached: value >= run.goal.target, fraction: Math.min(1, Math.max(0, value / run.goal.target)),
    label: run.goal.kind === 'distance' ? `${run.goal.target / 1000}km` : `${run.goal.target / 60}분` };
}
