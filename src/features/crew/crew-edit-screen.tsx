import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/back-header';
import { PaceQueryState } from '@/components/pace-feedback';
import { PaceColors } from '@/constants/pace';
import { getCrewDetail } from '@/data/crew-repository';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { CrewCreateScreen } from './crew-create-screen';
import type { CrewDetail } from './types';

export function CrewEditScreen() {
  const { crewId } = useLocalSearchParams<{ crewId?: string }>();
  const load = useCallback(async () => {
    if (!crewId) throw new Error('수정할 크루를 선택해 주세요.');
    const crew = await getCrewDetail(crewId, 'week');
    if (crew.membership !== 'leader') throw new Error('크루장만 크루 정보를 수정할 수 있어요.');
    return crew;
  }, [crewId]);
  const query = useFocusQuery<CrewDetail | null>(load, null, '크루 정보를 불러오지 못했어요. 크루장 권한과 연결 상태를 확인해 주세요.');
  if (!query.isLoading && !query.errorMessage && query.data) return <CrewCreateScreen key={query.data.id} crew={query.data} />;
  return <SafeAreaView style={styles.screen}><View style={styles.content}>
    <BackHeader /><PaceQueryState loading={query.isLoading} message={query.errorMessage}
      onRetry={() => { void query.reload(); }} />
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PaceColors.background },
  content: { paddingHorizontal: 24 },
});
