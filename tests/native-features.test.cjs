const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

function harness(os = 'ios') {
  const memory = new Map();
  const secure = new Map();
  const calls = [];
  const timers = new Map();
  let nextTimer = 0;
  const h = {
    memory, secure, calls, authentication: { success: true }, level: 1,
    authorization: true, sharing: 2, state: null, appleFailure: null,
    failWrite: false, failSecure: false, failHealth: false, available: true,
    steps: null, workouts: [], authorize: null, readSteps: null,
    expire: (milliseconds) => {
      for (const [id, timer] of timers) if (timer.milliseconds === milliseconds) {
        timers.delete(id); timer.callback();
      }
    },
  };
  const kit = {
    isHealthDataAvailable: () => h.available,
    AuthorizationStatus: { sharingAuthorized: 2 },
    WorkoutActivityType: { running: 37 },
    requestAuthorization: async (options) => { calls.push(['permissions', options]); return h.authorize ? h.authorize() : h.authorization; },
    authorizationStatusFor: () => h.sharing,
    queryStatisticsForQuantity: async (...args) => {
      calls.push(['steps', ...args]);
      return h.readSteps ? h.readSteps() : { sumQuantity: h.steps };
    },
    queryWorkoutSamples: async (options) => { calls.push(['workouts', options]); return h.workouts; },
    saveWorkoutSample: async (...args) => {
      calls.push(['save', ...args]);
      if (h.failHealth) throw new Error('HealthKit save failed');
    },
  };
  const mocks = {
    'react-native': { Platform: { OS: os } },
    'expo-local-authentication': {
      SecurityLevel: { NONE: 0 },
      getEnrolledLevelAsync: async () => h.level,
      authenticateAsync: async (options) => { calls.push(['authenticate', options]); return h.authentication; },
    },
    'expo-secure-store': {
      getItemAsync: async (key) => {
        if (h.failSecure) throw new Error('secure read failed');
        return secure.get(key) ?? null;
      },
      setItemAsync: async (key, value) => { secure.set(key, value); },
      deleteItemAsync: async (key) => { secure.delete(key); },
    },
    '@react-native-async-storage/async-storage': {
      getItem: async (key) => memory.get(key) ?? null,
      setItem: async (key, value) => {
        if (h.failWrite) throw new Error('disk full');
        memory.set(key, value);
      },
    },
    'expo-crypto': {
      randomUUID: crypto.randomUUID,
      CryptoDigestAlgorithm: { SHA256: 'sha256' },
      digestStringAsync: async (algorithm, value) => crypto.createHash(algorithm).update(value).digest('hex'),
    },
    'expo-apple-authentication': {
      AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
      isAvailableAsync: async () => true,
      signInAsync: async (options) => {
        calls.push(['apple', options]);
        if (h.appleFailure) throw h.appleFailure;
        return { identityToken: 'signed-token', authorizationCode: 'one-time-code', user: 'apple-opaque-id', state: h.state ?? options.state,
          fullName: { familyName: 'Kim', givenName: 'Runner' } };
      },
    },
    '@kingstinct/react-native-healthkit': kit,
  };
  const cache = new Map();
  const root = path.resolve(__dirname, '..', 'src');
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, {
      module, exports: module.exports,
      require: (name) => {
        if (mocks[name]) return mocks[name];
        const target = name.startsWith('@/') ? path.join(root, name.slice(2))
          : name.startsWith('.') ? path.resolve(path.dirname(file), name) : null;
        if (!target) throw new Error(`Unexpected dependency: ${name}`);
        return load(`${target}.ts`);
      },
      console, Date, Promise,
      setTimeout: (callback, milliseconds) => { const id = ++nextTimer; timers.set(id, { callback, milliseconds }); return id; },
      clearTimeout: (id) => timers.delete(id),
    }, { filename: file });
    return module.exports;
  }
  h.load = (name) => load(path.join(root, `${name}.ts`));
  h.onboarding = h.load('data/onboarding-repository');
  h.lock = h.load('features/auth/app-lock');
  h.apple = h.load('features/auth/apple-login');
  h.health = h.load('features/health/health-service');
  return h;
}

const run = {
  id: 'local-uuid', startedAt: Date.parse('2026-10-26T01:00:00Z'),
  endedAt: Date.parse('2026-10-26T01:10:00Z'), distanceMeters: 1500,
  durationSeconds: 540, routePoints: [],
};

