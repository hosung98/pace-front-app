import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaceBrand } from '@/components/pace-brand';
import { PaceErrorDialog } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

import { RUN_LOCATION_TASK } from './location-task';
import {
  clearActiveRun,
  formatDuration,
  getActiveRunSnapshot,
  getElapsedMilliseconds,
  refreshActiveRunSnapshot,
  saveCompletedRun,
  subscribeToActiveRun,
  type ActiveRun,
  type CompletedRun,
  writeActiveRun,
} from './run-storage';

export function RunTrackingScreen() {
  const router = useRouter();
  const snapshot = useSyncExternalStore(
    subscribeToActiveRun,
    getActiveRunSnapshot,
    getActiveRunSnapshot,
  );
  const { run } = snapshot;
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    refreshActiveRunSnapshot().catch((error: unknown) => {
      console.error('Unable to restore the active run.', error);
    });

    const timer = setInterval(() => {
      setNow(Date.now());
      if (AppState.currentState === 'active') {
        refreshActiveRunSnapshot().catch((error: unknown) => {
          console.error('Unable to refresh the active run.', error);
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const startLocationUpdates = useCallback(async () => {
    if (Platform.OS === 'web') {
      setMessage(
        '화면이 잠긴 뒤에도 기록하려면 웹앱이 아닌 iOS 또는 Android 앱이 필요해요.',
      );
      return false;
    }

    if (isRunningInExpoGo()) {
      setMessage(
        'Expo Go에서는 백그라운드 GPS를 사용할 수 없어요. PACE development build를 설치해 주세요.',
      );
      return false;
    }

    if (!(await TaskManager.isAvailableAsync())) {
      setMessage(
        '백그라운드 GPS는 Expo Go에서 지원되지 않아요. 개발용 앱 빌드를 설치해 주세요.',
      );
      return false;
    }

    if (!(await Location.hasServicesEnabledAsync())) {
      setMessage('기기의 위치 서비스를 켠 다음 다시 시도해 주세요.');
      return false;
    }

    // "While in use" is enough: tracking started in the foreground keeps running with the
    // screen locked (iOS background location indicator / Android foreground service).
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') {
      setMessage(
        foreground.canAskAgain
          ? '러닝 기록을 위해 앱 사용 중 위치 접근을 허용해 주세요.'
          : '설정 > PACE > 위치에서 위치 접근을 허용한 다음 다시 시도해 주세요.',
      );
      return false;
    }

    return true;
  }, []);

  const startRun = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (!(await startLocationUpdates())) return;

      const timestamp = Date.now();
      const nextRun: ActiveRun = {
        id: `local-${timestamp}`,
        status: 'running',
        startedAt: timestamp,
        segmentStartedAt: timestamp,
        elapsedBeforeSegmentMs: 0,
        distanceMeters: 0,
        currentSpeedMetersPerSecond: 0,
        routePoints: [],
      };
      await writeActiveRun(nextRun);
      setNow(timestamp);
      await Location.startLocationUpdatesAsync(RUN_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 1000,
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'PACE 러닝 기록 중',
          notificationBody: '러닝을 기록하고 있어요.',
          notificationColor: '#D5FA5B',
          killServiceOnDestroy: false,
        },
      });
    } catch (error) {
      console.error('Unable to start GPS run tracking.', error);
      await clearActiveRun();
      setErrorMessage(getLocationFailureMessage(
        error,
        'GPS 러닝을 시작하지 못했어요. 권한과 위치 설정을 확인해 주세요.',
      ));
    } finally {
      setBusy(false);
    }
  };

  const pauseRun = async () => {
    if (!run || run.status !== 'running') return;
    setBusy(true);
    try {
      await Location.stopLocationUpdatesAsync(RUN_LOCATION_TASK);
      const latestRun = getActiveRunSnapshot().run ?? run;
      const pausedRun: ActiveRun = {
        ...latestRun,
        status: 'paused',
        elapsedBeforeSegmentMs: getElapsedMilliseconds(latestRun, now),
      };
      await writeActiveRun(pausedRun);
    } catch (error) {
      console.error('Unable to pause GPS run tracking.', error);
      setErrorMessage('러닝을 일시 정지하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const resumeRun = async () => {
    if (!run || run.status !== 'paused') return;
    setBusy(true);
    setMessage('');
    try {
      if (!(await startLocationUpdates())) return;
      const resumedRun: ActiveRun = {
        ...run,
        status: 'running',
        segmentStartedAt: Date.now(),
      };
      await writeActiveRun(resumedRun);
      await Location.startLocationUpdatesAsync(RUN_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 1000,
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'PACE 러닝 기록 중',
          notificationBody: '러닝을 기록하고 있어요.',
          notificationColor: '#D5FA5B',
          killServiceOnDestroy: false,
        },
      });
    } catch (error) {
      console.error('Unable to resume GPS run tracking.', error);
      await writeActiveRun({ ...run, status: 'paused' });
      setErrorMessage(getLocationFailureMessage(
        error,
        '러닝을 다시 시작하지 못했어요. 권한과 위치 설정을 확인해 주세요.',
      ));
    } finally {
      setBusy(false);
    }
  };

  const finishRun = async () => {
    if (!run) return;
    setBusy(true);
    try {
      if (await Location.hasStartedLocationUpdatesAsync(RUN_LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(RUN_LOCATION_TASK);
      }

      const latestRun = getActiveRunSnapshot().run ?? run;
      const endedAt = Date.now();
      const durationSeconds = Math.floor(
        getElapsedMilliseconds(latestRun, endedAt) / 1000,
      );
      const completedRun: CompletedRun = {
        id: latestRun.id,
        startedAt: latestRun.startedAt,
        endedAt,
        distanceMeters: Math.round(latestRun.distanceMeters),
        durationSeconds,
        averagePaceSecondsPerKm:
          latestRun.distanceMeters > 0
            ? Math.round(durationSeconds / (latestRun.distanceMeters / 1000))
            : null,
        routePoints: latestRun.routePoints,
      };
      await saveCompletedRun(completedRun);
      await clearActiveRun();
      setConfirmingFinish(false);
      setMessage('러닝을 이 기기에 저장했어요. 서버 동기화는 아직 연결되지 않았어요.');
    } catch (error) {
      console.error('Unable to finish and save GPS run.', error);
      setErrorMessage('러닝을 저장하지 못했어요. 기록을 유지한 채 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const confirmFinish = () => {
    setConfirmingFinish(true);
  };

  const elapsedSeconds = run
    ? Math.floor(getElapsedMilliseconds(run, now) / 1000)
    : 0;
  const speedKmh = run ? run.currentSpeedMetersPerSecond * 3.6 : 0;
  const paceSecondsPerKm =
    speedKmh > 0.5 ? Math.round(3600 / speedKmh) : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이전 화면으로 돌아가기"
          onPress={() => router.back()}
          style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <PaceBrand />
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>GPS RUN TRACKER</Text>
        <Text style={styles.title}>
          {run ? (run.status === 'running' ? '러닝 중' : '잠시 쉬어가요') : '나만의 페이스로'}
        </Text>
        <Text style={styles.description}>
          {run?.status === 'running'
            ? '화면을 잠가도 러닝 기록을 계속합니다.'
            : 'GPS로 거리와 속도를 기록해요.'}
        </Text>

        {run ? (
          <>
            <View style={styles.distanceCard}>
              <Text style={styles.metricLabel}>누적 거리</Text>
              <Text style={styles.distance}>
                {(run.distanceMeters / 1000).toFixed(2)}
                <Text style={styles.distanceUnit}> km</Text>
              </Text>
              <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
              <Text style={styles.timerLabel}>경과 시간</Text>
            </View>
            <View style={styles.statsRow}>
              <Metric label="현재 속도" value={`${speedKmh.toFixed(1)} km/h`} />
              <Metric
                label="현재 페이스"
                value={
                  paceSecondsPerKm === null
                    ? '--:-- /km'
                    : `${Math.floor(paceSecondsPerKm / 60)}:${String(
                        paceSecondsPerKm % 60,
                      ).padStart(2, '0')} /km`
                }
              />
            </View>
            <View style={styles.locationStatus}>
              <View style={[styles.statusDot, run.status === 'running' && styles.statusActive]} />
              <Text style={styles.locationStatusText}>
                {run.status === 'running'
                  ? `GPS 기록 중 · 위치 ${run.routePoints.length}개`
                  : `일시 정지됨 · 위치 ${run.routePoints.length}개`}
              </Text>
            </View>
            {confirmingFinish ? (
              <View style={styles.confirmCard}>
                <Text style={styles.confirmTitle}>러닝을 종료하고 저장할까요?</Text>
                <Text style={styles.confirmDescription}>저장된 경로는 현재 이 기기에만 보관됩니다.</Text>
                <View style={styles.confirmActions}>
                  <ActionButton label="계속 달리기" secondary disabled={busy} onPress={() => setConfirmingFinish(false)} />
                  <ActionButton label="종료 및 저장" disabled={busy} onPress={finishRun} />
                </View>
              </View>
            ) : (
              <View style={styles.controls}>
                {run.status === 'running' ? (
                  <ActionButton label="일시 정지" secondary disabled={busy} onPress={pauseRun} />
                ) : (
                  <ActionButton label="다시 시작" disabled={busy} onPress={resumeRun} />
                )}
                <ActionButton
                  label="러닝 종료"
                  secondary
                  disabled={busy}
                  onPress={confirmFinish}
                />
              </View>
            )}
          </>
        ) : (
          <View style={styles.readyCard}>
            <View style={styles.readyIcon}><Text style={styles.readyIconText}>⌖</Text></View>
            <Text style={styles.readyTitle}>러닝을 기록할 준비가 됐어요</Text>
            <Text style={styles.readyDescription}>
              시작을 누르면 위치 권한을 요청하고, 위치는 러닝 중에만 사용해요.
            </Text>
            <ActionButton label="러닝 시작" disabled={busy} onPress={startRun} />
          </View>
        )}

        {message ? (
          <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
        ) : snapshot.error ? (
          <Text accessibilityLiveRegion="polite" style={styles.message}>{snapshot.error}</Text>
        ) : null}
        <Text style={styles.privacyNote}>
          GPS 경로는 러닝 종료 시 이 기기에 저장됩니다. 화면이 꺼진 동안에도 기록하려면
          위치 권한을 허용해야 합니다. 앱을 강제 종료하면 운영체제에 따라 기록이 중단될 수 있어요.
        </Text>
      </ScrollView>
      <PaceErrorDialog
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function getLocationFailureMessage(error: unknown, fallback: string) {
  if (
    error instanceof Error &&
    error.message.includes('ERR_LOCATION_INFO_PLIST')
  ) {
    return '현재 설치된 앱에 iOS 위치 권한 설정이 없어요. Expo Go에서는 백그라운드 GPS가 지원되지 않으니 PACE development build를 설치해 주세요.';
  }

  return fallback;
}

function ActionButton({
  label,
  secondary = false,
  disabled,
  onPress,
}: {
  label: string;
  secondary?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        secondary && styles.secondaryButton,
        disabled && styles.disabledButton,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.actionButtonText, secondary && styles.secondaryButtonText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  header: { width: '100%', maxWidth: 560, alignSelf: 'center', minHeight: 58, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { color: C.text, fontSize: 31, lineHeight: 34 },
  headerSpacer: { width: 42 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 36 },
  eyebrow: { marginTop: 22, color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 1.8 },
  title: { marginTop: 8, color: C.text, fontSize: 25, fontWeight: '700' },
  description: { marginTop: 5, color: C.muted, fontSize: 11 },
  distanceCard: { marginTop: 22, paddingVertical: 25, alignItems: 'center', borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  metricLabel: { color: C.muted, fontSize: 10 },
  distance: { marginTop: 7, color: C.accent, fontSize: 55, lineHeight: 62, fontWeight: '700', fontVariant: ['tabular-nums'] },
  distanceUnit: { color: C.accent, fontSize: 15, fontWeight: '500' },
  timer: { marginTop: 11, color: C.text, fontSize: 28, fontWeight: '600', fontVariant: ['tabular-nums'] },
  timerLabel: { marginTop: 3, color: C.subtle, fontSize: 9 },
  statsRow: { marginTop: 11, paddingVertical: 17, flexDirection: 'row', borderRadius: 17, backgroundColor: C.surface },
  metric: { flex: 1, alignItems: 'center', gap: 7 },
  metricValue: { color: C.text, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  locationStatus: { marginTop: 17, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.subtle },
  statusActive: { backgroundColor: C.accent },
  locationStatusText: { color: C.muted, fontSize: 10 },
  controls: { marginTop: 23, gap: 10 },
  actionButton: { minWidth: 160, minHeight: 51, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: C.accent },
  actionButtonText: { color: C.accentInk, fontSize: 12, fontWeight: '700' },
  secondaryButton: { backgroundColor: C.raised },
  secondaryButtonText: { color: C.text },
  disabledButton: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
  readyCard: { marginTop: 25, padding: 22, alignItems: 'center', borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  readyIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#252E1B' },
  readyIconText: { color: C.accent, fontSize: 31 },
  readyTitle: { marginTop: 16, color: C.text, fontSize: 14, fontWeight: '700' },
  readyDescription: { marginTop: 7, marginBottom: 19, color: C.muted, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  confirmCard: { marginTop: 21, padding: 16, borderRadius: 17, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  confirmTitle: { color: C.text, fontSize: 12, fontWeight: '700' },
  confirmDescription: { marginTop: 5, color: C.muted, fontSize: 9 },
  confirmActions: { marginTop: 13, gap: 8 },
  message: { marginTop: 13, color: C.accent, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  privacyNote: { marginTop: 19, color: C.subtle, fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
