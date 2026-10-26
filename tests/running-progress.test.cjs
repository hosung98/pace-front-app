const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relative, mocks = {}) {
  const file = path.resolve(__dirname, '../src', relative);
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module, exports: module.exports, console, Date, Map, Set,
    require: (name) => {
      if (name in mocks) return mocks[name];
      const next = name.startsWith('@/') ? name.slice(2)
        : path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(file), name));
      return load(`${next}.ts`, mocks);
    },
  });
  return module.exports;
}
const { computeRunningProgress } = load('features/running/progress.ts');
const run = (id, startedAt, km, durationSeconds = 1800) => ({
  id, startedAt: Date.parse(startedAt), endedAt: Date.parse(startedAt) + durationSeconds * 1000,
  distanceMeters: km * 1000, durationSeconds, routePoints: [], averagePaceSecondsPerKm: 300,
});

test('배지 거리 경계는 반올림하지 않고 중복 러닝은 한 번만 집계한다', () => {
  const first = run('a', '2026-10-26T00:00:00Z', 2.999);
  let result = computeRunningProgress([first, first], 20, Date.parse('2026-10-27T00:00:00Z'));
  assert.equal(result.totalRuns, 1);
  assert.equal(result.totalDistanceKm, 2.999);
  assert.equal(result.badges.find(b => b.id === 'single3k').earnedAt, null);
  assert.ok(result.badges.find(b => b.id === 'first-run').earnedAt);
  result = computeRunningProgress([first, run('b', '2026-10-26T02:00:00Z', 3)], 20, Date.parse('2026-10-27T00:00:00Z'));
  assert.ok(result.badges.find(b => b.id === 'single3k').earnedAt);
  assert.equal(result.badges.find(b => b.id === 'single5k').earnedAt, null);
});

test('꾸준함은 한국 달력의 서로 다른 날을 세고 지난 주 획득도 유지한다', () => {
  const runs = [
    run('a', '2026-10-18T16:00:00Z', 1),
    run('b', '2026-10-18T17:00:00Z', 1),
    run('c', '2026-10-19T16:00:00Z', 1),
  ];
  const now = Date.parse('2026-10-27T00:00:00Z');
  assert.equal(computeRunningProgress(runs, 20, now).badges.find(b => b.id === 'weekly3days').earnedAt, null);
  runs.push(run('d', '2026-10-20T16:00:00Z', 1));
  const result = computeRunningProgress(runs, 20, now);
  assert.ok(result.badges.find(b => b.id === 'weekly3days').earnedAt);
  assert.equal(result.weeklyRuns, 0);
  assert.equal(result.weeklyDistanceKm, 0);
});

test('누적·월간 배지와 개인 최장 거리에는 정확한 달성 기록을 연결한다', () => {
  const runs = Array.from({ length: 10 }, (_, i) => run(`${i}`, `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`, 10));
  const result = computeRunningProgress(runs, 20, Date.parse('2026-11-01T00:00:00Z'));
  assert.equal(result.totalDistanceKm, 100);
  assert.ok(result.badges.find(b => b.id === 'total100k').earnedAt);
  assert.ok(result.badges.find(b => b.id === 'monthly10runs').earnedAt);
  assert.equal(result.badges.find(b => b.id === 'total300k').earnedAt, null);
  assert.equal(result.personalBests[0].value, 10);
  assert.equal(result.personalBests.length, 1); // No inaccurate normalized 5K/10K times.
});

test('0거리·0시간·미래 완료 기록을 성취로 인정하지 않는다', () => {
  const result = computeRunningProgress([
    run('zero', '2026-10-20T00:00:00Z', 0),
    run('time', '2026-10-20T00:00:00Z', 10, 0),
    run('future', '2027-01-01T00:00:00Z', 100),
  ], 20, Date.parse('2026-10-27T00:00:00Z'));
  assert.equal(result.totalRuns, 0);
  assert.ok(result.badges.every(b => !b.earnedAt));
});