test('온보딩 완료는 다시 로드해도 유지하고 실패·잘못된 저장 상태를 숨기지 않는다', async () => {
  const h = harness();
  assert.equal(await h.onboarding.hasCompletedOnboarding(), false);
  await h.onboarding.completeOnboarding();
  assert.equal(await h.onboarding.hasCompletedOnboarding(), true);
  h.failWrite = true;
  await assert.rejects(h.onboarding.completeOnboarding(), /disk full/);
  h.memory.set('@pace/onboarding-completed-v1', '"true"');
  await assert.rejects(h.onboarding.hasCompletedOnboarding(), /올바르지/);
});

test('권한 안내 완료는 온보딩과 별도로 한 번만 저장하고 손상·저장 실패를 전파한다', async () => {
  const h = harness();
  const preferences = h.load('data/permission-preferences');
  await h.onboarding.completeOnboarding();
  assert.equal(await preferences.hasSeenPermissionIntro(), false);
  await preferences.completePermissionIntro();
  assert.equal(await preferences.hasSeenPermissionIntro(), true);
  h.failWrite = true;
  await assert.rejects(preferences.completePermissionIntro(), /disk full/);
  h.memory.set('@pace/permission-intro-v1', '1');
  await assert.rejects(preferences.hasSeenPermissionIntro(), /올바르지/);
});

test('건강 권한 시간 초과는 연동 성공으로 저장되지 않고 늦은 응답도 성공 상태를 쓰지 않는다', async () => {
  const h = harness();
  let resolve;
  h.authorize = () => new Promise((done) => { resolve = done; });
  const request = h.health.connectHealth();
  for (let i = 0; i < 20 && !resolve; i++) await Promise.resolve();
  assert.ok(resolve);
  await assert.rejects(h.health.connectHealth(), /진행 중/);
  h.expire(60000);
  await assert.rejects(request, /완료하지 못했/);
  assert.equal(await h.health.isHealthConnected(), false);
  resolve(true);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.equal(await h.health.isHealthConnected(), false);
  h.authorize = null;
  await h.health.connectHealth();
  assert.equal(await h.health.isHealthConnected(), true);
});

test('건강 조회는 15초에 명시적으로 실패하며 연결 선호를 지우거나 빈 성공 결과로 바꾸지 않는다', async () => {
  const h = harness();
  await h.health.connectHealth();
  h.readSteps = () => new Promise(() => {});
  const query = h.health.readHealthSummary();
  for (let i = 0; i < 20; i++) await Promise.resolve();
  assert.ok(h.calls.some(([kind]) => kind === 'steps'));
  h.expire(15000);
  await assert.rejects(query, /조회가 지연/);
  assert.equal(await h.health.isHealthConnected(), true);
  h.readSteps = null;
  const result = await h.health.readHealthSummary();
  assert.equal(result.steps, null);
});

test('Apple 요청은 해시된 nonce·state를 사용하며 서버용 원본 nonce를 반환한다', async () => {
  const h = harness();
  const credential = await h.apple.appleCredential();
  const options = h.calls.find(([kind]) => kind === 'apple')[1];
  assert.equal(options.nonce, crypto.createHash('sha256').update(credential.nonce).digest('hex'));
  assert.notEqual(options.nonce, credential.nonce);
  assert.equal(credential.idToken, 'signed-token');
  assert.equal(credential.authorizationCode, 'one-time-code');
  assert.equal(credential.appleUserId, 'apple-opaque-id');
  assert.ok(options.requestedScopes.length === 2);
  h.state = 'mismatched-state';
  await assert.rejects(h.apple.appleCredential(), /인증 응답/);
});

test('Apple 취소만 정상 중단으로 처리하고 다른 네이티브 실패는 전파한다', async () => {
  const h = harness();
  h.appleFailure = { code: 'ERR_REQUEST_CANCELED' };
  assert.equal(await h.apple.appleCredential(), null);
  h.appleFailure = new Error('native failed');
  await assert.rejects(h.apple.appleCredential(), /native failed/);
});

test('앱 잠금은 계정별 opt-in이며 기기 암호 폴백을 허용한다', async () => {
  const h = harness();
  assert.equal(await h.lock.isAppLockEnabled('alice'), false);
  await h.lock.setAppLockEnabled('alice', true);
  assert.equal(await h.lock.isAppLockEnabled('alice'), true);
  assert.equal(await h.lock.isAppLockEnabled('bob'), false);
  assert.equal(h.calls[0][1].disableDeviceFallback, false);
  await h.lock.setAppLockEnabled('alice', false);
  assert.equal(await h.lock.isAppLockEnabled('alice'), false);
});

