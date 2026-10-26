const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const tokens = (id = 'alice', suffix = 'initial', expires = 1800) => ({
  accessToken: `${id}-${suffix}`,
  refreshToken: `${id}-refresh-${suffix}`,
  accessTokenExpiresIn: expires,
  user: { id, nickname: id, profileImageUrl: null },
  isNewUser: false,
});
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
const run = {
  id: 'local-run', startedAt: Date.parse('2026-05-18T01:00:00Z'),
  endedAt: Date.parse('2026-05-18T01:10:00Z'), distanceMeters: 1500.4,
  durationSeconds: 600, averagePaceSecondsPerKm: 400,
  routePoints: [{
    latitude: 37.5, longitude: 127, altitudeMeters: null, accuracyMeters: 5,
    speedMetersPerSecond: 2.5, recordedAt: Date.parse('2026-05-18T01:00:00Z'),
  }],
};
const serverRun = {
  id: 'server-run', clientRunId: run.id,
  startedAt: new Date(run.startedAt).toISOString(), endedAt: new Date(run.endedAt).toISOString(),
  distanceMeters: 1500, durationSeconds: 600, averagePaceSecondsPerKm: 400,
};

// 각 테스트는 실제 TS 모듈을 별도 컨텍스트에서 실행하고 네이티브 저장소와 HTTP만 대체합니다.
async function harness() {
  const cache = new Map();
  const memory = new Map();
  const secure = new Map();
  const h = {
    memory, secure,
    fetch: async () => { throw new Error('예상하지 못한 HTTP 요청'); },
    beforeWrite: async () => {},
    beforeSecureWrite: async () => {},
  };
  const mocks = {
    react: { useSyncExternalStore: () => {} },
    '@react-native-async-storage/async-storage': {
      getItem: async (key) => memory.get(key) ?? null,
      setItem: async (key, value) => { await h.beforeWrite(key, value); memory.set(key, value); },
      removeItem: async (key) => { memory.delete(key); },
    },
    'expo-secure-store': {
      getItemAsync: async (key) => secure.get(key) ?? null,
      setItemAsync: async (key, value) => { await h.beforeSecureWrite(); secure.set(key, value); },
      deleteItemAsync: async (key) => { secure.delete(key); },
    },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => {
      if (mocks[name]) return mocks[name];
      const target = name.startsWith('@/') ? path.join(root, 'src', name.slice(2))
        : name.startsWith('.') ? path.resolve(path.dirname(file), name) : null;
      if (!target) throw new Error(`테스트에 없는 의존성: ${name}`);
      return load(`${target}.ts`);
    };
    vm.runInNewContext(code, {
      module, exports: module.exports, require: localRequire, process,
      fetch: (...args) => h.fetch(...args), AbortController, URLSearchParams, setTimeout, clearTimeout,
      console: { error: () => {}, warn: () => {} },
    }, { filename: file });
    return module.exports;
  }
  h.load = (name) => load(path.join(root, 'src', `${name}.ts`));
  h.session = h.load('features/auth/session-store');
  h.api = h.load('lib/api').api;
  h.runs = h.load('data/completed-runs-repository');
  h.keys = h.load('data/storage').STORAGE_KEYS;
  await h.session.initializeSession();
  return h;
}

test('네트워크 실패 문구는 환경 정보를 노출하지 않고 서버 오류 메시지는 유지한다', async () => {
  const h = await harness();
  const { requestJson } = h.load('lib/api-transport');
  h.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(requestJson('https://example.com', '/test'), (error) =>
    error.message === '인터넷 연결을 확인해 주세요.' && error.code === 'NETWORK_ERROR' && error.status === 0);
  h.fetch = async () => json({ code: 'FORBIDDEN', message: '권한이 없어요.' }, 403);
  await assert.rejects(requestJson('https://example.com', '/test'), (error) =>
    error.message === '권한이 없어요.' && error.status === 403 && error.code === 'FORBIDDEN');
});

test('동시 요청은 만료 토큰을 한 번만 회전하고 새 토큰을 공유한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens('alice', 'old', 1));
  let refreshes = 0;
  h.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; return json(tokens('alice', 'new')); }
    assert.equal(options.headers.Authorization, 'Bearer alice-new');
    return json({ ok: true });
  };
  await Promise.all(Array.from({ length: 8 }, () => h.api('/users/me')));
  assert.equal(refreshes, 1);
  assert.equal(h.session.getSessionState().session.refreshToken, 'alice-refresh-new');
});

