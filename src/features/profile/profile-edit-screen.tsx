import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceErrorDialog, PaceLoadingState } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { getMe, patchProfile, type Me } from '@/data/account-repository';
import { useSession } from '@/features/auth/session-store';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { errorMessage } from '@/lib/api-transport';

export function ProfileEditScreen() {
  const { session } = useSession();
  if (!session) return <ProfileEditFrame><Text style={styles.hint}>프로필을 수정하려면 먼저 로그인해 주세요.</Text></ProfileEditFrame>;
  return <LoadProfile key={session.user.id} />;
}

function LoadProfile() {
  const { data, isLoading, errorMessage: failure, reload } = useFocusQuery<Me | null>(
    getMe, null, '프로필을 불러오지 못했어요. 연결 상태를 확인해 주세요.',
  );
  if (isLoading) return <ProfileEditFrame><PaceLoadingState label="프로필을 불러오는 중" /></ProfileEditFrame>;
  if (!data) return (
    <ProfileEditFrame>
      <Text style={styles.hint}>{failure}</Text>
      <Pressable accessibilityRole="button" onPress={() => { void reload(); }} style={styles.save}>
        <Text style={styles.saveText}>다시 시도</Text>
      </Pressable>
    </ProfileEditFrame>
  );
  return <ProfileForm profile={data} />;
}

function ProfileEditFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <BackHeader />
          <Text style={styles.eyebrow}>MY PROFILE</Text>
          <Text style={styles.title}>프로필 수정</Text>
          <Text style={styles.description}>나를 소개하는 이름과 한 줄을 남겨보세요.</Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProfileForm({ profile }: Readonly<{ profile: Me }>) {
  const router = useRouter();
  const bioInput = useRef<TextInput>(null);
  const saving = useRef(false);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; };
  }, []));
  const [nickname, setNickname] = useState(profile.nickname);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const name = nickname.trim();
  const valid = name.length >= 2 && name.length <= 30 && bio.length <= 150;
  const changed = name !== profile.nickname || bio.trim() !== (profile.bio ?? '');
  const save = async () => {
    if (saving.current || !valid || !changed) return;
    saving.current = true;
    setBusy(true);
    try {
      await patchProfile({ nickname: name, bio: bio.trim() || null });
      if (focused.current) router.back();
    } catch (error) {
      setFailure(errorMessage(error, '프로필을 저장하지 못했어요.'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <ProfileEditFrame>
      <View style={styles.form}>
        <Text style={styles.label}>닉네임</Text>
        <TextInput accessibilityLabel="닉네임" value={nickname} onChangeText={setNickname}
          maxLength={30} editable={!busy} autoCorrect={false} returnKeyType="next"
          onSubmitEditing={() => bioInput.current?.focus()} style={styles.input}
          placeholder="닉네임을 입력해 주세요" placeholderTextColor={C.subtle} />
        <Text style={[styles.hint, name.length < 2 && styles.invalid]}>
          {name.length < 2 ? '닉네임은 공백을 제외하고 2자 이상 입력해 주세요.' : '2~30자 이내로 입력해 주세요.'}
        </Text>
        <View style={styles.labelRow}>
          <Text style={styles.label}>소개 <Text style={styles.optional}>(선택)</Text></Text>
          <Text style={styles.counter}>{bio.length}/150</Text>
        </View>
        <TextInput ref={bioInput} accessibilityLabel="소개" value={bio} onChangeText={setBio}
          maxLength={150} multiline editable={!busy} textAlignVertical="top"
          style={[styles.input, styles.bio]} placeholder="나의 러닝 스타일이나 목표를 소개해 보세요"
          placeholderTextColor={C.subtle} />
      </View>
      <Text style={styles.hint}>변경한 프로필은 현재 로그인한 계정에 저장됩니다.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !valid || !changed }}
        disabled={busy || !valid || !changed} onPress={() => { void save(); }}
        style={({ pressed }) => [styles.save, (busy || !valid || !changed) && styles.disabled, pressed && styles.pressed]}>
        <Text style={styles.saveText}>{busy ? '저장 중…' : '변경사항 저장'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.back()} style={styles.cancel}>
        <Text style={styles.cancelText}>취소</Text>
      </Pressable>
      <PaceErrorDialog message={failure} onClose={() => setFailure(null)} />
    </ProfileEditFrame>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  eyebrow: { marginTop: 24, color: C.accent, fontSize: 10, letterSpacing: 2 },
  title: { marginTop: 10, color: C.text, fontSize: 27, fontWeight: '700' },
  description: { marginTop: 8, color: C.muted, fontSize: 13, lineHeight: 21 },
  form: { marginTop: 28, padding: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 22 },
  label: { color: C.text, fontSize: 13, fontWeight: '600' },
  labelRow: { marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optional: { color: C.subtle, fontSize: 11 },
  counter: { color: C.muted, fontSize: 11 },
  input: { marginTop: 12, minHeight: 52, padding: 14, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.background, color: C.text, fontSize: 15, lineHeight: 22 },
  bio: { minHeight: 132 },
  hint: { marginTop: 12, color: C.muted, fontSize: 11, lineHeight: 18 },
  invalid: { color: '#F4B7A8' },
  save: { marginTop: 26, minHeight: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent },
  saveText: { color: C.accentInk, fontSize: 14, fontWeight: '700' },
  cancel: { minHeight: 48, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: C.muted, fontSize: 13 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
