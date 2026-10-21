export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return hours > 0
    ? `${hours}:${paddedMinutes}:${paddedSeconds}`
    : `${paddedMinutes}:${paddedSeconds}`;
}

export function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm === null || !Number.isFinite(secondsPerKm)) return '—';
  const roundedSeconds = Math.round(secondsPerKm);
  return `${Math.floor(roundedSeconds / 60)}'${String(roundedSeconds % 60).padStart(2, '0')}''`;
}

export function metersToKm(meters: number): number {
  return meters / 1000;
}

export function formatKm(meters: number, fractionDigits = 2): string {
  return metersToKm(meters).toFixed(fractionDigits);
}

export function formatSpeedKmh(distanceMeters: number, durationSeconds: number): string {
  if (!(durationSeconds > 0)) return '—';
  return `${((distanceMeters / durationSeconds) * 3.6).toFixed(1)} km/h`;
}

/** 10월 21일 (수) */
export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

/** 10월 21일 수요일 */
export function formatLongDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

/** 10월 21일 수요일 오후 2:44 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}
