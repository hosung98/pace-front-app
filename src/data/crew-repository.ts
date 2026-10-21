/**
 * In-memory mock of the crew API (docs/API_REQUIREMENTS.md §4.7).
 * Function signatures mirror the endpoints so the backend can be swapped in without touching screens.
 * State resets when the app reloads.
 */
import {
  CREW_MAX_MEMBERS,
  type CreateCrewInput,
  type CrewDetail,
  type CrewMemberStat,
  type CrewPeriod,
  type CrewRankingItem,
} from '@/features/crew/types';

type MockMember = Omit<CrewMemberStat, 'distanceMeters' | 'runCount' | 'isMe'> & {
  week: [distanceMeters: number, runCount: number];
  month: [distanceMeters: number, runCount: number];
};

type MockCrew = {
  id: string;
  name: string;
  intro: string;
  inviteCode: string;
  maxMembers: number;
  members: MockMember[];
};

const ME_ID = 'me';
const ME_NICKNAME = '페이서';
const MOCK_LATENCY_MS = 250;

const SAMPLE_NICKNAMES = ['하늘', '태오', '소율', '준서', '다은', '건우', '예린', '시우', '채원', '도윤', '라희', '지안', '우진', '서아'];

/** Deterministic sample crew whose members' weekly distances average `avgWeekMeters`. */
function sampleCrew(
  id: string,
  name: string,
  intro: string,
  inviteCode: string,
  memberCount: number,
  avgWeekMeters: number,
): MockCrew {
  const members: MockMember[] = Array.from({ length: memberCount }, (_, index) => {
    const factor = 1.6 - (index / Math.max(1, memberCount - 1)) * 1.2;
    const week = Math.round((avgWeekMeters * factor) / 100) * 100;
    const weekRuns = Math.max(1, Math.round(week / 6000));
    return {
      userId: `${id}-${index}`,
      nickname: SAMPLE_NICKNAMES[(index + id.length) % SAMPLE_NICKNAMES.length],
      role: index === 0 ? 'leader' : 'member',
      week: [week, weekRuns],
      month: [Math.round(week * 3.9), weekRuns * 4],
    };
  });
  return { id, name, intro, inviteCode, maxMembers: CREW_MAX_MEMBERS, members };
}

const crews: MockCrew[] = [
  {
    id: 'crew-hangang',
    name: '새벽 한강 러너스',
    intro: '평일 새벽 6시, 각자 동네에서 달리고 기록으로 만나요.',
    inviteCode: 'HAN6AM',
    maxMembers: CREW_MAX_MEMBERS,
    members: [
      { userId: 'u-jiwoo', nickname: '지우', role: 'leader', week: [32400, 5], month: [128600, 19] },
      { userId: ME_ID, nickname: ME_NICKNAME, role: 'member', week: [18200, 3], month: [74300, 12] },
      { userId: 'u-minjun', nickname: '민준', role: 'member', week: [27100, 4], month: [96800, 15] },
      { userId: 'u-seoyeon', nickname: '서연', role: 'member', week: [12500, 2], month: [58100, 9] },
      { userId: 'u-hyun', nickname: '현우', role: 'member', week: [21900, 4], month: [81200, 13] },
      { userId: 'u-yuna', nickname: '유나', role: 'member', week: [8400, 2], month: [40300, 7] },
    ],
  },
  sampleCrew('crew-seongsu', '성수 나이트런', '퇴근 후 성수에서 달리는 사람들', 'SSNIGHT', 14, 11600),
  sampleCrew('crew-jamsil', '잠실 페이스메이커', '하프 완주를 목표로 함께 달려요', 'JSPACE', 9, 11000),
  sampleCrew('crew-busan', '광안리 바람', '바다 보며 달리는 부산 크루', 'GWANGAN', 11, 12900),
  sampleCrew('crew-mapo', '마포 주말러닝', '주말엔 길게, 천천히', 'MAPOWKND', 7, 9200),
];

let myCrewId: string | null = 'crew-hangang';
let myPendingCrewId: string | null = null;

function wait<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS));
}

function crewTotal(crew: MockCrew, period: CrewPeriod): number {
  return crew.members.reduce((sum, member) => sum + member[period][0], 0);
}

function crewMemberCount(crew: MockCrew): number {
  return crew.members.length;
}

function rankedCrews(period: CrewPeriod): CrewRankingItem[] {
  return crews
    .map((crew) => ({
      id: crew.id,
      name: crew.name,
      memberCount: crewMemberCount(crew),
      distanceMeters: crewTotal(crew, period),
      isMine: crew.id === myCrewId,
    }))
    .sort((a, b) => b.distanceMeters - a.distanceMeters)
    .map((crew, index) => ({ ...crew, rank: index + 1 }));
}

