import { getSessionState, requireUserId } from '@/features/auth/session-store';
import type { CompletedRun } from '@/features/running/types';
import { getUploadRoutePoints } from '@/features/running/run-session';
import { api } from '@/lib/api';
import { ApiError, errorMessage } from '@/lib/api-transport';
import { readJson, STORAGE_KEYS, writeJson } from './storage';

type Entry = { run: CompletedRun; serverId?: string; deleted?: boolean };
type Queue = { accounts: Record<string, Entry[]>; guestOwners: Record<string, string> };
type RunResponse = {
  id: string; clientRunId: string; startedAt: string; endedAt: string;
  distanceMeters: number; durationSeconds: number; averagePaceSecondsPerKm: number | null;
  route?: { points?: { recordedAt: string; latitude: number; longitude: number;
    altitudeMeters: number | null; accuracyMeters: number | null; speedMetersPerSecond: number | null }[] };
};
let serial = Promise.resolve();

function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = serial.then(operation);
  serial = result.then(() => {}, () => {});
  return result;
}

async function queue(): Promise<Queue> {
  return readJson<Queue>(STORAGE_KEYS.runSync, { accounts: {}, guestOwners: {} });
}
const owner = () => getSessionState().session?.user.id ?? null;
function assertOwner(id: string | null) {
  if (owner() !== id) throw new Error('기록을 불러오는 계정이 변경됐어요. 다시 시도해 주세요.');
}
const scope = (id: string | null) => id ? `user:${id}` : 'guest';
const newest = (a: CompletedRun, b: CompletedRun) => b.startedAt - a.startedAt;

export function toCompletedRun(response: RunResponse): CompletedRun {
  return {
    id: response.id, serverId: response.id, clientRunId: response.clientRunId, startedAt: Date.parse(response.startedAt),
    endedAt: Date.parse(response.endedAt), distanceMeters: response.distanceMeters,
    durationSeconds: response.durationSeconds, averagePaceSecondsPerKm: response.averagePaceSecondsPerKm,
    routePoints: (response.route?.points ?? []).map((point) => ({
      ...point, recordedAt: Date.parse(point.recordedAt),
    })),
  };
}

async function guestRuns(): Promise<CompletedRun[]> {
  const [runs, all] = await Promise.all([
    readJson<CompletedRun[]>(STORAGE_KEYS.completedRuns, []), queue(),
  ]);
  return runs.filter((run) => !all.guestOwners[run.id]);
}

// 로그인 화면에서 안내한 기기 기록만 처음 연결한 계정에 귀속시킵니다.
export async function claimGuestRuns(): Promise<void> {
  const id = requireUserId();
  return exclusive(async () => {
    assertOwner(id);
    const runs = await guestRuns();
    if (!runs.length) return;
    const all = await queue();
    const entries = all.accounts[scope(id)] ?? [];
    for (const run of runs) {
      if (all.guestOwners[run.id] && all.guestOwners[run.id] !== id) continue;
      if (!entries.some((entry) => entry.run.id === run.id)) entries.push({ run });
      all.guestOwners[run.id] = id;
    }
    all.accounts[scope(id)] = entries;
    await writeJson(STORAGE_KEYS.runSync, all);
    await writeJson(STORAGE_KEYS.completedRuns, []);
  });
}

async function sync(id: string): Promise<void> {
  if (owner() !== id) throw new Error('기록 동기화 계정이 변경됐어요.');
  const all = await queue();
  const entries = all.accounts[scope(id)] ?? [];
  // 서버 결과를 항목마다 저장해 중단 후에도 완료된 업로드를 재전송하지 않습니다.
  for (const entry of entries) {
    if (owner() !== id) throw new Error('기록 동기화 계정이 변경됐어요.');
    if (entry.deleted) {
      continue;
    }
    if (entry.serverId) continue;
    const run = entry.run;
    const saved = await api<RunResponse>('/runs', {
      method: 'POST', headers: { 'Idempotency-Key': run.id },
      body: JSON.stringify({
        clientRunId: run.id, startedAt: new Date(run.startedAt).toISOString(),
        endedAt: new Date(run.endedAt).toISOString(), durationSeconds: run.durationSeconds,
        distanceMeters: Math.round(run.distanceMeters),
        // 기존 기록은 원본을 남기고 서버의 시간 조건에 맞는 경로만 전송합니다.
        routePoints: getUploadRoutePoints(run).map((point) => ({
          ...point, recordedAt: new Date(point.recordedAt).toISOString(),
        })),
      }),
    });
    entry.serverId = saved.id;
    all.accounts[scope(id)] = entries;
    await writeJson(STORAGE_KEYS.runSync, all);
  }
}

