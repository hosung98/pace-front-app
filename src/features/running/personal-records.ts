import { distanceBetweenMeters } from '@/lib/geo';
import type { CompletedRun, RunPoint } from './types';
import type { PersonalRecord } from './progress';

type Sample = { meters: number; seconds: number };
const FLOAT_TOLERANCE_METERS = 0.000001;

function interpolateTime(samples: Sample[], meters: number, preferLatest = false): number {
  let low = 0, high = samples.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].meters < meters || (preferLatest && samples[middle].meters === meters)) low = middle + 1;
    else high = middle;
  }
  if (preferLatest && low > 0 && samples[low - 1].meters === meters) return samples[low - 1].seconds;
  const right = samples[Math.min(low, samples.length - 1)];
  if (low === 0 || right.meters === meters) return right.seconds;
  const left = samples[low - 1];
  return left.seconds + (right.seconds - left.seconds) * (meters - left.meters) / (right.meters - left.meters);
}

function bestWindow(samples: Sample[]): number | null {
  const total = samples[samples.length - 1]?.meters ?? 0;
  if (total + FLOAT_TOLERANCE_METERS < 1000) return null;
  let best = Infinity;
  for (const sample of samples) {
    if (sample.meters + 1000 <= total + FLOAT_TOLERANCE_METERS) {
      best = Math.min(best, interpolateTime(samples, Math.min(total, sample.meters + 1000)) - sample.seconds);
    }
    if (sample.meters + FLOAT_TOLERANCE_METERS >= 1000) {
      best = Math.min(best, sample.seconds - interpolateTime(samples, Math.max(0, sample.meters - 1000), true));
    }
  }
  return Number.isFinite(best) ? best : null;
}

/** Actual elapsed 1km windows, never a whole-run pace extrapolation. */
export function fastestKilometer(points: RunPoint[]): number | null {
  let previous: RunPoint | null = null;
  let samples: Sample[] = [];
  let best: number | null = null;
  const flush = () => {
    const value = bestWindow(samples);
    if (value !== null) best = best === null ? value : Math.min(best, value);
    samples = [];
    previous = null;
  };
  for (const point of points) {
    if (!Number.isFinite(point.latitude) || Math.abs(point.latitude) > 90
      || !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180
      || !Number.isFinite(point.recordedAt)
      || (point.accuracyMeters !== null && (!Number.isFinite(point.accuracyMeters) || point.accuracyMeters > 35 || point.accuracyMeters < 0))) {
      flush();
      continue;
    }

    if (previous) {
      const seconds = (point.recordedAt - previous.recordedAt) / 1000;
      const meters = distanceBetweenMeters(previous, point);
      if (seconds <= 0 || seconds > 30 || meters / seconds > 8) {
        flush();
      } else {
        const last = samples[samples.length - 1];
        samples.push({ meters: last.meters + meters, seconds: point.recordedAt / 1000 });
      }
    }
    if (!previous) samples = [{ meters: 0, seconds: point.recordedAt / 1000 }];
    previous = point;
  }
  flush();
  return best === null ? null : Math.round(best * 1000) / 1000;
}

export function recordsEarnedByRun(records: PersonalRecord[], run: CompletedRun): PersonalRecord[] {
  return records.filter((record) => {
    if (record.runId && run.serverId) return record.runId === run.serverId;
    return record.runId === run.id || Date.parse(record.achievedAt) === run.endedAt;
  });
}
