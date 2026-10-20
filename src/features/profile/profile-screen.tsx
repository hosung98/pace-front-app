import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PaceMark } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { TabScreenShell, tabScreenStyles } from '@/features/navigation/tab-screen-shell';

const menuItems = [
  { label: '앱 설정', detail: '알림, 거리 단위, 개인정보', route: '/settings' },
  { label: '소셜 계정 연결', detail: 'Google · 카카오 · Apple', route: '/login' },
] as const;

export function ProfileScreen() {
  const router = useRouter();

  return (
    <TabScreenShell
      eyebrow="MY PACE"
      title="나의 프로필"
      description="나만의 러닝 목표와 앱 환경을 관리해요.">
      <View style={styles.profileCard}>
        <View style={styles.profileIcon}><PaceMark size={27} /></View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>PACE 러너</Text>
          <Text style={styles.handle}>로그인 전 미리보기 계정</Text>
        </View>
        <Text style={styles.edit}>편집</Text>
      </View>
      <View style={styles.goalCard}>
        <View>
          <Text style={styles.goalLabel}>주간 러닝 목표</Text>
          <Text style={styles.goalValue}>20<Text style={styles.goalUnit}> km</Text></Text>
        </View>
        <View style={styles.goalIcon}><Text style={styles.goalIconText}>↗</Text></View>
      </View>
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
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  profileCard: { marginTop: 8, padding: 18, flexDirection: 'row', alignItems: 'center', borderRadius: 19, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  profileIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#252E1B' },
  profileInfo: { flex: 1, marginLeft: 13 },
  name: { color: C.text, fontSize: 14, fontWeight: '700' },
  handle: { marginTop: 5, color: C.subtle, fontSize: 10 },
  edit: { color: C.accent, fontSize: 10, fontWeight: '600' },
  goalCard: { marginTop: 13, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 19, backgroundColor: '#20251B' },
  goalLabel: { color: C.muted, fontSize: 10 },
  goalValue: { marginTop: 6, color: C.text, fontSize: 26, fontWeight: '700' },
  goalUnit: { color: C.muted, fontSize: 12, fontWeight: '500' },
  goalIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#303A22' },
  goalIconText: { color: C.accent, fontSize: 21 },
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
