const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function load(relativePath, env = {}, mocks = {}) {
  const module = { exports: {} };
  const file = path.resolve(__dirname, '..', relativePath);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, process: { env },
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    },
  }, { filename: file });
  return module.exports;
}

test('API 환경은 개발이 기본이며 EAS 채널이나 NODE_ENV로 바뀌지 않는다', () => {
  const config = load('src/constants/api.ts', { NODE_ENV: 'production', EAS_BUILD_PROFILE: 'production' });
  assert.equal(config.APP_ENV, 'development');
  assert.match(config.API_BASE_URL, /\/dev\/api\/api\/v1$/);
});

test('운영 환경은 명시적인 운영 API 주소와 함께 설정한다', () => {
  const config = load('src/constants/api.ts', {
    EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_API_BASE_URL: 'https://api.example.com/api/v1/',
  });
  assert.equal(config.APP_ENV, 'production');
  assert.equal(config.API_BASE_URL, 'https://api.example.com/api/v1');
  for (const apiUrl of [undefined, 'https://example.com/dev/api/api/v1', 'http://localhost:8080/api/v1', 'http://127.0.0.1:8080/api/v1']) {
    assert.throws(() => load('src/constants/api.ts', {
      EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_API_BASE_URL: apiUrl,
    }), /Production requires/);
  }
  assert.throws(() => load('src/constants/api.ts', { EXPO_PUBLIC_APP_ENV: 'prod' }), /must be development or production/);
});

test('공통 로고의 DEV 배지는 개발에만 렌더링하고 운영에는 숨긴다', () => {
  const jsx = (type, props) => ({ type, props });
  for (const environment of ['development', 'production']) {
    const { PaceBrand } = load('src/components/pace-brand.tsx', {}, {
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'react-native': { StyleSheet: { create: (styles) => styles }, Text: 'Text', View: 'View' },
      '@/constants/pace': { PaceColors: { text: '#fff', accent: '#D5FA5B' } },
      '@/constants/api': { APP_ENV: environment },
    });
    for (const large of [false, true]) {
      const brand = PaceBrand({ large });
      const badge = brand.props.children.find((child) => child?.props?.children === 'DEV');
      assert.equal(Boolean(badge), environment === 'development');
      assert.equal(brand.props.accessibilityLabel, environment === 'development' ? 'PACE 개발 환경' : 'PACE');
    }
  }
});
