import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { ChoiceChips } from '@/components/choice-chips';
import { PaceButton } from '@/components/pace-button';
import { PaceQueryState } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { searchRaces } from '@/data/race-repository';
import { useNow } from '@/hooks/use-now';
import { useFocusQuery } from '@/hooks/use-focus-query';

import { RaceCard } from './race-card';
import { formatRaceDistance } from './race-status';
import {
  RACE_DISTANCE_OPTIONS_METERS,
  RACE_SOON_WINDOW_HOURS,
  type RaceSummary,
  type RaceTimeWindow,
} from './types';

const ANY_DISTANCE = 0;

const DISTANCE_OPTIONS = [
  { value: ANY_DISTANCE, label: '전체' },
  ...RACE_DISTANCE_OPTIONS_METERS.map((value) => ({ value, label: formatRaceDistance(value) })),
];

const WINDOW_OPTIONS: { value: RaceTimeWindow; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'soon', label: `곧 시작 (${RACE_SOON_WINDOW_HOURS}시간 내)` },
  { value: 'today', label: '오늘' },
  { value: 'tomorrow', label: '내일' },
  { value: 'weekend', label: '주말' },
];

export function RaceSearchScreen() {
  const router = useRouter();
  const now = useNow(30_000);
  const [distance, setDistance] = useState<number>(ANY_DISTANCE);
  const [timeWindow, setTimeWindow] = useState<RaceTimeWindow>('all');
  const [hideFull, setHideFull] = useState(true);
  const load = useCallback(() => searchRaces({
    distanceMeters: distance === ANY_DISTANCE ? null : distance, window: timeWindow, hideFull,
  }), [distance, timeWindow, hideFull]);
  const { data: items, isLoading, errorMessage, reload } = useFocusQuery<RaceSummary[]>(
    load, [], '대결 목록을 불러오지 못했어요. 연결 상태를 확인해 주세요.',
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}><BackHeader backLabel="대결 화면으로 돌아가기" />
        <Text style={styles.eyebrow}>FIND RACE</Text>
        <Text style={styles.title}>대결 찾기</Text>
        <Text style={styles.description}>대결은 각자 있는 곳에서 같은 시간에 달려요. 거리와 시간으로 골라 보세요.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.filterLabel}>거리</Text>
        <ChoiceChips size="small" options={DISTANCE_OPTIONS} value={distance} onChange={setDistance} />

        <Text style={styles.filterLabel}>시작 시간</Text>
        <ChoiceChips size="small" options={WINDOW_OPTIONS} value={timeWindow} onChange={setTimeWindow} />

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: hideFull }}
          onPress={() => setHideFull((value) => !value)}
          style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>정원 찬 방 숨기기</Text>
          <Switch
            value={hideFull}
            onValueChange={setHideFull}
            trackColor={{ false: C.raised, true: C.accent }}
            thumbColor={C.text}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>

        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>모집 중인 대결</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : !errorMessage ? (
            <Text style={styles.resultCaption}>{items.length}개 · 시작 시간 순</Text>
          ) : null}
        </View>

        {errorMessage && !isLoading ? (
          <PaceQueryState loading={false} message={errorMessage} onRetry={() => { void reload(); }} />
        ) : null}

        {!isLoading && !errorMessage && items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>조건에 맞는 대결이 없어요</Text>
            <Text style={styles.emptyText}>원하는 시간에 직접 방을 만들어 러너를 모아 보세요.</Text>
            <PaceButton
              label="대결 방 만들기"
              variant="secondary"
              onPress={() => router.push('/race-create')}
              style={styles.emptyButton}
            />
          </View>
        ) : null}

        {items.map((race) => (
          <RaceCard
            key={race.id}
            race={race}
            now={now}
            onPress={() => router.push({ pathname: '/race-detail', params: { raceId: race.id } })}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  eyebrow: { marginTop: 16, color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 2 },
  title: { marginTop: 8, color: C.text, fontSize: 25, fontWeight: '700', letterSpacing: -0.6 },
  description: { marginTop: 6, color: C.muted, fontSize: 12, lineHeight: 18 },
  filterLabel: { marginTop: 22, marginBottom: 8, color: C.text, fontSize: 13, fontWeight: '600' },
  toggleRow: {
    marginTop: 18,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { color: C.muted, fontSize: 13 },
  resultHeader: { marginTop: 20, minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  resultCaption: { color: C.subtle, fontSize: 10 },
  empty: {
    marginTop: 12,
    padding: 20,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: { color: C.text, fontSize: 14, fontWeight: '700' },
  emptyText: { marginTop: 6, color: C.muted, fontSize: 12, lineHeight: 18 },
  emptyButton: { marginTop: 14 },
});
