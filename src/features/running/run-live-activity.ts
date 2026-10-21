import { Platform } from 'react-native';
import type { LiveActivity, LiveActivityFactory } from 'expo-widgets';

import { formatKm, formatPace } from '@/lib/format';

import type { RunActivityProps } from './run-activity-layout';
import { getElapsedMilliseconds } from './run-session';
import type { ActiveRun } from './types';

/*
 * Mirrors the active run onto an iOS Live Activity (Lock Screen + Dynamic Island).
 * The elapsed timer ticks natively, so updates are only needed when distance or status changes.
 */

const RUN_TRACKING_URL = 'pacefrontapp://run-tracking';
const MIN_UPDATE_INTERVAL_MS = 3000;

type RunActivityFactory = LiveActivityFactory<RunActivityProps>;

let factory: RunActivityFactory | null | undefined;
let current: { runId: string; activity: LiveActivity<RunActivityProps> } | null = null;
let lastSent: { key: string; paused: boolean; at: number } | null = null;
let queue: Promise<void> = Promise.resolve();

/** Loaded lazily so web, Android and builds without the native module never touch it. */
function getFactory(): RunActivityFactory | null {
  if (factory !== undefined) return factory;
  factory = null;
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    factory = (require('./run-activity-layout') as typeof import('./run-activity-layout')).RunActivity;
  } catch (error) {
    console.warn('Live Activities are unavailable in this build.', error);
  }
  return factory;
}

function toProps(run: ActiveRun, now: number): RunActivityProps {
  const elapsedMs = getElapsedMilliseconds(run, Math.max(now, run.segmentStartedAt));
  const km = run.distanceMeters / 1000;
  const paused = run.status === 'paused';
  return {
    paused,
    distanceKm: formatKm(run.distanceMeters),
    pace: km >= 0.05 ? formatPace(elapsedMs / 1000 / km) : '—',
    timerStartMs: now - elapsedMs,
    pausedAtMs: paused ? now : null,
  };
}

async function endAll(): Promise<void> {
  const target = getFactory();
  if (!target) return;
  const activities = target.getInstances();
  current = null;
  lastSent = null;
  await Promise.all(activities.map((activity) => activity.end('immediate')));
}

async function sync(run: ActiveRun | null): Promise<void> {
  const target = getFactory();
  if (!target) return;
  if (!run) {
    if (current || target.getInstances().length > 0) await endAll();
    return;
  }

  const now = Date.now();
  const paused = run.status === 'paused';
  const key = `${paused}:${Math.floor(run.distanceMeters / 10)}`;

  if (current && current.runId !== run.id) await endAll();
  if (!current) {
    const restored = target.getInstances()[0];
    current = {
      runId: run.id,
      activity: restored ?? target.start(toProps(run, now), RUN_TRACKING_URL),
    };
    if (!restored) {
      lastSent = { key, paused, at: now };
      return;
    }
  }

  const statusChanged = lastSent?.paused !== paused;
  const throttled = lastSent !== null && now - lastSent.at < MIN_UPDATE_INTERVAL_MS;
  if (!statusChanged && (lastSent?.key === key || throttled)) return;

  lastSent = { key, paused, at: now };
  await current.activity.update(toProps(run, now));
}

/** Fire-and-forget; calls are serialized so start/update/end never race. */
export function syncRunLiveActivity(run: ActiveRun | null): void {
  queue = queue
    .then(() => sync(run))
    .catch((error: unknown) => {
      current = null;
      lastSent = null;
      console.warn('Unable to sync the run Live Activity.', error);
    });
}
