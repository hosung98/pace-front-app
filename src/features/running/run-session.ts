import type { LocationObject } from 'expo-location';

import { distanceBetweenMeters } from '@/lib/geo';

import type { ActiveRun, CompletedRun, RunPoint } from './types';

/** GPS samples less accurate than this are ignored. */
const MAX_ACCURACY_METERS = 35;
/** Reported speeds above this (≈43 km/h) are treated as GPS noise. */
const MAX_REPORTED_SPEED_MPS = 12;
/** Segment speeds above this (≈29 km/h) are treated as GPS jumps. */
const MAX_SEGMENT_SPEED_MPS = 8;
/** Movements shorter than this are jitter and don't add distance. */
const MIN_SEGMENT_METERS = 2;

export function createActiveRun(timestamp = Date.now()): ActiveRun {
  return {
    id: `local-${timestamp}`,
    status: 'running',
    startedAt: timestamp,
    segmentStartedAt: timestamp,
    elapsedBeforeSegmentMs: 0,
    distanceMeters: 0,
    currentSpeedMetersPerSecond: 0,
    routePoints: [],
  };
}

export function getElapsedMilliseconds(run: ActiveRun, now = Date.now()): number {
  return (
    run.elapsedBeforeSegmentMs +
    (run.status === 'running' ? Math.max(0, now - run.segmentStartedAt) : 0)
  );
}

export function pauseActiveRun(run: ActiveRun, now = Date.now()): ActiveRun {
  return {
    ...run,
    status: 'paused',
    elapsedBeforeSegmentMs: getElapsedMilliseconds(run, now),
  };
}

export function resumeActiveRun(run: ActiveRun, now = Date.now()): ActiveRun {
  return { ...run, status: 'running', segmentStartedAt: now };
}

export function toCompletedRun(run: ActiveRun, endedAt = Date.now()): CompletedRun {
  const durationSeconds = Math.floor(getElapsedMilliseconds(run, endedAt) / 1000);
  return {
    id: run.id,
    startedAt: run.startedAt,
    endedAt,
    distanceMeters: Math.round(run.distanceMeters),
    durationSeconds,
    averagePaceSecondsPerKm:
      run.distanceMeters > 0
        ? Math.round(durationSeconds / (run.distanceMeters / 1000))
        : null,
    routePoints: getUploadRoutePoints({ ...run, endedAt }),
  };
}

export function getUploadRoutePoints(
  run: Pick<CompletedRun, 'startedAt' | 'endedAt' | 'routePoints'>,
): RunPoint[] {
  let previous = run.startedAt;
  const points = run.routePoints.filter((point) => {
    if (!Number.isFinite(point.recordedAt)
        || point.recordedAt < previous || point.recordedAt > run.endedAt) return false;
    previous = point.recordedAt;
    return true;
  });
  if (points.length !== run.routePoints.length) {
    console.warn('러닝 시간 범위 밖이거나 역순인 GPS 포인트를 전송 경로에서 제외했어요.', {
      excludedCount: run.routePoints.length - points.length,
    });
  }
  return points;
}

/** Live pace from the current speed, or null when (nearly) standing still. */
export function getCurrentPaceSecondsPerKm(run: ActiveRun): number | null {
  const speedKmh = run.currentSpeedMetersPerSecond * 3.6;
  return speedKmh > 0.5 ? Math.round(3600 / speedKmh) : null;
}

/** Filters noisy GPS samples and accumulates distance. Pure — persistence is the caller's job. */
export function applyLocationUpdates(
  run: ActiveRun,
  locations: LocationObject[],
  receivedAt = Date.now(),
): ActiveRun {
  if (run.status !== 'running') return run;
  let next = run;

  for (const location of locations) {
    const { coords, timestamp } = location;
    if (
      !Number.isFinite(timestamp) || timestamp < run.startedAt || timestamp > receivedAt ||
      (coords.accuracy !== null && coords.accuracy > MAX_ACCURACY_METERS) ||
      location.mocked === true
    ) {
      continue;
    }

    const lastPoint: RunPoint | undefined = next.routePoints.at(-1);
    if (lastPoint && timestamp <= lastPoint.recordedAt) continue;

    let speedMetersPerSecond = coords.speed;
    if (speedMetersPerSecond === null || speedMetersPerSecond < 0) {
      speedMetersPerSecond = lastPoint
        ? distanceBetweenMeters(lastPoint, coords) /
          ((timestamp - lastPoint.recordedAt) / 1000)
        : 0;
    }
    if (!Number.isFinite(speedMetersPerSecond) || speedMetersPerSecond > MAX_REPORTED_SPEED_MPS) {
      continue;
    }

    if (lastPoint) {
      const segmentDistance = distanceBetweenMeters(lastPoint, coords);
      if (segmentDistance < MIN_SEGMENT_METERS) {
        next = { ...next, currentSpeedMetersPerSecond: speedMetersPerSecond };
        continue;
      }

      const segmentSeconds = (timestamp - lastPoint.recordedAt) / 1000;
      if (segmentDistance / segmentSeconds > MAX_SEGMENT_SPEED_MPS) continue;

      next = { ...next, distanceMeters: next.distanceMeters + segmentDistance };
    }

    const point: RunPoint = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitudeMeters: coords.altitude,
      accuracyMeters: coords.accuracy,
      speedMetersPerSecond,
      recordedAt: timestamp,
    };
    next = {
      ...next,
      currentSpeedMetersPerSecond: speedMetersPerSecond,
      routePoints: [...next.routePoints, point],
    };
  }

  return next;
}
