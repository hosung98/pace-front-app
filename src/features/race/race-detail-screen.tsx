import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceButton } from '@/components/pace-button';
import { PaceErrorDialog, PaceQueryState } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { cancelRace, getRaceDetail, joinRace, leaveRace } from '@/data/race-repository';
import { useNow } from '@/hooks/use-now';
import { formatDuration, formatPace } from '@/lib/format';

import { RaceStatusBadge } from './race-card';
import {
  canJoinRace,
  formatRaceDistance,
  formatRaceStart,
  getJoinDeadline,
  getRaceEndsAt,
  getRaceStatus,
} from './race-status';
import {
  RACE_TIME_LIMIT_MINUTES_PER_KM,
  type RaceDetail,
  type RaceParticipant,
  type RaceResultStatus,
  type RaceStatus,
} from './types';

type LoadState = { key: string; race: RaceDetail | null; error?: string };

function secondsUntil(target: number, now: number): number {
  return Math.max(0, Math.ceil((target - now) / 1000));
}

export function RaceDetailScreen() {
  const router = useRouter();
  const { raceId } = useLocalSearchParams<{ raceId?: string }>();
  const submitting = useRef(false);
  const now = useNow(1000);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<LoadState | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const key = `${raceId}:${version}`;

  useFocusEffect(useCallback(() => {
    if (!raceId) return;
    let cancelled = false;
    getRaceDetail(raceId)
      .then((race) => {
        if (!cancelled) setState({ key, race });
      })
      .catch((error: unknown) => {
        console.error('Unable to load the race detail.', error);
        if (!cancelled) setState({ key, race: null, error: error instanceof Error ? error.message : '대결을 불러오지 못했어요.' });
      });
    return () => {
      cancelled = true;
    };
  }, [raceId, key]));

  const runAction = async (action: () => Promise<unknown>) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      await action();
      setVersion((value) => value + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '요청을 처리하지 못했어요.');
    } finally {
      submitting.current = false;
      setBusy(false);
      setConfirmCancel(false);
    }
  };

  const race = state?.key === key ? state.race : null;

  if (!race) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <BackHeader backLabel="대결 목록으로 돌아가기" />
          <PaceQueryState loading={Boolean(raceId) && state?.key !== key} message={state?.error ?? '대결을 찾을 수 없어요.'}
            onRetry={() => setVersion((value) => value + 1)} />
        </View>
      </SafeAreaView>
    );
  }

  const status = getRaceStatus(race, now);
  const canCancel = race.isHost && (status === 'recruiting' || status === 'confirmed');
  const canLeave = race.isJoined && !race.isHost && status === 'recruiting';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}><BackHeader backLabel="대결 목록으로 돌아가기" />
        <View style={styles.badgeRow}>
          <RaceStatusBadge status={status} />
          {race.visibility === 'private' ? <Text style={styles.tag}>비공개</Text> : <Text style={styles.tag}>공개</Text>}
        </View>
        <Text style={styles.title}>{race.title}</Text>
        <Text style={styles.host}>방장 {race.hostNickname}{race.isHost ? ' (나)' : ''}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Hero race={race} status={status} now={now} />

        <View style={styles.infoCard}>
          <InfoRow label="거리" value={formatRaceDistance(race.distanceMeters)} />
          <InfoRow label="출발" value={formatRaceStart(race.startsAt, now)} />
          <InfoRow label="모집 마감" value={`${formatRaceStart(getJoinDeadline(race), now)} (${race.joinDeadlineMinutes}분 전)`} />
          <InfoRow label="인원" value={`${race.participantCount}명 참가 · 최소 ${race.minParticipants} / 최대 ${race.maxParticipants}명`} />
          <InfoRow
            label="제한 시간"
            value={`${Math.ceil((race.distanceMeters / 1000) * RACE_TIME_LIMIT_MINUTES_PER_KM)}분 (km당 ${RACE_TIME_LIMIT_MINUTES_PER_KM}분)`}
            last
          />
        </View>

        {race.inviteCode && status === 'recruiting' ? (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>초대 코드</Text>
            <Text style={styles.code} selectable>{race.inviteCode}</Text>
            <Text style={styles.codeCaption}>비공개 방이에요. 이 코드를 공유해 친구를 초대하세요.</Text>
          </View>
        ) : null}

        {status === 'finished' && race.participants.some((participant) => participant.result) ? (
          <Results participants={race.participants} distanceMeters={race.distanceMeters} />
        ) : (
          <Participants participants={race.participants} />
        )}
        <Text style={styles.host}>현재 방 생성·참가를 지원합니다. 자동 출발·GPS 결과 등록·순위 산정은 준비 중이에요.</Text>

        <View style={styles.actions}>
          {race.isHost && status === 'recruiting' ? <PaceButton label="대결 정보 수정" variant="secondary" disabled={busy}
            onPress={() => router.push({ pathname: '/race-edit', params: { raceId: race.id } })} /> : null}
          {canJoinRace(race, now) ? (
            <PaceButton label="참가하기" loading={busy} onPress={() => void runAction(() => joinRace(race.id))} />
          ) : null}
          {canLeave ? (
            <PaceButton label="참가 취소" variant="secondary" loading={busy} onPress={() => void runAction(() => leaveRace(race.id))} />
          ) : null}
          {canCancel ? (
            <PaceButton
              label={confirmCancel ? '한 번 더 누르면 대결이 취소돼요' : '대결 취소 (방장)'}
              variant="danger"
              loading={busy}
              onPress={() => {
                if (!confirmCancel) {
                  setConfirmCancel(true);
                  return;
                }
                void runAction(() => cancelRace(race.id));
              }}
            />
          ) : null}
        </View>
      </ScrollView>
      <PaceErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} title="요청 실패" />
    </SafeAreaView>
  );
}

