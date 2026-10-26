import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export function captureRunCardImage(ref: RefObject<View | null>): Promise<string> {
  return captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
}

export const releaseRunCardImage = releaseCapture;

export async function shareRunCardImage(uri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('이 기기에서는 이미지 공유를 사용할 수 없어요.');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'PACE 러닝 공유' });
}

export async function exportRunCard(ref: RefObject<View | null>): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('이 기기에서는 이미지 공유를 사용할 수 없어요.');
  const uri = await captureRunCardImage(ref);
  try {
    await shareRunCardImage(uri);
  } finally {
    releaseCapture(uri);
  }
}
