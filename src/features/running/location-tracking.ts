import { isRunningInExpoGo } from 'expo';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { appendLocationUpdates } from '@/data/active-run-store';
import { PaceColors } from '@/constants/pace';

/*
 * Background GPS tracking. Imported once from the root layout so the task is
 * defined before the OS delivers locations to a relaunched app.
 */

export const RUN_LOCATION_TASK = 'pace-background-run-location';

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(RUN_LOCATION_TASK)) {
  TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(
    RUN_LOCATION_TASK,
    async ({ data, error }) => {
      if (error) {
        console.error('Background run location task failed.', error);
        return;
      }
      if (data?.locations?.length) {
        await appendLocationUpdates(data.locations);
      }
    },
  );
}

const LOCATION_UPDATE_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: 5,
  timeInterval: 1000,
  activityType: Location.ActivityType.Fitness,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'PACE 러닝 기록 중',
    notificationBody: '러닝을 기록하고 있어요.',
    notificationColor: PaceColors.accent,
    killServiceOnDestroy: false,
  },
};

/** Returns null when tracking can start, otherwise a user-facing reason. */
export async function checkTrackingReadiness(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return '화면이 잠긴 뒤에도 기록하려면 웹앱이 아닌 iOS 또는 Android 앱이 필요해요.';
  }
  if (isRunningInExpoGo() || !(await TaskManager.isAvailableAsync())) {
    return 'Expo Go에서는 백그라운드 GPS를 사용할 수 없어요. PACE development build를 설치해 주세요.';
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    return '기기의 위치 서비스를 켠 다음 다시 시도해 주세요.';
  }

  // "While in use" is enough: tracking started in the foreground keeps running with the
  // screen locked (iOS background location indicator / Android foreground service).
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    return foreground.canAskAgain
      ? '러닝 기록을 위해 앱 사용 중 위치 접근을 허용해 주세요.'
      : '설정 > PACE > 위치에서 위치 접근을 허용한 다음 다시 시도해 주세요.';
  }
  return null;
}

export async function startLocationTracking(): Promise<void> {
  await Location.startLocationUpdatesAsync(RUN_LOCATION_TASK, LOCATION_UPDATE_OPTIONS);
}

export async function stopLocationTracking(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(RUN_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(RUN_LOCATION_TASK);
  }
}

export function getLocationFailureMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.includes('ERR_LOCATION_INFO_PLIST')) {
    return '현재 설치된 앱에 iOS 위치 권한 설정이 없어요. Expo Go에서는 백그라운드 GPS가 지원되지 않으니 PACE development build를 설치해 주세요.';
  }
  return fallback;
}