test('Apple 세션의 제공자와 기기 연결 ID는 토큰 회전 후에도 유지한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens('apple-user', 'old', 1), {
    provider: 'apple', appleUserId: 'apple-opaque-id',
  });
  h.fetch = async () => json(tokens('apple-user', 'rotated'));
  await h.session.accessToken();
  assert.equal(h.session.getSessionState().session.provider, 'apple');
  assert.equal(h.session.getSessionState().session.appleUserId, 'apple-opaque-id');
});

test('Apple 탈퇴는 새 인증 코드·원본 nonce를 보내고 성공 뒤에만 세션을 지운다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens('apple-user'));
  h.fetch = async (url, options) => {
    assert.ok(url.endsWith('/users/me'));
    assert.equal(options.method, 'DELETE');
    assert.deepEqual(JSON.parse(options.body), {
      appleAuthorizationCode: 'fresh-code', appleNonce: 'raw-nonce-1234567890',
    });
    return new Response(null, { status: 202 });
  };
  await h.load('data/account-repository').deleteAccount({
    appleAuthorizationCode: 'fresh-code', appleNonce: 'raw-nonce-1234567890',
  });
  assert.equal(h.session.getSessionState().session, null);
});

test('Apple 토큰 폐기 실패 시 탈퇴 성공으로 처리하지 않고 기존 계정·로컬 기록을 유지한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens('apple-user'));
  h.memory.set(h.keys.runSync, JSON.stringify({ accounts: { 'user:apple-user': [{ run }] }, guestOwners: {} }));
  h.fetch = async () => json({ code: 'APPLE_REVOCATION_FAILED', message: 'Apple 연결 해제에 실패했어요.' }, 502);
  await assert.rejects(h.load('data/account-repository').deleteAccount({
    appleAuthorizationCode: 'fresh-code', appleNonce: 'raw-nonce-1234567890',
  }), /Apple 연결 해제/);
  assert.equal(h.session.getSessionState().session.user.id, 'apple-user');
  assert.equal(JSON.parse(h.memory.get(h.keys.runSync)).accounts['user:apple-user'].length, 1);
});

test('동시 401 응답은 한 번만 재인증하고 같은 요청을 한 번 재시도한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens());
  let refreshes = 0;
  h.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; return json(tokens('alice', 'new')); }
    return options.headers.Authorization === 'Bearer alice-initial'
      ? json({ code: 'TOKEN_EXPIRED', message: '만료' }, 401) : json({ ok: true });
  };
  const results = await Promise.all(Array.from({ length: 8 }, () => h.api('/users/me')));
  assert.equal(results.length, 8);
  assert.equal(refreshes, 1);
});

test('로그아웃 후 도착한 갱신 응답은 세션을 복원하지 않는다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens('alice', 'old', 1));
  const started = deferred();
  const response = deferred();
  h.fetch = async () => { started.resolve(); return response.promise; };
  const request = h.session.accessToken();
  await started.promise;
  await h.session.clearSession();
  response.resolve(json(tokens('alice', 'new')));
  await assert.rejects(request, /변경/);
  assert.equal(h.session.getSessionState().session, null);
  assert.equal(h.secure.size, 0);
});

test('계정 변경 중에는 이전 갱신을 새 계정에서 공유하지 않는다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens('alice', 'old', 1));
  const started = deferred();
  const response = deferred();
  h.fetch = async (_url, options) => {
    if (JSON.parse(options.body).refreshToken.startsWith('alice')) {
      started.resolve();
      return response.promise;
    }
    return json(tokens('bob', 'new'));
  };
  const alice = h.session.accessToken();
  await started.promise;
  await h.session.acceptSession(tokens('bob', 'old', 1));
  assert.equal(await h.session.accessToken(), 'bob-new');
  response.resolve(json(tokens('alice', 'new')));
  await assert.rejects(alice, /변경/);
  assert.equal(h.session.getSessionState().session.user.id, 'bob');
});