function findCrew(crewId: string): MockCrew {
  const crew = crews.find((item) => item.id === crewId);
  if (!crew) throw new Error('크루를 찾을 수 없어요.');
  return crew;
}

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

/** GET /crews/rankings?period= */
export function getCrewRankings(period: CrewPeriod): Promise<CrewRankingItem[]> {
  return wait(rankedCrews(period));
}

/** GET /users/me/crew → crewId or null */
export function getMyCrewId(): Promise<string | null> {
  return wait(myCrewId);
}

/** GET /crews/{crewId}?period= (+ /members/stats) */
export function getCrewDetail(crewId: string, period: CrewPeriod): Promise<CrewDetail> {
  const crew = findCrew(crewId);
  const me = crew.members.find((member) => member.userId === ME_ID);
  const isLeader = me?.role === 'leader';
  const membership = me ? me.role : myPendingCrewId === crewId ? 'pending' : 'none';
  const members = crew.members
    .map((member) => ({
      userId: member.userId,
      nickname: member.nickname,
      role: member.role,
      distanceMeters: member[period][0],
      runCount: member[period][1],
      isMe: member.userId === ME_ID,
    }))
    .sort((a, b) => b.distanceMeters - a.distanceMeters);

  return wait({
    id: crew.id,
    name: crew.name,
    intro: crew.intro,
    leaderNickname: crew.members.find((member) => member.role === 'leader')?.nickname ?? '크루장',
    memberCount: crewMemberCount(crew),
    maxMembers: crew.maxMembers,
    period,
    rank: rankedCrews(period).find((item) => item.id === crew.id)?.rank ?? null,
    distanceMeters: crewTotal(crew, period),
    members,
    membership,
    inviteCode: isLeader ? crew.inviteCode : null,
    pendingRequestCount: isLeader ? 2 : 0,
  });
}

/** POST /crews */
export function createCrew(input: CreateCrewInput): Promise<string> {
  if (myCrewId) return Promise.reject(new Error('이미 가입한 크루가 있어요. 크루는 하나만 가입할 수 있어요.'));
  const id = `crew-${Date.now()}`;
  crews.push({
    id,
    name: input.name.trim(),
    intro: input.intro.trim(),
    inviteCode: generateInviteCode(),
    maxMembers: CREW_MAX_MEMBERS,
    members: [{ userId: ME_ID, nickname: ME_NICKNAME, role: 'leader', week: [0, 0], month: [0, 0] }],
  });
  myCrewId = id;
  myPendingCrewId = null;
  return wait(id);
}

/** POST /crews/join-by-code */
export function joinCrewByCode(code: string): Promise<string> {
  if (myCrewId) return Promise.reject(new Error('이미 가입한 크루가 있어요. 크루는 하나만 가입할 수 있어요.'));
  const crew = crews.find((item) => item.inviteCode === code.trim().toUpperCase());
  if (!crew) return Promise.reject(new Error('초대 코드가 올바르지 않아요.'));
  crew.members.push({ userId: ME_ID, nickname: ME_NICKNAME, role: 'member', week: [0, 0], month: [0, 0] });
  myCrewId = crew.id;
  myPendingCrewId = null;
  return wait(crew.id);
}

/** POST /crews/{crewId}/join-requests (leader approves later) */
export function requestToJoinCrew(crewId: string): Promise<void> {
  if (myCrewId) return Promise.reject(new Error('이미 가입한 크루가 있어요. 크루는 하나만 가입할 수 있어요.'));
  findCrew(crewId);
  myPendingCrewId = crewId;
  return wait(undefined);
}

/** DELETE /crews/{crewId}/join-requests/me */
export function cancelCrewJoinRequest(): Promise<void> {
  myPendingCrewId = null;
  return wait(undefined);
}

/** DELETE /crews/{crewId}/members/me */
export function leaveCrew(crewId: string): Promise<void> {
  const crew = findCrew(crewId);
  const me = crew.members.find((member) => member.userId === ME_ID);
  if (me?.role === 'leader' && crew.members.length > 1) {
    return Promise.reject(new Error('크루장은 다른 멤버에게 크루장을 넘긴 뒤 나갈 수 있어요.'));
  }
  crew.members = crew.members.filter((member) => member.userId !== ME_ID);
  if (crew.members.length === 0) crews.splice(crews.indexOf(crew), 1);
  myCrewId = null;
  return wait(undefined);
}

/** POST /crews/{crewId}/invite-code (leader only) */
export function regenerateCrewInviteCode(crewId: string): Promise<string> {
  const crew = findCrew(crewId);
  crew.inviteCode = generateInviteCode();
  return wait(crew.inviteCode);
}
