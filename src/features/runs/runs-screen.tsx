import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PaceErrorDialog, PaceLoadingState, PaceQueryState } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { SwipeToDelete } from '@/components/swipe-to-delete';
import { PaceColors as C } from '@/constants/pace';
import {
  deleteCompletedRun,
  listCompletedRuns,
  restoreCompletedRun,
} from '@/data/completed-runs-repository';
import { TabScreenShell, tabScreenStyles } from '@/features/navigation/tab-screen-shell';
import { getWeeklyInsights } from '@/features/running/run-insights';
import type { CompletedRun } from '@/features/running/types';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { formatDuration, formatKm, formatPace, formatShortDate } from '@/lib/format';
import { useSession } from '@/features/auth/session-store';

const UNDO_DURATION_MS = 4000;
const SKELETON_DELAY_MS = 200;

export function RunsScreen() {
  const { session } = useSession();
  return <AccountRuns key={session?.user.id ?? 'guest'} />;
}

function AccountRuns() {
  const { session } = useSession();
  const router = useRouter();
  const {
    data: completedRuns,
    setData: setCompletedRuns,
    isLoading,
    errorMessage: loadErrorMessage,
    clearError,
    reload,
  } = useFocusQuery<CompletedRun[]>(
    listCompletedRuns,
    [],
    '러닝 기록을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.',
  );
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [deletedRun, setDeletedRun] = useState<CompletedRun | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  // Only show the skeleton for slow loads so fast storage reads don't flicker.
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setShowSkeleton(true), SKELETON_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setShowSkeleton(false);
    };
  }, [isLoading]);

  const handleDelete = async (run: CompletedRun) => {
    setCompletedRuns((runs) => runs.filter((item) => item.id !== run.id));
    try {
      await deleteCompletedRun(run.id);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      setDeletedRun(run);
      undoTimer.current = setTimeout(() => setDeletedRun(null), UNDO_DURATION_MS);
    } catch (error) {
      console.error('Unable to delete run.', error);
      await reload();
      setActionErrorMessage('기록을 삭제하지 못했어요. 다시 시도해 주세요.');
    }
  };

  const handleUndo = async () => {
    if (!deletedRun) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const run = deletedRun;
    setDeletedRun(null);
    try {
      await restoreCompletedRun(run);
      await reload();
    } catch (error) {
      console.error('Unable to restore run.', error);
      setActionErrorMessage('기록을 되돌리지 못했어요.');
    }
  };

  const weeklyInsights = getWeeklyInsights(completedRuns);

  return (
    <TabScreenShell
      eyebrow="RUN HISTORY"
      title="나의 러닝 기록"
      description="달려온 시간과 거리를 차곡차곡 모아봐요."
      badge={session ? '계정 연결' : '기기 모드'}
      disclaimer={session ? '계정에 저장한 기록입니다. 연결 복구 후 화면을 다시 열면 대기 중인 기록을 동기화해요.' : '로그인 전에는 이 기기에 저장해요. 로그인하면 GPS 경로와 함께 계정에 연결합니다.'}
      overlay={deletedRun ? (
        <View style={styles.toast} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>러닝 기록을 삭제했어요</Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleUndo}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.toastAction}>되돌리기</Text>
          </Pressable>
        </View>
      ) : null}>
      {!isLoading && !loadErrorMessage ? (
      <>
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryValue}>{weeklyInsights.distanceKm.toFixed(2)}<Text style={styles.summaryUnit}> km</Text></Text>
          <Text style={tabScreenStyles.muted}>이번 주 누적 거리</Text>
        </View>
        <View style={styles.summaryCount}>
          <Text style={styles.countValue}>{weeklyInsights.runCount}회</Text>
          <Text style={tabScreenStyles.muted}>이번 주 러닝</Text>
        </View>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>최근 기록</Text>
        {completedRuns.length > 0 ? (
          <Text style={styles.sectionHint}>← 밀어서 삭제</Text>
        ) : null}
      </View>
      </>
      ) : null}
      {isLoading ? (
        showSkeleton ? <PaceLoadingState label="러닝 기록을 불러오는 중" /> : null
      ) : loadErrorMessage ? (
        <PaceQueryState loading={false} message={loadErrorMessage} onRetry={() => { void reload(); }} />
      ) : completedRuns.length === 0 ? (
        <View style={[tabScreenStyles.card, styles.emptyCard]}>
          <Text style={styles.emptyTitle}>아직 러닝 기록이 없어요</Text>
          <Text style={styles.emptyDescription}>
            GPS 러닝을 완료하면 저장된 기록과 페이스를 여기서 확인할 수 있어요.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/run-tracking')}
            style={({ pressed }) => [styles.emptyAction, pressed && styles.pressed]}>
            <Text style={styles.emptyActionText}>첫 러닝 시작하기</Text>
          </Pressable>
        </View>
      ) : completedRuns.map((run) => (
        <SwipeToDelete
          key={run.id}
          accessibilityLabel={`${formatShortDate(run.startedAt)} 러닝 기록, ${formatKm(run.distanceMeters)}킬로미터`}
          onDelete={() => handleDelete(run)}
          style={[tabScreenStyles.card, styles.runCard]}
          pressedStyle={styles.pressed}
          onPress={() => router.push({ pathname: '/run-detail', params: { runId: run.id } })}>
          <View style={styles.runHeader}>
            <View>
              <Text style={styles.runDate}>{formatShortDate(run.startedAt)}</Text>
              <Text style={styles.runNote}>GPS 러닝 기록</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
          <View style={tabScreenStyles.divider} />
          <View style={styles.metrics}>
            <Metric label="거리" value={formatKm(run.distanceMeters)} unit="km" />
            <Metric label="시간" value={formatDuration(run.durationSeconds)} />
            <Metric label="평균 페이스" value={formatPace(run.averagePaceSecondsPerKm)} unit="/km" />
          </View>
        </SwipeToDelete>
      ))}
      <PaceErrorDialog
        message={actionErrorMessage}
        onClose={() => {
          setActionErrorMessage(null);
          clearError();
        }}
      />
    </TabScreenShell>
  );
}

