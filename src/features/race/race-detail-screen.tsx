import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceButton } from '@/components/pace-button';
import { PaceErrorDialog, PaceLoadingState } from '@/components/pace-feedback';
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
import { RACE_TIME_LIMIT_MINUTES_PER_KM, type RaceDetail, type RaceParticipant, type RaceStatus } from './types';

type LoadState = { key: string; race: RaceDetail | null };

function secondsUntil(target: number, now: number): number {
  return Math.max(0, Math.ceil((target - now) / 1000));
}

export function RaceDetailScreen() {
  const { raceId } = useLocalSearchParams<{ raceId?: string }>();
  const now = useNow(1000);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<LoadState | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const key = `${raceId}:${version}`;

  useEffect(() => {
    if (!raceId) return;
    let cancelled = false;
    getRaceDetail(raceId)
      .then((race) => {
        if (!cancelled) setState({ key, race });
      })
      .catch((error: unknown) => {
        console.error('Unable to load the race detail.', error);
        if (!cancelled) setState({ key, race: null });
      });
    return () => {
      cancelled = true;
    };
  }, [raceId, key]);

  const runAction = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      setVersion((value) => value + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '요청을 처리하지 못했어요.');
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  };

  const race = state?.race ?? null;

  if (!race) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <BackHeader backLabel="대결 목록으로 돌아가기" />
          {state === null && raceId ? <PaceLoadingState label="대결 불러오는 중" /> : (
            <Text style={styles.missing}>대결을 찾을 수 없어요.</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const status = getRaceStatus(race, now);
  const canCancel = race.isHost && (status === 'recruiting' || status === 'confirmed');
  const canLeave = race.isJoined && !race.isHost && status === 'recruiting';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackHeader backLabel="대결 목록으로 돌아가기" />
        <View style={styles.badgeRow}>
          <RaceStatusBadge status={status} />
          {race.visibility === 'private' ? <Text style={styles.tag}>비공개</Text> : <Text style={styles.tag}>공개</Text>}
          <Text style={styles.sample}>샘플 데이터</Text>
        </View>
        <Text style={styles.title}>{race.title}</Text>
        <Text style={styles.host}>방장 {race.hostNickname}{race.isHost ? ' (나)' : ''}</Text>

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

        {status === 'finished' ? (
          <Results participants={race.participants} distanceMeters={race.distanceMeters} />
        ) : (
          <Participants participants={race.participants} />
        )}

        <View style={styles.actions}>
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
              ? '대결이 확정됐어요. 출발 10초 전 카운트다운 후 러닝이 자동으로 시작돼요. 앱을 열어 두세요.'
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
              ? '다른 참가자의 위치는 보이지 않아요. 목표 거리를 완주하면 기록이 자동 제출돼요.'
              : '참가자들이 각자의 장소에서 달리고 있어요. 종료 후 순위가 공개돼요.'}
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
            {race.participantCount < race.minParticipants
              ? `모집 마감까지 최소 인원(${race.minParticipants}명)이 모이지 않아 자동으로 취소됐어요.`
              : '방장이 대결을 취소했어요.'}
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

function Results({ participants, distanceMeters }: Readonly<{ participants: RaceParticipant[]; distanceMeters: number }>) {
  const sorted = [...participants].sort((a, b) => (a.result?.rank ?? Infinity) - (b.result?.rank ?? Infinity));
  const winner = sorted[0];

  return (
    <>
      <Text style={styles.sectionTitle}>최종 순위</Text>
      {winner?.result?.finishSeconds ? (
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
                    : `미완주 · ${((result?.distanceMeters ?? 0) / 1000).toFixed(2)}km`}
                </Text>
              </View>
              <Text style={[styles.resultTime, !finished && styles.dnf]}>
                {finished ? formatDuration(result.finishSeconds!) : 'DNF'}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.footnote}>목표 거리에 도달한 시점까지 걸린 시간으로 순위를 매겨요.</Text>
    </>
  );
}

const styles = StyleSheet.create({
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
  personName: { color: C.text, fontSize: 13, fontWeight: '600' },
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
