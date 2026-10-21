import { AppleMaps } from 'expo-maps';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PaceColors as C } from '@/constants/pace';
import { getFittingZoom, getRouteBounds, type RouteCoordinate } from './route-geometry';

type RunRouteMapProps = {
  coordinates: RouteCoordinate[];
  height: number;
};

export function RunRouteMap({ coordinates, height }: RunRouteMapProps) {
  const [width, setWidth] = useState(0);
  const bounds = getRouteBounds(coordinates);

  if (!bounds) {
    return null;
  }

  const start = coordinates[0];
  const finish = coordinates[coordinates.length - 1];

  return (
    <View
      style={[styles.frame, { height }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <AppleMaps.View
          style={StyleSheet.absoluteFill}
          colorScheme={AppleMaps.MapColorScheme.DARK}
          cameraPosition={{
            coordinates: {
              latitude: (bounds.minLatitude + bounds.maxLatitude) / 2,
              longitude: (bounds.minLongitude + bounds.maxLongitude) / 2,
            },
            zoom: getFittingZoom(bounds, width, height),
          }}
          polylines={[{ id: 'route', coordinates, color: C.accent, width: 5 }]}
          markers={[
            { id: 'start', coordinates: start, systemImage: 'figure.run', tintColor: '#3FB950', title: '출발' },
            { id: 'finish', coordinates: finish, systemImage: 'flag.checkered', tintColor: '#F85149', title: '도착' },
          ]}
          properties={{ pointsOfInterest: { including: [] }, selectionEnabled: false }}
          uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false, togglePitchEnabled: false }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#303A22',
    backgroundColor: '#20251B',
  },
});
