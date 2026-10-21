import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

export function SettingsScreen() {
  const [runReminders, setRunReminders] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi'>('km');
  const [message, setMessage] = useState('');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.fixedContent}>
        <BackHeader backLabel="마이 화면으로 돌아가기" />
        <Text style={styles.eyebrow}>PREFERENCES</Text>
        <Text style={styles.title}>앱 설정</Text>
        <Text style={styles.description}>PACE를 나에게 맞게 설정해 보세요.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>알림</Text>
        <View style={styles.card}>
          <SettingSwitch
            title="러닝 리마인더"
            detail="달리기를 시작할 시간에 알려드려요."
            value={runReminders}
            onValueChange={setRunReminders}
          />
          <View style={styles.divider} />
          <SettingSwitch
            title="주간 리포트"
            detail="매주 러닝 요약을 받아보세요."
            value={weeklySummary}
            onValueChange={setWeeklySummary}
          />
        </View>

        <Text style={styles.sectionTitle}>러닝</Text>
        <View style={styles.card}>
          <View style={styles.unitHeading}>
            <Text style={styles.settingTitle}>거리 단위</Text>
            <Text style={styles.settingDetail}>기록과 통계에 표시할 단위</Text>
          </View>
          <View style={styles.unitSelector}>
            {(['km', 'mi'] as const).map((unit) => (
              <Pressable
                key={unit}
                accessibilityRole="radio"
                accessibilityState={{ selected: distanceUnit === unit }}
                onPress={() => setDistanceUnit(unit)}
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
            detail="친구가 아닌 사람에게 내 기록을 숨겨요."
            value={privateProfile}
            onValueChange={setPrivateProfile}
          />
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            onPress={() => setMessage('계정 및 데이터 삭제는 백엔드 연동 후 제공할 예정이에요.')}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
            <View style={styles.actionCopy}>
              <Text style={styles.settingTitle}>계정 및 데이터 삭제</Text>
              <Text style={styles.settingDetail}>계정과 러닝 데이터 삭제 요청</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
        {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
        <Text style={styles.note}>설정은 미리보기 상태이며 아직 계정에 저장되지 않습니다.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingSwitch({
  title,
  detail,
  value,
  onValueChange,
}: {
  title: string;
  detail: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
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
