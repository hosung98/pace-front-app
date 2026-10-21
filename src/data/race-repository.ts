/**
 * In-memory mock of the race API (docs/API_REQUIREMENTS.md §4.8).
 * Times are relative to app launch so every status (모집 중 / 확정 / 진행 중 / 종료) is visible in the preview.
 */
import { canJoinRace, getRaceStatus, getRaceWindowRange } from '@/features/race/race-status';
import type {
  CreateRaceInput,
  RaceDetail,
  RaceParticipant,
  RaceSearchParams,
  RaceSummary,
} from '@/features/race/types';

type MockRace = Omit<RaceSummary, 'participantCount' | 'isJoined' | 'isHost'> & {
  hostId: string;
  inviteCode: string | null;
  participants: Omit<RaceParticipant, 'isMe' | 'isHost'>[];
};

const ME_ID = 'me';
const ME_NICKNAME = '페이서';
const MOCK_LATENCY_MS = 250;
const MINUTE = 60_000;
const launchedAt = Date.now();

function at(minutesFromLaunch: number): number {
  const tenMinutes = 10 * MINUTE;
  return Math.ceil((launchedAt + minutesFromLaunch * MINUTE) / tenMinutes) * tenMinutes;
}

/** This weekend's Saturday (+addDays) at `hour`:00 local time, or next week's if already past — keeps the 주말 filter populated. */
function nextWeekendAt(hour: number, addDays = 0): number {
  const now = new Date(launchedAt);
  const day = now.getDay();
  const toSaturday = day === 0 ? -1 : 6 - day;
  const time = new Date(now.getFullYear(), now.getMonth(), now.getDate() + toSaturday + addDays, hour).getTime();
  return time > launchedAt + 90 * MINUTE ? time : time + 7 * 86_400_000;
}

function crowd(count: number): MockRace['participants'] {
  const names = ['하늘', '태오', '소율', '준서', '다은', '건우', '예린', '시우', '채원', '도윤', '라희', '지안'];
  return Array.from({ length: count }, (_, index) => person(`u-crowd-${index}`, names[index % names.length]));
}

function person(userId: string, nickname: string): MockRace['participants'][number] {
  return { userId, nickname, result: null };
}

