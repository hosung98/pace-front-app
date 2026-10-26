import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/back-header';
import { PaceQueryState } from '@/components/pace-feedback';
import { PaceColors } from '@/constants/pace';
import { getRaceDetail } from '@/data/race-repository';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { RaceCreateScreen } from './race-create-screen';
import { getRaceStatus } from './race-status';
import type { RaceDetail } from './types';

export function RaceEditScreen() {
  const { raceId } = useLocalSearchParams<{ raceId?: string }>();
  const load = useCallback(async () => {
    if (!raceId) throw new Error('수정할 대결을 선택해 주세요.');
    const race = await getRaceDetail(raceId);
    if (!race.isHost || getRaceStatus(race, Date.now()) !== 'recruiting') {
      throw new Error('모집 중인 대결의 방장만 수정할 수 있어요.');
    }
    return race;
  }, [raceId]);
  const query = useFocusQuery<RaceDetail | null>(load, null, '대결 정보를 불러오지 못했어요. 방장 권한·모집 상태와 연결을 확인해 주세요.');
  if (!query.isLoading && !query.errorMessage && query.data) return <RaceCreateScreen key={query.data.id} race={query.data} />;
  return <SafeAreaView style={styles.screen}><View style={styles.content}>
    <BackHeader /><PaceQueryState loading={query.isLoading} message={query.errorMessage}
      onRetry={() => { void query.reload(); }} />
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PaceColors.background },
  content: { paddingHorizontal: 24 },
});