function Metric({
  label,
  value,
  unit,
}: Readonly<{ label: string; value: string; unit?: string }>) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}{unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginTop: 8,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 20,
    backgroundColor: '#20251B',
  },
  summaryValue: { color: C.accent, fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  summaryUnit: { color: C.accent, fontSize: 13, fontWeight: '500' },
  summaryCount: { alignItems: 'flex-end', justifyContent: 'center' },
  countValue: { color: C.text, fontSize: 20, fontWeight: '700' },
  sectionHeader: { marginTop: 28, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  sectionHint: { color: C.subtle, fontSize: 9 },
  runCard: { marginTop: 0 },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    minHeight: 48,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.border,
    zIndex: 10,
    elevation: 8,
  },
  toastText: { color: C.text, fontSize: 11 },
  toastAction: { color: C.accent, fontSize: 11, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingVertical: 28 },
  emptyTitle: { color: C.text, fontSize: 13, fontWeight: '700' },
  emptyDescription: { marginTop: 8, color: C.muted, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  emptyAction: { minHeight: 40, marginTop: 15, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: C.accent },
  emptyActionText: { color: C.accentInk, fontSize: 10, fontWeight: '700' },
  runHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  runDate: { color: C.text, fontSize: 12, fontWeight: '600' },
  runNote: { marginTop: 4, color: C.muted, fontSize: 10 },
  chevron: { color: C.subtle, fontSize: 25 },
  metrics: { paddingTop: 14, flexDirection: 'row' },
  metric: { flex: 1, gap: 6 },
  metricLabel: { color: C.subtle, fontSize: 9 },
  metricValue: { color: C.text, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  metricUnit: { color: C.muted, fontSize: 9, fontWeight: '400' },
  pressed: { opacity: 0.75 },
});
