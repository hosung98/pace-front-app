/** A single accepted GPS sample. */
export type RunPoint = {
  latitude: number;
  longitude: number;
  altitudeMeters: number | null;
  accuracyMeters: number | null;
  speedMetersPerSecond: number | null;
  recordedAt: number;
};

/** A run in progress. Elapsed time = elapsedBeforeSegmentMs + (now - segmentStartedAt) while running. */
export type ActiveRun = {
  ownerId?: string | null;
  id: string;
  status: 'running' | 'paused';
  startedAt: number;
  segmentStartedAt: number;
  elapsedBeforeSegmentMs: number;
  distanceMeters: number;
  currentSpeedMetersPerSecond: number;
  routePoints: RunPoint[];
};

/** A finished run. Mirrors the `POST /runs` payload in docs/API_REQUIREMENTS.md. */
export type CompletedRun = {
  serverId?: string;
  id: string;
  startedAt: number;
  endedAt: number;
  distanceMeters: number;
  durationSeconds: number;
  averagePaceSecondsPerKm: number | null;
  routePoints: RunPoint[];
};
