const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function source(relative) {
  const file = path.join(__dirname, '../src', relative);
  return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function elements(file, tag) {
  const result = [];
  const visit = (node) => {
    if ((ts.isJsxSelfClosingElement(node) && node.tagName.getText() === tag)
      || (ts.isJsxElement(node) && node.openingElement.tagName.getText() === tag)) result.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return result;
}
function ancestors(node) {
  const tags = [];
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isJsxElement(parent)) tags.push(parent.openingElement.tagName.getText());
  }
  return tags;
}

test('네이티브 Apple 로그인 버튼은 Google Pressable 안에 중첩되지 않는다', () => {
  const file = source('features/auth/login-screen.tsx');
  const apple = elements(file, 'AppleLoginButton');
  assert.equal(apple.length, 1);
  assert.equal(ancestors(apple[0]).includes('Pressable'), false);
  assert.equal(ancestors(apple[0])[0], 'View');
});

test('설정의 도움말·법적 링크는 건강 버튼과 별도의 터치 영역이다', () => {
  const file = source('features/settings/settings-screen.tsx');
  for (const button of elements(file, 'Pressable')) {
    assert.equal(ancestors(button).includes('Pressable'), false);
  }
});

test('모든 하위 화면의 뒤로가기 헤더는 스크롤 영역 밖에 있다', () => {
  const root = path.join(__dirname, '../src/features');
  const files = fs.readdirSync(root, { recursive: true }).filter((file) => file.endsWith('.tsx'));
  let checked = 0;
  for (const file of files) {
    for (const header of elements(source(`features/${file}`), 'BackHeader')) {
      assert.equal(ancestors(header).includes('ScrollView'), false, file);
      checked++;
    }
  }
  assert.ok(checked >= 20);
});

test('러닝 시작·정지·종료는 스크롤 밖의 하단 안전 영역에 고정한다', () => {
  const file = source('features/running/run-tracking-screen.tsx');
  const controls = elements(file, 'RunControls');
  assert.equal(controls.length, 1);
  assert.equal(ancestors(controls[0]).includes('ScrollView'), false);
  assert.ok(ancestors(controls[0]).includes('SafeAreaView'));
  const ready = elements(file, 'RunReadyView');
  assert.equal(ready.length, 1);
  assert.ok(ancestors(ready[0]).includes('ScrollView'));
  assert.equal(elements(source('features/running/run-ready-view.tsx'), 'PulseRing').length, 0);
});

test('건강·Apple 재인증은 RN 확인 모달을 닫으며 동시에 호출하지 않는다', () => {
  for (const file of ['features/health/health-screen.tsx', 'features/settings/settings-screen.tsx']) {
    const screen = source(file);
    assert.equal(elements(screen, 'PaceConfirmDialog').length, 0);
    assert.equal(elements(screen, 'Modal').length, 0);
  }
});

test('탭의 브랜드·제목·설명은 함께 고정되고 본문만 스크롤한다', () => {
  const file = source('features/navigation/tab-screen-shell.tsx');
  const texts = elements(file, 'Text');
  const title = texts.find((node) => node.children.some((child) =>
    ts.isJsxExpression(child) && child.expression?.getText() === 'title'));
  assert.ok(title);
  assert.equal(ancestors(title).includes('ScrollView'), false);
  for (const name of ['eyebrow', 'description']) {
    const text = texts.find((node) => node.children.some((child) =>
      ts.isJsxExpression(child) && child.expression?.getText() === name));
    assert.ok(text);
    assert.equal(ancestors(text).includes('ScrollView'), false);
  }
  assert.equal(ancestors(elements(file, 'PaceBrand')[0]).includes('ScrollView'), false);
});

test('목록·상세·설정·러닝 화면의 페이지 제목은 스크롤 영역 밖에 있다', () => {
  const screens = [
    'crew/crew-create', 'crew/crew-detail', 'crew/crew-search',
    'race/race-create', 'race/race-detail', 'race/race-search',
    'profile/profile-edit', 'profile/weekly-goal', 'health/health',
    'settings/settings', 'settings/permissions', 'settings/app-update',
    'legal/legal', 'running/achievements', 'running/run-tracking',
  ];
  for (const screen of screens) {
    const titles = elements(source(`features/${screen}-screen.tsx`), 'Text')
      .filter(node => node.openingElement.attributes.getText().includes('styles.title'));
    assert.ok(titles.length, screen);
    for (const title of titles) assert.equal(ancestors(title).includes('ScrollView'), false, screen);
  }
});

