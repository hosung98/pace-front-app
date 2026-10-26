const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

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
