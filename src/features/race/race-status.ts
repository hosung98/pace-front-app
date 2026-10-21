import {
  RACE_TIME_LIMIT_MINUTES_PER_KM,
  type RaceStatus,
  type RaceSummary,
} from './types';

const MINUTE_MS = 60_000;

export function getJoinDeadline(race: Pick<RaceSummary, 'startsAt' | 'joinDeadlineMinutes'>): number {
  return race.startsAt - race.joinDeadlineMinutes * MINUTE_MS;
}

export function getRaceEndsAt(race: Pick<RaceSummary, 'startsAt' | 'distanceMeters'>): number {
  const limitMinutes = Math.ceil((race.distanceMeters / 1000) * RACE_TIME_LIMIT_MINUTES_PER_KM);
  return race.startsAt + limitMinutes * MINUTE_MS;
}

/** Same rules the server scheduler applies (see docs/API_REQUIREMENTS.md, 대결). */
export function getRaceStatus(race: RaceSummary, now = Date.now()): RaceStatus {
  if (race.cancelled) return 'cancelled';
  if (now < getJoinDeadline(race)) return 'recruiting';
  if (race.participantCount < race.minParticipants) return 'cancelled';
  if (now < race.startsAt) return 'confirmed';
  if (now < getRaceEndsAt(race)) return 'live';
  return 'finished';
}

export function canJoinRace(race: RaceSummary, now = Date.now()): boolean {
  return (
    !race.isJoined &&
    getRaceStatus(race, now) === 'recruiting' &&
    race.participantCount < race.maxParticipants
  );
}

export const RACE_STATUS_LABELS: Record<RaceStatus, string> = {
  recruiting: '모집 중',
  confirmed: '확정',
  cancelled: '취소됨',
  live: '진행 중',
  finished: '종료',
};

/** "2시간 5분", "12분", "45초" */
export function formatTimeUntil(targetMs: number, now = Date.now()): string {
  const totalSeconds = Math.max(0, Math.floor((targetMs - now) / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분`;
  return `${totalSeconds}초`;
}

/** "오늘 오후 7:00", "내일 오전 6:30", "10월 23일 (금) 오후 7:00" */
export function formatRaceStart(startsAt: number, now = Date.now()): string {
  const start = new Date(startsAt);
  const today = new Date(now);
  const dayDiff = Math.round(
    (new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86_400_000,
  );
  const time = start.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  if (dayDiff === 0) return `오늘 ${time}`;
  if (dayDiff === 1) return `내일 ${time}`;
  const date = start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  return `${date} ${time}`;
}

export function formatRaceDistance(distanceMeters: number): string {
  if (distanceMeters === 21097) return '하프';
  const km = distanceMeters / 1000;
  return `${Number.isInteger(km) ? km : km.toFixed(1)}km`;
}
