import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PaceMark } from '@/components/pace-brand';
import { PaceErrorDialog, PaceLoadingState } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { TabScreenShell, tabScreenStyles } from '@/features/navigation/tab-screen-shell';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { getMe, logout, type Me } from '@/data/account-repository';
import { PaceConfirmDialog } from '@/components/pace-confirm-dialog';
import { readActiveRun } from '@/data/active-run-store';
import { getSessionState, useSession } from '@/features/auth/session-store';
import { errorMessage as describeError } from '@/lib/api-transport';
import { ProgressSummary } from '@/features/running/progress-summary';

async function loadProfile() {
  return { me: getSessionState().session ? await getMe() : null };
}

const menuItems = [
  { label: '배지 · 개인 최고 기록', detail: '모은 성취와 나의 러닝 컬렉션', route: '/achievements' },
  { label: '앱 설정', detail: '알림, 거리 단위, 개인정보', route: '/settings' },
  { label: '계정 로그인', detail: 'Google · Apple 로그인', route: '/login' },
] as const;

export function ProfileScreen() {
  const { session } = useSession();
  return <AccountProfile key={session?.user.id ?? 'guest'} />;
}

function AccountProfile() {
  const router = useRouter();
  const { session } = useSession();
  const { data, errorMessage, reload, isLoading } = useFocusQuery(
    loadProfile,
    { me: null as Me | null },
    '프로필을 불러오지 못했어요. 연결 상태를 확인해 주세요.',
  );
  const { me } = data;
  const [busy, setBusy] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const signOut = async () => {
    setConfirmLogout(false);
    setBusy(true);
    try {
      if (await readActiveRun()) throw new Error('러닝을 종료하고 저장한 뒤 로그아웃해 주세요.');
      await logout();
      router.replace('/login');
    } catch (error) {
      setActionError(describeError(error, '로그아웃하지 못했어요.'));
    } finally { setBusy(false); }
  };

  return (
    <TabScreenShell
      eyebrow="MY PACE"
      title="나의 프로필"
      description="나의 성취와 프로필, 앱 환경을 관리해요."
      badge={session ? '계정 연결' : '기기 모드'}
      disclaimer={session ? '프로필과 러닝 성취는 계정에 저장됩니다.' : '로그인 전에는 기록을 이 기기에 저장합니다.'}>
      {isLoading ? <PaceLoadingState label="프로필을 불러오는 중" /> : errorMessage ? (
        <View style={tabScreenStyles.card}>
          <Text style={styles.menuLabel}>프로필을 불러오지 못했어요</Text>
          <Text style={styles.menuDetail}>{errorMessage}</Text>
          <Pressable accessibilityRole="button" onPress={() => { void reload(); }} style={styles.logoutButton}>
            <Text style={styles.logoutText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
      <>
      <View style={styles.profileCard}>
        <View style={styles.profileHeading}>
        <View style={styles.profileIcon}><PaceMark size={27} /></View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{me?.nickname ?? session?.user.nickname ?? 'PACE 러너'}</Text>
          <Text style={styles.handle}>{me?.handle ? `@${me.handle}` : session ? '소셜 계정 연결됨' : '로그인하지 않은 기기 사용자'}</Text>
        </View>
        <View style={styles.previewTag}>
          <Text style={styles.previewTagText}>{session ? (me?.linkedProviders?.map((p) => p === 'APPLE' || p === 'apple' ? 'Apple' : p === 'GOOGLE' || p === 'google' ? 'Google' : p).join(' · ') || '계정') : '기기'}</Text>
        </View>
        </View>
        {me?.bio ? <Text style={styles.bio}>{me.bio}</Text> : null}
        {session && me ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/profile-edit')}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
            <Text style={styles.editText}>프로필 수정</Text>
            <Text style={styles.editText}>›</Text>
          </Pressable>
        ) : null}
      </View>
      <ProgressSummary />
      <Text style={styles.sectionTitle}>내 메뉴</Text>
      <View style={styles.menuCard}>
        {menuItems.filter((item) => !session || item.route !== '/login').map((item, index) => (
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
        onPress={() => { if (session) setConfirmLogout(true); else router.push('/login'); }}
        style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
        <Text style={styles.logoutText}>{busy ? '처리 중…' : session ? '로그아웃' : '소셜 로그인'}</Text>
      </Pressable>
      </>
      )}
      <PaceErrorDialog
        message={actionError}
        onClose={() => setActionError(null)}
      />
      <PaceConfirmDialog visible={confirmLogout} title="로그아웃할까요?"
        message="계정에 저장된 기록은 유지됩니다. 아직 전송하지 못한 기록은 이 기기에 보관하고 같은 계정으로 로그인하면 다시 동기화합니다."
        onCancel={() => setConfirmLogout(false)} onConfirm={() => { void signOut(); }} />
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  profileCard: { marginTop: 8, padding: 20, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  profileHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bio: { marginTop: 18, color: C.muted, fontSize: 13, lineHeight: 21 },
  editButton: { marginTop: 20, minHeight: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 13, backgroundColor: C.raised },
  editText: { color: C.text, fontSize: 12, fontWeight: '600' },
  profileIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#252E1B' },
  profileInfo: { flex: 1, minWidth: 0, marginLeft: 5 },
  name: { color: C.text, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  handle: { marginTop: 5, color: C.subtle, fontSize: 10 },
  previewTag: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: '#20251B' },
  previewTagText: { color: C.accent, fontSize: 9, fontWeight: '600' },
  sectionTitle: { marginTop: 27, marginBottom: 0, color: C.text, fontSize: 16, fontWeight: '700' },
  menuCard: { marginTop: 10, paddingHorizontal: 16, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  menuRow: { minHeight: 64, paddingVertical: 12, gap: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuCopy: { flex: 1, gap: 4 },
  menuLabel: { color: C.text, fontSize: 12, fontWeight: '600' },
  menuDetail: { marginTop: 4, color: C.muted, fontSize: 11, lineHeight: 18 },
  chevron: { color: C.subtle, fontSize: 24 },
  logoutButton: { minHeight: 46, marginTop: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: C.border },
  logoutText: { color: C.muted, fontSize: 11, fontWeight: '600' },
  pressed: { opacity: 0.72 },
});