const races: MockRace[] = [
  {
    id: 'race-soon-3k',
    title: '지금 바로 3km',
    hostId: 'u-crowd-0',
    hostNickname: '하늘',
    distanceMeters: 3000,
    startsAt: at(70),
    joinDeadlineMinutes: 10,
    minParticipants: 2,
    maxParticipants: 6,
    visibility: 'public',
    cancelled: false,
    inviteCode: null,
    participants: crowd(3),
  },
  {
    id: 'race-full-5k',
    title: '퇴근길 5km (정원 마감)',
    hostId: 'u-crowd-0',
    hostNickname: '하늘',
    distanceMeters: 5000,
    startsAt: at(60 * 5),
    joinDeadlineMinutes: 30,
    minParticipants: 3,
    maxParticipants: 4,
    visibility: 'public',
    cancelled: false,
    inviteCode: null,
    participants: crowd(4),
  },
  {
    id: 'race-tomorrow-10k',
    title: '내일 밤 10km 페이스 대결',
    hostId: 'u-crowd-1',
    hostNickname: '태오',
    distanceMeters: 10000,
    startsAt: at(60 * 26),
    joinDeadlineMinutes: 60,
    minParticipants: 3,
    maxParticipants: 12,
    visibility: 'public',
    cancelled: false,
    inviteCode: null,
    participants: crowd(5),
  },
  {
    id: 'race-weekend-half',
    title: '주말 하프 완주 챌린지',
    hostId: 'u-crowd-2',
    hostNickname: '소율',
    distanceMeters: 21097,
    startsAt: nextWeekendAt(7),
    joinDeadlineMinutes: 60,
    minParticipants: 3,
    maxParticipants: 20,
    visibility: 'public',
    cancelled: false,
    inviteCode: null,
    participants: crowd(6),
  },
  {
    id: 'race-weekend-5k',
    title: '일요일 저녁 5km',
    hostId: 'u-crowd-3',
    hostNickname: '준서',
    distanceMeters: 5000,
    startsAt: nextWeekendAt(19, 1),
    joinDeadlineMinutes: 30,
    minParticipants: 2,
    maxParticipants: 10,
    visibility: 'public',
    cancelled: false,
    inviteCode: null,
    participants: crowd(2),
  },
  {
    id: 'race-tonight-5k',
    title: '오늘 저녁 5km 한 판',
    hostId: 'u-jiwoo',
    hostNickname: '지우',
    distanceMeters: 5000,
    startsAt: at(150),
    joinDeadlineMinutes: 30,
    minParticipants: 4,
    maxParticipants: 10,
    visibility: 'public',
    cancelled: false,
    inviteCode: null,
    participants: [person('u-jiwoo', '지우'), person('u-minjun', '민준'), person('u-yuna', '유나')],
  },
  {
    id: 'race-morning-3k',
    title: '출근 전 3km 스프린트',
    hostId: 'u-hyun',
    hostNickname: '현우',
    distanceMeters: 3000,
    startsAt: at(60 * 15),
    joinDeadlineMinutes: 10,
    minParticipants: 2,
    maxParticipants: 6,
    visibility: 'public',
    cancelled: false,
    inviteCode: null,
    participants: [person('u-hyun', '현우'), person(ME_ID, ME_NICKNAME)],
  },
  {
    id: 'race-weekend-10k',
    title: '10km 기록 경쟁',
    hostId: 'u-seoyeon',
    hostNickname: '서연',
    distanceMeters: 10000,
    startsAt: at(60 * 40),
    joinDeadlineMinutes: 60,
    minParticipants: 5,
    maxParticipants: 20,
    visibility: 'public',
    cancelled: false,
    inviteCode: null,
    participants: [person('u-seoyeon', '서연'), person('u-dohyun', '도현')],
  },
  {
    id: 'race-live-5k',
    title: '점심 5km 번개',
    hostId: 'u-minjun',
    hostNickname: '민준',
    distanceMeters: 5000,
    startsAt: at(-20),
    joinDeadlineMinutes: 10,
    minParticipants: 2,
    maxParticipants: 8,
    visibility: 'public',
    cancelled: false,
    inviteCode: null,
    participants: [person('u-minjun', '민준'), person('u-jiwoo', '지우'), person(ME_ID, ME_NICKNAME), person('u-hyun', '현우')],
  },
  {
    id: 'race-finished-5k',
    title: '어제 밤 5km 대결',
    hostId: ME_ID,
    hostNickname: ME_NICKNAME,
    distanceMeters: 5000,
    startsAt: at(-60 * 20),
    joinDeadlineMinutes: 30,
    minParticipants: 3,
    maxParticipants: 10,
    visibility: 'private',
    cancelled: false,
    inviteCode: 'NIGHT5',
    participants: [
      { userId: 'u-jiwoo', nickname: '지우', result: { status: 'finished', rank: 1, finishSeconds: 1412, distanceMeters: 5000 } },
      { userId: ME_ID, nickname: ME_NICKNAME, result: { status: 'finished', rank: 2, finishSeconds: 1538, distanceMeters: 5000 } },
      { userId: 'u-minjun', nickname: '민준', result: { status: 'finished', rank: 3, finishSeconds: 1601, distanceMeters: 5000 } },
      { userId: 'u-yuna', nickname: '유나', result: { status: 'did_not_finish', rank: null, finishSeconds: null, distanceMeters: 3120 } },
      { userId: 'u-seoyeon', nickname: '서연', result: { status: 'did_not_start', rank: null, finishSeconds: null, distanceMeters: 0 } },
    ],
  },
  {
    id: 'race-cancelled-10k',
    title: '새벽 10km 도전',
    hostId: 'u-dohyun',
    hostNickname: '도현',
    distanceMeters: 10000,
    startsAt: at(-60 * 30),
    joinDeadlineMinutes: 30,
    minParticipants: 5,
    maxParticipants: 10,
    visibility: 'public',
    cancelled: false,
    inviteCode: null,
    participants: [person('u-dohyun', '도현'), person(ME_ID, ME_NICKNAME)],
  },
];

function wait<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS));
}

function toSummary(race: MockRace): RaceSummary {
  const { participants, hostId, inviteCode: _inviteCode, ...rest } = race;
  return {
    ...rest,
    participantCount: participants.length,
    isJoined: participants.some((participant) => participant.userId === ME_ID),
    isHost: hostId === ME_ID,
  };
}

