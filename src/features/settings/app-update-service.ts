import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { readActiveRun } from '@/data/active-run-store';

export function getAppUpdateInfo() {
  return {
    version: Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '개발',
    build: Constants.nativeBuildVersion,
    enabled: Platform.OS !== 'web' && Updates.isEnabled,
    channel: Updates.channel,
    runtime: Updates.runtimeVersion,
    updateId: Updates.updateId,
    embedded: Updates.isEmbeddedLaunch,
    emergency: Updates.isEmergencyLaunch,
  };
}

export async function downloadAppUpdate(): Promise<string | null> {
  if (!getAppUpdateInfo().enabled) throw new Error('앱 업데이트는 TestFlight 또는 설치된 배포 앱에서 확인할 수 있어요.');
  const checked = await Updates.checkForUpdateAsync();
  if (checked.isRollBackToEmbedded) throw new Error('기본 버전으로 복구가 안내되었어요. 앱을 다시 실행한 뒤 앱 정보를 확인해 주세요.');
  if (!checked.isAvailable) {
    if (checked.reason === Updates.UpdateCheckResultNotAvailableReason.UPDATE_PREVIOUSLY_FAILED) {
      throw new Error('이 기기에서 업데이트 실행이 이전에 실패했어요. 앱 정보를 캡처해 문의해 주세요. 앱을 삭제하지 마세요.');
    }
    if (checked.reason !== Updates.UpdateCheckResultNotAvailableReason.NO_UPDATE_AVAILABLE_ON_SERVER) {
      throw new Error(`설치된 앱의 업데이트 정책에 의해 적용되지 않았어요 (${checked.reason}). 앱 정보를 캡처해 문의해 주세요.`);
    }
    return null;
  }
  const downloaded = await Updates.fetchUpdateAsync();
  if (!downloaded.isNew) throw new Error('업데이트 다운로드가 완료되지 않았어요. 연결 상태를 확인하고 다시 시도해 주세요.');
  return downloaded.manifest.id;
}

export async function applyAppUpdate(): Promise<void> {
  if (!getAppUpdateInfo().enabled) throw new Error('설치된 배포 앱에서만 업데이트를 적용할 수 있어요.');
  if (await readActiveRun()) throw new Error('진행 중인 러닝이 있어요. 종료하고 저장한 뒤 업데이트를 적용해 주세요.');
  await Updates.reloadAsync();
}