test('이전 계정 API 응답은 새 계정에서 반환되지 않는다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens());
  const started = deferred();
  const response = deferred();
  h.fetch = async () => { started.resolve(); return response.promise; };
  const request = h.api('/users/me');
  await started.promise;
  await h.session.acceptSession(tokens('bob'));
  response.resolve(json({ id: 'alice' }));
  await assert.rejects(request, /변경/);
  assert.equal(h.session.getSessionState().session.user.id, 'bob');
});

test('SecureStore 저장 실패 시 갱신된 토큰을 사용하지 않고 로그아웃한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens('alice', 'old', 1));
  h.fetch = async () => json(tokens('alice', 'new'));
  h.beforeSecureWrite = async () => { throw new Error('저장 공간 오류'); };
  await assert.rejects(h.session.accessToken(), /저장 공간/);
  assert.equal(h.session.getSessionState().session, null);
  assert.equal(h.secure.size, 0);
});

test('오프라인 저장을 보존하고 재전송 시 동일한 멱등 키와 GPS 본문을 사용한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens());
  const payloads = [];
  h.fetch = async (_url, options) => {
    payloads.push(options);
    throw new Error('offline');
  };
  const result = await h.runs.saveCompletedRun(run);
  assert.equal(result.synced, false);
  assert.match(result.message, /기기 저장은 완료/);
  h.fetch = async (_url, options) => { payloads.push(options); return json(serverRun); };
  await h.runs.syncCompletedRuns();
  assert.equal(payloads[0].body, payloads[1].body);
  assert.equal(payloads[1].headers['Idempotency-Key'], run.id);
  const body = JSON.parse(payloads[1].body);
  assert.equal(body.distanceMeters, 1500);
  assert.equal(body.routePoints[0].recordedAt, new Date(run.startedAt).toISOString());
  assert.equal(body.routePoints[0].latitude, 37.5);
  await h.runs.syncCompletedRuns();
  assert.equal(payloads.length, 2);
});

test('게스트 기록 이동 도중 저장 실패가 나도 다른 계정이나 게스트에 노출하지 않는다', async () => {
  const h = await harness();
  await h.runs.saveCompletedRun(run, null);
  await h.session.acceptSession(tokens());
  h.beforeWrite = async (key) => {
    if (key === h.keys.completedRuns) throw new Error('게스트 저장소 정리 실패');
  };
  await assert.rejects(h.runs.claimGuestRuns(), /정리 실패/);
  h.beforeWrite = async () => {};
  await h.session.clearSession();
  assert.equal((await h.runs.listCompletedRuns()).length, 0);
  await h.session.acceptSession(tokens('bob'));
  await h.runs.claimGuestRuns();
  await h.runs.syncCompletedRuns();
  const saved = JSON.parse(h.memory.get(h.keys.runSync));
  assert.equal(saved.accounts['user:alice'][0].run.id, run.id);
  assert.equal(saved.accounts['user:bob'], undefined);
  assert.equal(saved.guestOwners[run.id], 'alice');
});

test('계정이 달라진 진행 중 러닝은 원래 소유자에게만 보관한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens('bob'));
  const result = await h.runs.saveCompletedRun(run, 'alice');
  assert.equal(result.synced, false);
  const saved = JSON.parse(h.memory.get(h.keys.runSync));
  assert.equal(saved.accounts['user:alice'][0].run.id, run.id);
  assert.equal(saved.accounts['user:bob'], undefined);
});

test('커서 전체 조회와 상세 GPS 변환 및 반복 커서 오류를 처리한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens());
  let pages = 0;
  h.fetch = async (url) => {
    if (url.includes('route=full')) return json({ ...serverRun, route: {
      points: run.routePoints.map((point) => ({ ...point, recordedAt: new Date(point.recordedAt).toISOString() })),
    } });
    pages++;
    return json({ items: [{ ...serverRun, id: `server-${pages}` }], nextCursor: pages === 1 ? 'cursor-2' : null });
  };
  assert.equal((await h.runs.listCompletedRuns()).length, 2);
  const detail = await h.runs.getCompletedRun('server-run');
  assert.equal(detail.routePoints[0].recordedAt, run.startedAt);
  assert.equal(detail.routePoints[0].longitude, 127);
  h.fetch = async () => json({ items: [], nextCursor: 'repeated' });
  await assert.rejects(h.runs.listCompletedRuns(), /커서가 반복/);
});

