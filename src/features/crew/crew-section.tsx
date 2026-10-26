import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { InviteCodeForm } from '@/components/invite-code-form';
import { PaceButton } from '@/components/pace-button';
import { PaceQueryState } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { SearchEntry } from '@/components/search-entry';
import { SegmentedControl } from '@/components/segmented-control';
import { PaceColors as C } from '@/constants/pace';
import { getCrewRankings, getMyCrewId, joinCrewByCode } from '@/data/crew-repository';
import { tabScreenStyles as shared } from '@/features/navigation/tab-screen-shell';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { formatKm } from '@/lib/format';

import { formatRegion } from './regions';
import type { CrewPeriod, CrewRankingItem } from './types';

type CrewHome = {
  myCrewId: string | null;
  rankings: Record<CrewPeriod, CrewRankingItem[]>;
};

const PERIOD_OPTIONS = [
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
] as const;

async function loadCrewHome(): Promise<CrewHome> {
  const [myCrewId, week, month] = await Promise.all([
    getMyCrewId(),
    getCrewRankings('week'),
    getCrewRankings('month'),
  ]);
  return { myCrewId, rankings: { week, month } };
}

const EMPTY: CrewHome = { myCrewId: null, rankings: { week: [], month: [] } };

export function CrewSection() {
  const router = useRouter();
  const [period, setPeriod] = useState<CrewPeriod>('week');
  const { data, isLoading, errorMessage, reload } = useFocusQuery(loadCrewHome, EMPTY, '크루 정보를 불러오지 못했어요.');

  const openCrew = (crewId: string) => router.push({ pathname: '/crew-detail', params: { crewId } });

  if (isLoading || errorMessage) return <PaceQueryState loading={isLoading} message={errorMessage} onRetry={() => { void reload(); }} />;

  const rankings = data.rankings[period];
  const myCrew = rankings.find((crew) => crew.isMine);
  const topDistance = Math.max(rankings[0]?.distanceMeters ?? 0, 1);

  return (
    <View>
      {myCrew ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`내 크루 ${myCrew.name}, ${period === 'week' ? '이번 주' : '이번 달'} ${myCrew.rank}위`}
          onPress={() => openCrew(myCrew.id)}
          style={({ pressed }) => [styles.myCrewCard, pressed && styles.pressed]}>
          <View style={styles.myCrewTop}>
            <Text style={styles.myCrewEyebrow}>MY CREW</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
          <Text style={styles.myCrewName}>{myCrew.name}</Text>
          <Text style={styles.myCrewRegion}>{formatRegion(myCrew.region)}</Text>
          <View style={styles.myCrewStats}>
            <View>
              <Text style={styles.myCrewRank}>{myCrew.rank}<Text style={styles.myCrewUnit}>위</Text></Text>
              <Text style={styles.myCrewLabel}>{period === 'week' ? '이번 주 순위' : '이번 달 순위'}</Text>
            </View>
            <View style={styles.myCrewDivider} />
            <View>
              <Text style={styles.myCrewValue}>{formatKm(myCrew.distanceMeters, 1)}<Text style={styles.myCrewUnitSmall}> km</Text></Text>
              <Text style={styles.myCrewLabel}>크루 누적 거리</Text>
            </View>
            <View style={styles.myCrewDivider} />
            <View>
              <Text style={styles.myCrewValue}>{myCrew.memberCount}<Text style={styles.myCrewUnitSmall}> 명</Text></Text>
              <Text style={styles.myCrewLabel}>멤버</Text>
            </View>
          </View>
        </Pressable>
      ) : data.myCrewId === null ? (
        <View style={shared.card}>
          <Text style={shared.cardTitle}>아직 가입한 크루가 없어요</Text>
          <Text style={[shared.muted, styles.cardBody]}>
            우리 동네 크루를 찾아 가입하거나 직접 만들어 보세요. 크루는 하나만 가입할 수 있어요.
          </Text>
          <PaceButton label="크루 만들기" onPress={() => router.push('/crew-create')} style={styles.createButton} />
          <Text style={styles.orLabel}>초대 코드가 있나요?</Text>
          <InviteCodeForm
            label="크루 초대 코드"
            onSubmit={async (code) => {
              const crewId = await joinCrewByCode(code);
              openCrew(crewId);
            }}
          />
        </View>
      ) : null}

      <SearchEntry
        label="크루 이름이나 지역으로 찾기"
        onPress={() => router.push('/crew-search')}
        style={styles.searchEntry}
      />

      <View style={styles.rankingHeader}>
        <Text style={styles.sectionTitle}>크루 랭킹</Text>
        <Text style={styles.sectionCaption}>멤버 누적 거리 합계</Text>
      </View>
      <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />

      <View style={[shared.card, styles.rankingCard]}>
        {rankings.length === 0 ? (
          <View style={styles.emptyRanking}>
            <Text style={shared.cardTitle}>아직 등록된 크루가 없어요</Text>
            <Text style={[shared.muted, styles.cardBody]}>첫 크루를 만들고 함께 달릴 멤버를 초대해 보세요.</Text>
          </View>
        ) : null}
        {rankings.map((crew, index) => (
          <Pressable
            key={crew.id}
            accessibilityRole="button"
            accessibilityLabel={`${crew.rank}위 ${crew.name}, ${formatKm(crew.distanceMeters, 1)}킬로미터`}
            onPress={() => openCrew(crew.id)}
            style={({ pressed }) => [
              styles.rankRow,
              index > 0 && styles.rankRowBorder,
              crew.isMine && styles.rankRowMine,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.rankNumber, crew.rank <= 3 && styles.rankTop]}>{crew.rank}</Text>
            <View style={styles.rankBody}>
              <View style={styles.rankNameRow}>
                <Text style={styles.rankName} numberOfLines={1}>{crew.name}</Text>
                {crew.isMine ? <Text style={styles.mineTag}>내 크루</Text> : null}
              </View>
              <Text style={styles.rankRegion} numberOfLines={1}>{formatRegion(crew.region)}</Text>
              <View style={styles.rankBarTrack}>
                <View style={[styles.rankBarFill, { width: `${(crew.distanceMeters / topDistance) * 100}%` }]} />
              </View>
            </View>
            <View style={styles.rankValue}>
              <Text style={styles.rankKm}>{formatKm(crew.distanceMeters, 1)}</Text>
              <Text style={styles.rankMeta}>{crew.memberCount}명</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyRanking: { paddingVertical: 20 },
  pressed: { opacity: 0.8 },
  myCrewCard: {
    marginTop: 14,
    padding: 20,
    borderRadius: 22,
    backgroundColor: C.accent,
  },
  myCrewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  myCrewEyebrow: { color: C.accentInk, fontSize: 9, fontWeight: '700', letterSpacing: 2, opacity: 0.7 },
  chevron: { color: C.accentInk, fontSize: 24, lineHeight: 24 },
  myCrewName: { marginTop: 6, color: C.accentInk, fontSize: 21, fontWeight: '700', letterSpacing: -0.4 },
  myCrewRegion: { marginTop: 2, color: C.accentInk, fontSize: 11, opacity: 0.7 },
  myCrewStats: { marginTop: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  myCrewRank: { color: C.accentInk, fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  myCrewUnit: { color: C.accentInk, fontSize: 15, fontWeight: '700' },
  myCrewValue: { color: C.accentInk, fontSize: 19, fontWeight: '700' },
  myCrewUnitSmall: { color: C.accentInk, fontSize: 11, fontWeight: '600' },
  myCrewLabel: { marginTop: 2, color: C.accentInk, fontSize: 10, opacity: 0.7 },
  myCrewDivider: { width: 1, height: 30, backgroundColor: C.accentInk, opacity: 0.15 },
  cardBody: { marginTop: 6 },
  createButton: { marginTop: 16 },
  orLabel: { marginTop: 18, marginBottom: 8, color: C.muted, fontSize: 11, fontWeight: '600' },
  searchEntry: { marginTop: 14 },
  rankingHeader: { marginTop: 26, marginBottom: 10, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  sectionCaption: { color: C.subtle, fontSize: 10 },
  rankingCard: { paddingVertical: 6, paddingHorizontal: 0, overflow: 'hidden' },
  rankRow: { minHeight: 64, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 13 },
  rankRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  rankRowMine: { backgroundColor: '#1C2117' },
  rankNumber: { width: 20, color: C.subtle, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  rankTop: { color: C.accent },
  rankBody: { flex: 1, gap: 5 },
  rankRegion: { marginTop: -2, color: C.subtle, fontSize: 10 },
  rankNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankName: { flexShrink: 1, color: C.text, fontSize: 13, fontWeight: '600' },
  mineTag: { color: C.accent, fontSize: 9, fontWeight: '700' },
  rankBarTrack: { height: 4, borderRadius: 2, backgroundColor: C.raised },
  rankBarFill: { height: 4, borderRadius: 2, backgroundColor: C.accent },
  rankValue: { minWidth: 54, alignItems: 'flex-end' },
  rankKm: { color: C.text, fontSize: 14, fontWeight: '700' },
  rankMeta: { marginTop: 2, color: C.subtle, fontSize: 10 },
});
