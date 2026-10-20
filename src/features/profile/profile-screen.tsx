import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { PaceMark } from '@/components/pace-brand';
import { PaceErrorDialog } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { TabScreenShell, tabScreenStyles } from '@/features/navigation/tab-screen-shell';
import { readWeeklyGoalKm } from '@/features/running/weekly-goal-storage';

const menuItems = [
  { label: '앱 설정', detail: '알림, 거리 단위, 개인정보', route: '/settings' },
  { label: '소셜 계정 연결', detail: 'Google · 카카오 · Apple', route: '/login' },
] as const;

export function ProfileScreen() {
  const router = useRouter();
  const [weeklyGoalKm, setWeeklyGoalKm] = useState(20);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      readWeeklyGoalKm()
        .then((goal) => {
          if (isActive) setWeeklyGoalKm(goal);
        })
        .catch((error: unknown) => {
          console.error('Unable to load the weekly running goal.', error);
          if (isActive) {
            setErrorMessage('주간 목표를 불러오지 못했어요. 저장 공간을 확인해 주세요.');
          }
        });
      return () => {
        isActive = false;
      };
    }, []),
  );

  return (
    <TabScreenShell
      eyebrow="MY PACE"
      title="나의 프로필"
      description="나만의 러닝 목표와 앱 환경을 관리해요."
      disclaimer="프로필과 계정 기능은 미리보기입니다. 주간 목표는 이 기기에 저장돼요.">
      <View style={styles.profileCard}>
        <View style={styles.profileIcon}><PaceMark size={27} /></View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>PACE 러너</Text>
          <Text style={styles.handle}>로그인 전 미리보기 계정</Text>
        </View>
        <View style={styles.previewTag}>
          <Text style={styles.previewTagText}>미리보기</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`주간 러닝 목표 ${weeklyGoalKm}킬로미터, 변경하기`}
        onPress={() => router.push('/weekly-goal')}
        style={({ pressed }) => [styles.goalCard, pressed && styles.pressed]}>
        <View>
          <Text style={styles.goalLabel}>주간 러닝 목표</Text>
          <Text style={styles.goalValue}>{weeklyGoalKm}<Text style={styles.goalUnit}> km</Text></Text>
        </View>
        <View style={styles.goalAction}>
          <Text style={styles.goalActionText}>변경</Text>
          <Text style={styles.goalIconText}>›</Text>
        </View>
      </Pressable>
      <Text style={styles.sectionTitle}>내 메뉴</Text>
      <View style={tabScreenStyles.card}>
        {menuItems.map((item, index) => (
          <View key={item.route}>
            {index > 0 ? <View style={tabScreenStyles.divider} /> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(item.route)}
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
              <View style={styles.menuCopy}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDetail}>{item.detail}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/login')}
        style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
        <Text style={styles.logoutText}>로그인 화면 보기</Text>
      </Pressable>
      <PaceErrorDialog
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  profileCard: { marginTop: 8, padding: 18, flexDirection: 'row', alignItems: 'center', borderRadius: 19, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  profileIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#252E1B' },
  profileInfo: { flex: 1, marginLeft: 13 },
  name: { color: C.text, fontSize: 14, fontWeight: '700' },
  handle: { marginTop: 5, color: C.subtle, fontSize: 10 },
  previewTag: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: '#20251B' },
  previewTagText: { color: C.accent, fontSize: 9, fontWeight: '600' },
  goalCard: { marginTop: 13, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 19, backgroundColor: '#20251B' },
  goalLabel: { color: C.muted, fontSize: 10 },
  goalValue: { marginTop: 6, color: C.text, fontSize: 26, fontWeight: '700' },
  goalUnit: { color: C.muted, fontSize: 12, fontWeight: '500' },
  goalAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalActionText: { color: C.accent, fontSize: 10, fontWeight: '600' },
  goalIconText: { color: C.accent, fontSize: 24 },
  sectionTitle: { marginTop: 27, marginBottom: 0, color: C.text, fontSize: 16, fontWeight: '700' },
  menuRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuCopy: { gap: 4 },
  menuLabel: { color: C.text, fontSize: 12, fontWeight: '600' },
  menuDetail: { color: C.subtle, fontSize: 9 },
  chevron: { color: C.subtle, fontSize: 24 },
  logoutButton: { minHeight: 46, marginTop: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: C.border },
  logoutText: { color: C.muted, fontSize: 11, fontWeight: '600' },
  pressed: { opacity: 0.72 },
});
