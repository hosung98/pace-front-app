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

test('Google 버튼은 로컬 공식 아이콘을 포함하고 Apple 버튼은 44pt 공식 컨트롤을 사용한다', () => {
  const login = source('features/auth/login-screen.tsx');
  const image = elements(login, 'Image')[0];
  assert.ok(image);
  assert.match(image.getText(), /google-logo\.png/);
  const logo = fs.readFileSync(path.join(__dirname, '../assets/images/google-logo.png'));
  assert.equal(logo.subarray(1, 4).toString(), 'PNG');
  const apple = elements(source('features/auth/apple-login-button.tsx'), 'AppleAuthentication.AppleAuthenticationButton')[0];
  assert.match(apple.getText(), /height: 44/);
  assert.equal(elements(login, 'ProviderText').length, 1);
  assert.match(login.text, /providerText:\s*\{\s*fontSize: 19,/);
});

test('iOS 로그인 분기는 로고와 텍스트를 가로 배치하며 Apple은 별도 버튼으로 렌더링한다', () => {
  const file = source('features/auth/login-screen.tsx');
  const jsx = (type, props) => ({ type, props });
  const router = { push() {}, replace() {} };
  const mocks = {
    react: { useCallback: (fn) => fn, useRef: (current) => ({ current }), useState: (value) => [value, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      Platform: { OS: 'ios' }, Pressable: 'Pressable', ScrollView: 'ScrollView', View: 'View',
      Text: 'ProviderText', StyleSheet: { create: (styles) => styles },
    },
    'expo-router': { useRouter: () => router },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-image': { Image: 'Image' },
    '@/components/back-header': { BackHeader: 'BackHeader' },
    '@/components/pace-text': { PaceText: 'Text' },
    '@/constants/pace': { PaceColors: {} },
    '@/components/pace-feedback': { PaceErrorDialog: 'PaceErrorDialog' },
    '@/constants/api': {}, '@/data/completed-runs-repository': {}, '@/data/active-run-store': {},
    '@/lib/api-transport': {}, './google-login': {}, './apple-login': {},
    './google-web-button': { GoogleWebButton: 'GoogleWebButton' },
    './apple-login-button': { AppleLoginButton: 'AppleLoginButton' },
    './session-store': { useSession: () => ({ session: null }) },
    '@/assets/images/google-logo.png': 'bundled-google-logo',
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(file.text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { module, exports: module.exports, console, require: (name) => {
    if (!(name in mocks)) throw new Error(`Unexpected import ${name}`);
    return mocks[name];
  } });
  const tree = module.exports.LoginScreen();
  const nodes = [];
  const visit = (node, parents = []) => {
    if (!node || typeof node !== 'object') return;
    nodes.push({ node, parents });
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) visit(child, [...parents, node]);
  };
  visit(tree);
  const google = nodes.find(({ node }) => node.props.accessibilityLabel === 'Google로 계속하기').node;
  assert.equal(google.props.children[0].type, 'Image');
  assert.equal(google.props.children[0].props.source, 'bundled-google-logo');
  assert.equal(google.props.children[1].type, 'ProviderText');
  assert.equal(google.props.style({ pressed: false })[0].flexDirection, 'row');
  const apple = nodes.find(({ node }) => node.type === 'AppleLoginButton');
  assert.equal(apple.parents.includes(google), false);
  const header = nodes.find(({ node }) => node.type === 'BackHeader');
  assert.equal(header.parents.some((node) => node.type === 'ScrollView'), false);
});