function onboardingHarness(replay, canGoBack = true) {
  const file = source('features/onboarding/onboarding-screen.tsx');
  const calls = [];
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: { useRef: (current) => ({ current }), useState: (value) => [value, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      StyleSheet: { create: (value) => value }, View: 'View', ScrollView: 'ScrollView',
      Animated: { View: 'AnimatedView' }, Platform: { OS: 'ios' },
      useWindowDimensions: () => ({ width: 390, height: 844 }),
    },
    'expo-router': { useRouter: () => ({
      canGoBack: () => canGoBack, back: () => calls.push('back'), replace: (route) => calls.push(route),
    }) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/constants/pace': { PaceColors: {} },
    '@/data/onboarding-repository': { completeOnboarding: async () => calls.push('persist') },
    '@/components/pace-feedback': { PaceErrorDialog: 'PaceErrorDialog' },
    './onboarding-content': { onboardingSlides: [{}] },
    './onboarding-footer': { OnboardingFooter: 'OnboardingFooter' },
    './onboarding-header': { OnboardingHeader: 'OnboardingHeader' },
    './onboarding-slide-content': { OnboardingSlideContent: 'OnboardingSlideContent' },
    './use-onboarding-pager': { useOnboardingPager: () => ({
      page: 0, isLastSlide: true, entrance: { interpolate: () => 0 },
    }) },
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(file.text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { module, exports: module.exports, console, require: (name) => {
    if (!(name in mocks)) throw new Error(`Unexpected module ${name}`);
    return mocks[name];
  } });
  const tree = module.exports.OnboardingScreen({ replay });
  const find = (node, type) => {
    if (!node || typeof node !== 'object') return null;
    if (node.type === type) return node;
    const children = node.props?.children;
    return (Array.isArray(children) ? children : [children]).map((child) => find(child, type)).find(Boolean);
  };
  return { calls, footer: find(tree, 'OnboardingFooter'), header: find(tree, 'OnboardingHeader') };
}

test('온보딩 다시 보기는 완료 상태를 덮어쓰거나 권한 안내를 반복하지 않고 설정으로 복귀한다', async () => {
  for (const canGoBack of [true, false]) {
    const h = onboardingHarness(true, canGoBack);
    assert.equal(h.footer.props.finishLabel, '돌아가기');
    h.footer.props.onAdvance();
    await Promise.resolve();
    assert.deepEqual(h.calls, [canGoBack ? 'back' : '/settings']);
  }
  const h = onboardingHarness(true);
  h.header.props.onClose();
  assert.deepEqual(h.calls, ['back']);
});

test('최초 온보딩은 완료를 저장한 뒤에만 권한 안내로 이동한다', async () => {
  const h = onboardingHarness(false);
  assert.equal(h.header.props.onClose, undefined);
  h.footer.props.onAdvance();
  await new Promise(setImmediate);
  assert.deepEqual(h.calls, ['persist', '/permissions']);
});

test('소셜 버튼은 문구 없는 56pt 원형·공식 로고·접근성 이름과 개별 로딩을 사용한다', () => {
  const logo = fs.readFileSync(path.join(__dirname, '../assets/images/google-logo.png'));
  assert.equal(logo.subarray(1, 4).toString(), 'PNG');
  const appleLogo = fs.readFileSync(path.join(__dirname, '../assets/images/apple-login-logo.svg'), 'utf8');
  assert.match(appleLogo, /viewBox="0 0 31 44"/);
  const h = renderHarness('features/auth/provider-login-button.tsx', {
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', View: 'View',
      Text: 'Text', StyleSheet: { create: (styles) => styles },
    },
    'expo-image': { Image: 'Image' },
    '@/assets/images/google-logo.png': 'google-logo',
    '@/assets/images/apple-login-logo.svg': 'apple-logo',
  });
  for (const provider of ['google', 'apple']) {
    const tree = h.render('ProviderLoginButton', { provider, disabled: false, loading: false });
    const nodes = flatten(tree);
    assert.equal(nodes.filter(({ node }) => node.type === 'Text').length, 0);
    assert.equal(tree.props.accessibilityLabel, `${provider === 'apple' ? 'Apple' : 'Google'}로 계속하기`);
    assert.equal(nodes.find(({ node }) => node.type === 'Image').node.props.source, `${provider}-logo`);
    const target = tree.props.style({ pressed: false })[0];
    assert.equal(target.width, 56);
    assert.equal(target.height, 56);
    assert.equal(target.borderRadius, 28);
    const loading = h.render('ProviderLoginButton', { provider, disabled: true, loading: true });
    assert.equal(loading.props.disabled, true);
    assert.equal(loading.props.accessibilityState.busy, true);
    assert.equal(flatten(loading).filter(({ node }) => node.type === 'ActivityIndicator').length, 1);
    assert.equal(flatten(loading).filter(({ node }) => node.type === 'Image').length, 0);
  }
});

function flatten(tree) {
  const nodes = [];
  const visit = (node, parents = []) => {
    if (!node || typeof node !== 'object') return;
    nodes.push({ node, parents });
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) visit(child, [...parents, node]);
  };
  visit(tree);
  return nodes;
}

