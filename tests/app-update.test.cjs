const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness(os = 'ios') {
  const h = { activeRun: null, readError: null, calls: [], checkError: null };
  const updates = {
    isEnabled: true, channel: 'production', runtimeVersion: '1.0.4',
    updateId: 'running-update', isEmbeddedLaunch: false, isEmergencyLaunch: false,
    UpdateCheckResultNotAvailableReason: {
      NO_UPDATE_AVAILABLE_ON_SERVER: 'none', UPDATE_PREVIOUSLY_FAILED: 'failed',
    },
    checkForUpdateAsync: async () => {
      h.calls.push('check');
      if (h.checkError) throw h.checkError;
      return h.checked;
    },
    fetchUpdateAsync: async () => { h.calls.push('fetch'); return h.fetched; },
    reloadAsync: async () => { h.calls.push('reload'); },
  };
  h.checked = { isAvailable: true, isRollBackToEmbedded: false };
  h.fetched = { isNew: true, manifest: { id: 'downloaded-update' } };
  h.updates = updates;
  const mocks = {
    'react-native': { Platform: { OS: os } },
    'expo-constants': { nativeAppVersion: '1.0.4', nativeBuildVersion: '8' },
    'expo-updates': updates,
    '@/data/active-run-store': { readActiveRun: async () => {
      if (h.readError) throw h.readError;
      return h.activeRun;
    } },
  };
  const file = path.resolve(__dirname, '../src/features/settings/app-update-service.ts');
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { module, exports: module.exports, require: (name) => {
    if (!(name in mocks)) throw new Error(`Unexpected import ${name}`);
    return mocks[name];
  } });
  h.service = module.exports;
  return h;
}

test('앱 정보는 설치 빌드와 실제 실행 중인 OTA 식별자를 구분한다', () => {
  const h = harness();
  const info = h.service.getAppUpdateInfo();
  assert.equal(info.version, '1.0.4');
  assert.equal(info.build, '8');
  assert.equal(info.updateId, 'running-update');
  assert.equal(info.channel, 'production');
});

test('다운로드는 자동 재시작하지 않고 명시적 적용만 러닝 종료 후 재시작한다', async () => {
  const h = harness();
  assert.equal(await h.service.downloadAppUpdate(), 'downloaded-update');
  assert.deepEqual(h.calls, ['check', 'fetch']);
  h.activeRun = { status: 'paused' };
  await assert.rejects(h.service.applyAppUpdate(), /러닝/);
  assert.equal(h.calls.includes('reload'), false);
  h.activeRun = null;
  h.readError = new Error('disk read failed');
  await assert.rejects(h.service.applyAppUpdate(), /disk read failed/);
  assert.equal(h.calls.includes('reload'), false);
  h.readError = null;
  await h.service.applyAppUpdate();
  assert.equal(h.calls.at(-1), 'reload');
});

test('네트워크·다운로드·이전 실행 실패·정책 거부를 최신 버전으로 오인하지 않는다', async () => {
  const h = harness();
  h.checkError = new Error('network failed');
  await assert.rejects(h.service.downloadAppUpdate(), /network failed/);
  h.checkError = null;
  h.fetched = { isNew: false };
  await assert.rejects(h.service.downloadAppUpdate(), /다운로드가 완료되지/);
  h.checked = { isAvailable: false, reason: 'failed' };
  await assert.rejects(h.service.downloadAppUpdate(), /이전에 실패/);
  h.checked = { isAvailable: false, reason: 'selectionPolicy' };
  await assert.rejects(h.service.downloadAppUpdate(), /정책/);
  h.checked = { isAvailable: false, isRollBackToEmbedded: true };
  await assert.rejects(h.service.downloadAppUpdate(), /복구/);
  h.checked = { isAvailable: false, reason: 'none' };
  assert.equal(await h.service.downloadAppUpdate(), null);
});

test('웹과 업데이트 비활성 앱은 native update API를 호출하지 않는다', async () => {
  for (const os of ['web', 'ios']) {
    const h = harness(os);
    if (os === 'ios') h.updates.isEnabled = false;
    await assert.rejects(h.service.downloadAppUpdate(), /배포 앱/);
    await assert.rejects(h.service.applyAppUpdate(), /배포 앱/);
    assert.deepEqual(h.calls, []);
  }
});
