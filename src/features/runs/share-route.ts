import { distanceBetweenMeters } from '@/lib/geo';
import type { RunPoint } from '@/features/running/types';
import { getRouteBounds } from './route-geometry';

type Segment = { id: string; x: number; y: number; length: number; angle: string };

/** Hidden points split the route, rather than drawing a shortcut through private areas. */
export function shareRouteSegments(points: RunPoint[], hideEndpoints: boolean): Segment[] {
  const valid = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180);
  if (valid.length < 2) return [];
  const start = valid[0];
  const end = valid[valid.length - 1];
  const visible = (point: RunPoint) => !hideEndpoints
    || (distanceBetweenMeters(point, start) > 200 && distanceBetweenMeters(point, end) > 200);
  const shown = valid.filter(visible);
  if (shown.length < 2) return [];
  const bounds = getRouteBounds(shown);
  if (!bounds) return [];
  const { minLatitude: minLat, maxLatitude: maxLat, minLongitude: minLon, maxLongitude: maxLon } = bounds;
  const cos = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
  const scale = Math.min(220 / Math.max((maxLon - minLon) * cos, 0.00001),
    140 / Math.max(maxLat - minLat, 0.00001));
  const project = (p: RunPoint) => ({
    x: 120 + (p.longitude - (minLon + maxLon) / 2) * cos * scale,
    y: 80 - (p.latitude - (minLat + maxLat) / 2) * scale,
  });
  const segments: Segment[] = [];
  // At most 300 straight segments, retaining every privacy break.
  let previous: RunPoint | null = null;
  const step = Math.max(1, Math.ceil(valid.length / 300));
  for (let i = 0; i < valid.length; i++) {
    const point = valid[i];
    if (!visible(point)) { previous = null; continue; }
    if (i % step !== 0 && i !== valid.length - 1) continue;
    if (previous && (!hideEndpoints || (!crossesPrivateArea(previous, point, start)
      && !crossesPrivateArea(previous, point, end)))) {
      const a = project(previous), b = project(point);
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      segments.push({ id: `${i}:${previous.recordedAt}:${point.recordedAt}`, x: (a.x + b.x) / 2 - length / 2, y: (a.y + b.y) / 2,
        length, angle: `${Math.atan2(b.y - a.y, b.x - a.x)}rad` });
    }
    previous = point;
  }
  return segments;
}

function crossesPrivateArea(a: RunPoint, b: RunPoint, center: RunPoint): boolean {
  const cos = Math.cos(center.latitude * Math.PI / 180);
  const x = (p: RunPoint) => (p.longitude - center.longitude) * cos * 111_320;
  const y = (p: RunPoint) => (p.latitude - center.latitude) * 111_320;
  const ax = x(a), ay = y(a), dx = x(b) - ax, dy = y(b) - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy) <= 202;
}
