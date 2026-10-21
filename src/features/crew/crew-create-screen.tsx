import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceButton } from '@/components/pace-button';
import { PaceErrorDialog } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { createCrew } from '@/data/crew-repository';

import { LocateRegionButton, RegionPicker, type RegionSelection } from './region-picker';
import { CREW_INTRO_MAX_LENGTH, CREW_MAX_MEMBERS, CREW_NAME_MAX_LENGTH } from './types';

export function CrewCreateScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [intro, setIntro] = useState('');
  const [region, setRegion] = useState<RegionSelection>({ sido: null, sigungu: null });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length >= 2 && region.sido !== null;

  const submit = async () => {
    setSaving(true);
    try {
      const crewId = await createCrew({
        name: trimmedName,
        intro,
        region: region.sido ? { sido: region.sido, sigungu: region.sigungu } : null,
      });
      router.replace({ pathname: '/crew-detail', params: { crewId } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '크루를 만들지 못했어요.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackHeader backLabel="크루 화면으로 돌아가기" />
          <Text style={styles.eyebrow}>NEW CREW</Text>
          <Text style={styles.title}>크루 만들기</Text>
          <Text style={styles.description}>
            만든 사람이 크루장이 돼요. 초대 코드를 공유하거나 가입 신청을 승인해서 멤버를 모아요.
          </Text>

          <Field label="크루 이름" count={`${name.length}/${CREW_NAME_MAX_LENGTH}`}>
            <TextInput
              accessibilityLabel="크루 이름"
              value={name}
              onChangeText={setName}
              maxLength={CREW_NAME_MAX_LENGTH}
              placeholder="예) 새벽 한강 러너스"
              placeholderTextColor={C.subtle}
              style={styles.input}
            />
          </Field>
          <Field label="소개 (선택)" count={`${intro.length}/${CREW_INTRO_MAX_LENGTH}`}>
            <TextInput
              accessibilityLabel="크루 소개"
              value={intro}
              onChangeText={setIntro}
              maxLength={CREW_INTRO_MAX_LENGTH}
              placeholder="어떤 크루인지 한 줄로 알려 주세요"
              placeholderTextColor={C.subtle}
              multiline
              style={[styles.input, styles.multiline]}
            />
          </Field>

          <Field
            label="활동 지역"
            accessory={<LocateRegionButton onLocated={setRegion} onError={setLocationError} />}
            caption="크루 찾기에서 지역으로 검색돼요. 정확한 위치는 저장하지 않아요.">
            <RegionPicker value={region} onChange={setRegion} allSigunguLabel="시/도 전체" />
          </Field>

          <View style={styles.rules}>
            <Text style={styles.rule}>· 크루는 한 사람당 하나만 가입할 수 있어요.</Text>
            <Text style={styles.rule}>· 최대 {CREW_MAX_MEMBERS}명까지 함께할 수 있어요.</Text>
            <Text style={styles.rule}>· 멤버들의 달린 거리 합계로 주간·월간 순위가 매겨져요.</Text>
          </View>

          <PaceButton
            label="크루 만들기"
            disabled={!canSubmit}
            loading={saving}
            onPress={() => void submit()}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <PaceErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} title="크루를 만들 수 없어요" />
      <PaceErrorDialog message={locationError} onClose={() => setLocationError(null)} title="지역을 찾지 못했어요" />
    </SafeAreaView>
  );
}

function Field({
  label,
  count,
  accessory,
  caption,
  children,
}: Readonly<{ label: string; count?: string; accessory?: ReactNode; caption?: string; children: ReactNode }>) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {accessory ?? (count ? <Text style={styles.fieldCount}>{count}</Text> : null)}
      </View>
      {children}
      {caption ? <Text style={styles.fieldCaption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  eyebrow: { marginTop: 16, color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 2 },
  title: { marginTop: 8, color: C.text, fontSize: 25, fontWeight: '700', letterSpacing: -0.6 },
  description: { marginTop: 6, color: C.muted, fontSize: 12, lineHeight: 18 },
  field: { marginTop: 24 },
  fieldHeader: { marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { color: C.text, fontSize: 13, fontWeight: '600' },
  fieldCount: { color: C.subtle, fontSize: 11 },
  fieldCaption: { marginTop: 8, color: C.subtle, fontSize: 11, lineHeight: 16 },
  input: {
    minHeight: 50,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 15,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontFamily: 'Pretendard-Regular',
    fontSize: 15,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  rules: { marginTop: 22, gap: 6 },
  rule: { color: C.subtle, fontSize: 11, lineHeight: 16 },
  submit: { marginTop: 28 },
});
