import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@/constants/api';

export async function googleIdToken(): Promise<string | null> {
  if (Platform.OS !== 'ios') {
    throw new Error('네이티브 Google 로그인은 iOS 앱에서 지원해요. 웹에서는 웹 로그인 버튼을 사용해 주세요.');
  }
  if (isRunningInExpoGo()) throw new Error('Google 로그인은 새로 빌드한 PACE 앱에서 사용할 수 있어요.');
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } =
    await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ iosClientId: GOOGLE_IOS_CLIENT_ID, webClientId: GOOGLE_WEB_CLIENT_ID });
  try {
    const result = await GoogleSignin.signIn();
    if (!isSuccessResponse(result)) return null;
    if (!result.data.idToken) throw new Error('Google에서 인증 토큰을 받지 못했어요.');
    return result.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw error;
  }
}
