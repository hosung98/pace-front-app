import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { ChoiceChips } from '@/components/choice-chips';
import { PaceButton } from '@/components/pace-button';
import { PaceErrorDialog } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { createRace } from '@/data/race-repository';
import { useNow } from '@/hooks/use-now';

import { formatRaceDistance, formatRaceStart, getJoinDeadline } from './race-status';
import {
  RACE_DEADLINE_OPTIONS_MINUTES,
  RACE_DISTANCE_OPTIONS_METERS,
  RACE_MAX_PARTICIPANTS,
  RACE_MIN_PARTICIPANTS,
  type RaceVisibility,
} from './types';

const DAY_OPTIONS = ['오늘', '내일', '모레'] as const;
const TIME_STEP_MINUTES = 30;
/** The join deadline must leave at least this long for people to find the room. */
const MIN_RECRUIT_MINUTES = 5;

function defaultStartMinutes(): number {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes() + 90;
  return Math.min(Math.ceil(minutes / 60) * 60, 23 * 60 + 30);
}

function toStartsAt(dayOffset: number, minutesOfDay: number): number {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(Math.floor(minutesOfDay / 60), minutesOfDay % 60, 0, 0);
  return date.getTime();
}

function formatClock(minutesOfDay: number): string {
  const hours = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  const period = hours < 12 ? '오전' : '오후';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${displayHour}:${String(minutes).padStart(2, '0')}`;
}

export function RaceCreateScreen() {
  const router = useRouter();
  const now = useNow(30_000);
  const [title, setTitle] = useState('');
  const [distanceMeters, setDistanceMeters] = useState<number>(5000);
  const [dayOffset, setDayOffset] = useState(0);
  const [minutesOfDay, setMinutesOfDay] = useState(defaultStartMinutes);
  const [deadlineMinutes, setDeadlineMinutes] = useState<number>(30);
  const [minParticipants, setMinParticipants] = useState(3);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [visibility, setVisibility] = useState<RaceVisibility>('public');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startsAt = toStartsAt(dayOffset, minutesOfDay);
  const joinDeadline = getJoinDeadline({ startsAt, joinDeadlineMinutes: deadlineMinutes });
  const tooSoon = joinDeadline - now < MIN_RECRUIT_MINUTES * 60_000;
  const autoTitle = `${formatClock(minutesOfDay)} ${formatRaceDistance(distanceMeters)} 대결`;

  const submit = async () => {
    setSaving(true);
    try {
      const raceId = await createRace({
        title: title.trim() || autoTitle,
        distanceMeters,
        startsAt,
        joinDeadlineMinutes: deadlineMinutes,
        minParticipants,
        maxParticipants,
        visibility,
      });
      router.replace({ pathname: '/race-detail', params: { raceId } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '대결 방을 만들지 못했어요.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackHeader backLabel="대결 화면으로 돌아가기" />
          <Text style={styles.eyebrow}>NEW RACE</Text>
          <Text style={styles.title}>대결 방 만들기</Text>

          <Section label="방 이름 (선택)">
            <TextInput
              accessibilityLabel="방 이름"
              value={title}
              onChangeText={setTitle}
              maxLength={30}
              placeholder={autoTitle}
              placeholderTextColor={C.subtle}
              style={styles.input}
            />
          </Section>

          <Section label="거리">
            <ChoiceChips
              options={RACE_DISTANCE_OPTIONS_METERS.map((value) => ({ value, label: formatRaceDistance(value) }))}
              value={distanceMeters}
              onChange={setDistanceMeters}
            />
          </Section>

          <Section label="시작 시간">
            <ChoiceChips
              options={DAY_OPTIONS.map((label, value) => ({ value, label }))}
              value={dayOffset}
              onChange={setDayOffset}
            />
            <View style={styles.stepperCard}>
              <StepButton
                label="−"
                accessibilityLabel="30분 앞당기기"
                disabled={minutesOfDay <= 0}
                onPress={() => setMinutesOfDay((value) => Math.max(0, value - TIME_STEP_MINUTES))}
              />
              <Text style={styles.clock}>{formatClock(minutesOfDay)}</Text>
              <StepButton
                label="+"
                accessibilityLabel="30분 미루기"
                disabled={minutesOfDay >= 23 * 60 + 30}
                onPress={() => setMinutesOfDay((value) => Math.min(23 * 60 + 30, value + TIME_STEP_MINUTES))}
              />
            </View>
          </Section>

          <Section label="모집 마감" caption="마감 시점에 최소 인원이 안 되면 자동으로 취소돼요.">
            <ChoiceChips
              options={RACE_DEADLINE_OPTIONS_MINUTES.map((value) => ({ value, label: `${value}분 전` }))}
              value={deadlineMinutes}
              onChange={setDeadlineMinutes}
            />
          </Section>

          <Section label="인원">
            <View style={styles.countRow}>
              <Counter
                label="최소"
                value={minParticipants}
                min={RACE_MIN_PARTICIPANTS}
                max={maxParticipants}
                onChange={setMinParticipants}
              />
              <Counter
                label="최대"
                value={maxParticipants}
                min={minParticipants}
                max={RACE_MAX_PARTICIPANTS}
                onChange={setMaxParticipants}
              />
            </View>
          </Section>

          <Section
            label="공개 범위"
            caption={visibility === 'public' ? '대결 목록에 보이고 누구나 참가할 수 있어요.' : '초대 코드를 받은 사람만 참가할 수 있어요.'}>
            <ChoiceChips
              options={[
                { value: 'public' as const, label: '공개' },
                { value: 'private' as const, label: '비공개 (코드)' },
              ]}
              value={visibility}
              onChange={setVisibility}
            />
          </Section>

          <View style={[styles.summary, tooSoon && styles.summaryError]}>
            {tooSoon ? (
              <Text style={styles.summaryErrorText}>
                모집 마감이 너무 가까워요. 시작 시간을 늦추거나 마감 시간을 줄여 주세요.
              </Text>
            ) : (
              <Text style={styles.summaryText}>
                <Text style={styles.summaryStrong}>{formatRaceStart(joinDeadline, now)}</Text>까지{' '}
                <Text style={styles.summaryStrong}>{minParticipants}명</Text> 이상 모이면{' '}
                <Text style={styles.summaryStrong}>{formatRaceStart(startsAt, now)}</Text>에 다 함께 출발해요.
              </Text>
            )}
          </View>

          <PaceButton
            label="방 만들기"
            disabled={tooSoon}
            loading={saving}
            onPress={() => void submit()}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <PaceErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} title="방을 만들 수 없어요" />
    </SafeAreaView>
  );
}

function Section({ label, caption, children }: Readonly<{ label: string; caption?: string; children: ReactNode }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );
}

function StepButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: Readonly<{ label: string; accessibilityLabel: string; disabled: boolean; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, disabled && styles.stepDisabled, pressed && styles.pressed]}>
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: Readonly<{ label: string; value: number; min: number; max: number; onChange: (value: number) => void }>) {
  return (
    <View style={styles.counter}>
      <Text style={styles.counterLabel}>{label}</Text>
      <View style={styles.counterBody}>
        <StepButton label="−" accessibilityLabel={`${label} 인원 줄이기`} disabled={value <= min} onPress={() => onChange(value - 1)} />
        <Text style={styles.counterValue}>{value}명</Text>
        <StepButton label="+" accessibilityLabel={`${label} 인원 늘리기`} disabled={value >= max} onPress={() => onChange(value + 1)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  eyebrow: { marginTop: 16, color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 2 },
  title: { marginTop: 8, color: C.text, fontSize: 25, fontWeight: '700', letterSpacing: -0.6 },
  section: { marginTop: 24 },
  sectionLabel: { marginBottom: 9, color: C.text, fontSize: 13, fontWeight: '600' },
  sectionCaption: { marginTop: 8, color: C.subtle, fontSize: 11, lineHeight: 16 },
  input: {
    minHeight: 50,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontFamily: 'Pretendard-Regular',
    fontSize: 15,
  },
  stepperCard: { marginTop: 10, padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  clock: { color: C.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  stepButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: C.raised },
  stepDisabled: { opacity: 0.35 },
  stepText: { color: C.text, fontSize: 20, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  countRow: { flexDirection: 'row', gap: 10 },
  counter: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  counterLabel: { color: C.subtle, fontSize: 11 },
  counterBody: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterValue: { color: C.text, fontSize: 16, fontWeight: '700' },
  summary: { marginTop: 26, padding: 16, borderRadius: 16, backgroundColor: '#1C2117', borderWidth: 1, borderColor: '#2D3624' },
  summaryError: { backgroundColor: '#2A1C1C', borderColor: '#4A2B2B' },
  summaryText: { color: C.muted, fontSize: 13, lineHeight: 20 },
  summaryStrong: { color: C.accent, fontSize: 13, fontWeight: '700' },
  summaryErrorText: { color: '#FF8A80', fontSize: 12, lineHeight: 18 },
  submit: { marginTop: 18 },
});