test('목표 러닝은 경계에서 달성하고 일시정지 시간은 30분에 포함하지 않는다', () => {
  const { runGoalProgress } = load('features/running/run-goals.ts');
  const active = { startedAt: 0, status: 'paused', elapsedBeforeSegmentMs: 1799_000,
    segmentStartedAt: 0, distanceMeters: 2999, goal: { kind: 'distance', target: 3000 } };
  assert.equal(runGoalProgress(active, 9999999).reached, false);
  assert.equal(runGoalProgress({ ...active, distanceMeters: 3000 }, 0).reached, true);
  active.goal = { kind: 'duration', target: 1800 };
  assert.equal(runGoalProgress(active, 9999999).reached, false);
  assert.equal(runGoalProgress({ ...active, status: 'running', segmentStartedAt: 1000 }, 2000).reached, true);
  assert.equal(runGoalProgress({ ...active, goal: null }, 2000), null);
});

test('공유 경로는 출발·도착 반경을 숨기고 비공개 구간을 직선으로 연결하지 않는다', () => {
  const { shareRouteSegments } = load('features/runs/share-route.ts');
  const point = (lat, lon) => ({ latitude: lat, longitude: lon });
  const points = [point(37, 127), point(37.0001, 127), point(37.003, 127),
    point(37.004, 127), point(37.0001, 127), point(37, 127)];
  assert.equal(shareRouteSegments(points, false).length, 5);
  assert.equal(shareRouteSegments(points, true).length, 1);
  const crossing = [point(37, 127), point(37.003, 127), point(36.997, 127), point(37, 127)];
  assert.equal(shareRouteSegments(crossing, true).length, 0);
  assert.equal(shareRouteSegments([point(37, 127)], true).length, 0);
});

test('음성은 km·목표 경계마다 한 번만 안내하고 정지·백그라운드에서는 중단한다', async () => {
  const slots = [];
  const effects = [];
  const calls = [];
  let cursor = 0;
  let onState;
  const state = (initial) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], value => { slots[index] = value; }];
  };
  const appState = { currentState: 'active', addEventListener: (_name, callback) => {
    onState = callback;
    return { remove() {} };
  } };
  const { useRunGuidance } = load('features/running/use-run-guidance.ts', {
    react: {
      useRef: initial => state({ current: initial })[0],
      useState: state,
      useEffect: (fn, deps) => {
        const index = cursor++;
        if (!slots[index] || deps.some((value, i) => value !== slots[index][i])) effects.push(fn);
        slots[index] = deps;
      },
    },
    'react-native': { AppState: appState },
    'expo-speech': { speak: text => calls.push(text), stop: async () => { calls.push('stop'); } },
  });
  const render = (run, now) => {
    cursor = 0;
    useRunGuidance(run, now);
    effects.splice(0).forEach(fn => fn());
  };
  const active = { id: 'one', status: 'running', voiceGuidance: true, startedAt: 0,
    segmentStartedAt: 0, elapsedBeforeSegmentMs: 0, distanceMeters: 0,
    goal: { kind: 'distance', target: 3000 } };
  render(active, 0);
  render({ ...active, distanceMeters: 1000 }, 300_000);
  render({ ...active, distanceMeters: 1001 }, 301_000);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /1킬로미터.*5분 0초/);
  render({ ...active, distanceMeters: 3000 }, 900_000);
  render({ ...active, distanceMeters: 3001 }, 901_000);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /목표를 달성/);
  render({ ...active, status: 'paused', distanceMeters: 4000 }, 1000_000);
  assert.equal(calls.at(-1), 'stop');
  appState.currentState = 'background';
  onState('background');
  render({ ...active, distanceMeters: 5000 }, 1500_000);
  assert.equal(calls.at(-1), 'stop');
});

