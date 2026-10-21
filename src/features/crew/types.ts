import type { CrewRegion } from '@/features/crew/regions';

export type CrewPeriod = 'week' | 'month';

export type CrewMembership = 'leader' | 'member' | 'pending' | 'none';

/** One row of the crew leaderboard (GET /crews/rankings). */
export type CrewRankingItem = {
  id: string;
  name: string;
  region: CrewRegion | null;
  rank: number;
  memberCount: number;
  distanceMeters: number;
  isMine: boolean;
};

/** One row of crew search (GET /crews?query=&sido=&sigungu=). Distance is this week's total. */
export type CrewSearchItem = {
  id: string;
  name: string;
  intro: string;
  region: CrewRegion | null;
  memberCount: number;
  maxMembers: number;
  weekDistanceMeters: number;
  isMine: boolean;
};

export type CrewSearchParams = {
  query?: string;
  sido?: string | null;
  sigungu?: string | null;
};

export type CrewMemberStat = {
  userId: string;
  nickname: string;
  role: 'leader' | 'member';
  distanceMeters: number;
  runCount: number;
  isMe: boolean;
};

/** GET /crews/{crewId}?period= */
export type CrewDetail = {
  id: string;
  name: string;
  intro: string;
  region: CrewRegion | null;
  leaderNickname: string;
  memberCount: number;
  maxMembers: number;
  period: CrewPeriod;
  rank: number | null;
  distanceMeters: number;
  members: CrewMemberStat[];
  membership: CrewMembership;
  /** Only visible to the leader. */
  inviteCode: string | null;
  /** Only visible to the leader. */
  pendingRequestCount: number;
};

export type CreateCrewInput = {
  name: string;
  intro: string;
  region: CrewRegion | null;
};

export const CREW_MAX_MEMBERS = 50;
/** After leaving a crew, joining or creating another one is blocked for this long (stops ranking hopping). */
export const CREW_REJOIN_COOLDOWN_HOURS = 24;
export const CREW_NAME_MAX_LENGTH = 20;
export const CREW_INTRO_MAX_LENGTH = 100;
