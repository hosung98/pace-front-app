import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { matchRegion, type CrewRegion } from './regions';

/**
 * Turns the device's current position into a 시/도 + 시/군/구 region.
 * Only the region strings are used — coordinates are never sent to the server.
 * Throws a user-facing message on failure (web, permission denied, outside Korea…).
 */
export async function detectCurrentRegion(): Promise<CrewRegion> {
  if (Platform.OS === 'web') {
    throw new Error('웹에서는 내 위치로 찾기를 지원하지 않아요. 지역을 직접 골라 주세요.');
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('위치 권한이 없어서 지역을 찾지 못했어요. 지역을 직접 골라 주세요.');
  }

  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 })) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));

  const [address] = await Location.reverseGeocodeAsync({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
  const region = address
    ? matchRegion([address.region, address.city, address.subregion, address.district])
    : null;
  if (!region) {
    throw new Error('현재 위치를 지역 목록에서 찾지 못했어요. 지역을 직접 골라 주세요.');
  }
  return region;
}