function findRace(raceId: string): MockRace {
  const race = races.find((item) => item.id === raceId);
  if (!race) throw new Error('대결을 찾을 수 없어요.');
  return race;
}

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

/** GET /races?scope=open — public races still accepting runners. */
export function listOpenRaces(): Promise<RaceSummary[]> {
  const now = Date.now();
  return wait(
    races
      .filter((race) => race.visibility === 'public')
      .map(toSummary)
      .filter((race) => !race.isJoined && getRaceStatus(race, now) === 'recruiting')
      .sort((a, b) => a.startsAt - b.startsAt),
  );
}

/**
 * GET /races?scope=open&distance=&from=&to=&hideFull= — race search.
 * Public races still recruiting (joined ones included and marked), soonest first.
 */
export function searchRaces(params: RaceSearchParams): Promise<RaceSummary[]> {
  const now = Date.now();
  const { from, to } = getRaceWindowRange(params.window, now);
  return wait(
    races
      .filter((race) => race.visibility === 'public')
      .map(toSummary)
      .filter((race) => getRaceStatus(race, now) === 'recruiting')
      .filter((race) => params.distanceMeters === null || race.distanceMeters === params.distanceMeters)
      .filter((race) => race.startsAt >= from && (to === null || race.startsAt < to))
      .filter((race) => !params.hideFull || race.isJoined || race.participantCount < race.maxParticipants)
      .sort((a, b) => a.startsAt - b.startsAt),
  );
}

/** GET /races?scope=mine — races I host or joined, newest first after upcoming ones. */
export function listMyRaces(): Promise<RaceSummary[]> {
  return wait(
    races
      .map(toSummary)
      .filter((race) => race.isJoined)
      .sort((a, b) => b.startsAt - a.startsAt),
  );
}

/** GET /races/{raceId} (+ /participants, /results) */
export function getRaceDetail(raceId: string): Promise<RaceDetail> {
  const race = findRace(raceId);
  const summary = toSummary(race);
  return wait({
    ...summary,
    inviteCode: summary.isHost ? race.inviteCode : null,
    participants: race.participants.map((participant) => ({
      ...participant,
      isHost: participant.userId === race.hostId,
      isMe: participant.userId === ME_ID,
    })),
  });
}

/** POST /races */
export function createRace(input: CreateRaceInput): Promise<string> {
  const id = `race-${Date.now()}`;
  races.push({
    ...input,
    id,
    title: input.title.trim(),
    hostId: ME_ID,
    hostNickname: ME_NICKNAME,
    cancelled: false,
    inviteCode: input.visibility === 'private' ? generateInviteCode() : null,
    participants: [person(ME_ID, ME_NICKNAME)],
  });
  return wait(id);
}

/** POST /races/{raceId}/participants */
export function joinRace(raceId: string): Promise<void> {
  const race = findRace(raceId);
  if (!canJoinRace(toSummary(race))) {
    return Promise.reject(new Error('모집이 마감됐거나 정원이 가득 찼어요.'));
  }
  race.participants.push(person(ME_ID, ME_NICKNAME));
  return wait(undefined);
}

/** POST /races/join-by-code */
export function joinRaceByCode(code: string): Promise<string> {
  const race = races.find((item) => item.inviteCode === code.trim().toUpperCase());
  if (!race) return Promise.reject(new Error('초대 코드가 올바르지 않아요.'));
  const summary = toSummary(race);
  if (summary.isJoined) return wait(race.id);
  if (!canJoinRace(summary)) return Promise.reject(new Error('모집이 마감됐거나 정원이 가득 찼어요.'));
  race.participants.push(person(ME_ID, ME_NICKNAME));
  return wait(race.id);
}

/** DELETE /races/{raceId}/participants/me */
export function leaveRace(raceId: string): Promise<void> {
  const race = findRace(raceId);
  if (getRaceStatus(toSummary(race)) !== 'recruiting') {
    return Promise.reject(new Error('모집 마감 후에는 나갈 수 없어요.'));
  }
  race.participants = race.participants.filter((participant) => participant.userId !== ME_ID);
  return wait(undefined);
}

/** POST /races/{raceId}/cancel (host only) */
export function cancelRace(raceId: string): Promise<void> {
  const race = findRace(raceId);
  if (race.hostId !== ME_ID) return Promise.reject(new Error('방장만 취소할 수 있어요.'));
  race.cancelled = true;
  return wait(undefined);
}
