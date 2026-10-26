import { useCallback, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { PaceText as Text } from '@/components/pace-text';
import { PaceButton } from '@/components/pace-button';
import { PaceQueryState } from '@/components/pace-feedback';
import { PaceColors as C } from '@/constants/pace';
import { getCrewGoal, saveCrewGoal, type CrewGoal } from '@/data/running-progress-repository';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { errorMessage } from '@/lib/api-transport';

export function CrewGoalCard({ crewId }: Readonly<{ crewId: string }>) {
  const load = useCallback(() => getCrewGoal(crewId), [crewId]);
  const query = useFocusQuery<CrewGoal | null>(load, null, '크루 공동 목표를 불러오지 못했어요.');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const data = query.data;
  return <View style={styles.card}>
    <Text style={styles.title}>함께 채우는 이번 달</Text>
    {query.isLoading || query.errorMessage || !data ? <PaceQueryState loading={query.isLoading}
      message={query.errorMessage} onRetry={() => { void query.reload(); }} /> : <>
      {data.targetKm > 0 ? <>
        <Text style={styles.value}>{data.totalKm.toFixed(1)} / {data.targetKm} km</Text>
        <View style={styles.track}><View style={[styles.fill, {
          width: `${Math.min(100, data.totalKm / data.targetKm * 100)}%`,
        }]} /></View>
        <Text style={styles.caption}>{data.month} · {data.totalKm >= data.targetKm ? '함께 목표를 달성했어요!' : '순위보다 함께 달리는 즐거움을 모아요.'}</Text>
      </> : <Text style={styles.caption}>{data.canEdit ? '이번 달 함께 달릴 목표를 정해 주세요.' : '크루장이 이번 달 목표를 설정하면 함께 도전할 수 있어요.'}</Text>}
      {data.contributors.map((member) => <Text key={member.userId} style={styles.caption}>
        {member.nickname} · {member.distanceKm.toFixed(1)} km
      </Text>)}
      <Text style={styles.caption}>한국 시간 기준 이번 달, 현재 멤버가 가입 이후에 시작한 PACE 러닝을 합산해요. 공동 배지는 목표 설정 이후 새로 달성했을 때 기여한 멤버가 받아요.</Text>
      {data.canEdit ? <>
        <TextInput accessibilityLabel="크루 월간 목표 킬로미터" keyboardType="number-pad" value={target}
          editable={!busy} onChangeText={setTarget} placeholder={data.targetKm > 0 ? `현재 목표 ${data.targetKm}km · 1~10000` : '월간 목표 거리 · 1~10000km'}
          placeholderTextColor={C.subtle} style={styles.input} maxLength={5} />
        <PaceButton label="크루 목표 저장" loading={busy} onPress={() => {
          if (saving.current) return;
          const value = Number(target);
          if (!/^\d+$/.test(target) || value < 1 || value > 10000) {
            setMessage('목표는 1~10000km 사이의 정수로 입력해 주세요.');
            return;
          }
          saving.current = true;
          setBusy(true);
          setMessage(null);
          void saveCrewGoal(crewId, value).then(async () => {
            setTarget('');
            await query.reload();
          }).catch((error: unknown) => {
            console.error('크루 목표 저장 실패', error);
            setMessage(errorMessage(error, '목표를 저장하지 못했어요.'));
          }).finally(() => { saving.current = false; setBusy(false); });
        }} />
      </> : null}
    </>}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.caption}>{message}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { marginTop: 20, padding: 18, backgroundColor: C.surface, borderRadius: 18, gap: 12 },
  title: { color: C.text, fontSize: 17, fontWeight: '700' },
  value: { color: C.accent, fontSize: 23, fontWeight: '700' },
  caption: { color: C.muted, fontSize: 12, lineHeight: 19 },
  track: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.accent },
  input: { minHeight: 48, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, color: C.text },
});