test('서버 삭제 후 재동기화에서 중복 삭제하지 않고 되돌리기를 전송한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens());
  const calls = [];
  h.fetch = async (url, options) => {
    calls.push([url, options.method]);
    return options.method === 'DELETE' ? new Response(null, { status: 204 }) : json(serverRun);
  };
  await h.runs.saveCompletedRun(run);
  await h.runs.deleteCompletedRun('server-run');
  await h.runs.syncCompletedRuns();
  assert.equal(calls.filter(([, method]) => method === 'DELETE').length, 1);
  await h.runs.restoreCompletedRun({ ...run, id: 'server-run', serverId: 'server-run' });
  assert.equal(calls.filter(([url]) => url.endsWith('/restore')).length, 1);
});

test('주간 목표는 계정에서 미터 단위로 변환하고 로그아웃은 회전한 refreshToken을 전송한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens('alice', 'old', 1));
  let logoutBody;
  let goalBody;
  h.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) return json(tokens('alice', 'new'));
    if (url.endsWith('/auth/logout')) {
      logoutBody = JSON.parse(options.body);
      return new Response(null, { status: 204 });
    }
    if (options.method === 'PATCH') goalBody = JSON.parse(options.body);
    return json({ weeklyGoalMeters: 35000 });
  };
  const goals = h.load('data/weekly-goal-repository');
  assert.equal(await goals.getWeeklyGoalKm(), 35);
  await goals.saveWeeklyGoalKm(40);
  assert.equal(goalBody.weeklyGoalMeters, 40000);
  await h.load('data/account-repository').logout();
  assert.equal(logoutBody.refreshToken, 'alice-refresh-new');
  assert.equal(h.session.getSessionState().session, null);
});

test('서버 대시보드·통계의 미터, 한국 시간과 서버 버킷 라벨을 유지한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens());
  h.fetch = async (url) => {
    if (url.includes('/dashboard')) {
      assert.match(url, /timeZone=Asia%2FSeoul/);
      return json({
        today: { distanceMeters: 1500 },
        week: { from: '2026-05-18', goalMeters: 30000, distanceMeters: 4500, runCount: 3,
          dailyDistances: [1500, 3000, 0, 0, 0, 0, 0] },
        recentRun: serverRun,
      });
    }
    if (url.includes('/stats/running')) {
      assert.match(url, /period=month/);
      return json({ totals: { distanceMeters: 4500 }, buckets: [
        { label: '1~7일', distanceMeters: 4500 },
      ], allTime: { distanceMeters: 4500, runCount: 3, averagePaceSecondsPerKm: 400 } });
    }
    return json({ items: [serverRun], nextCursor: null });
  };
  const insights = h.load('data/insights-repository');
  const home = await insights.getHomeData();
  assert.equal(home.weekly.distanceKm, 4.5);
  assert.equal(home.goalKm, 30);
  assert.equal(home.todayKm, 1.5);
  assert.equal(home.weekly.dailyDistancesKm[1], 3);
  assert.equal(home.weekStart.toISOString(), '2026-05-17T15:00:00.000Z');
  const stats = await insights.getStatsData('month');
  assert.equal(stats.labels[0], '1~7일');
  assert.equal(stats.values[0], 4.5);
  assert.equal(stats.allTime.longestRunKm, 1.5);
});

test('탈퇴 시 해당 계정 캐시만 정리하고 세션을 삭제한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens());
  h.fetch = async () => json(serverRun);
  await h.runs.saveCompletedRun(run);
  await h.session.acceptSession(tokens('bob'));
  await h.runs.saveCompletedRun({ ...run, id: 'bob-local' });
  h.fetch = async () => new Response(null, { status: 202 });
  await h.load('data/account-repository').deleteAccount();
  const saved = JSON.parse(h.memory.get(h.keys.runSync));
  assert.equal(saved.accounts['user:bob'], undefined);
  assert.equal(saved.accounts['user:alice'][0].run.id, run.id);
  assert.equal(h.session.getSessionState().session, null);
});

