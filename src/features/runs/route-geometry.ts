import type { RunPoint } from '@/features/running/types';

export type RouteCoordinate = { latitude: number; longitude: number };

export type RouteBounds = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

const MAX_ROUTE_POINTS = 400;

export function toRouteCoordinates(points: RunPoint[]): RouteCoordinate[] {
  const valid = points.filter(
    (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
  if (valid.length <= MAX_ROUTE_POINTS) {
    return valid.map(({ latitude, longitude }) => ({ latitude, longitude }));
  }

  const step = (valid.length - 1) / (MAX_ROUTE_POINTS - 1);
  return Array.from({ length: MAX_ROUTE_POINTS }, (_, index) => {
    const { latitude, longitude } = valid[Math.round(index * step)];
    return { latitude, longitude };
  });
}

export function getRouteBounds(coordinates: RouteCoordinate[]): RouteBounds | null {
  if (coordinates.length === 0) {
    return null;
  }

  return coordinates.reduce<RouteBounds>(
    (bounds, { latitude, longitude }) => ({
      minLatitude: Math.min(bounds.minLatitude, latitude),
      maxLatitude: Math.max(bounds.maxLatitude, latitude),
      minLongitude: Math.min(bounds.minLongitude, longitude),
      maxLongitude: Math.max(bounds.maxLongitude, longitude),
    }),
    {
      minLatitude: Infinity,
      maxLatitude: -Infinity,
      minLongitude: Infinity,
      maxLongitude: -Infinity,
    },
  );
}

/** Web-Mercator zoom level that fits the bounds inside a view of the given size. */
export function getFittingZoom(bounds: RouteBounds, width: number, height: number): number {
  const centerLatitude = (bounds.minLatitude + bounds.maxLatitude) / 2;
  const latitudeSpan = Math.max(bounds.maxLatitude - bounds.minLatitude, 0.0005);
  const longitudeSpan = Math.max(bounds.maxLongitude - bounds.minLongitude, 0.0005);
  const cosLatitude = Math.cos((centerLatitude * Math.PI) / 180);

  const zoomForWidth = Math.log2((width * 360) / (256 * longitudeSpan));
  const zoomForHeight = Math.log2((height * 360 * cosLatitude) / (256 * latitudeSpan));
  const padded = Math.min(zoomForWidth, zoomForHeight) - 0.6;

  return Math.min(Math.max(padded, 3), 18);
}
