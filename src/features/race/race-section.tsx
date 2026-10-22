import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { InviteCodeForm } from '@/components/invite-code-form';
import { PaceButton } from '@/components/pace-button';
import { PaceQueryState } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { SearchEntry } from '@/components/search-entry';
import { PaceColors as C } from '@/constants/pace';
import { joinRaceByCode, listMyRaces, listOpenRaces } from '@/data/race-repository';
import { tabScreenStyles as shared } from '@/features/navigation/tab-screen-shell';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useNow } from '@/hooks/use-now';

import { RaceCard } from './race-card';
import { getRaceStatus } from './race-status';
import type { RaceSummary } from './types';

type RaceHome = { mine: RaceSummary[]; open: RaceSummary[] };

async function loadRaceHome(): Promise<RaceHome> {
  const [mine, open] = await Promise.all([listMyRaces(), listOpenRaces()]);
  return { mine, open };
}

const OPEN_PREVIEW_COUNT = 3;

const EMPTY: RaceHome = { mine: [], open: [] };

export function RaceSection() {
  const router = useRouter();
  const now = useNow(30_000);
  const { data, isLoading, errorMessage, reload } = useFocusQuery(loadRaceHome, EMPTY, '대결 목록을 불러오지 못했어요.');

  const openRace = (raceId: string) => router.push({ pathname: '/race-detail', params: { raceId } });

  if (isLoading || errorMessage) {
    return <PaceQueryState loading={isLoading} message={errorMessage} onRetry={() => { void reload(); }} />;
  }

  const upcoming = data.mine
    .filter((race) => {
      const status = getRaceStatus(race, now);
      return status === 'recruiting' || status === 'confirmed' || status === 'live';
    })
    .sort((a, b) => a.startsAt - b.startsAt);
  const past = data.mine.filter((race) => !upcoming.includes(race)).slice(0, 5);

  return (
    <View>
      <View style={[shared.card, styles.howCard]}>
        <Text style={styles.howTitle}>각자 있는 곳에서, 같은 시간에 출발</Text>
        <Text style={[shared.muted, styles.howBody]}>
          거리와 출발 시간을 정하고 참가자를 모아보세요. 마감 전까지 최소 인원이 모이지 않으면 취소돼요.
          {'\n'}현재 방 생성·참가를 지원하며, 자동 러닝 시작·GPS 결과 등록과 순위 산정은 준비 중이에요.
        </Text>
        <PaceButton label="대결 방 만들기" onPress={() => router.push('/race-create')} style={styles.createButton} />
        <Text style={styles.orLabel}>비공개 방 초대 코드</Text>
        <InviteCodeForm
          label="대결 초대 코드"
          onSubmit={async (code) => {
            const raceId = await joinRaceByCode(code);
            openRace(raceId);
          }}
        />
      </View>

      {upcoming.length > 0 ? (
        <>
          <SectionHeader title="참가 중인 대결" caption={`${upcoming.length}개`} />
          {upcoming.map((race) => (
            <RaceCard key={race.id} race={race} now={now} onPress={() => openRace(race.id)} />
          ))}
        </>
      ) : null}

      <SectionHeader title="참가할 수 있는 대결" caption="공개 방 · 시작 시간 순" />
      <SearchEntry
        label="거리·시간으로 대결 찾기"
        onPress={() => router.push('/race-search')}
        style={styles.searchEntry}
      />
      {data.open.length > 0 ? (
        <>
          {data.open.slice(0, OPEN_PREVIEW_COUNT).map((race) => (
            <RaceCard key={race.id} race={race} now={now} onPress={() => openRace(race.id)} />
          ))}
          {data.open.length > OPEN_PREVIEW_COUNT ? (
            <PaceButton
              label={`모집 중인 대결 ${data.open.length}개 모두 보기`}
              variant="secondary"
              onPress={() => router.push('/race-search')}
              style={styles.moreButton}
            />
          ) : null}
        </>
      ) : (
        <View style={shared.card}>
          <Text style={shared.muted}>지금 모집 중인 공개 대결이 없어요. 직접 방을 만들어 보세요.</Text>
        </View>
      )}

      {past.length > 0 ? (
        <>
          <SectionHeader title="지난 대결" />
          {past.map((race) => (
            <RaceCard key={race.id} race={race} now={now} onPress={() => openRace(race.id)} />
          ))}
        </>
      ) : null}
    </View>
  );
}

function SectionHeader({ title, caption }: Readonly<{ title: string; caption?: string }>) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  howCard: { borderColor: '#2D3624' },
  howTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  howBody: { marginTop: 7 },
  createButton: { marginTop: 16 },
  orLabel: { marginTop: 18, marginBottom: 8, color: C.muted, fontSize: 11, fontWeight: '600' },
  searchEntry: { marginTop: 12 },
  moreButton: { marginTop: 12 },
  sectionHeader: { marginTop: 26, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  sectionCaption: { color: C.subtle, fontSize: 10 },
});
