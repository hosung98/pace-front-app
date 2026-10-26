import { StyleSheet, Switch, View } from 'react-native';
import { PaceText as Text } from '@/components/pace-text';
import { PaceButton } from '@/components/pace-button';
import { PaceColors as C } from '@/constants/pace';
import { RUN_GOALS } from './run-goals';
import type { RunGoal } from './types';

export function RunOptions({ goal, voice, disabled, onGoal, onVoice }: Readonly<{
  goal: RunGoal; voice: boolean; disabled: boolean;
  onGoal: (goal: RunGoal) => void; onVoice: (enabled: boolean) => void;
}>) {
  return <View style={styles.card}>
    <Text style={styles.title}>어떻게 달려볼까요?</Text>
    <View style={styles.choices}>{RUN_GOALS.map((option) => <PaceButton key={option.label} label={option.label}
      disabled={disabled} style={styles.option}
      variant={goal?.kind === option.value?.kind && goal?.target === option.value?.target ? 'primary' : 'secondary'}
      onPress={() => onGoal(option.value)} />)}</View>
    <View style={styles.row}>
      <View style={styles.voiceCopy}>
        <Text style={styles.title}>음성 코치</Text>
        <Text style={styles.caption}>1km마다 거리 · 평균 페이스 안내</Text>
      </View>
      <Switch accessibilityLabel="러닝 중 거리와 평균 페이스 음성 안내" value={voice}
        disabled={disabled} onValueChange={onVoice} trackColor={{ true: C.accent, false: C.border }} />
    </View>
    <Text style={styles.hint}>목표 달성 후에도 기록은 계속돼요.</Text>
    {voice ? <Text style={styles.caption}>러닝 화면을 열어 둔 동안 안내해요. iPhone 무음 모드에서는 소리가 나지 않을 수 있어요.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { marginTop: 28, marginBottom: 24, gap: 14 },
  title: { color: C.text, fontSize: 14, fontWeight: '600' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 44, paddingHorizontal: 13 },
  row: { marginTop: 4, paddingTop: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  voiceCopy: { flex: 1, gap: 4 },
  hint: { color: C.subtle, fontSize: 11, lineHeight: 18 },
  caption: { color: C.muted, fontSize: 12, lineHeight: 19 },
});
