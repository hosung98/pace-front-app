import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { getRouteBounds, type RouteCoordinate } from './route-geometry';

type RunRouteMapProps = {
  coordinates: RouteCoordinate[];
  height: number;
};

const PADDING = 26;
const LINE_WIDTH = 4;

/**
 * Map-less route sketch for Android and web, where no map key is configured.
 * Projects GPS points to the view with an equirectangular projection.
 */
export function RunRouteMap({ coordinates, height }: RunRouteMapProps) {
  const [width, setWidth] = useState(0);
  const bounds = getRouteBounds(coordinates);

  if (!bounds) {
    return null;
  }

  const cosLatitude = Math.cos((((bounds.minLatitude + bounds.maxLatitude) / 2) * Math.PI) / 180);
  const spanX = Math.max((bounds.maxLongitude - bounds.minLongitude) * cosLatitude, 1e-6);
  const spanY = Math.max(bounds.maxLatitude - bounds.minLatitude, 1e-6);
  const drawWidth = Math.max(width - PADDING * 2, 1);
  const drawHeight = Math.max(height - PADDING * 2, 1);
  const scale = Math.min(drawWidth / spanX, drawHeight / spanY);
  const offsetX = PADDING + (drawWidth - spanX * scale) / 2;
  const offsetY = PADDING + (drawHeight - spanY * scale) / 2;

  const points = coordinates.map(({ latitude, longitude }) => ({
    x: offsetX + (longitude - bounds.minLongitude) * cosLatitude * scale,
    y: offsetY + (bounds.maxLatitude - latitude) * scale,
  }));
  const start = points[0];
  const finish = points[points.length - 1];

  return (
    <View
      style={[styles.frame, { height }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityLabel="러닝 경로"
    >
      {width > 0 && (
        <>
          {points.slice(1).map((point, index) => {
            const previous = points[index];
            const dx = point.x - previous.x;
            const dy = point.y - previous.y;
            const length = Math.hypot(dx, dy);
            if (length < 0.5) {
              return null;
            }
            return (
              <View
                key={index}
                style={[
                  styles.segment,
                  {
                    left: (previous.x + point.x) / 2 - length / 2,
                    top: (previous.y + point.y) / 2 - LINE_WIDTH / 2,
                    width: length + LINE_WIDTH / 2,
                    transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                  },
                ]}
              />
            );
          })}
          <View style={[styles.dot, styles.startDot, { left: start.x - 7, top: start.y - 7 }]} />
          <View style={[styles.dot, styles.finishDot, { left: finish.x - 7, top: finish.y - 7 }]} />
        </>
      )}
      <View style={styles.legend} pointerEvents="none">
        <View style={[styles.legendDot, styles.startDot]} />
        <Text style={styles.legendText}>출발</Text>
        <View style={[styles.legendDot, styles.finishDot]} />
        <Text style={styles.legendText}>도착</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#303A22',
    backgroundColor: '#1A1F15',
  },
  segment: {
    position: 'absolute',
    height: LINE_WIDTH,
    borderRadius: LINE_WIDTH / 2,
    backgroundColor: C.accent,
  },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#1A1F15',
  },
  startDot: { backgroundColor: '#3FB950' },
  finishDot: { backgroundColor: '#F85149' },
  legend: {
    position: 'absolute',
    left: 12,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: C.muted, fontSize: 9, marginRight: 6 },
});
