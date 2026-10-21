/**
 * recruiting → (join deadline) → confirmed | cancelled → (start) → live → (time limit) → finished
 * The server owns these transitions; the app derives the same status from timestamps for display.
 */
export type RaceStatus = 'recruiting' | 'confirmed' | 'cancelled' | 'live' | 'finished';

export type RaceVisibility = 'public' | 'private';

export type RaceResultStatus = 'finished' | 'did_not_finish';

export type RaceParticipant = {
  userId: string;
  nickname: string;
  isHost: boolean;
  isMe: boolean;
  /** Present once the race is finished. */
  result: {
    status: RaceResultStatus;
    rank: number | null;
    finishSeconds: number | null;
    distanceMeters: number;
  } | null;
};

export type RaceSummary = {
  id: string;
  title: string;
  hostNickname: string;
  distanceMeters: number;
  startsAt: number;
  /** Joining closes this many minutes before the start; the minimum headcount is checked then. */
  joinDeadlineMinutes: number;
  minParticipants: number;
  maxParticipants: number;
  participantCount: number;
  visibility: RaceVisibility;
  isJoined: boolean;
  isHost: boolean;
  /** Set by the server when it cancels the race (e.g. host cancel). Otherwise derived from time. */
  cancelled: boolean;
};

export type RaceDetail = RaceSummary & {
  participants: RaceParticipant[];
  /** Only visible to the host of a private race. */
  inviteCode: string | null;
};

export type CreateRaceInput = {
  title: string;
  distanceMeters: number;
  startsAt: number;
  joinDeadlineMinutes: number;
  minParticipants: number;
  maxParticipants: number;
  visibility: RaceVisibility;
};

export const RACE_DISTANCE_OPTIONS_METERS = [3000, 5000, 10000, 21097] as const;
export const RACE_DEADLINE_OPTIONS_MINUTES = [10, 30, 60] as const;
export const RACE_MIN_PARTICIPANTS = 2;
export const RACE_MAX_PARTICIPANTS = 20;
/** Runners get this many minutes per km to finish before the race closes. */
export const RACE_TIME_LIMIT_MINUTES_PER_KM = 12;