function renderHarness(file, imports) {
  const slots = [];
  const cleanups = new Map();
  let cursor = 0;
  let effects = [];
  const jsx = (type, props) => ({ type, props });
  const slot = (initial) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], (value) => {
      slots[index] = typeof value === 'function' ? value(slots[index]) : value;
    }];
  };
  const mocks = {
    react: {
      useState: slot, useRef: (current) => slot({ current })[0], useCallback: (fn) => fn,
      useMemo: (compute) => compute(),
      useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
      useEffect: (fn, deps) => {
        const index = cursor++;
        const prior = slots[index];
        if (!prior || deps.some((dep, i) => dep !== prior[i])) effects.push(() => {
          cleanups.get(index)?.();
          cleanups.set(index, fn());
        });
        slots[index] = deps;
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    ...imports,
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source(file).text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { module, exports: module.exports, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: (callback) => { callback(); return 0; }, cancelAnimationFrame() {},
    console: { ...console, error() {} }, require: (name) => {
    if (!(name in mocks)) throw new Error(`Unexpected import ${name}`);
    return mocks[name];
  } });
  return { unmount: () => {
    cleanups.forEach((cleanup) => cleanup?.());
    cleanups.clear();
  }, render: (name, props) => {
    cursor = 0;
    const tree = module.exports[name](props);
    const pending = effects;
    effects = [];
    pending.forEach((fn) => fn());
    return tree;
  } };
}

test('러닝 목표를 진행 기록에 보관하고 저장 실패는 기록을 유지하며 성공 후에만 완료 화면으로 간다', async () => {
  let snapshot = { run: null, loaded: true, error: null };
  let fail = true;
  let stopped = 0;
  let savedOwner;
  const finished = { id: 'run', startedAt: 0, endedAt: 1000, distanceMeters: 1000, durationSeconds: 300, routePoints: [] };
  const h = renderHarness('features/running/run-tracking-screen.tsx', {
    'react-native': { AppState: { currentState: 'active' }, Pressable: 'Pressable', ScrollView: 'ScrollView', View: 'View',
      StyleSheet: { create: (s) => s } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/back-header': { BackHeader: 'BackHeader' },
    '@/components/pace-feedback': { PaceErrorDialog: 'PaceErrorDialog' },
    '@/components/pace-text': { PaceText: 'Text' }, '@/constants/pace': { PaceColors: {} },
    '@/data/active-run-store': {
      subscribeToActiveRun() {}, getActiveRunSnapshot: () => snapshot,
      refreshActiveRunSnapshot: async () => {},
      writeActiveRun: async (run) => { snapshot = { ...snapshot, run }; },
      clearActiveRun: async () => { snapshot = { ...snapshot, run: null }; },
    },
    '@/data/completed-runs-repository': { saveCompletedRun: async (_run, owner) => {
      savedOwner = owner;
      if (fail) throw new Error('disk full');
      return { synced: true, message: 'saved' };
    } },
    '@/features/auth/session-store': { getSessionState: () => ({ session: { user: { id: 'alice' } } }) },
    '@/features/health/health-service': { exportHealthRun: async () => {} },
    '@/lib/format': { formatDuration: () => '', formatKm: () => '', formatPace: () => '' },
    './location-tracking': { checkTrackingReadiness: async () => null, startLocationTracking: async () => {},
      stopLocationTracking: async () => { stopped++; }, getLocationFailureMessage: (_error, text) => text },
    './run-ready-view': { RunReadyView: 'RunReadyView' }, './run-options': { RunOptions: 'RunOptions' },
    './run-goals': { runGoalProgress: () => null }, './use-run-guidance': { useRunGuidance: () => null },
    './run-completion': { RunCompletion: 'RunCompletion' },
    './run-session': {
      createActiveRun: () => ({ id: 'run', status: 'running', startedAt: 0, routePoints: [], distanceMeters: 1000 }),
      getCurrentPaceSecondsPerKm: () => 300, getElapsedMilliseconds: () => 300_000,
      pauseActiveRun: (run) => ({ ...run, status: 'paused' }), resumeActiveRun: (run) => ({ ...run, status: 'running' }),
      toCompletedRun: () => finished,
    },
  });
  let nodes = flatten(h.render('RunTrackingScreen'));
  const options = nodes.find(({ node }) => node.type === 'RunOptions').node;
  options.props.onGoal({ kind: 'distance', target: 5000 });
  options.props.onVoice(true);
  nodes = flatten(h.render('RunTrackingScreen'));
  await nodes.find(({ node }) => typeof node.type === 'function' && node.type.name === 'ActionButton').node.props.onPress();
  assert.equal(snapshot.run.goal.target, 5000);
  assert.equal(snapshot.run.voiceGuidance, true);
  nodes = flatten(h.render('RunTrackingScreen'));
  let controls = nodes.find(({ node }) => typeof node.type === 'function' && node.type.name === 'RunControls').node;
  controls.props.onConfirm();
  controls = flatten(h.render('RunTrackingScreen')).find(({ node }) => typeof node.type === 'function' && node.type.name === 'RunControls').node;
  assert.equal(controls.props.confirming, true);
  await controls.props.onFinish();
  assert.ok(snapshot.run);
  assert.equal(flatten(h.render('RunTrackingScreen')).some(({ node }) => node.type === 'RunCompletion'), false);
  fail = false;
  controls = flatten(h.render('RunTrackingScreen')).find(({ node }) => typeof node.type === 'function' && node.type.name === 'RunControls').node;
  await controls.props.onFinish();
  assert.equal(snapshot.run, null);
  assert.equal(savedOwner, 'alice');
  assert.equal(stopped, 2);
  assert.equal(flatten(h.render('RunTrackingScreen')).find(({ node }) => node.type === 'RunCompletion').node.props.run.id, 'run');
});

test('완료 화면은 해당 러닝에서 획득한 배지만 공유 카드에 넘긴다', () => {
  const pushed = [];
  const h = renderHarness('features/running/run-completion.tsx', {
    'react-native': { ScrollView: 'ScrollView', View: 'View', StyleSheet: { create: s => s } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { useRouter: () => ({ replace: route => pushed.push(route), push() {} }) },
    '@/components/back-header': { BackHeader: 'BackHeader' },
    '@/components/pace-text': { PaceText: 'Text' }, '@/components/pace-button': { PaceButton: 'PaceButton' },
    '@/components/pace-feedback': { PaceQueryState: 'PaceQueryState' }, '@/constants/pace': { PaceColors: {} },
    '@/data/running-progress-repository': { getRunningProgress() {} },
    '@/hooks/use-focus-query': { useFocusQuery: () => ({ isLoading: false, data: {
      weeklyDistanceKm: 5, weeklyGoalKm: 20, badges: [
        { id: 'old', title: '이전 배지', earnedAt: '2026-10-20T00:00:00Z' },
        { id: 'new', title: '첫 5K', earnedAt: '2026-10-26T01:30:00Z' },
        { id: 'locked', title: '첫 10K', earnedAt: null },
      ],
    } }) },
    '@/lib/format': { formatDuration: () => '30:00', formatKm: () => '5.00' },
    '@/features/runs/run-share-card': { RunShareCard: 'RunShareCard' },
    './personal-records': { recordsEarnedByRun: () => [] },
    './personal-record-celebration': { PersonalRecordCelebration: 'PersonalRecordCelebration' },
    './badge-emblem': { BadgeEmblem: 'BadgeEmblem' },
  });

  test('PACE 배지 10종은 동일한 도형을 재사용하며 미획득은 회색으로 표시한다', () => {
    const h = renderHarness('features/running/badge-emblem.tsx', {
      'react-native': { View: 'View', StyleSheet: { create: s => s } },
      '@/components/pace-icon': { PaceIcon: 'PaceIcon' },
      '@/components/pace-text': { PaceText: 'Text' },
    });
    const ids = ['first-run', 'single3k', 'single5k', 'single10k', 'total30k', 'total100k',
      'total300k', 'weekly3days', 'monthly10runs', 'crew-goal'];
    const colors = new Set();
    for (const id of ids) {
      const earned = flatten(h.render('BadgeEmblem', { id, earned: true }));
      const locked = flatten(h.render('BadgeEmblem', { id, earned: false }));
      const border = nodes => nodes.find(({ node }) => Array.isArray(node.props.style)
        && node.props.style[1]?.borderColor).node.props.style[1].borderColor;
      colors.add(border(earned));
      assert.equal(border(locked), '#757A83');
      assert.equal(earned[0].node.props.importantForAccessibility, 'no-hide-descendants');
    }
    assert.equal(colors.size, ids.length);
    const unknown = flatten(h.render('BadgeEmblem', { id: 'future-badge', earned: true }));
    assert.ok(unknown.some(({ node }) => node.props.children === 'PACE ACHIEVEMENT'));
  });
  const nodes = flatten(h.render('RunCompletion', { run: {
    id: 'local-id', startedAt: Date.parse('2026-10-26T01:00:00Z'), endedAt: Date.parse('2026-10-26T01:30:00Z'),
    durationSeconds: 1800, distanceMeters: 5000,
  }, message: 'saved', onDone() {} }));
  const card = nodes.find(({ node }) => node.type === 'RunShareCard').node;
  assert.deepEqual(Array.from(card.props.badgeTitles), ['첫 5K']);
  nodes.find(({ node }) => node.props?.label === '컨디션 기록 · 러닝 상세').node.props.onPress();
  assert.equal(pushed[0].pathname, '/run-detail');
  assert.equal(pushed[0].params.runId, 'local-id');
});

test('러닝 공유 카드는 레이아웃 뒤 이미지를 자동 생성하고 프라이버시 변경 시 다시 생성한다', async () => {
  const calls = [];
  let next = 0;
  let fail = false;
  let defer = false;
  let finishCapture;
  const h = renderHarness('features/runs/run-share-card.tsx', {
    'react-native': { Platform: { OS: 'ios' }, Switch: 'Switch', View: 'View', StyleSheet: { create: s => s } },
    '@/components/pace-text': { PaceText: 'Text' }, '@/components/pace-brand': { PaceBrand: 'PaceBrand' },
    '@/components/pace-button': { PaceButton: 'PaceButton' }, '@/constants/pace': { PaceColors: {} },
    '@/lib/format': { formatDuration: () => '30:00', formatKm: () => '5.00', formatPace: () => '6:00' },
    '@/lib/api-transport': { errorMessage: e => e.message },
    './share-route': { shareRouteSegments: () => [] },
    './share-card-export': {
      captureRunCardImage: async () => {
        const uri = `image-${++next}.png`;
        calls.push(['capture', uri]);
        if (fail) throw new Error('이미지 생성 실패');
        if (defer) return new Promise(resolve => { finishCapture = () => resolve(uri); });
        return uri;
      },
      releaseRunCardImage: uri => calls.push(['release', uri]),
      shareRunCardImage: async uri => { calls.push(['share', uri]); },
    },
  });
  const props = { run: { id: 'run', startedAt: 0, distanceMeters: 5000, durationSeconds: 1800, routePoints: [] } };
  let nodes = flatten(h.render('RunShareCard', props));
  assert.equal(calls.length, 0);
  nodes.find(({ node }) => node.props?.collapsable === false).node.props.onLayout();
  h.render('RunShareCard', props);
  await Promise.resolve();
  nodes = flatten(h.render('RunShareCard', props));
  assert.equal(calls[0][0], 'capture');
  assert.equal(nodes.find(({ node }) => node.type === 'PaceButton').node.props.disabled, false);
  nodes.find(({ node }) => node.type === 'Switch').node.props.onValueChange(false);
  h.render('RunShareCard', props);
  await Promise.resolve();
  nodes = flatten(h.render('RunShareCard', props));
  assert.equal(calls.filter(c => c[0] === 'capture').length, 2);
  assert.deepEqual(calls.find(c => c[0] === 'release'), ['release', 'image-1.png']);
  nodes.find(({ node }) => node.type === 'PaceButton').node.props.onPress();
  await Promise.resolve();
  assert.deepEqual(calls.find(c => c[0] === 'share'), ['share', 'image-2.png']);
  await new Promise(setImmediate);
  nodes = flatten(h.render('RunShareCard', props));
  fail = true;
  nodes.find(({ node }) => node.type === 'Switch').node.props.onValueChange(true);
  h.render('RunShareCard', props);
  await new Promise(setImmediate);
  nodes = flatten(h.render('RunShareCard', props));
  assert.equal(nodes.find(({ node }) => node.type === 'PaceButton').node.props.disabled, true);
  assert.ok(nodes.some(({ node }) => node.type === 'Text' && node.props.children === '이미지 생성 실패'));
  fail = false;
  nodes.find(({ node }) => node.props?.label === '카드 이미지 다시 만들기').node.props.onPress();
  h.render('RunShareCard', props);
  await new Promise(setImmediate);
  nodes = flatten(h.render('RunShareCard', props));
  assert.equal(nodes.find(({ node }) => node.type === 'PaceButton').node.props.disabled, false);
  assert.ok(calls.some(c => c[0] === 'release' && c[1] === 'image-2.png'));
  defer = true;
  nodes.find(({ node }) => node.type === 'Switch').node.props.onValueChange(false);
  h.render('RunShareCard', props);
  h.unmount();
  finishCapture();
  await new Promise(setImmediate);
  assert.ok(calls.some(c => c[0] === 'release' && c[1] === 'image-4.png'));
  assert.ok(calls.some(c => c[0] === 'release' && c[1] === 'image-5.png'));
});

test('크루의 목표 0은 달성이 아니라 미설정으로 표시하고 일반 멤버는 수정할 수 없다', () => {
  const h = renderHarness('features/crew/crew-goal-card.tsx', {
    'react-native': { TextInput: 'TextInput', View: 'View', StyleSheet: { create: s => s } },
    '@/components/pace-text': { PaceText: 'Text' },
    '@/components/pace-button': { PaceButton: 'PaceButton' },
    '@/components/pace-feedback': { PaceQueryState: 'PaceQueryState' },
    '@/constants/pace': { PaceColors: {} },
    '@/data/running-progress-repository': {},
    '@/lib/api-transport': {},
    '@/hooks/use-focus-query': { useFocusQuery: () => ({
      data: { targetKm: 0, totalKm: 0, month: '2026-10', canEdit: false, contributors: [] },
      isLoading: false,
    }) },
  });
  const nodes = flatten(h.render('CrewGoalCard', { crewId: 'crew' }));
  const text = nodes.filter(({ node }) => node.type === 'Text').map(({ node }) => node.props.children).join(' ');
  assert.match(text, /크루장이 이번 달 목표를 설정하면/);
  assert.doesNotMatch(text, /함께 목표를 달성했어요/);
  assert.equal(nodes.filter(({ node }) => node.type === 'TextInput').length, 0);
  assert.equal(nodes.filter(({ node }) => node.type === 'PaceButton').length, 0);
});

function loginHarness(overrides = {}) {
  return renderHarness('features/auth/login-screen.tsx', {
    'react-native': {
      Platform: { OS: 'ios' }, Pressable: 'Pressable', ScrollView: 'ScrollView', View: 'View',
      StyleSheet: { create: (styles) => styles },
    },
    'expo-router': { useRouter: () => ({ push() {}, replace() {} }) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/back-header': { BackHeader: 'BackHeader' },
    '@/components/pace-brand': { PaceBrand: 'PaceBrand' },
    '@/components/pace-text': { PaceText: 'Text' },
    '@/constants/pace': { PaceColors: {} },
    '@/components/pace-feedback': { PaceErrorDialog: 'PaceErrorDialog' },
    '@/constants/api': {}, '@/data/completed-runs-repository': {},
    '@/data/active-run-store': { readActiveRun: async () => null },
    '@/lib/api-transport': {}, './google-login': {}, './apple-login': {},
    './google-web-button': { GoogleWebButton: 'GoogleWebButton' },
    './apple-login-button': { AppleLoginButton: 'AppleLoginButton' },
    './provider-login-button': { ProviderLoginButton: 'ProviderLoginButton' },
    './session-store': { useSession: () => ({ session: null }) },
    ...overrides,
  });
}

test('iOS 로그인은 공통 Google 버튼과 별도 Apple 버튼을 렌더링하고 헤더를 스크롤 밖에 둔다', () => {
  const nodes = flatten(loginHarness().render('LoginScreen'));
  const google = nodes.find(({ node }) => node.type === 'ProviderLoginButton').node;
  assert.equal(google.props.provider, 'google');
  const apple = nodes.find(({ node }) => node.type === 'AppleLoginButton');
  assert.equal(apple.parents.includes(google), false);
  const header = nodes.find(({ node }) => node.type === 'BackHeader');
  assert.equal(header.parents.some((node) => node.type === 'ScrollView'), false);
  assert.equal(header.node.props.showBrand, false);
  const brands = nodes.filter(({ node }) => node.type === 'PaceBrand');
  assert.equal(brands.length, 1);
  assert.equal(brands[0].node.props.large, true);
  assert.equal(brands[0].parents.some((node) => node.type === 'ScrollView'), true);
});

test('로그인에서 헤더 로고를 숨겨도 뒤로가기를 유지하고 다른 화면은 기본 로고를 유지한다', () => {
  let backs = 0;
  const h = renderHarness('components/back-header.tsx', {
    'react-native': { Pressable: 'Pressable', View: 'View', StyleSheet: { create: (s) => s } },
    'expo-router': { useRouter: () => ({ canGoBack: () => true, back: () => backs++ }) },
    '@/components/pace-brand': { PaceBrand: 'PaceBrand' },
    '@/components/pace-text': { PaceText: 'Text' },
    '@/constants/pace': { PaceColors: {} },
  });
  const login = flatten(h.render('BackHeader', { showBrand: false }));
  assert.equal(login.filter(({ node }) => node.type === 'PaceBrand').length, 0);
  login.find(({ node }) => node.type === 'Pressable').node.props.onPress();
  assert.equal(backs, 1);
  assert.equal(flatten(h.render('BackHeader', {})).filter(({ node }) => node.type === 'PaceBrand').length, 1);
});

test('Apple 인증 중 Google은 로딩하지 않고 중복 요청을 차단하며 취소·실패 후 해제한다', async () => {
  let resolveApple;
  let rejectGoogle;
  let appleCalls = 0;
  let googleCalls = 0;
  const h = loginHarness({
    './apple-login': { appleCredential: () => { appleCalls++; return new Promise((resolve) => { resolveApple = resolve; }); } },
    './google-login': { googleIdToken: () => { googleCalls++; return new Promise((_, reject) => { rejectGoogle = reject; }); } },
    '@/lib/api-transport': { errorMessage: (error) => error.message },
  });
  const buttons = () => {
    const nodes = flatten(h.render('LoginScreen'));
    return {
      apple: nodes.find(({ node }) => node.type === 'AppleLoginButton').node.props,
      google: nodes.find(({ node }) => node.type === 'ProviderLoginButton').node.props,
      error: nodes.find(({ node }) => node.type === 'PaceErrorDialog').node.props.message,
    };
  };
  buttons().apple.onPress();
  await new Promise(setImmediate);
  assert.equal(buttons().apple.loading, true);
  assert.equal(buttons().google.loading, false);
  assert.equal(buttons().google.disabled, true);
  buttons().apple.onPress();
  buttons().google.onPress();
  assert.equal(appleCalls, 1);
  assert.equal(googleCalls, 0);
  resolveApple(null);
  await new Promise(setImmediate);
  assert.equal(buttons().apple.disabled, false);
  buttons().google.onPress();
  await new Promise(setImmediate);
  assert.equal(buttons().google.loading, true);
  assert.equal(buttons().apple.loading, false);
  rejectGoogle(new Error('인증 실패'));
  await new Promise(setImmediate);
  assert.equal(buttons().google.disabled, false);
  assert.equal(buttons().error, '인증 실패');
});

test('설치의 온보딩 기록이 없으면 기존 로그인과 관계없이 권한보다 온보딩을 먼저 표시한다', async () => {
  for (const session of [null, { user: { id: 'restored-user' } }]) {
    for (const completed of [false, true]) {
      for (const seen of [false, true]) {
        const h = renderHarness('app/index.tsx', {
          'expo-router': { Redirect: 'Redirect' },
          'react-native': { View: 'View' },
          '@/features/onboarding/onboarding-screen': { OnboardingScreen: 'OnboardingScreen' },
          '@/features/onboarding/pace-splash': { PaceSplash: 'PaceSplash' },
          '@/data/onboarding-repository': { hasCompletedOnboarding: async () => completed },
          '@/features/auth/session-store': { useSession: () => ({ session }) },
          '@/components/pace-feedback': { PaceQueryState: 'PaceQueryState' },
          '@/data/permission-preferences': { hasSeenPermissionIntro: async () => seen },
        });
        h.render('default').props.onFinish();
        await new Promise(setImmediate);
        const tree = h.render('default');
        assert.equal(tree.type, completed ? 'Redirect' : 'OnboardingScreen');
        if (completed) assert.equal(tree.props.href, !seen ? '/permissions' : session ? '/main' : '/login');
      }
    }
  }
});

test('설정 이용 안내에는 온보딩 링크가 없고 내 메뉴는 별도의 압축 카드로 렌더링한다', () => {
  const settings = source('features/settings/settings-screen.tsx');
  assert.doesNotMatch(settings.text, /온보딩 다시 보기|['"]\/onboarding['"]/);
  const profile = source('features/profile/profile-screen.tsx');
  const menu = elements(profile, 'View').find((node) => node.openingElement.attributes.getText().includes('styles.menuCard'));
  assert.ok(menu);
  assert.match(menu.getText(), /menuItems\.filter/);
  assert.match(profile.text, /menuCard: \{[^}]*paddingHorizontal: 16/);
  assert.doesNotMatch(profile.text.match(/menuCard: \{([^}]*)/)[1], /\bpadding:|paddingVertical:/);
});

function communityFormHarness(kind, repository) {
  return renderHarness(`features/${kind}/${kind}-create-screen.tsx`, {
    'react-native': {
      KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'ios' }, Pressable: 'Pressable',
      ScrollView: 'ScrollView', TextInput: 'TextInput', View: 'View', StyleSheet: { create: (s) => s },
    },
    'expo-router': { useRouter: () => ({ canGoBack: () => true, back() {}, replace() {} }), useFocusEffect: (fn) => fn() },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/back-header': { BackHeader: 'BackHeader' },
    '@/components/choice-chips': { ChoiceChips: 'ChoiceChips' },
    '@/components/pace-button': { PaceButton: 'PaceButton' },
    '@/components/pace-feedback': { PaceErrorDialog: 'PaceErrorDialog' },
    '@/components/pace-text': { PaceText: 'Text' }, '@/constants/pace': { PaceColors: {} },
    [`@/data/${kind}-repository`]: repository,
    '@/hooks/use-now': { useNow: () => Date.now() },
    './race-status': {
      getJoinDeadline: (r) => r.startsAt - r.joinDeadlineMinutes * 60000,
      formatRaceDistance: String, formatRaceStart: String,
    },
    './region-picker': { LocateRegionButton: 'LocateRegionButton', RegionPicker: 'RegionPicker' },
    './types': {
      CREW_INTRO_MAX_LENGTH: 100, CREW_NAME_MAX_LENGTH: 20, CREW_MAX_MEMBERS: 50,
      RACE_DEADLINE_OPTIONS_MINUTES: [10, 30, 60], RACE_DISTANCE_OPTIONS_METERS: [3000, 5000, 10000, 21097],
      RACE_MAX_PARTICIPANTS: 20, RACE_MIN_PARTICIPANTS: 2,
    },
  });
}

test('크루 수정은 기존 필드를 채우고 생성 대신 PATCH 저장을 실행한다', async () => {
  let saved;
  const h = communityFormHarness('crew', {
    createCrew: () => { throw new Error('생성을 호출하면 안 됩니다'); },
    updateCrew: async (...args) => { saved = args; },
  });
  const crew = { id: 'crew-1', name: '기존 이름', intro: '소개', region: { sido: '서울', sigungu: null } };
  let nodes = flatten(h.render('CrewCreateScreen', { crew }));
  const name = nodes.find(({ node }) => node.props.accessibilityLabel === '크루 이름').node.props;
  assert.equal(name.value, crew.name);
  name.onChangeText('수정한 이름');
  nodes = flatten(h.render('CrewCreateScreen', { crew }));
  nodes.find(({ node }) => node.props.label === '변경 사항 저장').node.props.onPress();
  await new Promise(setImmediate);
  assert.equal(saved[0], crew.id);
  assert.equal(saved[1].name, '수정한 이름');
  assert.equal(saved[1].region.sido, '서울');
});

test('참가자가 있는 대결 수정은 약속 조건을 잠그고 정확한 원본 시각을 보존해 저장한다', async () => {
  let saved;
  const h = communityFormHarness('race', {
    createRace: () => { throw new Error('생성을 호출하면 안 됩니다'); },
    updateRace: async (...args) => { saved = args; },
  });
  const race = {
    id: 'race-1', title: '기존 대결', distanceMeters: 10000, startsAt: Date.now() + 6 * 86400000 + 1234,
    joinDeadlineMinutes: 30, minParticipants: 2, maxParticipants: 10,
    visibility: 'private', participantCount: 3, cancelled: false,
  };
  let nodes = flatten(h.render('RaceCreateScreen', { race }));
  for (const { node } of nodes.filter(({ node }) => node.type === 'ChoiceChips')) assert.equal(node.props.disabled, true);
  assert.equal(nodes.find(({ node }) => node.props.label === '최대').node.props.min, 3);
  assert.equal(nodes.find(({ node }) => node.props.label === '최소').node.props.disabled, true);
  nodes.find(({ node }) => node.props.accessibilityLabel === '방 이름').node.props.onChangeText('수정한 대결');
  nodes = flatten(h.render('RaceCreateScreen', { race }));
  nodes.find(({ node }) => node.props.label === '변경 사항 저장').node.props.onPress();
  await new Promise(setImmediate);
  assert.equal(saved[0], race.id);
  assert.equal(saved[1].title, '수정한 대결');
  assert.equal(saved[1].startsAt, race.startsAt);
  assert.equal(saved[1].visibility, race.visibility);
});

test('권한 안내는 첫 진입에서 위치만 자동 확인하고 설정 재진입에서는 요청하지 않는다', async () => {
  for (const from of [undefined, 'settings']) {
    const calls = [];
    let focus;
    const h = renderHarness('features/settings/permissions-screen.tsx', {
      'react-native': {
        AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
        Linking: { openSettings() {} }, Platform: { OS: 'ios' },
        Pressable: 'Pressable', ScrollView: 'ScrollView', View: 'View', StyleSheet: { create: (s) => s },
      },
      'expo-router': {
        useFocusEffect: (fn) => { focus = fn; }, useLocalSearchParams: () => ({ from }),
        useRouter: () => ({ replace() {}, push() {} }),
      },
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
      '@/components/back-header': { BackHeader: 'BackHeader' },
      '@/components/pace-button': { PaceButton: 'PaceButton' },
      '@/components/pace-text': { PaceText: 'Text' }, '@/constants/pace': { PaceColors: {} },
      '@/data/permission-preferences': {}, '@/features/auth/session-store': { useSession: () => ({ session: null }) },
      '@/lib/api-transport': {},
      './location-permission': { checkLocationPermission: async (mode) => {
        calls.push(mode); return { granted: true, canAskAgain: true, status: 'granted' };
      } },
    });
    h.render('PermissionsScreen');
    const cleanup = focus();
    await new Promise(setImmediate);
    assert.deepEqual(calls, [from === 'settings' ? 'never' : 'initial']);
    cleanup();
  }
});
