const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the gate's hooks and AppState subscriptions with controlled native promises.
function gateHarness({ enabled = true, supported = true } = {}) {
  const hooks = [];
  let cursor = 0;
  const effects = [];
  let stateListener;
  const h = { enabled, readFailure: false, authFailure: false, authPrompt: false, onAuthenticate: null, now: 0 };
  const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [hooks[index].value, (next) => {
        hooks[index].value = typeof next === 'function' ? next(hooks[index].value) : next;
      }];
    },
    useRef(value) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = { current: value };
      return hooks[index];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!hooks[index] || deps.some((value, i) => value !== hooks[index].deps[i])) {
        hooks[index]?.cleanup?.();
        hooks[index] = { deps };
        effects.push(() => { hooks[index].cleanup = effect(); });
      }
    },
  };
  const mocks = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': {
      AppState: { addEventListener: (_, listener) => {
        stateListener = listener;
        return { remove: () => { stateListener = null; } };
      } },
      Modal: 'Modal', View: 'View', StyleSheet: { create: (value) => value },
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/pace-brand': { PaceBrand: 'PaceBrand' },
    '@/components/pace-button': { PaceButton: 'PaceButton' },
    '@/components/pace-text': { PaceText: 'Text' },
    '@/constants/pace': { PaceColors: {} },
    '@/lib/api-transport': { errorMessage: (error) => error.message },
    './app-lock': {
      supportsAppLock: supported,
      isAppLockEnabled: async () => {
        if (h.readFailure) throw new Error('read failed');
        return h.enabled;
      },
      isDeviceAuthenticationInProgress: () => h.authPrompt,
      authenticateDevice: async () => {
        h.onAuthenticate?.();
        if (h.authFailure) throw new Error('cancelled');
      },
    },
  };
  const module = { exports: {} };
  const file = path.resolve(__dirname, '../src/features/auth/app-lock-gate.tsx');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, console: { error() {} }, Date: { now: () => h.now },
    require: (name) => {
      if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
      return mocks[name];
    },
  });
  const element = module.exports.AppLockGate({ userId: 'alice', children: 'protected-screen' });
  const component = element.type;
  h.render = () => {
    cursor = 0;
    const tree = typeof component === 'function' ? component(element.props) : element;
    effects.splice(0).forEach((effect) => effect());
    return tree;
  };
  h.changeState = (state) => stateListener?.(state);
  h.unmount = () => hooks.forEach((hook) => hook.cleanup?.());
  return h;
}

function find(tree, type) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === type) return tree;
  const children = tree.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const match = find(child, type);
    if (match) return match;
  }
  return null;
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

test('초기 설정 조회·잠금 해제 전에는 보호된 화면을 마운트하지 않는다', async () => {
  const h = gateHarness();
  let tree = h.render();
  assert.equal(tree.props.children[0], null);
  assert.equal(find(tree, 'Modal').props.visible, true);
  await settle();
  tree = h.render();
  assert.equal(tree.props.children[0], null);
  const button = find(tree, 'PaceButton');
  button.props.onPress();
  await settle();
  tree = h.render();
  assert.equal(tree.props.children[0], 'protected-screen');
  assert.equal(find(tree, 'Modal').props.visible, false);
});

test('인증 취소는 잠금을 유지하고 자체 인증창의 inactive 이벤트는 재잠금 루프를 만들지 않는다', async () => {
  const h = gateHarness();
  h.render();
  await settle();
  h.authFailure = true;
  find(h.render(), 'PaceButton').props.onPress();
  await settle();
  assert.equal(find(h.render(), 'Modal').props.visible, true);
  h.authFailure = false;
  h.onAuthenticate = () => { h.changeState('inactive'); h.changeState('active'); };
  find(h.render(), 'PaceButton').props.onPress();
  await settle();
  assert.equal(find(h.render(), 'Modal').props.visible, false);
  h.changeState('active');
  await settle();
  assert.equal(find(h.render(), 'Modal').props.visible, false);
});

test('백그라운드에서는 프라이버시 커버를 덮고 5분 이상 복귀 시만 인증하며 러닝을 유지한다', async () => {
  const h = gateHarness();
  h.render();
  await settle();
  find(h.render(), 'PaceButton').props.onPress();
  await settle();
  h.changeState('background');
  let tree = h.render();
  assert.equal(find(tree, 'Modal').props.visible, false);
  assert.ok(tree.props.children[1]);
  assert.equal(tree.props.children[0], 'protected-screen');
  h.now = 300000;
  h.changeState('active');
  await settle();
  tree = h.render();
  assert.equal(find(tree, 'Modal').props.visible, true);
  assert.equal(tree.props.children[0], 'protected-screen');
});

test('299999ms 백그라운드와 시스템 inactive 권한창은 재인증을 요구하지 않는다', async () => {
  const h = gateHarness();
  h.render();
  await settle();
  find(h.render(), 'PaceButton').props.onPress();
  await settle();
  h.changeState('background');
  h.now = 299999;
  h.changeState('active');
  await settle();
  assert.equal(find(h.render(), 'Modal').props.visible, false);
  assert.equal(h.render().props.children[1], null);
  h.changeState('inactive');
  assert.ok(h.render().props.children[1]);
  h.now += 600000;
  h.changeState('active');
  await settle();
  assert.equal(find(h.render(), 'Modal').props.visible, false);
});

test('5분 뒤 인증을 취소하면 짧은 추가 앱 전환으로 잠금이 풀리지 않는다', async () => {
  const h = gateHarness();
  h.render();
  await settle();
  find(h.render(), 'PaceButton').props.onPress();
  await settle();
  h.changeState('background');
  h.now = 300000;
  h.changeState('active');
  await settle();
  h.authFailure = true;
  find(h.render(), 'PaceButton').props.onPress();
  await settle();
  h.changeState('background');
  h.now += 1000;
  h.changeState('active');
  await settle();
  assert.equal(find(h.render(), 'Modal').props.visible, true);
});

test('설정 조회 실패는 fail-closed이고 재시도 후에만 잠금 설정을 판단한다', async () => {
  const h = gateHarness({ enabled: false });
  h.readFailure = true;
  h.render();
  await settle();
  let tree = h.render();
  assert.equal(find(tree, 'Modal').props.visible, true);
  assert.equal(tree.props.children[0], null);
  assert.equal(find(tree, 'PaceButton').props.label, '잠금 설정 다시 확인');
  h.readFailure = false;
  find(tree, 'PaceButton').props.onPress();
  h.render();
  await settle();
  tree = h.render();
  assert.equal(find(tree, 'Modal').props.visible, false);
  assert.equal(tree.props.children[0], 'protected-screen');
});

test('미지원 플랫폼은 잠금창을 띄우거나 보호 화면을 불필요하게 지연하지 않는다', () => {
  const h = gateHarness({ supported: false });
  const tree = h.render();
  assert.equal(tree.props.children, 'protected-screen');
  assert.equal(find(tree, 'Modal'), null);
});
