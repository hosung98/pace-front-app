import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PaceMark } from '@/components/pace-brand';
import { PaceErrorDialog } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { TabScreenShell, tabScreenStyles } from '@/features/navigation/tab-screen-shell';
import { getWeeklyGoalKm } from '@/data/weekly-goal-repository';
import { DEFAULT_WEEKLY_GOAL_KM } from '@/features/running/weekly-goal';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { getMe, logout, patchProfile, type Me } from '@/data/account-repository';
import { readActiveRun } from '@/data/active-run-store';
import { getSessionState, useSession } from '@/features/auth/session-store';
import { errorMessage as describeError } from '@/lib/api-transport';

async function loadProfile() {
  const [weeklyGoalKm, me] = await Promise.all([
    getWeeklyGoalKm(), getSessionState().session ? getMe() : Promise.resolve(null),
  ]);
  return { weeklyGoalKm, me };
}

const menuItems = [
  { label: '앱 설정', detail: '알림, 거리 단위, 개인정보', route: '/settings' },
  { label: '계정 로그인', detail: 'Google 로그인 · iOS 지원', route: '/login' },
] as const;

export function ProfileScreen() {
  const { session } = useSession();
  return <AccountProfile key={session?.user.id ?? 'guest'} />;
}

function AccountProfile() {
  const router = useRouter();
  const { session } = useSession();
  const { data, errorMessage, clearError, reload } = useFocusQuery(
    loadProfile,
    { weeklyGoalKm: DEFAULT_WEEKLY_GOAL_KM, me: null as Me | null },
    '프로필을 불러오지 못했어요. 연결 상태를 확인해 주세요.',
  );
  const { weeklyGoalKm, me } = data;
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const signOut = async () => {
    setBusy(true);
    try {
      if (await readActiveRun()) throw new Error('러닝을 종료하고 저장한 뒤 로그아웃해 주세요.');
      await logout();
      setEditing(false);
      router.replace('/login');
    } catch (error) {
      setActionError(describeError(error, '로그아웃하지 못했어요.'));
    } finally { setBusy(false); }
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      await patchProfile({ nickname: nickname.trim(), bio: bio.trim() || null });
      setEditing(false);
      await reload();
    } catch (error) { setActionError(describeError(error, '프로필을 저장하지 못했어요.')); }
    finally { setBusy(false); }
  };

  return (
    <TabScreenShell
      eyebrow="MY PACE"
      title="나의 프로필"
      description="나만의 러닝 목표와 앱 환경을 관리해요."
      badge={session ? '계정 연결' : '기기 모드'}
      disclaimer={session ? '프로필과 주간 목표는 계정에 저장됩니다.' : '로그인 전에는 주간 목표와 기록을 이 기기에 저장합니다.'}>
      <View style={styles.profileCard}>
        <View style={styles.profileIcon}><PaceMark size={27} /></View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{me?.nickname ?? session?.user.nickname ?? 'PACE 러너'}</Text>
          <Text style={styles.handle}>{me?.handle ? `@${me.handle}` : session ? 'Google 계정 연결됨' : '로그인하지 않은 기기 사용자'}</Text>
        </View>
        <View style={styles.previewTag}>
          <Text style={styles.previewTagText}>{session ? 'Google' : '기기'}</Text>
        </View>
        {session && me ? (
          <View style={tabScreenStyles.card}>
            {editing ? (
              <>
                <TextInput accessibilityLabel="닉네임" value={nickname} onChangeText={setNickname}
                  maxLength={30} editable={!busy} style={styles.input} placeholder="닉네임 (2~30자)" placeholderTextColor={C.subtle} />
                <TextInput accessibilityLabel="소개" value={bio} onChangeText={setBio}
                  maxLength={150} editable={!busy} multiline style={styles.input} placeholder="소개 (최대 150자)" placeholderTextColor={C.subtle} />
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void saveProfile(); }} style={styles.logoutButton}>
                  <Text style={styles.logoutText}>{busy ? '저장 중…' : '프로필 저장'}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => setEditing(false)} style={styles.logoutButton}>
                  <Text style={styles.logoutText}>취소</Text>
                </Pressable>
              </>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => {
                setNickname(me.nickname); setBio(me.bio ?? ''); setEditing(true);
              }}>
                <Text style={styles.menuLabel}>프로필 수정</Text>
                <Text style={styles.menuDetail}>{me.bio ?? '닉네임과 소개를 설정해 보세요.'}</Text>
              </Pressable>
            )}
          </View>
        ) : null}
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
        disabled={busy}
        onPress={() => { if (session) void signOut(); else router.push('/login'); }}
        style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
        <Text style={styles.logoutText}>{busy ? '처리 중…' : session ? '로그아웃' : 'Google 로그인'}</Text>
      </Pressable>
      <PaceErrorDialog
        message={actionError ?? errorMessage}
        onClose={() => { setActionError(null); clearError(); }}
      />
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  input: { color: C.text, borderColor: C.border, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 13 },
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
