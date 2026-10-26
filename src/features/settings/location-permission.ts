import * as Location from 'expo-location';

type LocationPermission = Awaited<ReturnType<typeof Location.getForegroundPermissionsAsync>>;
let pending: Promise<LocationPermission> | null = null;

export function checkLocationPermission(request: 'never' | 'initial' | 'retry'): Promise<LocationPermission> {
  if (pending !== null) return pending;
  const operation = (async () => {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.granted || request === 'never' || !permission.canAskAgain
      || (request === 'initial' && permission.status !== 'undetermined')) return permission;
    return Location.requestForegroundPermissionsAsync();
  })();
  pending = operation;
  const clear = () => { if (pending === operation) pending = null; };
  void operation.then(clear, clear);
  return operation;
}