export async function syncCompletedRuns(): Promise<void> {
  const id = requireUserId();
  await claimGuestRuns();
  return exclusive(() => sync(id));
}

export async function listCompletedRuns(): Promise<CompletedRun[]> {
  const id = owner();
  if (!id) return (await guestRuns()).sort(newest);
  await syncCompletedRuns();
  const result: CompletedRun[] = [];
  let cursor: string | null = null;
  const seen = new Set<string>();
  do {
    assertOwner(id);
    const query = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const page: { items: RunResponse[]; nextCursor: string | null } = await api(
      `/runs?limit=50${query}`,
    );
    assertOwner(id);
    result.push(...page.items.map(toCompletedRun));
    cursor = page.nextCursor;
    if (cursor && seen.has(cursor)) throw new Error('서버의 목록 커서가 반복돼요.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return result;
}

export async function getCompletedRun(runId: string): Promise<CompletedRun | null> {
  const id = owner();
  if (!id) return (await guestRuns()).find((run) => run.id === runId) ?? null;
  return exclusive(async () => {
    assertOwner(id);
    const entries = (await queue()).accounts[scope(id)] ?? [];
    const local = entries.find((entry) => entry.run.id === runId || entry.serverId === runId);
    if (local && !local.serverId) return local.deleted ? null : local.run;
    try {
      return toCompletedRun(await api<RunResponse>(`/runs/${local?.serverId ?? encodeURIComponent(runId)}?route=full`));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  });
}

export async function saveCompletedRun(
  run: CompletedRun,
  ownerId: string | null = owner(),
): Promise<{ synced: boolean; message: string }> {
  return exclusive(async () => {
    if (!ownerId) {
      const runs = await guestRuns();
      await writeJson(STORAGE_KEYS.completedRuns, [run, ...runs.filter((item) => item.id !== run.id)].sort(newest));
      return { synced: false, message: '러닝을 기기에 저장했어요. 로그인하면 계정에 동기화할 수 있어요.' };
    }
    const all = await queue();
    const entries = all.accounts[scope(ownerId)] ?? [];
    if (!entries.some((entry) => entry.run.id === run.id)) entries.push({ run });
    all.accounts[scope(ownerId)] = entries;
    await writeJson(STORAGE_KEYS.runSync, all);
    try {
      await sync(ownerId);
      return { synced: true, message: '러닝을 기기와 계정에 저장했어요.' };
    } catch (error) {
      console.warn('러닝은 기기에 보관했지만 서버 동기화에 실패했어요.', error);
      return { synced: false, message: `기기 저장은 완료했어요. 계정 동기화는 기록 화면에서 다시 시도해 주세요. ${errorMessage(error, '')}` };
    }
  });
}

export async function deleteCompletedRun(runId: string): Promise<void> {
  const id = owner();
  return exclusive(async () => {
    assertOwner(id);
    if (!id) {
      await writeJson(STORAGE_KEYS.completedRuns, (await guestRuns()).filter((run) => run.id !== runId));
      return;
    }
    const all = await queue();
    const entries = all.accounts[scope(id)] ?? [];
    const entry = entries.find((item) => item.run.id === runId || item.serverId === runId);
    // 삭제는 서버 성공을 확인한 뒤 로컬 상태에 반영합니다.
    if (!entry || entry.serverId) await api<void>(`/runs/${entry?.serverId ?? encodeURIComponent(runId)}`, { method: 'DELETE' });
    if (entry) entry.deleted = true;
    all.accounts[scope(id)] = entries;
    await writeJson(STORAGE_KEYS.runSync, all);
  });
}

export async function restoreCompletedRun(run: CompletedRun): Promise<void> {
  const id = owner();
  return exclusive(async () => {
    assertOwner(id);
    if (!id) {
      const runs = await guestRuns();
      if (!runs.some((item) => item.id === run.id)) await writeJson(STORAGE_KEYS.completedRuns, [...runs, run].sort(newest));
      return;
    }
    const all = await queue();
    const entries = all.accounts[scope(id)] ?? [];
    const entry = entries.find((item) => item.run.id === run.id || item.serverId === run.id);
    const serverId = entry?.serverId ?? run.serverId;
    if (serverId) await api(`/runs/${serverId}/restore`, { method: 'POST' });
    if (entry) entry.deleted = false;
    all.accounts[scope(id)] = entries;
    await writeJson(STORAGE_KEYS.runSync, all);
  });
}

export async function removeAccountRunCache(): Promise<void> {
  const id = requireUserId();
  return exclusive(async () => {
    const all = await queue();
    delete all.accounts[scope(id)];
    await writeJson(STORAGE_KEYS.runSync, all);
  });
}
