import type { RefObject } from 'react';
import type { View } from 'react-native';

export function exportRunCard(_ref: RefObject<View | null>): Promise<void> {
  return Promise.reject(new Error('이미지 공유는 iOS·Android 앱에서 사용할 수 있어요.'));
}

export function captureRunCardImage(_ref: RefObject<View | null>): Promise<string> {
  return Promise.reject(new Error('이미지 생성은 iOS·Android 앱에서 사용할 수 있어요.'));
}

export function shareRunCardImage(_uri: string): Promise<void> {
  return Promise.reject(new Error('이미지 공유는 iOS·Android 앱에서 사용할 수 있어요.'));
}

export function releaseRunCardImage(_uri: string): void {
  throw new Error('웹에서는 네이티브 캡처 이미지를 생성하지 않아요.');
}
