import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationObject } from 'expo-location';

const ACTIVE_RUN_KEY = '@pace/active-run';
const COMPLETED_RUNS_KEY = '@pace/completed-runs';

export type ActiveRunSnapshot = {
  run: ActiveRun | null;
  loaded: boolean;
  error: string | null;
};

export type RunPoint = {
  latitude: number;
  longitude: number;
  altitudeMeters: number | null;
  accuracyMeters: number | null;
  speedMetersPerSecond: number | null;
  recordedAt: number;
};

export type ActiveRun = {
  id: string;
  status: 'running' | 'paused';
  startedAt: number;
  segmentStartedAt: number;
  elapsedBeforeSegmentMs: number;
  distanceMeters: number;
  currentSpeedMetersPerSecond: number;
  routePoints: RunPoint[];
};

export type CompletedRun = {
  id: string;
  startedAt: number;
  endedAt: number;
  distanceMeters: number;
  durationSeconds: number;
  averagePaceSecondsPerKm: number | null;
  routePoints: RunPoint[];
};

let activeRunSnapshot: ActiveRunSnapshot = {
  run: null,
  loaded: false,
  error: null,
};
const activeRunListeners = new Set<() => void>();

export function subscribeToActiveRun(listener: () => void): () => void {
  activeRunListeners.add(listener);
  return () => activeRunListeners.delete(listener);
}

export function getActiveRunSnapshot(): ActiveRunSnapshot {
  return activeRunSnapshot;
}

function publishActiveRun(snapshot: ActiveRunSnapshot): void {
  activeRunSnapshot = snapshot;
  for (const listener of activeRunListeners) listener();
}

export async function readActiveRun(): Promise<ActiveRun | null> {
  const stored = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
  return stored ? (JSON.parse(stored) as ActiveRun) : null;
}

export async function refreshActiveRunSnapshot(): Promise<void> {
  try {
    const run = await readActiveRun();
    publishActiveRun({ run, loaded: true, error: null });
  } catch (error) {
    publishActiveRun({
      ...activeRunSnapshot,
      loaded: true,
      error: '러닝 기록을 불러오지 못했어요. 저장 공간을 확인해 주세요.',
    });
    throw error;
  }
}

export async function writeActiveRun(run: ActiveRun): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(run));
  publishActiveRun({ run, loaded: true, error: null });
}

export async function clearActiveRun(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_RUN_KEY);
  publishActiveRun({ run: null, loaded: true, error: null });
}

export async function saveCompletedRun(run: CompletedRun): Promise<void> {
  const stored = await AsyncStorage.getItem(COMPLETED_RUNS_KEY);
  const runs = stored ? (JSON.parse(stored) as CompletedRun[]) : [];
  await AsyncStorage.setItem(
    COMPLETED_RUNS_KEY,
    JSON.stringify([run, ...runs]),
  );
}

export async function readCompletedRuns(): Promise<CompletedRun[]> {
  const stored = await AsyncStorage.getItem(COMPLETED_RUNS_KEY);
  return stored ? (JSON.parse(stored) as CompletedRun[]) : [];
}

export async function appendLocationUpdates(
  locations: LocationObject[],
): Promise<void> {
  let run = await readActiveRun();
  if (!run || run.status !== 'running') return;

  for (const location of locations) {
    const { coords, timestamp } = location;
    if (
      (coords.accuracy !== null && coords.accuracy > 35) ||
      (location.mocked === true)
    ) {
      continue;
    }

    const lastPoint: RunPoint | undefined = run.routePoints.at(-1);
    if (lastPoint && timestamp <= lastPoint.recordedAt) continue;

    let speedMetersPerSecond = coords.speed;
    if (speedMetersPerSecond === null || speedMetersPerSecond < 0) {
      speedMetersPerSecond = lastPoint
        ? calculateDistanceMeters(
            lastPoint.latitude,
            lastPoint.longitude,
            coords.latitude,
            coords.longitude,
          ) / ((timestamp - lastPoint.recordedAt) / 1000)
        : 0;
    }
    if (!Number.isFinite(speedMetersPerSecond) || speedMetersPerSecond > 12) {
      continue;
    }

    const point: RunPoint = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitudeMeters: coords.altitude,
      accuracyMeters: coords.accuracy,
      speedMetersPerSecond,
      recordedAt: timestamp,
    };

    if (lastPoint) {
      const segmentDistance = calculateDistanceMeters(
        lastPoint.latitude,
        lastPoint.longitude,
        point.latitude,
        point.longitude,
      );
      if (segmentDistance < 2) {
        run = { ...run, currentSpeedMetersPerSecond: speedMetersPerSecond };
        continue;
      }

      const segmentDurationSeconds = (timestamp - lastPoint.recordedAt) / 1000;
      const segmentSpeed = segmentDistance / segmentDurationSeconds;
      if (segmentSpeed > 8) continue;

      run = { ...run, distanceMeters: run.distanceMeters + segmentDistance };
    }

    run = {
      ...run,
      currentSpeedMetersPerSecond: speedMetersPerSecond,
      routePoints: [...run.routePoints, point],
    };
  }

  await writeActiveRun(run);
}

export function getElapsedMilliseconds(run: ActiveRun, now = Date.now()): number {
  return (
    run.elapsedBeforeSegmentMs +
    (run.status === 'running' ? Math.max(0, now - run.segmentStartedAt) : 0)
  );
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return hours > 0
    ? `${hours}:${paddedMinutes}:${paddedSeconds}`
    : `${paddedMinutes}:${paddedSeconds}`;
}

function calculateDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(latitude2 - latitude1);
  const longitudeDelta = toRadians(longitude2 - longitude1);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
