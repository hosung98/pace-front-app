import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceErrorDialog, PaceQueryState } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { getWeeklyGoalKm, saveWeeklyGoalKm } from '@/data/weekly-goal-repository';
import {
  DEFAULT_WEEKLY_GOAL_KM,
  MAX_WEEKLY_GOAL_KM,
  MIN_WEEKLY_GOAL_KM,
  WEEKLY_GOAL_STEP_KM,
} from '@/features/running/weekly-goal';
import { useFocusQuery } from '@/hooks/use-focus-query';

export function WeeklyGoalScreen() {
  const router = useRouter();
  const {
    data: goalKm,
    setData: setGoalKm,
    errorMessage: loadErrorMessage,
    reload,
    isLoading,
  } = useFocusQuery(
    getWeeklyGoalKm,
    DEFAULT_WEEKLY_GOAL_KM,
    '주간 목표를 불러오지 못했어요. 연결 상태를 확인해 주세요.',
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const saveGoal = async () => {
    setIsSaving(true);
    try {
      await saveWeeklyGoalKm(goalKm);
      router.back();
    } catch (error) {
      console.error('Unable to save the weekly running goal.', error);
      setSaveErrorMessage('주간 목표를 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={[styles.container, styles.header]}><BackHeader />
        <Text style={styles.eyebrow}>YOUR WEEKLY PACE</Text>
        <Text style={styles.title}>이번 주 목표를 정해요</Text>
        <Text style={styles.description}>
          무리하지 않는 거리부터 시작해 꾸준히 이어가 보세요.
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
        {isLoading || loadErrorMessage ? (
          <PaceQueryState loading={isLoading} message={loadErrorMessage} onRetry={() => { void reload(); }} />
        ) : (
        <>
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>주간 러닝 거리</Text>
          <View style={styles.goalValueRow}>
            <Text style={styles.goalValue}>{goalKm}</Text>
            <Text style={styles.goalUnit}>km</Text>
          </View>
          <View
            accessibilityRole="adjustable"
            accessibilityLabel="주간 러닝 목표"
            accessibilityValue={{
              min: MIN_WEEKLY_GOAL_KM,
              max: MAX_WEEKLY_GOAL_KM,
              now: goalKm,
              text: `${goalKm}킬로미터`,
            }}
            style={styles.stepper}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="목표 5킬로미터 낮추기"
              accessibilityState={{ disabled: goalKm <= MIN_WEEKLY_GOAL_KM }}
              disabled={isSaving || isLoading || goalKm <= MIN_WEEKLY_GOAL_KM}
              onPress={() => setGoalKm((value) => value - WEEKLY_GOAL_STEP_KM)}
              style={[styles.stepButton, goalKm <= MIN_WEEKLY_GOAL_KM && styles.disabled]}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.stepDescription}>5km 단위로 조절</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="목표 5킬로미터 높이기"
              accessibilityState={{ disabled: goalKm >= MAX_WEEKLY_GOAL_KM }}
              disabled={isSaving || isLoading || goalKm >= MAX_WEEKLY_GOAL_KM}
              onPress={() => setGoalKm((value) => value + WEEKLY_GOAL_STEP_KM)}
              style={[styles.stepButton, goalKm >= MAX_WEEKLY_GOAL_KM && styles.disabled]}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>목표 설정 팁</Text>
          <Text style={styles.tipText}>
            최근 달리던 거리보다 조금씩 늘려 보세요. 로그인하면 목표는 계정에 저장되며,
            언제든 다시 변경할 수 있어요.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isSaving || isLoading || Boolean(loadErrorMessage)}
          onPress={saveGoal}
          style={({ pressed }) => [
            styles.saveButton,
            (isSaving || pressed) && styles.saveButtonMuted,
          ]}>
          <Text style={styles.saveButtonText}>
            {isSaving ? '저장 중…' : '목표 저장하기'}
          </Text>
        </Pressable>
        </>
        )}
      </View>
      </ScrollView>
      <PaceErrorDialog
        message={saveErrorMessage}
        onClose={() => {
          setSaveErrorMessage(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  scrollContent: { flexGrow: 1 },
  header: { paddingBottom: 16 },
  container: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  eyebrow: { marginTop: 24, color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 2 },
  title: { marginTop: 9, color: C.text, fontSize: 24, fontWeight: '700' },
  description: { marginTop: 6, color: C.muted, fontSize: 12, lineHeight: 18 },
  goalCard: { marginTop: 12, padding: 22, alignItems: 'center', borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  goalLabel: { color: C.muted, fontSize: 11 },
  goalValueRow: { marginTop: 9, flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  goalValue: { color: C.text, fontSize: 54, lineHeight: 64, fontWeight: '700', fontVariant: ['tabular-nums'] },
  goalUnit: { color: C.accent, fontSize: 16, fontWeight: '600' },
  stepper: { width: '100%', marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#303A22' },
  stepText: { color: C.accent, fontSize: 26, lineHeight: 31, fontWeight: '500' },
  stepDescription: { color: C.subtle, fontSize: 10 },
  disabled: { opacity: 0.35 },
  tipCard: { marginTop: 16, padding: 16, gap: 7, borderRadius: 16, backgroundColor: C.surface },
  tipTitle: { color: C.text, fontSize: 11, fontWeight: '700' },
  tipText: { color: C.muted, fontSize: 10, lineHeight: 16 },
  saveButton: { minHeight: 52, marginTop: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: C.accent },
  saveButtonMuted: { opacity: 0.65 },
  saveButtonText: { color: C.accentInk, fontSize: 13, fontWeight: '700' },
});
