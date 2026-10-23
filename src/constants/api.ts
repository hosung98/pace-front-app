export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'https://hosung-macmini.tailfb288b.ts.net/dev/api/api/v1'
).replace(/\/+$/, '');

const configuredEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
if (configuredEnvironment !== 'development' && configuredEnvironment !== 'production') {
  throw new Error('EXPO_PUBLIC_APP_ENV must be development or production.');
}
if (configuredEnvironment === 'production' && (
  !process.env.EXPO_PUBLIC_API_BASE_URL
  || /\/dev(?:\/|$)/i.test(API_BASE_URL)
  || /^https?:\/\/(?:localhost|127\.0\.0\.1)(?=[:/]|$)/i.test(API_BASE_URL)
)) {
  throw new Error('Production requires an explicit production API URL, not a development or localhost API.');
}
export const APP_ENV = configuredEnvironment;

export const GOOGLE_IOS_CLIENT_ID =
  '569856299617-2ulippt30k87ubgkq1sotovovlfvsst7.apps.googleusercontent.com';
export const GOOGLE_WEB_CLIENT_ID =
  '569856299617-orl7jldniqah1qqmit3kutc9516n9f8o.apps.googleusercontent.com';
