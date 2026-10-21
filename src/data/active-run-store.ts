import type { LocationObject } from 'expo-location';

import { syncRunLiveActivity } from '@/features/running/run-live-activity';
import { applyLocationUpdates } from '@/features/running/run-session';
import type { ActiveRun } from '@/features/running/types';

import { readJson, removeItem, STORAGE_KEYS, writeJson } from './storage';

/*
 * In-progress run, persisted on the device so the background GPS task and the UI
 * share it (and it survives app restarts). Stays local even after backend integration;
 * only the finished run is uploaded.
 */

export type ActiveRunSnapshot = {
  run: ActiveRun | null;
  loaded: boolean;
  error: string | null;
};

let snapshot: ActiveRunSnapshot = { run: null, loaded: false, error: null };
const listeners = new Set<() => void>();

function publish(next: ActiveRunSnapshot): void {
  snapshot = next;
  if (next.loaded && !next.error) syncRunLiveActivity(next.run);
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore. */
export function subscribeToActiveRun(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveRunSnapshot(): ActiveRunSnapshot {
  return snapshot;
}

export async function readActiveRun(): Promise<ActiveRun | null> {
  return readJson<ActiveRun | null>(STORAGE_KEYS.activeRun, null);
}

export async function refreshActiveRunSnapshot(): Promise<void> {
  try {
    publish({ run: await readActiveRun(), loaded: true, error: null });
  } catch (error) {
    publish({
      ...snapshot,
      loaded: true,
      error: '러닝 기록을 불러오지 못했어요. 저장 공간을 확인해 주세요.',
    });
    throw error;
  }
}

export async function writeActiveRun(run: ActiveRun): Promise<void> {
  await writeJson(STORAGE_KEYS.activeRun, run);
  publish({ run, loaded: true, error: null });
}

export async function clearActiveRun(): Promise<void> {
  await removeItem(STORAGE_KEYS.activeRun);
  publish({ run: null, loaded: true, error: null });
}

/** Called by the background location task. */
export async function appendLocationUpdates(locations: LocationObject[]): Promise<void> {
  const run = await readActiveRun();
  if (!run || run.status !== 'running') return;
  await writeActiveRun(applyLocationUpdates(run, locations));
}
