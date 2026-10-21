export type CrewPeriod = 'week' | 'month';

export type CrewMembership = 'leader' | 'member' | 'pending' | 'none';

/** One row of the crew leaderboard (GET /crews/rankings). */
export type CrewRankingItem = {
  id: string;
  name: string;
  rank: number;
  memberCount: number;
  distanceMeters: number;
  isMine: boolean;
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
};

export const CREW_MAX_MEMBERS = 50;
export const CREW_NAME_MAX_LENGTH = 20;
export const CREW_INTRO_MAX_LENGTH = 100;
