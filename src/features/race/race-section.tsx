import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { InviteCodeForm } from '@/components/invite-code-form';
import { PaceButton } from '@/components/pace-button';
import { PaceLoadingState } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
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

const EMPTY: RaceHome = { mine: [], open: [] };

export function RaceSection() {
  const router = useRouter();
  const now = useNow(30_000);
  const { data, isLoading } = useFocusQuery(loadRaceHome, EMPTY, '대결 목록을 불러오지 못했어요.');

  const openRace = (raceId: string) => router.push({ pathname: '/race-detail', params: { raceId } });

  if (isLoading && data.mine.length === 0 && data.open.length === 0) {
    return <PaceLoadingState label="대결 불러오는 중" />;
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
          시작 시간이 되면 카운트다운 후 러닝이 자동으로 시작돼요. 목표 거리를 가장 빨리 달린 순서로 순위가 정해지고, 마감 전까지 최소 인원이 모이지 않으면 자동으로 취소돼요.
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
      {data.open.length > 0 ? (
        data.open.map((race) => (
          <RaceCard key={race.id} race={race} now={now} onPress={() => openRace(race.id)} />
        ))
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
  sectionHeader: { marginTop: 26, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  sectionCaption: { color: C.subtle, fontSize: 10 },
});