function Hero({ race, status, now }: Readonly<{ race: RaceDetail; status: RaceStatus; now: number }>) {
  switch (status) {
    case 'recruiting': {
      const missing = Math.max(0, race.minParticipants - race.participantCount);
      const ratio = Math.min(1, race.participantCount / race.minParticipants);
      return (
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>모집 마감까지</Text>
          <Text style={styles.heroTime}>{formatDuration(secondsUntil(getJoinDeadline(race), now))}</Text>
          <View style={styles.heroTrack}>
            <View style={[styles.heroFill, { width: `${ratio * 100}%` }]} />
          </View>
          <Text style={styles.heroCaption}>
            {missing > 0
              ? `${missing}명 더 모이면 대결이 확정돼요. 마감 때까지 안 모이면 자동 취소돼요.`
              : '최소 인원이 모였어요! 마감 후 대결이 확정돼요.'}
          </Text>
        </View>
      );
    }
    case 'confirmed': {
      const seconds = secondsUntil(race.startsAt, now);
      const finalCount = seconds <= 10;
      return (
        <View style={[styles.hero, styles.heroConfirmed]}>
          <Text style={styles.heroLabel}>{finalCount ? '곧 출발!' : '출발까지'}</Text>
          <Text style={[styles.heroTime, finalCount && styles.heroFinalCount]}>
            {finalCount ? seconds : formatDuration(seconds)}
          </Text>
          <Text style={styles.heroCaption}>
            {race.isJoined
              ? '출발 예정 시간이에요. 현재 자동 러닝 시작과 대결 기록 제출은 지원하지 않아요.'
              : '대결이 확정되어 더 이상 참가할 수 없어요.'}
          </Text>
        </View>
      );
    }
    case 'live':
      return (
        <View style={[styles.hero, styles.heroLive]}>
          <Text style={styles.heroLabel}>대결 진행 중 · 종료까지</Text>
          <Text style={styles.heroTime}>{formatDuration(secondsUntil(getRaceEndsAt(race), now))}</Text>
          <Text style={styles.heroCaption}>
            {race.isJoined
              ? '출발 시간이 됐어요. 현재 GPS 결과 자동 제출은 지원하지 않아요.'
              : '예정된 대결 시간이에요. 실시간 위치와 결과 순위는 제공하지 않아요.'}
          </Text>
        </View>
      );
    case 'finished':
      return null;
    case 'cancelled':
      return (
        <View style={[styles.hero, styles.heroCancelled]}>
          <Text style={styles.heroCancelledTitle}>대결이 취소됐어요</Text>
          <Text style={styles.heroCaption}>
            취소된 대결이에요. 다른 방을 찾거나 새로 만들어 보세요.
          </Text>
        </View>
      );
  }
}

