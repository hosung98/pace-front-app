import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { appendLocationUpdates } from './run-storage';

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
