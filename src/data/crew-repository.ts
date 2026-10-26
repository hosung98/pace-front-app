import type {
  CreateCrewInput, CrewDetail, CrewPeriod, CrewRankingItem, CrewSearchItem, CrewSearchParams,
} from '@/features/crew/types';
import { api } from '@/lib/api';

export const getCrewRankings = (period: CrewPeriod) =>
  api<CrewRankingItem[]>(`/crews/rankings?period=${period}`);

export function searchCrews(params: CrewSearchParams): Promise<CrewSearchItem[]> {
  const query = new URLSearchParams();
  if (params.query?.trim()) query.set('query', params.query.trim());
  if (params.sido) query.set('sido', params.sido);
  if (params.sigungu) query.set('sigungu', params.sigungu);
  return api(`/crews?${query.toString()}`);
}

export async function getMyCrewId(): Promise<string | null> {
  return (await api<{ crewId: string | null }>('/users/me/crew')).crewId;
}

export const getCrewDetail = (id: string, period: CrewPeriod) =>
  api<CrewDetail>(`/crews/${encodeURIComponent(id)}?period=${period}`);

export async function createCrew(input: CreateCrewInput): Promise<string> {
  return (await api<{ id: string }>('/crews', {
    method: 'POST', body: JSON.stringify({ ...input, name: input.name.trim(), intro: input.intro.trim() }),
  })).id;
}

export const updateCrew = (id: string, input: CreateCrewInput) =>
  api<void>(`/crews/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify({ ...input, name: input.name.trim(), intro: input.intro.trim() }),
  });

export async function joinCrewByCode(code: string): Promise<string> {
  return (await api<{ id: string }>('/crews/join-by-code', {
    method: 'POST', body: JSON.stringify({ code: code.trim().toUpperCase() }),
  })).id;
}

export const requestToJoinCrew = (id: string) =>
  api<void>(`/crews/${encodeURIComponent(id)}/join-requests`, { method: 'POST' });
export const cancelCrewJoinRequest = () =>
  api<void>('/crews/join-requests/me', { method: 'DELETE' });
export const leaveCrew = (id: string) =>
  api<void>(`/crews/${encodeURIComponent(id)}/members/me`, { method: 'DELETE' });

export async function regenerateCrewInviteCode(id: string): Promise<string> {
  return (await api<{ inviteCode: string }>(`/crews/${encodeURIComponent(id)}/invite-code`, {
    method: 'POST',
  })).inviteCode;
}

export type CrewJoinRequest = { userId: string; nickname: string };
export const getCrewJoinRequests = (id: string) =>
  api<CrewJoinRequest[]>(`/crews/${encodeURIComponent(id)}/join-requests`);
export const reviewCrewJoinRequest = (id: string, userId: string, approve: boolean) =>
  api<void>(`/crews/${encodeURIComponent(id)}/join-requests/${encodeURIComponent(userId)}/${approve ? 'approve' : 'reject'}`, { method: 'POST' });
export const transferCrewLeadership = (id: string, userId: string) =>
  api<void>(`/crews/${encodeURIComponent(id)}/leader`, { method: 'POST', body: JSON.stringify({ userId }) });