function InfoRow({ label, value, last = false }: Readonly<{ label: string; value: string; last?: boolean }>) {
  return (
    <View style={[styles.infoRow, !last && styles.infoBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Avatar({ nickname }: Readonly<{ nickname: string }>) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{nickname.slice(0, 1)}</Text>
    </View>
  );
}

function Participants({ participants }: Readonly<{ participants: RaceParticipant[] }>) {
  return (
    <>
      <Text style={styles.sectionTitle}>참가자 {participants.length}명</Text>
      <View style={styles.listCard}>
        {participants.map((participant, index) => (
          <View key={participant.userId} style={[styles.personRow, index > 0 && styles.infoBorder]}>
            <Avatar nickname={participant.nickname} />
            <Text style={styles.personName}>{participant.nickname}</Text>
            {participant.isHost ? <Text style={styles.hostTag}>방장</Text> : null}
            {participant.isMe ? <Text style={styles.meTag}>나</Text> : null}
          </View>
        ))}
      </View>
    </>
  );
}

const RESULT_ORDER: Record<RaceResultStatus, number> = {
  finished: 0,
  did_not_finish: 1,
  did_not_start: 2,
  disqualified: 3,
};

const RESULT_BADGES: Record<Exclude<RaceResultStatus, 'finished'>, string> = {
  did_not_finish: 'DNF',
  did_not_start: 'DNS',
  disqualified: '실격',
};

function unfinishedStatus(status: RaceResultStatus | undefined): Exclude<RaceResultStatus, 'finished'> {
  return !status || status === 'finished' ? 'did_not_start' : status;
}

function resultMeta(status: RaceResultStatus, distanceMeters: number): string {
  if (status === 'did_not_start') return '불참 · 출발하지 않았어요';
  if (status === 'disqualified') return '실격 · 기록 확인 필요';
  return `미완주 · ${(distanceMeters / 1000).toFixed(2)}km`;
}

function compareResults(a: RaceParticipant, b: RaceParticipant): number {
  const statusA = a.result?.status ?? 'did_not_start';
  const statusB = b.result?.status ?? 'did_not_start';
  if (statusA !== statusB) return RESULT_ORDER[statusA] - RESULT_ORDER[statusB];
  if (statusA === 'finished') return (a.result?.rank ?? Infinity) - (b.result?.rank ?? Infinity);
  return (b.result?.distanceMeters ?? 0) - (a.result?.distanceMeters ?? 0);
}

function Results({ participants, distanceMeters }: Readonly<{ participants: RaceParticipant[]; distanceMeters: number }>) {
  const sorted = participants.filter((participant) => participant.result !== null).sort(compareResults);
  const winner = sorted[0];

  return (
    <>
      <Text style={styles.sectionTitle}>등록된 결과</Text>
      {winner?.result?.rank === 1 && winner.result.finishSeconds !== null ? (
        <View style={styles.winnerCard}>
          <Text style={styles.winnerLabel}>🏆 1위</Text>
          <Text style={styles.winnerName}>{winner.nickname}{winner.isMe ? ' (나)' : ''}</Text>
          <Text style={styles.winnerTime}>{formatDuration(winner.result.finishSeconds)}</Text>
        </View>
      ) : null}
      <View style={styles.listCard}>
        {sorted.map((participant, index) => {
          const result = participant.result;
          const finished = result?.status === 'finished' && result.finishSeconds !== null;
          return (
            <View key={participant.userId} style={[styles.personRow, index > 0 && styles.infoBorder, participant.isMe && styles.mineRow]}>
              <Text style={[styles.rank, result?.rank === 1 && styles.rankFirst]}>{finished ? result.rank : '-'}</Text>
              <Avatar nickname={participant.nickname} />
              <View style={styles.resultBody}>
                <Text style={styles.personName}>
                  {participant.nickname}
                  {participant.isMe ? <Text style={styles.meInline}>  나</Text> : null}
                </Text>
                <Text style={styles.resultMeta}>
                  {finished
                    ? `페이스 ${formatPace(result.finishSeconds! / (distanceMeters / 1000))}`
                    : resultMeta(result?.status ?? 'did_not_start', result?.distanceMeters ?? 0)}
                </Text>
              </View>
              <Text style={[styles.resultTime, !finished && styles.dnf]}>
                {finished ? formatDuration(result.finishSeconds!) : RESULT_BADGES[unfinishedStatus(result?.status)]}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.footnote}>
        서버에서 확인된 결과만 표시합니다. 아직 결과가 없는 참가자는 순위에 포함하지 않아요.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  missing: { marginTop: 40, color: C.muted, fontSize: 13, textAlign: 'center' },
  badgeRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { color: C.muted, fontSize: 10, fontWeight: '600' },
  sample: { marginLeft: 'auto', color: C.subtle, fontSize: 9 },
  title: { marginTop: 12, color: C.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.6 },
  host: { marginTop: 5, color: C.muted, fontSize: 12 },
  hero: { marginTop: 18, padding: 20, borderRadius: 22, backgroundColor: '#1C2117', borderWidth: 1, borderColor: '#2D3624' },
  heroConfirmed: { backgroundColor: '#161D27', borderColor: '#24344A' },
  heroLive: { backgroundColor: '#251E12', borderColor: '#4A3A1C' },
  heroCancelled: { backgroundColor: '#2A1C1C', borderColor: '#4A2B2B' },
  heroLabel: { color: C.muted, fontSize: 11, fontWeight: '600' },
  heroTime: { marginTop: 4, color: C.text, fontSize: 42, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  heroFinalCount: { color: C.accent, fontSize: 64 },
  heroTrack: { marginTop: 12, height: 6, borderRadius: 3, backgroundColor: C.raised },
  heroFill: { height: 6, borderRadius: 3, backgroundColor: C.accent },
  heroCaption: { marginTop: 11, color: C.muted, fontSize: 12, lineHeight: 18 },
  heroCancelledTitle: { color: '#FF8A80', fontSize: 17, fontWeight: '700' },
  infoCard: { marginTop: 14, paddingHorizontal: 18, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  infoRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  infoBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  infoLabel: { color: C.subtle, fontSize: 12 },
  infoValue: { flexShrink: 1, color: C.text, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  codeCard: { marginTop: 14, padding: 18, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  codeLabel: { color: C.subtle, fontSize: 10 },
  code: { marginTop: 4, color: C.accent, fontSize: 26, fontWeight: '700', letterSpacing: 4 },
  codeCaption: { marginTop: 6, color: C.subtle, fontSize: 11 },
  sectionTitle: { marginTop: 26, marginBottom: 2, color: C.text, fontSize: 16, fontWeight: '700' },
  listCard: { marginTop: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  personRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11 },
  mineRow: { marginHorizontal: -16, paddingHorizontal: 16, backgroundColor: '#1C2117' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.raised },
  avatarText: { color: C.text, fontSize: 13, fontWeight: '700' },
  personName: { flexShrink: 1, color: C.text, fontSize: 13, fontWeight: '600' },
  hostTag: { color: C.accent, fontSize: 9, fontWeight: '700' },
  meTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, overflow: 'hidden', color: C.accentInk, backgroundColor: C.accent, fontSize: 9, fontWeight: '700' },
  meInline: { color: C.accent, fontSize: 10, fontWeight: '700' },
  rank: { width: 18, color: C.subtle, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  rankFirst: { color: C.accent },
  resultBody: { flex: 1 },
  resultMeta: { marginTop: 2, color: C.subtle, fontSize: 10 },
  resultTime: { color: C.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dnf: { color: C.subtle },
  winnerCard: { marginTop: 10, padding: 18, borderRadius: 20, backgroundColor: C.accent },
  winnerLabel: { color: C.accentInk, fontSize: 11, fontWeight: '700' },
  winnerName: { marginTop: 4, color: C.accentInk, fontSize: 19, fontWeight: '700' },
  winnerTime: { marginTop: 2, color: C.accentInk, fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  footnote: { marginTop: 10, color: C.subtle, fontSize: 10, lineHeight: 15 },
  actions: { marginTop: 24, gap: 10 },
});
