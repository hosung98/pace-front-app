import { Platform } from 'react-native';
import { readJson, STORAGE_KEYS, writeJson } from '@/data/storage';
import type { CompletedRun } from '@/features/running/types';

export type HealthSummary = {
  steps: number | null;
  workouts: { id: string; startedAt: number; durationSeconds: number; running: boolean }[];
};
export const supportsHealth = Platform.OS === 'ios';
export async function isHealthConnected(): Promise<boolean> {
  if (!supportsHealth) return false;
  const value = await readJson(STORAGE_KEYS.healthEnabled, false);
  if (typeof value !== 'boolean') throw new Error('저장된 건강 연동 상태가 올바르지 않아요.');
  return value;
}
async function healthKit() {
  if (!supportsHealth) throw new Error('Apple 건강 연동은 iPhone에서 사용할 수 있어요.');
  const kit = await import('@kingstinct/react-native-healthkit');
  if (!kit.isHealthDataAvailable()) throw new Error('이 기기에서는 건강 데이터를 사용할 수 없어요.');
  return kit;
}
export async function connectHealth(): Promise<void> {
  const kit = await healthKit();
  const completed = await kit.requestAuthorization({
    toRead: ['HKQuantityTypeIdentifierStepCount', 'HKWorkoutTypeIdentifier'],
    toShare: ['HKWorkoutTypeIdentifier'],
  });
  if (!completed) throw new Error('건강 권한 요청을 완료하지 못했어요. 다시 시도해 주세요.');
  await writeJson(STORAGE_KEYS.healthEnabled, true);
}
export const disconnectHealth = () => writeJson(STORAGE_KEYS.healthEnabled, false);
export async function readHealthSummary(): Promise<HealthSummary> {
  if (!(await isHealthConnected())) throw new Error('먼저 Apple 건강 연동을 켜 주세요.');
  const kit = await healthKit();
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const recent = new Date(now);
  recent.setDate(recent.getDate() - 30);
  const [steps, workouts] = await Promise.all([
    kit.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
      unit: 'count', filter: { date: { startDate: today, endDate: now } },
    }),
    kit.queryWorkoutSamples({ limit: 20, ascending: false, filter: { date: { startDate: recent, endDate: now } } }),
  ]);
  return {
    steps: steps.sumQuantity?.quantity ?? null,
    workouts: workouts.map((workout) => ({
      id: workout.uuid, startedAt: workout.startDate.getTime(),
      durationSeconds: workout.duration.quantity,
      running: workout.workoutActivityType === kit.WorkoutActivityType.running,
    })),
  };
}
export async function exportHealthRun(run: CompletedRun): Promise<boolean> {
  if (!(await isHealthConnected())) return false;
  if (!Number.isFinite(run.startedAt) || !Number.isFinite(run.endedAt) || run.endedAt <= run.startedAt
      || !Number.isFinite(run.distanceMeters) || run.distanceMeters < 0
      || !Number.isFinite(run.durationSeconds) || run.durationSeconds < 0 || !run.id) {
    throw new Error('건강 앱에 저장할 러닝 기록이 올바르지 않아요.');
  }
  const kit = await healthKit();
  if (kit.authorizationStatusFor('HKWorkoutTypeIdentifier') !== kit.AuthorizationStatus.sharingAuthorized) {
    throw new Error('건강 앱에서 PACE의 운동 쓰기 권한을 허용해 주세요.');
  }
  // HealthKit's sync identifier/version makes retries atomic, including after a crash.
  await kit.saveWorkoutSample(kit.WorkoutActivityType.running, [],
    new Date(run.startedAt), new Date(run.endedAt), { distance: run.distanceMeters }, {
      HKMetadataKeySyncIdentifier: `pace.run.${run.clientRunId ?? run.id}`,
      HKMetadataKeySyncVersion: 1,
      'pace.activeDurationSeconds': run.durationSeconds,
    });
  return true;
}
