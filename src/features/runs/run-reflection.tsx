import { useCallback, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { PaceText as Text } from '@/components/pace-text';
import { PaceButton } from '@/components/pace-button';
import { PaceColors as C } from '@/constants/pace';
import { getSessionState, useSession } from '@/features/auth/session-store';
import { getRunReflection, saveRunReflection, type Reflection } from '@/data/running-progress-repository';
import { readJson, STORAGE_KEYS, writeJson } from '@/data/storage';
import { PaceQueryState } from '@/components/pace-feedback';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { errorMessage } from '@/lib/api-transport';
import type { CompletedRun } from '@/features/running/types';

const EMPTY: Reflection = { effort: null, note: '' };
const EFFORTS = [{ value: 'easy', label: '쉬웠어요' }, { value: 'moderate', label: '적당했어요' },
  { value: 'hard', label: '힘들었어요' }] as const;

export function RunReflection({ run }: Readonly<{ run: CompletedRun }>) {
  const { session } = useSession();
  const owner = session?.user.id;
  const key = `${owner ?? 'guest'}:${run.clientRunId ?? run.id}`;
  const load = useCallback(async () => {
    if (owner && run.serverId) return getRunReflection(run.serverId);
    const all = await readJson<Record<string, Reflection>>(STORAGE_KEYS.runReflections, {});
    return all[key] ?? EMPTY;
  }, [owner, run.serverId, key]);
  const query = useFocusQuery(load, EMPTY, '러닝 메모를 불러오지 못했어요.');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setMessage(null);
    try {
      if (getSessionState().session?.user.id !== owner) throw new Error('계정이 변경됐어요. 다시 열어 주세요.');
      if (!query.data.effort) throw new Error('오늘의 러닝 컨디션을 선택해 주세요.');
      if (owner) {
        if (!run.serverId) throw new Error('기록 화면에서 러닝을 서버에 동기화한 뒤 메모를 저장해 주세요.');
        await saveRunReflection(run.serverId, query.data);
      } else {
        const all = await readJson<Record<string, Reflection>>(STORAGE_KEYS.runReflections, {});
        await writeJson(STORAGE_KEYS.runReflections, { ...all, [key]: query.data });
      }
      setMessage(owner ? '컨디션과 메모를 계정에 저장했어요.' : '컨디션과 메모를 이 기기에 저장했어요.');
    } catch (error) {
      console.error('러닝 메모 저장 실패', error);
      setMessage(errorMessage(error, '메모를 저장하지 못했어요.'));
    } finally {
      setBusy(false);
      saving.current = false;
    }
  };
  return <View style={styles.card}>
    <Text style={styles.heading}>오늘의 러닝은 어땠나요?</Text>
    {query.isLoading || query.errorMessage ? <PaceQueryState loading={query.isLoading}
      message={query.errorMessage} onRetry={() => { void query.reload(); }} /> : <>
      <View style={styles.options}>{EFFORTS.map((effort) => <PaceButton key={effort.value}
        style={styles.option} disabled={busy} label={effort.label}
        variant={query.data.effort === effort.value ? 'primary' : 'secondary'}
        onPress={() => { setMessage(null); query.setData((current) => ({ ...current, effort: effort.value })); }} />)}</View>
      <TextInput accessibilityLabel="러닝 메모" multiline maxLength={500} editable={!busy}
        value={query.data.note} onChangeText={(note) => { setMessage(null); query.setData((current) => ({ ...current, note })); }}
        placeholder="기억하고 싶은 순간을 남겨요 (선택)"
        placeholderTextColor={C.subtle} style={styles.input} />
      <PaceButton label="컨디션 · 메모 저장" loading={busy} disabled={!query.data.effort}
        onPress={() => { void save(); }} />
    </>}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.caption}>{message}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { marginTop: 24, padding: 16, borderRadius: 18, backgroundColor: C.surface, gap: 12 },
  heading: { color: C.text, fontSize: 16, fontWeight: '600' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingHorizontal: 12, minHeight: 44 },
  input: { color: C.text, minHeight: 100, padding: 12, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, fontSize: 14, textAlignVertical: 'top' },
  caption: { color: C.muted, fontSize: 12, lineHeight: 20 },
});
