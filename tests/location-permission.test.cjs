const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function harness(permission, request) {
  const calls = [];
  let fail = false;
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(`${__dirname}/../src/features/settings/location-permission.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: () => ({
    getForegroundPermissionsAsync: async () => {
      calls.push('check');
      if (fail) throw new Error('permission query failed');
      return permission;
    },
    requestForegroundPermissionsAsync: async () => { calls.push('request'); return request ? request() : { granted: true }; },
  }) });
  return { check: module.exports.checkLocationPermission, calls, fail: () => { fail = true; } };
}

test('자동 요청은 미결정 위치만 한 번 요청하고 동시 호출은 같은 작업을 공유한다', async () => {
  const h = harness({ status: 'undetermined', granted: false, canAskAgain: true });
  const one = h.check('initial');
  const two = h.check('initial');
  assert.equal(one, two);
  assert.equal((await one).granted, true);
  assert.deepEqual(h.calls, ['check', 'request']);
});

test('이미 거부·허용·설정 진입 상태에서는 자동 팝업을 반복하지 않는다', async () => {
  for (const [mode, permission] of [
    ['initial', { status: 'denied', granted: false, canAskAgain: true }],
    ['initial', { status: 'granted', granted: true, canAskAgain: true }],
    ['retry', { status: 'denied', granted: false, canAskAgain: false }],
    ['never', { status: 'undetermined', granted: false, canAskAgain: true }],
  ]) {
    const h = harness(permission);
    assert.equal(await h.check(mode), permission);
    assert.deepEqual(h.calls, ['check']);
  }
});

test('명시적인 재요청만 재시도하며 조회·요청 실패를 전파하고 single-flight를 해제한다', async () => {
  let count = 0;
  const h = harness({ status: 'denied', granted: false, canAskAgain: true }, () => {
    if (++count === 1) throw new Error('request failed');
    return { granted: true };
  });
  await assert.rejects(h.check('retry'), /request failed/);
  assert.equal((await h.check('retry')).granted, true);
  h.fail();
  await assert.rejects(h.check('initial'), /permission query failed/);
});
