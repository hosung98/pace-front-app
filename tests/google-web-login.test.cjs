const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  const scripts = [];
  const timers = new Set();
  const window = {};
  const module = { exports: {} };
  const file = path.resolve(__dirname, '../src/features/auth/google-web-sdk.ts');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, window,
    document: {
      createElement: () => ({ remove() { this.removed = true; } }),
      head: { appendChild: (script) => scripts.push(script) },
    },
    setTimeout: (callback) => { timers.add(callback); return callback; },
    clearTimeout: (callback) => timers.delete(callback),
  }, { filename: file });
  return { load: module.exports.loadGoogleIdentity, window, scripts, timers };
}

test('웹 Google SDK는 동시 요청에서 한 번만 로드하고 성공한 SDK를 재사용한다', async () => {
  const h = harness();
  const first = h.load();
  assert.equal(first, h.load());
  assert.equal(h.scripts.length, 1);
  assert.equal(h.scripts[0].src, 'https://accounts.google.com/gsi/client?hl=ko');
  const sdk = { initialize() {}, renderButton() {} };
  h.window.google = { accounts: { id: sdk } };
  h.scripts[0].onload();
  assert.equal(await first, sdk);
  assert.equal(await h.load(), sdk);
  assert.equal(h.timers.size, 0);
});

test('웹 Google SDK 네트워크 실패는 명시적으로 실패하고 재시도할 수 있다', async () => {
  const h = harness();
  const first = h.load();
  h.scripts[0].onerror();
  await assert.rejects(first, /Google 로그인 버튼을 불러오지 못했어요/);
  assert.equal(h.scripts[0].removed, true);
  assert.equal(h.timers.size, 0);
  const retry = h.load();
  assert.equal(h.scripts.length, 2);
  h.window.google = { accounts: { id: { initialize() {}, renderButton() {} } } };
  h.scripts[1].onload();
  await retry;
});

test('SDK 로드 시간 초과나 비정상 응답을 성공으로 처리하지 않는다', async () => {
  for (const failure of ['timeout', 'missing-sdk']) {
    const h = harness();
    const result = h.load();
    if (failure === 'timeout') [...h.timers][0]();
    else h.scripts[0].onload();
    await assert.rejects(result, /Google 로그인 버튼을 불러오지 못했어요/);
    assert.equal(h.scripts[0].removed, true);
    assert.equal(h.timers.size, 0);
  }
});
