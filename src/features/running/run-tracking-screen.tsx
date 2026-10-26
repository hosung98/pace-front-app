import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceErrorDialog } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import {
  clearActiveRun,
  getActiveRunSnapshot,
  refreshActiveRunSnapshot,
  subscribeToActiveRun,
  writeActiveRun,
} from '@/data/active-run-store';
import { saveCompletedRun } from '@/data/completed-runs-repository';
import { getSessionState } from '@/features/auth/session-store';
import { exportHealthRun } from '@/features/health/health-service';
import { formatDuration, formatKm, formatPace } from '@/lib/format';

import {
  checkTrackingReadiness,
  getLocationFailureMessage,
  startLocationTracking,
  stopLocationTracking,
} from './location-tracking';
import { RunReadyView } from './run-ready-view';
import { RunOptions } from './run-options';
import { runGoalProgress } from './run-goals';
import { useRunGuidance } from './use-run-guidance';
import { RunCompletion } from './run-completion';
import type { CompletedRun, RunGoal } from './types';
import {
  createActiveRun,
  getCurrentPaceSecondsPerKm,
  getElapsedMilliseconds,
  pauseActiveRun,
  resumeActiveRun,
  toCompletedRun,
} from './run-session';

export function RunTrackingScreen() {
  const snapshot = useSyncExternalStore(
    subscribeToActiveRun,
    getActiveRunSnapshot,
    getActiveRunSnapshot,
  );
  const { run } = snapshot;
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const operating = useRef(false);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [goal, setGoal] = useState<RunGoal>(null);
  const [voice, setVoice] = useState(false);
  const [completedRun, setCompletedRun] = useState<CompletedRun | null>(null);
  const guidanceFailure = useRunGuidance(run, now);

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

  /** Shows the readiness problem (if any) and reports whether tracking may start. */
  const ensureReady = async () => {
    const problem = await checkTrackingReadiness();
    if (problem) setMessage(problem);
    return problem === null;
  };

  const startRun = async () => {
    if (operating.current) return;
    operating.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (!(await ensureReady())) return;
      const nextRun = createActiveRun();
      nextRun.ownerId = getSessionState().session?.user.id ?? null;
      nextRun.goal = goal;
      nextRun.voiceGuidance = voice;
      await writeActiveRun(nextRun);
      setNow(nextRun.startedAt);
      await startLocationTracking();
    } catch (error) {
      console.error('Unable to start GPS run tracking.', error);
      await clearActiveRun();
      setErrorMessage(getLocationFailureMessage(
        error,
        'GPS 러닝을 시작하지 못했어요. 권한과 위치 설정을 확인해 주세요.',
      ));
    } finally {
      operating.current = false;
      setBusy(false);
    }
  };

  const pauseRun = async () => {
    if (run?.status !== 'running' || operating.current) return;
    operating.current = true;
    setBusy(true);
    try {
      await stopLocationTracking();
      await writeActiveRun(pauseActiveRun(getActiveRunSnapshot().run ?? run));
    } catch (error) {
      console.error('Unable to pause GPS run tracking.', error);
      setErrorMessage('러닝을 일시 정지하지 못했어요. 다시 시도해 주세요.');
    } finally {
      operating.current = false;
      setBusy(false);
    }
  };

  const resumeRun = async () => {
    if (run?.status !== 'paused' || operating.current) return;
    operating.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (!(await ensureReady())) return;
      await writeActiveRun(resumeActiveRun(run));
      await startLocationTracking();
    } catch (error) {
      console.error('Unable to resume GPS run tracking.', error);
      await writeActiveRun({ ...run, status: 'paused' });
      setErrorMessage(getLocationFailureMessage(
        error,
        '러닝을 다시 시작하지 못했어요. 권한과 위치 설정을 확인해 주세요.',
      ));
    } finally {
      operating.current = false;
      setBusy(false);
    }
  };

  const finishRun = async () => {
    if (!run || operating.current) return;
    operating.current = true;
    setBusy(true);
    setErrorMessage(null);
    try {
      await stopLocationTracking();
      const completed = getActiveRunSnapshot().run ?? run;
      const result = toCompletedRun(completed);
      const saved = await saveCompletedRun(result, completed.ownerId ?? null);
      await clearActiveRun();
      setConfirmingFinish(false);
      setMessage(saved.message);
      setCompletedRun(result);
      try { await exportHealthRun(toCompletedRun(completed)); }
      catch (error) {
        console.error('건강 앱 러닝 저장 실패', error);
        setErrorMessage('PACE 러닝 저장은 완료했지만 건강 앱에는 저장하지 못했어요. 권한을 확인한 뒤 러닝 상세에서 다시 시도해 주세요.');
      }
    } catch (error) {
      console.error('Unable to finish and save GPS run.', error);
      setErrorMessage('러닝을 저장하지 못했어요. 기록을 유지한 채 다시 시도해 주세요.');
    } finally {
      operating.current = false;
      setBusy(false);
    }
  };

  const elapsedSeconds = run
    ? Math.floor(getElapsedMilliseconds(run, now) / 1000)
    : 0;
  const speedKmh = run ? run.currentSpeedMetersPerSecond * 3.6 : 0;
  const paceSecondsPerKm = run ? getCurrentPaceSecondsPerKm(run) : null;
  const goalProgress = run ? runGoalProgress(run, now) : null;

  if (completedRun) return <>
    <RunCompletion run={completedRun} message={message} onDone={() => { setCompletedRun(null); setMessage(''); }} />
    <PaceErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />
  </>;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackHeader />
        {run ? (
          <>
            <Text style={styles.eyebrow}>GPS RUN TRACKER</Text>
            <Text style={styles.title}>
              {run.status === 'running' ? '러닝 중' : '잠시 쉬어가요'}
            </Text>
            <Text style={styles.description}>
              {run.status === 'running'
                ? '화면을 잠가도 러닝 기록을 계속합니다.'
                : 'GPS로 거리와 속도를 기록해요.'}
            </Text>
          </>
        ) : <>
          <Text style={styles.eyebrow}>MAKE TODAY YOUR PACE</Text>
          <Text style={styles.title}>오늘도, 나의 페이스로.</Text>
          <Text style={styles.description}>기록보다 중요한 건, 시작하는 마음.</Text>
        </>}
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {run ? (
          <>
            {goalProgress ? <Text accessibilityLiveRegion="polite" style={styles.message}>
              {goalProgress.reached ? `${goalProgress.label} 목표 달성! 기록은 계속돼요.` : `${goalProgress.label} 목표 · ${Math.floor(goalProgress.fraction * 100)}%`}
            </Text> : null}
            <View style={styles.distanceCard}>
              <Text style={styles.metricLabel}>누적 거리</Text>
              <Text style={styles.distance}>
                {formatKm(run.distanceMeters)}
                <Text style={styles.distanceUnit}> km</Text>
              </Text>
              <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
              <Text style={styles.timerLabel}>경과 시간</Text>
            </View>
            <View style={styles.statsRow}>
              <Metric label="현재 속도" value={`${speedKmh.toFixed(1)} km/h`} />
              <Metric
                label="현재 페이스"
                value={`${formatPace(paceSecondsPerKm)} /km`}
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
          </>
        ) : (
          <RunReadyView>
            <RunOptions goal={goal} voice={voice} disabled={busy} onGoal={setGoal} onVoice={setVoice} />
          </RunReadyView>
        )}
        {guidanceFailure ? <Text accessibilityLiveRegion="polite" style={styles.message}>{guidanceFailure}</Text> : null}

        {message ? (
          <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
        ) : snapshot.error ? (
          <Text accessibilityLiveRegion="polite" style={styles.message}>{snapshot.error}</Text>
        ) : null}
        {run ? <Text style={styles.privacyNote}>
          GPS 경로는 종료 시 기기에 저장되고 로그인 계정에 동기화됩니다. 화면이 꺼진 동안에도 기록하려면
          위치 권한을 허용해야 합니다. 앱을 강제 종료하면 운영체제에 따라 기록이 중단될 수 있어요.
        </Text> : null}
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={styles.dock}>
        <View style={styles.dockContent}>
          {run ? <RunControls runStatus={run.status} busy={busy} confirming={confirmingFinish}
            onPause={pauseRun} onResume={resumeRun} onFinish={finishRun}
            onConfirm={() => setConfirmingFinish(true)} onCancel={() => setConfirmingFinish(false)} />
            : <>
              <ActionButton label={busy ? 'GPS 준비 중…' : '러닝 시작하기  →'} disabled={busy || !snapshot.loaded || Boolean(snapshot.error)}
                onPress={startRun} />
              <Text style={styles.dockCaption}>시작할 때 위치 권한과 GPS를 확인해요</Text>
            </>}
        </View>
      </SafeAreaView>
      <PaceErrorDialog
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />
    </SafeAreaView>
  );
}

