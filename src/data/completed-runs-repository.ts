import type { CompletedRun } from '@/features/running/types';

import { readJson, STORAGE_KEYS, writeJson } from './storage';

/*
 * Completed runs repository (device storage).
 * When the backend is connected, swap these bodies for API calls
 * (GET/POST/DELETE /runs) — screens only depend on these functions.
 */

const byNewestFirst = (a: CompletedRun, b: CompletedRun) => b.startedAt - a.startedAt;

export async function listCompletedRuns(): Promise<CompletedRun[]> {
  return readJson<CompletedRun[]>(STORAGE_KEYS.completedRuns, []);
}

export async function getCompletedRun(runId: string): Promise<CompletedRun | null> {
  const runs = await listCompletedRuns();
  return runs.find((run) => run.id === runId) ?? null;
}

export async function saveCompletedRun(run: CompletedRun): Promise<void> {
  const runs = await listCompletedRuns();
  await writeJson(STORAGE_KEYS.completedRuns, [run, ...runs]);
}

export async function deleteCompletedRun(runId: string): Promise<void> {
  const runs = await listCompletedRuns();
  await writeJson(
    STORAGE_KEYS.completedRuns,
    runs.filter((run) => run.id !== runId),
  );
}

export async function restoreCompletedRun(run: CompletedRun): Promise<void> {
  const runs = await listCompletedRuns();
  if (runs.some((item) => item.id === run.id)) return;
  await writeJson(STORAGE_KEYS.completedRuns, [...runs, run].sort(byNewestFirst));
}
