import { Platform } from 'react-native';
import { readJson, STORAGE_KEYS, writeJson } from '@/data/storage';
import type { CompletedRun } from '@/features/running/types';
import { withTimeout } from '@/lib/with-timeout';

let authorization: Promise<boolean> | null = null;

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
  const kit = await withTimeout(import('@kingstinct/react-native-healthkit'), 15000,
    '건강 모듈을 불러오지 못했어요. 최신 PACE 앱인지 확인해 주세요.');
  if (!kit.isHealthDataAvailable()) throw new Error('이 기기에서는 건강 데이터를 사용할 수 없어요.');
  return kit;
}
export async function connectHealth(): Promise<void> {
  const kit = await healthKit();
  if (authorization) throw new Error('건강 권한 요청이 진행 중이에요. 열린 권한창을 완료한 뒤 다시 시도해 주세요.');
  const request = kit.requestAuthorization({
    toRead: ['HKQuantityTypeIdentifierStepCount', 'HKWorkoutTypeIdentifier'],
    toShare: ['HKWorkoutTypeIdentifier'],
  });
  authorization = request;
  void request.then(() => { if (authorization === request) authorization = null; },
    () => { if (authorization === request) authorization = null; });
  const completed = await withTimeout(request, 60000,
    '건강 권한 요청을 완료하지 못했어요. 권한창을 닫고 다시 시도해 주세요. 창이 보이지 않으면 앱을 완전히 닫았다가 열어 주세요.');
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
  const [steps, workouts] = await withTimeout(Promise.all([
    kit.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
      unit: 'count', filter: { date: { startDate: today, endDate: now } },
    }),
    kit.queryWorkoutSamples({ limit: 20, ascending: false, filter: { date: { startDate: recent, endDate: now } } }),
  ]), 15000, '건강 데이터 조회가 지연되고 있어요. iPhone 잠금을 해제하고 다시 시도해 주세요.');
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
  await withTimeout(kit.saveWorkoutSample(kit.WorkoutActivityType.running, [],
    new Date(run.startedAt), new Date(run.endedAt), { distance: run.distanceMeters }, {
      HKMetadataKeySyncIdentifier: `pace.run.${run.clientRunId ?? run.id}`,
      HKMetadataKeySyncVersion: 1,
      'pace.activeDurationSeconds': run.durationSeconds,
    }), 15000, '건강 앱 저장 결과를 확인하지 못했어요. 러닝 상세에서 같은 기록을 다시 저장해도 중복되지 않아요.');
  return true;
}