test('취소·기기 암호 미설정은 잠금 해제나 설정 변경에 성공하지 않는다', async () => {
  const h = harness();
  await h.lock.setAppLockEnabled('alice', true);
  h.authentication = { success: false, error: 'user_cancel' };
  await assert.rejects(h.lock.setAppLockEnabled('alice', false), /잠금을 해제하지/);
  assert.equal(await h.lock.isAppLockEnabled('alice'), true);
  assert.equal(h.lock.isDeviceAuthenticationInProgress(), false);
  h.level = 0;
  await assert.rejects(h.lock.authenticateDevice(), /먼저 설정/);
  h.failSecure = true;
  await assert.rejects(h.lock.isAppLockEnabled('alice'), /secure read failed/);
});

test('웹·Android는 네이티브 건강 저장·앱 잠금을 실행하지 않는다', async () => {
  for (const os of ['web', 'android']) {
    const h = harness(os);
    assert.equal(await h.health.exportHealthRun(run), false);
    assert.equal(await h.lock.isAppLockEnabled('alice'), false);
    await assert.rejects(h.health.connectHealth(), /iPhone/);
    assert.equal(h.calls.length, 0);
  }
});

test('건강 연동 전에는 읽기·쓰기를 실행하지 않고 필요한 권한만 요청한다', async () => {
  const h = harness();
  assert.equal(await h.health.exportHealthRun(run), false);
  await assert.rejects(h.health.readHealthSummary(), /연동을 켜/);
  assert.equal(h.calls.length, 0);
  await h.health.connectHealth();
  const permissions = h.calls[0][1];
  assert.equal(JSON.stringify(permissions), JSON.stringify({
    toRead: ['HKQuantityTypeIdentifierStepCount', 'HKWorkoutTypeIdentifier'],
    toShare: ['HKWorkoutTypeIdentifier'],
  }));
  assert.equal(await h.health.isHealthConnected(), true);
});

test('건강 권한 요청·설정 저장 실패는 연동 성공으로 처리하지 않는다', async () => {
  const h = harness();
  h.authorization = false;
  await assert.rejects(h.health.connectHealth(), /권한 요청/);
  assert.equal(await h.health.isHealthConnected(), false);
  h.authorization = true;
  h.failWrite = true;
  await assert.rejects(h.health.connectHealth(), /disk full/);
  assert.equal(await h.health.isHealthConnected(), false);
});

test('건강 읽기는 당일 통계·최근 30일 최대 20개만 조회하고 데이터 없음과 0을 구별한다', async () => {
  const h = harness();
  await h.health.connectHealth();
  const empty = await h.health.readHealthSummary();
  assert.equal(empty.steps, null);
  assert.equal(empty.workouts.length, 0);
  h.steps = { quantity: 0, unit: 'count' };
  assert.equal((await h.health.readHealthSummary()).steps, 0);
  const options = h.calls.find(([kind]) => kind === 'workouts')[1];
  assert.equal(options.limit, 20);
  assert.equal(options.ascending, false);
  const days = (options.filter.date.endDate - options.filter.date.startDate) / 86400000;
  assert.ok(days > 29 && days < 31);
  assert.equal(h.calls.some(([kind]) => kind === 'save'), false);
});

test('건강 저장은 로컬·서버 기록과 재시도에 같은 동기화 키를 사용하고 GPS를 보내지 않는다', async () => {
  const h = harness();
  await h.health.connectHealth();
  await h.health.exportHealthRun(run);
  await h.health.exportHealthRun({ ...run, id: 'server-id', clientRunId: run.id });
  const saves = h.calls.filter(([kind]) => kind === 'save');
  assert.equal(saves.length, 2);
  assert.equal(saves[0][6].HKMetadataKeySyncIdentifier, saves[1][6].HKMetadataKeySyncIdentifier);
  assert.equal(saves[0][6].HKMetadataKeySyncVersion, 1);
  assert.equal(saves[0][6]['pace.activeDurationSeconds'], 540);
  assert.equal(saves[0][2].length, 0);
  assert.equal(saves[0][5].distance, 1500);
  assert.equal(saves[0][3].getTime(), run.startedAt);
  assert.equal(saves[0][4].getTime(), run.endedAt);
});

test('건강 쓰기 거부·저장 실패는 전파하고 연동 해제 후에는 저장하지 않는다', async () => {
  const h = harness();
  await h.health.connectHealth();
  h.sharing = 1;
  await assert.rejects(h.health.exportHealthRun(run), /쓰기 권한/);
  assert.equal(h.calls.some(([kind]) => kind === 'save'), false);
  h.sharing = 2;
  h.failHealth = true;
  await assert.rejects(h.health.exportHealthRun(run), /HealthKit save failed/);
  await h.health.disconnectHealth();
  assert.equal(await h.health.exportHealthRun(run), false);
  await assert.rejects(h.health.readHealthSummary(), /연동을 켜/);
});
