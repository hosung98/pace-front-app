import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceButton } from '@/components/pace-button';
import { PaceErrorDialog } from '@/components/pace-feedback';
import { PaceIcon } from '@/components/pace-icon';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { searchCrews } from '@/data/crew-repository';
import { formatKm } from '@/lib/format';

import { LocateRegionButton, RegionPicker, type RegionSelection } from './region-picker';
import { formatRegion } from './regions';
import type { CrewSearchItem } from './types';

const QUERY_DEBOUNCE_MS = 300;

type SearchResult = { key: string; items: CrewSearchItem[] } | { key: string; error: string };

export function CrewSearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [region, setRegion] = useState<RegionSelection>({ sido: null, sigungu: null });
  const [result, setResult] = useState<SearchResult | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), QUERY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const searchKey = JSON.stringify([debouncedQuery, region.sido, region.sigungu]);

  useEffect(() => {
    let active = true;
    searchCrews({ query: debouncedQuery, sido: region.sido, sigungu: region.sigungu })
      .then((items) => {
        if (active) setResult({ key: searchKey, items });
      })
      .catch((error: unknown) => {
        console.error('크루 검색 실패', error);
        if (active) setResult({ key: searchKey, error: '크루를 찾지 못했어요. 잠시 후 다시 시도해 주세요.' });
      });
    return () => {
      active = false;
    };
  }, [debouncedQuery, region.sido, region.sigungu, searchKey]);

  const isLoading = result?.key !== searchKey;
  const items = result && 'items' in result ? result.items : [];
  const hasFilter = debouncedQuery.length > 0 || region.sido !== null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BackHeader backLabel="크루 화면으로 돌아가기" />
        <Text style={styles.eyebrow}>FIND CREW</Text>
        <Text style={styles.title}>크루 찾기</Text>

        <View style={styles.searchBox}>
          <PaceIcon name="search" color={C.subtle} size={18} />
          <TextInput
            accessibilityLabel="크루 이름 검색"
            value={query}
            onChangeText={setQuery}
            placeholder="크루 이름이나 소개로 검색"
            placeholderTextColor={C.subtle}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" hitSlop={10} onPress={() => setQuery('')}>
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterHeader}>
          <Text style={styles.filterLabel}>활동 지역</Text>
          <LocateRegionButton onLocated={setRegion} onError={setLocationError} />
        </View>
        <RegionPicker value={region} onChange={setRegion} allSidoLabel="전국" />

        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>
            {region.sido ? formatRegion({ sido: region.sido, sigungu: region.sigungu }) : '전국'} 크루
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Text style={styles.resultCaption}>{items.length}개 · 이번 주 거리 순</Text>
          )}
        </View>

        {result && 'error' in result && !isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{result.error}</Text>
          </View>
        ) : null}

        {!isLoading && result && 'items' in result && items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{hasFilter ? '조건에 맞는 크루가 없어요' : '아직 크루가 없어요'}</Text>
            <Text style={styles.emptyText}>원하는 크루가 없다면 직접 만들어 보세요.</Text>
            <PaceButton
              label="크루 만들기"
              variant="secondary"
              onPress={() => router.push('/crew-create')}
              style={styles.emptyButton}
            />
          </View>
        ) : null}

        {items.map((crew) => (
          <CrewResultCard
            key={crew.id}
            crew={crew}
            onPress={() => router.push({ pathname: '/crew-detail', params: { crewId: crew.id } })}
          />
        ))}
      </ScrollView>
      <PaceErrorDialog message={locationError} onClose={() => setLocationError(null)} title="지역을 찾지 못했어요" />
    </SafeAreaView>
  );
}

function CrewResultCard({ crew, onPress }: Readonly<{ crew: CrewSearchItem; onPress: () => void }>) {
  const isFull = crew.memberCount >= crew.maxMembers;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${crew.name}, ${formatRegion(crew.region)}, 멤버 ${crew.memberCount}명, 이번 주 ${formatKm(crew.weekDistanceMeters, 1)}킬로미터`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, crew.isMine && styles.cardMine, pressed && styles.pressed]}>
      <View style={styles.cardTop}>
        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{crew.name}</Text>
            {crew.isMine ? <Text style={styles.mineTag}>내 크루</Text> : null}
            {isFull && !crew.isMine ? <Text style={styles.fullTag}>정원 마감</Text> : null}
          </View>
          <Text style={styles.meta}>
            {formatRegion(crew.region)} · 멤버 {crew.memberCount}/{crew.maxMembers}명
          </Text>
        </View>
        <View style={styles.distance}>
          <Text style={styles.km}>{formatKm(crew.weekDistanceMeters, 1)}</Text>
          <Text style={styles.kmLabel}>이번 주 km</Text>
        </View>
      </View>
      {crew.intro ? <Text style={styles.intro} numberOfLines={2}>{crew.intro}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  eyebrow: { marginTop: 16, color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 2 },
  title: { marginTop: 8, color: C.text, fontSize: 25, fontWeight: '700', letterSpacing: -0.6 },
  searchBox: {
    marginTop: 18,
    minHeight: 50,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 15,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, paddingVertical: 13, color: C.text, fontFamily: 'Pretendard-Regular', fontSize: 15 },
  clear: { color: C.subtle, fontSize: 13 },
  filterHeader: { marginTop: 20, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterLabel: { color: C.text, fontSize: 13, fontWeight: '600' },
  resultHeader: { marginTop: 24, minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  card: {
    marginTop: 12,
    padding: 17,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardMine: { borderColor: C.accent },
  pressed: { opacity: 0.8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardBody: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, color: C.text, fontSize: 15, fontWeight: '700' },
  mineTag: { color: C.accent, fontSize: 10, fontWeight: '700' },
  fullTag: { color: C.muted, fontSize: 10, fontWeight: '600' },
  meta: { marginTop: 4, color: C.subtle, fontSize: 11 },
  distance: { alignItems: 'flex-end' },
  km: { color: C.text, fontSize: 17, fontWeight: '700' },
  kmLabel: { marginTop: 2, color: C.subtle, fontSize: 9 },
  intro: { marginTop: 10, color: C.muted, fontSize: 12, lineHeight: 18 },
});