function RunControls({ runStatus, busy, confirming, onPause, onResume, onFinish, onConfirm, onCancel }: Readonly<{
  runStatus: 'running' | 'paused'; busy: boolean; confirming: boolean;
  onPause: () => void; onResume: () => void; onFinish: () => void; onConfirm: () => void; onCancel: () => void;
}>) {
  if (confirming) return <>
    <Text style={styles.confirmTitle}>러닝을 마치고 저장할까요?</Text>
    <Text style={styles.confirmDescription}>기기에 먼저 보관하고 로그인 계정에 동기화해요.</Text>
    <View style={styles.controls}>
      <ActionButton label="돌아가기" secondary disabled={busy} onPress={onCancel} />
      <ActionButton label={busy ? '저장 중…' : '종료 및 저장'} disabled={busy} onPress={onFinish} />
    </View>
  </>;
  return <View style={styles.controls}>
    <ActionButton label={runStatus === 'running' ? '일시 정지' : '다시 시작'} disabled={busy}
      onPress={runStatus === 'running' ? onPause : onResume} />
    <ActionButton label="러닝 종료" secondary disabled={busy} onPress={onConfirm} />
  </View>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
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
  header: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 16 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  dock: { backgroundColor: C.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  dockContent: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, gap: 10 },
  dockCaption: { color: C.subtle, fontSize: 11, textAlign: 'center' },
  eyebrow: { marginTop: 22, color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 1.8 },
  title: { marginTop: 8, color: C.text, fontSize: 25, fontWeight: '700' },
  description: { marginTop: 7, color: C.muted, fontSize: 13, lineHeight: 21 },
  distanceCard: { marginTop: 28, paddingVertical: 30, alignItems: 'center' },
  metricLabel: { color: C.muted, fontSize: 12 },
  distance: { marginTop: 9, color: C.accent, fontSize: 64, lineHeight: 78, fontWeight: '700', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  distanceUnit: { color: C.muted, fontSize: 18, fontWeight: '500', letterSpacing: 0 },
  timer: { marginTop: 20, color: C.text, fontSize: 32, fontWeight: '600', fontVariant: ['tabular-nums'] },
  timerLabel: { marginTop: 3, color: C.subtle, fontSize: 9 },
  statsRow: { marginTop: 11, paddingVertical: 17, flexDirection: 'row', borderRadius: 17, backgroundColor: C.surface },
  metric: { flex: 1, alignItems: 'center', gap: 7 },
  metricValue: { color: C.text, fontSize: 19, fontWeight: '600', fontVariant: ['tabular-nums'] },
  locationStatus: { marginTop: 17, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.subtle },
  statusActive: { backgroundColor: C.accent },
  locationStatusText: { color: C.muted, fontSize: 10 },
  controls: { flexDirection: 'row', gap: 10 },
  actionButton: { flexGrow: 1, flexBasis: 0, minHeight: 56, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: C.accent },
  actionButtonText: { color: C.accentInk, fontSize: 16, fontWeight: '700' },
  secondaryButton: { backgroundColor: C.raised },
  secondaryButtonText: { color: C.text },
  disabledButton: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
  confirmCard: { marginTop: 21, padding: 16, borderRadius: 17, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  confirmTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  confirmDescription: { color: C.muted, fontSize: 12, lineHeight: 19 },
  confirmActions: { marginTop: 13, gap: 8 },
  message: { marginTop: 13, color: C.accent, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  privacyNote: { marginTop: 19, color: C.subtle, fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
