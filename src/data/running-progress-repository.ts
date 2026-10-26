import { getSessionState, requireUserId } from '@/features/auth/session-store';
import { computeRunningProgress, type RunningProgress } from '@/features/running/progress';
import { api } from '@/lib/api';
import { listCompletedRuns, syncCompletedRuns } from './completed-runs-repository';
import { getWeeklyGoalKm } from './weekly-goal-repository';

export async function getRunningProgress(): Promise<RunningProgress> {
  if (getSessionState().session) {
    await syncCompletedRuns();
    return api('/users/me/progress');
  }
  const [runs, goal] = await Promise.all([listCompletedRuns(), getWeeklyGoalKm()]);
  return computeRunningProgress(runs, goal);
}

export function setRepresentativeBadge(badgeId: string | null): Promise<void> {
  requireUserId();
  return api('/users/me/progress/representative-badge', { method: 'PUT', body: JSON.stringify({ badgeId }) });
}

export type Reflection = { effort: 'easy' | 'moderate' | 'hard' | null; note: string };
export const getRunReflection = (id: string) =>
  api<Reflection>(`/runs/${encodeURIComponent(id)}/reflection`);
export const saveRunReflection = (id: string, reflection: Reflection) =>
  api<void>(`/runs/${encodeURIComponent(id)}/reflection`, { method: 'PUT', body: JSON.stringify(reflection) });

export type CrewGoal = {
  month: string; targetKm: number; totalKm: number; canEdit: boolean;
  contributors: { userId: string; nickname: string; distanceKm: number }[];
};
export const getCrewGoal = (id: string) => api<CrewGoal>(`/crews/${encodeURIComponent(id)}/goal`);
export const saveCrewGoal = (id: string, targetKm: number) =>
  api<void>(`/crews/${encodeURIComponent(id)}/goal`, { method: 'PUT', body: JSON.stringify({ targetKm }) });