test('이전 계정의 재시도 401 응답으로 새 계정을 로그아웃시키지 않는다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens());
  const started = deferred();
  const response = deferred();
  h.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) return json(tokens('alice', 'new'));
    if (options.headers.Authorization === 'Bearer alice-initial') {
      return json({ message: '만료', code: 'TOKEN_EXPIRED' }, 401);
    }
    started.resolve();
    return response.promise;
  };
  const request = h.api('/users/me');
  await started.promise;
  await h.session.acceptSession(tokens('bob'));
  response.resolve(json({ message: '이전 계정 인증 실패', code: 'UNAUTHORIZED' }, 401));
  await assert.rejects(request);
  assert.equal(h.session.getSessionState().session.user.id, 'bob');
});

test('잘못된 갱신 응답은 이전 refreshToken을 다시 사용하지 않도록 세션을 종료한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens('alice', 'old', 1));
  h.fetch = async () => json({ accessToken: 'incomplete' });
  await assert.rejects(h.session.accessToken(), /인증 응답/);
  assert.equal(h.session.getSessionState().session, null);
  assert.equal(h.secure.size, 0);
});

test('GPS 수집은 시작 전 캐시·미래·역순 샘플을 거부하고 시작 시각 샘플은 허용한다', async () => {
  const h = await harness();
  const session = h.load('features/running/run-session');
  const start = run.startedAt;
  const sample = (timestamp, latitude = 37.5) => ({
    timestamp, coords: {
      latitude, longitude: 127, altitude: null, accuracy: 5,
      altitudeAccuracy: null, heading: null, speed: 2,
    },
  });
  const active = session.createActiveRun(start);
  const updated = session.applyLocationUpdates(active, [
    sample(start - 60_000), sample(start + 20_000), sample(Number.NaN),
    sample(start), sample(start + 5_000, 37.5001), sample(start + 1_000, 37.50011),
  ], start + 10_000);
  assert.equal(updated.routePoints.length, 2);
  assert.equal(updated.routePoints[0].recordedAt, start);
  assert.equal(updated.routePoints[1].recordedAt, start + 5_000);
  assert.ok(updated.distanceMeters > 0);
  const paused = session.pauseActiveRun(updated, start + 6_000);
  assert.equal(session.applyLocationUpdates(paused, [sample(start + 8_000)]), paused);
});

test('기존 미전송 경로는 시간 범위·오름차순을 보정하고 원본·멱등 본문은 유지한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens());
  const start = run.startedAt;
  const point = (recordedAt) => ({ ...run.routePoints[0], recordedAt });
  const legacy = { ...run, routePoints: [
    point(start - 1000), point(start), point(start + 2000), point(start + 1000),
    point(run.endedAt), point(run.endedAt + 1000),
  ] };
  const bodies = [];
  h.fetch = async (_url, options) => {
    bodies.push(options.body);
    throw new Error('offline');
  };
  assert.equal((await h.runs.saveCompletedRun(legacy)).synced, false);
  const stored = JSON.parse(h.memory.get(h.keys.runSync));
  assert.equal(stored.accounts['user:alice'][0].run.routePoints.length, 6);
  const payload = JSON.parse(bodies[0]);
  assert.deepEqual(payload.routePoints.map((p) => p.recordedAt), [
    new Date(start).toISOString(), new Date(start + 2000).toISOString(),
    new Date(run.endedAt).toISOString(),
  ]);
  assert.equal(payload.distanceMeters, Math.round(run.distanceMeters));
  assert.equal(payload.durationSeconds, run.durationSeconds);
  h.fetch = async (_url, options) => { bodies.push(options.body); return json(serverRun); };
  await h.runs.syncCompletedRuns();
  assert.equal(bodies[1], bodies[0]);
});

test('완료 기록은 종료 후 시각을 제외하고 유효한 경로와 기존 러닝 시간을 유지한다', async () => {
  const h = await harness();
  const session = h.load('features/running/run-session');
  const active = { ...session.createActiveRun(run.startedAt), distanceMeters: 1000,
    routePoints: [
      run.routePoints[0],
      { ...run.routePoints[0], recordedAt: run.startedAt + 20_000 },
    ] };
  const completed = session.toCompletedRun(active, run.startedAt + 10_000);
  assert.equal(completed.routePoints.length, 1);
  assert.equal(active.routePoints.length, 2);
  assert.equal(completed.durationSeconds, 10);
  assert.equal(completed.distanceMeters, 1000);
});

