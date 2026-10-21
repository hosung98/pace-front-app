import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

import { detectCurrentRegion } from './current-region';
import { SIDO_LIST, sigunguOf } from './regions';

export type RegionSelection = Readonly<{ sido: string | null; sigungu: string | null }>;

const ALL = '';

type RegionPickerProps = Readonly<{
  value: RegionSelection;
  onChange: (value: RegionSelection) => void;
  /** Label for "no 시/도 filter" (search). Omit to force picking a 시/도 (create). */
  allSidoLabel?: string;
  /** Label for "whole 시/도" in the 시/군/구 row. */
  allSigunguLabel?: string;
}>;

/** Two scrollable chip rows: 시/도, then that 시/도's 시/군/구. */
export function RegionPicker({ value, onChange, allSidoLabel, allSigunguLabel = '전체' }: RegionPickerProps) {
  const sidoOptions = [
    ...(allSidoLabel ? [{ value: ALL, label: allSidoLabel }] : []),
    ...SIDO_LIST.map((sido) => ({ value: sido, label: sido })),
  ];
  const sigunguList = value.sido ? sigunguOf(value.sido) : [];

  return (
    <View style={styles.wrap}>
      <ChoiceChips
        scrollable
        size="small"
        options={sidoOptions}
        value={value.sido ?? ALL}
        onChange={(sido) => onChange({ sido: sido || null, sigungu: null })}
      />
      {value.sido && sigunguList.length > 0 ? (
        <ChoiceChips
          scrollable
          size="small"
          options={[
            { value: ALL, label: allSigunguLabel },
            ...sigunguList.map((sigungu) => ({ value: sigungu, label: sigungu })),
          ]}
          value={value.sigungu ?? ALL}
          onChange={(sigungu) => onChange({ sido: value.sido, sigungu: sigungu || null })}
        />
      ) : null}
      {value.sido && sigunguList.length === 0 ? <Text style={styles.hint}>시/군/구 구분이 없는 지역이에요.</Text> : null}
    </View>
  );
}

/** "내 위치로" — fills the picker from the device location (region names only). */
export function LocateRegionButton({
  onLocated,
  onError,
}: Readonly<{ onLocated: (value: RegionSelection) => void; onError: (message: string) => void }>) {
  const [locating, setLocating] = useState(false);

  const locate = async () => {
    setLocating(true);
    try {
      onLocated(await detectCurrentRegion());
    } catch (error) {
      onError(error instanceof Error ? error.message : '현재 위치를 확인하지 못했어요.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="내 위치로 지역 선택"
      accessibilityState={{ busy: locating }}
      disabled={locating}
      hitSlop={8}
      onPress={() => void locate()}
      style={({ pressed }) => [styles.locate, pressed && styles.pressed]}>
      {locating ? <ActivityIndicator size="small" color={C.accent} /> : null}
      <Text style={styles.locateText}>{locating ? '찾는 중' : '내 위치로'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  locate: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28 },
  locateText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.6 },
  hint: { color: C.subtle, fontSize: 11 },
});
