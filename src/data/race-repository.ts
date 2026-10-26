import { getRaceWindowRange } from '@/features/race/race-status';
import type { CreateRaceInput, RaceDetail, RaceSearchParams, RaceSummary } from '@/features/race/types';
import { api } from '@/lib/api';

type RaceResponse = Omit<RaceSummary, 'startsAt'> & { startsAt: string };
type RaceDetailResponse = Omit<RaceDetail, 'startsAt'> & { startsAt: string };
function fromServer<T extends RaceResponse>(race: T): Omit<T, 'startsAt'> & { startsAt: number } {
  const startsAt = Date.parse(race.startsAt);
  if (!Number.isFinite(startsAt)) throw new Error('대결 시작 시간 응답이 올바르지 않아요.');
  return { ...race, startsAt };
}

export async function listOpenRaces(): Promise<RaceSummary[]> {
  return (await api<RaceResponse[]>('/races?scope=open')).map(fromServer).filter((race) => !race.isJoined);
}

export async function searchRaces(params: RaceSearchParams): Promise<RaceSummary[]> {
  const { from, to } = getRaceWindowRange(params.window);
  const query = new URLSearchParams({ scope: 'open', from: new Date(from).toISOString(), hideFull: String(params.hideFull) });
  if (to !== null) query.set('to', new Date(to).toISOString());
  if (params.distanceMeters !== null) query.set('distanceMeters', String(params.distanceMeters));
  return (await api<RaceResponse[]>(`/races?${query.toString()}`)).map(fromServer);
}

export async function listMyRaces(): Promise<RaceSummary[]> {
  return (await api<RaceResponse[]>('/races?scope=mine')).map(fromServer);
}

export async function getRaceDetail(id: string): Promise<RaceDetail> {
  return fromServer(await api<RaceDetailResponse>(`/races/${encodeURIComponent(id)}`));
}

export async function createRace(input: CreateRaceInput): Promise<string> {
  return (await api<{ id: string }>('/races', {
    method: 'POST', body: JSON.stringify({ ...input, title: input.title.trim(), startsAt: new Date(input.startsAt).toISOString() }),
  })).id;
}

export const updateRace = (id: string, input: CreateRaceInput) =>
  api<void>(`/races/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify({ ...input, title: input.title.trim(), startsAt: new Date(input.startsAt).toISOString() }),
  });

export const joinRace = (id: string) =>
  api<void>(`/races/${encodeURIComponent(id)}/participants`, { method: 'POST' });
export async function joinRaceByCode(code: string): Promise<string> {
  return (await api<{ id: string }>('/races/join-by-code', {
    method: 'POST', body: JSON.stringify({ code: code.trim().toUpperCase() }),
  })).id;
}
export const leaveRace = (id: string) =>
  api<void>(`/races/${encodeURIComponent(id)}/participants/me`, { method: 'DELETE' });
export const cancelRace = (id: string) =>
  api<void>(`/races/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
