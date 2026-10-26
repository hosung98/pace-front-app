import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { PaceQueryState } from '@/components/pace-feedback';
import { PaceButton } from '@/components/pace-button';
import { deleteAccount as deleteServerAccount, getMe, getSettings, patchSettings, type SettingsPatch } from '@/data/account-repository';
import { readActiveRun } from '@/data/active-run-store';
import { getSessionState, useSession } from '@/features/auth/session-store';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { errorMessage as describeError } from '@/lib/api-transport';
import { useRouter } from 'expo-router';
import { isAppLockEnabled, setAppLockEnabled, supportsAppLock } from '@/features/auth/app-lock';
import { appleCredential } from '@/features/auth/apple-login';

async function loadSettings() {
  return getSessionState().session ? getSettings() : null;
}

export function SettingsScreen() {
  const { session } = useSession();
  return <AccountSettings key={session?.user.id ?? 'guest'} />;
}

function AccountSettings() {
  const router = useRouter();
  const { session } = useSession();
  const { data: settings, errorMessage, isLoading, setData, reload } = useFocusQuery(
    loadSettings, null, '설정을 불러오지 못했어요. 연결 상태를 확인해 주세요.',
  );
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const userId = session?.user.id;
  const loadLock = useCallback(async () => userId ? isAppLockEnabled(userId) : false, [userId]);
  const lock = useFocusQuery(loadLock,
    false, '앱 잠금 설정을 확인하지 못했어요.');
  const [lockBusy, setLockBusy] = useState(false);
  const runReminders = settings?.notifications.runReminder ?? true;
  const weeklySummary = settings?.notifications.weeklySummary ?? true;
  const privateProfile = settings?.profileVisibility === 'private';
  const distanceUnit = settings?.distanceUnit ?? 'km';
  const [message, setMessage] = useState('');
  const update = async (patch: SettingsPatch) => {
    if (!session) { setMessage('설정을 계정에 저장하려면 먼저 로그인해 주세요.'); return; }
    setBusy(true);
    try { setData(await patchSettings(patch)); }
    catch (error) { setMessage(describeError(error, '설정을 저장하지 못했어요.')); }
    finally { setBusy(false); }
  };

  const deleteAccount = async () => {
    setConfirmDelete(false);
    setBusy(true);
    try {
      if (await readActiveRun()) throw new Error('러닝을 종료하고 저장한 뒤 탈퇴해 주세요.');
      const me = await getMe();
      if (me.linkedProviders.some((provider) => provider.toLowerCase() === 'apple')) {
        if (Platform.OS !== 'ios') throw new Error('Apple로 가입한 계정은 iPhone에서 재인증 후 탈퇴해 주세요.');
        const credential = await appleCredential();
        if (!credential) { setMessage('Apple 재인증을 취소했어요. 계정은 삭제하지 않았어요.'); return; }
        if (!credential.authorizationCode) throw new Error('Apple 연결 해제에 필요한 인증 코드를 받지 못했어요. 다시 시도해 주세요.');
        await deleteServerAccount({ appleAuthorizationCode: credential.authorizationCode, appleNonce: credential.nonce });
      } else { await deleteServerAccount(); }
      router.replace('/login');
    } catch (error) { setMessage(describeError(error, '계정을 삭제하지 못했어요.')); }
    finally { setBusy(false); }
  };
  const disabled = busy || isLoading || !session || !settings;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.fixedContent}>
        <BackHeader backLabel="마이 화면으로 돌아가기" />
        <Text style={styles.eyebrow}>PREFERENCES</Text>
        <Text style={styles.title}>앱 설정</Text>
        <Text style={styles.description}>PACE를 나에게 맞게 설정해 보세요.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>보안 · 건강 연동</Text>
        <View style={styles.card}>
          <SettingSwitch title="Face ID · 기기 암호로 앱 잠금"
            detail={supportsAppLock ? '앱 시작·5분 이상 이탈 후에만 인증해요. 기본은 꺼짐이에요.' : 'iPhone에서 사용할 수 있어요.'}
            value={lock.data} disabled={!session || !supportsAppLock || lockBusy || lock.isLoading || Boolean(lock.errorMessage)}
            onValueChange={(value) => {
              if (!session || lockBusy) return;
              setLockBusy(true);
              void setAppLockEnabled(session.user.id, value).then(() => lock.reload()).catch((error: unknown) => {
                console.error('앱 잠금 변경 실패', error);
                setMessage(describeError(error, '앱 잠금을 변경하지 못했어요.'));
              }).finally(() => setLockBusy(false));
            }} />
          {lock.errorMessage ? <PaceQueryState loading={false} message={lock.errorMessage}
            onRetry={() => { void lock.reload(); }} /> : null}
          <View style={styles.divider} />
          <Pressable accessibilityRole="button" onPress={() => router.push('/health')}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
            <View style={styles.actionCopy}>
              <Text style={styles.settingTitle}>Apple 건강</Text>
              <Text style={styles.settingDetail}>걸음 수·운동 조회와 PACE 러닝 저장 · iPhone 전용</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
        <Text style={styles.sectionTitle}>이용 안내</Text>
        <View style={styles.card}>
          {([
            ['/permissions', '앱 권한 안내'],
            ['/privacy', '개인정보 처리방침'],
            ['/terms', '이용약관'],
            ['/support', '도움말 · 문의 및 삭제 요청'],
          ] as const).map(([route, label]) => <Pressable key={route} accessibilityRole="link"
            style={styles.actionRow} onPress={() => router.push(route === '/permissions'
              ? { pathname: route, params: { from: 'settings' } } : route)}>
            <Text style={styles.settingTitle}>{label}</Text><Text style={styles.chevron}>›</Text>
          </Pressable>)}
        </View>
        {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
        {session && (isLoading || errorMessage) ? (
          <PaceQueryState loading={isLoading} message={errorMessage} onRetry={() => { void reload(); }} />
        ) : (
        <>
        <Text style={styles.sectionTitle}>알림</Text>
        <View style={styles.card}>
          <SettingSwitch
            title="러닝 리마인더"
            detail="계정에 알림 선호를 저장해요. 실제 발송은 준비 중이에요."
            value={runReminders}
            disabled={disabled}
            onValueChange={(value) => { void update({ notifications: { runReminder: value } }); }}
          />
          <View style={styles.divider} />
          <SettingSwitch
            title="주간 리포트"
            detail="주간 요약 알림 설정이에요. 실제 발송은 준비 중이에요."
            value={weeklySummary}
            disabled={disabled}
            onValueChange={(value) => { void update({ notifications: { weeklySummary: value } }); }}
          />
        </View>

        <Text style={styles.sectionTitle}>러닝</Text>
        <View style={styles.card}>
          <View style={styles.unitHeading}>
            <Text style={styles.settingTitle}>거리 단위</Text>
            <Text style={styles.settingDetail}>계정의 선호 단위 (현재 러닝 화면은 km로 표시)</Text>
          </View>
          <View style={styles.unitSelector}>
            {(['km', 'mi'] as const).map((unit) => (
              <Pressable
                key={unit}
                accessibilityRole="radio"
                accessibilityState={{ selected: distanceUnit === unit }}
                disabled={disabled}
                onPress={() => { void update({ distanceUnit: unit }); }}
                style={[styles.unitButton, distanceUnit === unit && styles.unitButtonActive]}>
                <View style={styles.radioIndicator}>
                  {distanceUnit === unit ? <View style={styles.radioSelected} /> : null}
                </View>
                <View style={styles.unitCopy}>
                  <Text style={[styles.unitText, distanceUnit === unit && styles.unitTextActive]}>
                    {unit === 'km' ? '킬로미터' : '마일'}
                  </Text>
                  <Text style={styles.unitCode}>{unit}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>개인정보</Text>
        <View style={styles.card}>
          <SettingSwitch
            title="비공개 프로필"
            detail="계정 프로필의 공개 범위를 저장해요."
            value={privateProfile}
            disabled={disabled}
            onValueChange={(value) => { void update({ profileVisibility: value ? 'private' : 'public' }); }}
          />
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => setConfirmDelete(true)}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
            <View style={styles.actionCopy}>
              <Text style={styles.settingTitle}>계정 및 데이터 삭제</Text>
              <Text style={styles.settingDetail}>계정과 러닝 데이터 삭제 요청</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
        {confirmDelete ? <View style={[styles.card, styles.deleteConfirmation]}>
          <Text style={styles.settingTitle}>계정 삭제를 요청할까요?</Text>
          <Text style={styles.settingDetail}>요청하면 로그인이 차단되고 서버에서 삭제 대기 처리됩니다. 물리 삭제·백업 보관은 개인정보 처리방침을 확인해 주세요. Apple 건강의 운동은 별도로 남으며 건강 앱에서 직접 삭제해야 해요.</Text>
          <PaceButton label="취소" variant="secondary" disabled={busy} onPress={() => setConfirmDelete(false)} />
          <PaceButton label="삭제 요청 진행" variant="danger" loading={busy} onPress={() => { void deleteAccount(); }} />
        </View> : null}
        <Text style={styles.note}>{session ? '변경한 설정은 계정에 저장됩니다.' : '로그인 후 계정 설정과 탈퇴 기능을 사용할 수 있어요.'}</Text>
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingSwitch({
  title,
  detail,
  value,
  onValueChange,
  disabled,
}: {
  title: string;
  detail: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{ checked: value }}
        disabled={disabled}
        onPress={() => onValueChange(!value)}
        style={[styles.switchTrack, value && styles.switchTrackActive]}>
        <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  fixedContent: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 28 },
  eyebrow: { marginTop: 23, color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 2 },
  title: { marginTop: 8, color: C.text, fontSize: 25, fontWeight: '700' },
  description: { marginTop: 5, color: C.muted, fontSize: 12 },
  sectionTitle: { marginTop: 24, marginBottom: 10, color: C.text, fontSize: 14, fontWeight: '700' },
  card: { paddingHorizontal: 15, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  deleteConfirmation: { paddingVertical: 18, marginTop: 14, gap: 14 },
  settingRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  settingCopy: { flex: 1, gap: 5 },
  settingTitle: { color: C.text, fontSize: 11, fontWeight: '600' },
  settingDetail: { color: C.subtle, fontSize: 9, lineHeight: 14 },
  switchTrack: { width: 46, height: 28, padding: 3, flexShrink: 0, justifyContent: 'center', borderRadius: 14, backgroundColor: C.raised },
  switchTrackActive: { backgroundColor: '#718A35' },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#D0D2CC', transform: [{ translateX: 0 }] },
  switchThumbActive: { backgroundColor: C.accent, transform: [{ translateX: 18 }] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  unitHeading: { paddingTop: 15, gap: 5 },
  unitSelector: { marginTop: 12, marginBottom: 15, gap: 8 },
  unitButton: { minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: C.border, borderRadius: 12 },
  unitButtonActive: { borderColor: '#718A35', backgroundColor: '#20251B' },
  radioIndicator: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.subtle, borderRadius: 9 },
  radioSelected: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent },
  unitCopy: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  unitText: { color: C.muted, fontSize: 11 },
  unitTextActive: { color: C.accent, fontWeight: '600' },
  unitCode: { color: C.subtle, fontSize: 10, textTransform: 'uppercase' },
  actionRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionCopy: { gap: 5 },
  chevron: { color: C.subtle, fontSize: 22 },
  message: { marginTop: 10, color: C.muted, fontSize: 10, lineHeight: 16 },
  note: { marginTop: 19, color: C.subtle, fontSize: 9, lineHeight: 15, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
