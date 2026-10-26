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

test('건강·Apple 재인증은 RN 확인 모달을 닫으며 동시에 호출하지 않는다', () => {
  for (const file of ['features/health/health-screen.tsx', 'features/settings/settings-screen.tsx']) {
    const screen = source(file);
    assert.equal(elements(screen, 'PaceConfirmDialog').length, 0);
    assert.equal(elements(screen, 'Modal').length, 0);
  }
});

test('탭 제목은 콘텐츠와 함께 스크롤하고 브랜드만 고정된다', () => {
  const file = source('features/navigation/tab-screen-shell.tsx');
  const texts = elements(file, 'Text');
  const title = texts.find((node) => node.children.some((child) =>
    ts.isJsxExpression(child) && child.expression?.getText() === 'title'));
  assert.ok(title);
  assert.ok(ancestors(title).includes('ScrollView'));
  assert.equal(ancestors(elements(file, 'PaceBrand')[0]).includes('ScrollView'), false);
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

test('소셜 버튼은 같은 18pt 반굵은 시스템 글꼴·44pt 시각 높이·52pt 터치 영역과 로컬 공식 로고를 사용한다', () => {
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
  const titles = [];
  for (const provider of ['google', 'apple']) {
    const tree = h.render('ProviderLoginButton', { provider, disabled: true, loading: provider === 'apple' });
    const nodes = flatten(tree);
    const title = nodes.find(({ node }) => node.type === 'Text').node;
    titles.push(title.props.style);
    assert.equal(title.props.children, `${provider === 'apple' ? 'Apple' : 'Google'}로 계속하기`);
    assert.equal(nodes.find(({ node }) => node.type === 'Image').node.props.source, `${provider}-logo`);
    assert.equal(tree.props.style({ pressed: false })[0].minHeight, 52);
    assert.equal(tree.props.accessibilityState.busy, provider === 'apple');
    assert.equal(nodes.filter(({ node }) => node.type === 'ActivityIndicator').length, provider === 'apple' ? 1 : 0);
    assert.equal(nodes.find(({ node }) => node.type === 'View').node.props.style[0].minHeight, 44);
  }
  assert.equal(titles[0], titles[1]);
  assert.equal(titles[0].fontSize, 18);
  assert.equal(titles[0].fontWeight, '600');
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
      useEffect: (fn, deps) => {
        const index = cursor++;
        const prior = slots[index];
        if (!prior || deps.some((dep, i) => dep !== prior[i])) effects.push(fn);
        slots[index] = deps;
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    ...imports,
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source(file).text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { module, exports: module.exports, console: { ...console, error() {} }, require: (name) => {
    if (!(name in mocks)) throw new Error(`Unexpected import ${name}`);
    return mocks[name];
  } });
  return { render: (name, props) => {
    cursor = 0;
    const tree = module.exports[name](props);
    const pending = effects;
    effects = [];
    pending.forEach((fn) => fn());
    return tree;
  } };
}

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