test('크루 생성·검색·가입·승인·위임은 실제 API를 사용하고 빈 목록은 그대로 유지한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens());
  const calls = [];
  h.fetch = async (url, options) => {
    calls.push({ url: new URL(url), options });
    const pathname = new URL(url).pathname;
    if (pathname.endsWith('/rankings') || options.method === undefined && pathname.endsWith('/crews')) return json([]);
    if (pathname.endsWith('/users/me/crew')) return json({ crewId: null });
    if (pathname.endsWith('/join-by-code') || options.method === 'POST' && pathname.endsWith('/crews')) return json({ id: 'real-crew' });
    if (pathname.endsWith('/invite-code')) return json({ inviteCode: 'ABC123' });
    return new Response(null, { status: 204 });
  };
  const crews = h.load('data/crew-repository');
  assert.equal((await crews.getCrewRankings('week')).length, 0);
  assert.equal(await crews.getMyCrewId(), null);
  assert.equal((await crews.searchCrews({ query: '한강 & 러너', sido: '서울', sigungu: '마포구' })).length, 0);
  assert.equal(calls.at(-1).url.searchParams.get('query'), '한강 & 러너');
  assert.equal(await crews.createCrew({ name: '  첫 크루  ', intro: '소개', region: { sido: '서울', sigungu: null } }), 'real-crew');
  assert.equal(JSON.parse(calls.at(-1).options.body).name, '첫 크루');
  assert.equal(await crews.joinCrewByCode(' abC123 '), 'real-crew');
  assert.equal(JSON.parse(calls.at(-1).options.body).code, 'ABC123');
  await crews.reviewCrewJoinRequest('real-crew', 'member-1', true);
  assert.match(calls.at(-1).url.pathname, /join-requests\/member-1\/approve$/);
  await crews.transferCrewLeadership('real-crew', 'member-1');
  assert.equal(JSON.parse(calls.at(-1).options.body).userId, 'member-1');
  h.fetch = async () => json({ message: '서버 미배포', code: 'NOT_FOUND' }, 404);
  await assert.rejects(crews.getCrewRankings('week'), /서버 미배포/);
});

test('대결 생성 시 UTC ISO를 전송하고 조회 시 epoch로 변환하며 검색 조건을 전달한다', async () => {
  const h = await harness();
  await h.session.acceptSession(tokens());
  const calls = [];
  const race = { id: 'real-race', title: '실제 대결', startsAt: '2026-10-23T09:00:00Z',
    distanceMeters: 5000, joinDeadlineMinutes: 30, minParticipants: 2, maxParticipants: 10,
    hostNickname: '러너', participantCount: 1, visibility: 'public', isJoined: true, isHost: true, cancelled: false };
  h.fetch = async (url, options) => {
    calls.push({ url: new URL(url), options });
    if (options.method === 'POST') return json({ id: race.id });
    if (new URL(url).pathname.endsWith('/real-race')) return json({ ...race, participants: [], inviteCode: null });
    return json([race]);
  };
  const races = h.load('data/race-repository');
  assert.equal(await races.createRace({ ...race, startsAt: Date.parse(race.startsAt) }), 'real-race');
  assert.equal(JSON.parse(calls.at(-1).options.body).startsAt, '2026-10-23T09:00:00.000Z');
  assert.equal((await races.getRaceDetail(race.id)).startsAt, Date.parse(race.startsAt));
  assert.equal((await races.listOpenRaces()).length, 0);
  assert.equal((await races.listMyRaces())[0].id, race.id);
  await races.searchRaces({ distanceMeters: 5000, window: 'tomorrow', hideFull: true });
  assert.equal(calls.at(-1).url.searchParams.get('distanceMeters'), '5000');
  assert.equal(calls.at(-1).url.searchParams.get('hideFull'), 'true');
  assert.ok(Number.isFinite(Date.parse(calls.at(-1).url.searchParams.get('from'))));
  await races.joinRaceByCode(' hi1234 ');
  assert.equal(JSON.parse(calls.at(-1).options.body).code, 'HI1234');
});