test('이미지 공유 실패도 임시 캡처를 정리하며 미지원 기기에는 명시적 오류를 전달한다', async () => {
  const calls = [];
  let available = true;
  const sharing = load('features/runs/share-card-export.ts', {
    'react-native-view-shot': {
      captureRef: async (_ref, options) => { calls.push(options); return 'temporary.png'; },
      releaseCapture: uri => calls.push(uri),
    },
    'expo-sharing': {
      isAvailableAsync: async () => available,
      shareAsync: async () => { throw new Error('share failed'); },
    },
  });

  function routePoint(meters, seconds) {
    return { latitude: 0, longitude: meters / 6_371_000 * 180 / Math.PI,
      recordedAt: seconds * 1000, accuracyMeters: 5, altitudeMeters: null, speedMetersPerSecond: null };
  }

  test('1km PR은 정확한 구간을 보간하고 짧은 러닝을 환산하지 않는다', () => {
    const { fastestKilometer } = load('features/running/personal-records.ts');
    const points = Array.from({ length: 13 }, (_, i) => routePoint(i * 100, i <= 6 ? i * 25 : 150 + (i - 6) * 30));
    assert.equal(fastestKilometer(points), 270);
    assert.equal(fastestKilometer(Array.from({ length: 11 }, (_, i) => routePoint(i * 100, i * 25))), 250);
    assert.equal(fastestKilometer(Array.from({ length: 11 }, (_, i) => routePoint(i * 99.9, i * 25))), null);
    const irregular = Array.from({ length: 8 }, (_, i) => routePoint(i * 90, i * 20));
    for (let i = 1; i <= 5; i++) irregular.push(routePoint(630 + i * 130, 140 + i * 30));
    assert.equal(fastestKilometer(irregular), 225.385);
  });

  test('1km PR은 긴 GPS 공백·점프를 넘지 않고 시작 전 제자리 대기는 제외한다', () => {
    const { fastestKilometer } = load('features/running/personal-records.ts');
    const points = Array.from({ length: 11 }, (_, i) => routePoint(i * 100, i * 25));
    assert.equal(fastestKilometer([routePoint(0, -10), ...points]), 250);
    const gap = points.map((p, i) => ({ ...p, recordedAt: p.recordedAt + (i >= 5 ? 31_000 : 0) }));
    assert.equal(fastestKilometer(gap), null);
    const jump = Array.from({ length: 11 }, (_, i) => routePoint(i * 100, i * 10));
    assert.equal(fastestKilometer(jump), null);
  });

  test('PR 동률은 이전 기록을 유지하고 이번 러닝의 최고 기록만 축하한다', () => {
    const { recordsEarnedByRun } = load('features/running/personal-records.ts');
    const a = run('a', '2026-10-25T00:00:00Z', 1);
    a.routePoints = Array.from({ length: 11 }, (_, i) => ({ ...routePoint(i * 100, i * 25), recordedAt: a.startedAt + i * 25_000 }));
    const b = { ...a, id: 'b', startedAt: a.startedAt + 86_400_000, endedAt: a.endedAt + 86_400_000,
      routePoints: a.routePoints.map(p => ({ ...p, recordedAt: p.recordedAt + 86_400_000 })) };
    const data = computeRunningProgress([a, b], 20, b.endedAt);
    assert.equal(data.personalBests.length, 2);
    assert.ok(data.personalBests.every(best => best.runId === a.id));
    assert.equal(recordsEarnedByRun(data.personalBests, a).length, 2);
    assert.equal(recordsEarnedByRun(data.personalBests, b).length, 0);
  });
  await assert.rejects(sharing.exportRunCard({ current: {} }), /share failed/);
  assert.equal(calls[0].format, 'png');
  assert.equal(calls[1], 'temporary.png');
  available = false;
  await assert.rejects(sharing.exportRunCard({ current: {} }), /공유를 사용할 수 없어요/);
  assert.equal(calls.length, 2);
});
