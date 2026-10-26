import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { PaceConfirmDialog } from '@/components/pace-confirm-dialog';
import { PaceButton } from '@/components/pace-button';
import { PaceErrorDialog, PaceQueryState } from '@/components/pace-feedback';
import { PaceText as Text } from '@/components/pace-text';
import { SegmentedControl } from '@/components/segmented-control';
import { PaceColors as C } from '@/constants/pace';
import {
  cancelCrewJoinRequest,
  getCrewDetail,
  leaveCrew,
  regenerateCrewInviteCode,
  requestToJoinCrew,
  getCrewJoinRequests,
  reviewCrewJoinRequest,
  transferCrewLeadership,
  type CrewJoinRequest,
} from '@/data/crew-repository';
import { formatKm } from '@/lib/format';

import { formatRegion } from './regions';
import { CREW_REJOIN_COOLDOWN_HOURS, type CrewDetail, type CrewPeriod } from './types';

const PERIOD_OPTIONS = [
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
] as const;

type LoadState = { key: string; detail: CrewDetail | null; requests: CrewJoinRequest[]; error?: string };

export function CrewDetailScreen() {
  const router = useRouter();
  const submitting = useRef(false);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; };
  }, []));
  const { crewId } = useLocalSearchParams<{ crewId?: string }>();
  const [period, setPeriod] = useState<CrewPeriod>('week');
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<LoadState | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<CrewJoinRequest | null>(null);

  const key = `${crewId}:${period}:${version}`;

  useFocusEffect(useCallback(() => {
    if (!crewId) return;
    let cancelled = false;
    getCrewDetail(crewId, period)
      .then(async (detail) => {
        const requests = detail.membership === 'leader' ? await getCrewJoinRequests(detail.id) : [];
        if (!cancelled) setState({ key, detail, requests });
      })
      .catch((error: unknown) => {
        console.error('Unable to load the crew detail.', error);
        if (!cancelled) setState({ key, detail: null, requests: [], error: error instanceof Error ? error.message : '크루를 불러오지 못했어요.' });
      });
    return () => {
      cancelled = true;
    };
  }, [crewId, period, key]));

  const runAction = async (action: () => Promise<unknown>, onSuccess?: () => void) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      await action();
      if (onSuccess) {
        if (focused.current) onSuccess();
      } else {
        setVersion((value) => value + 1);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '요청을 처리하지 못했어요.');
    } finally {
      submitting.current = false;
      setBusy(false);
      setConfirmLeave(false);
      setTransferTarget(null);
    }
  };

  const detail = state?.key === key ? state.detail : null;
  const isFirstLoad = Boolean(crewId) && state?.key !== key;

  if (!detail) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <BackHeader backLabel="크루 목록으로 돌아가기" />
          <PaceQueryState loading={isFirstLoad} message={state?.error ?? '크루를 찾을 수 없어요.'}
            onRetry={() => setVersion((value) => value + 1)} />
        </View>
      </SafeAreaView>
    );
  }

  const isMember = detail.membership === 'leader' || detail.membership === 'member';
  const me = detail.members.find((member) => member.isMe);
  const topDistance = Math.max(detail.members[0]?.distanceMeters ?? 0, 1);
  const myShare = me && detail.distanceMeters > 0 ? Math.round((me.distanceMeters / detail.distanceMeters) * 100) : 0;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackHeader backLabel="크루 목록으로 돌아가기" />
        <Text style={styles.eyebrow}>CREW</Text>
        <Text style={styles.title}>{detail.name}</Text>
        {detail.intro ? <Text style={styles.intro}>{detail.intro}</Text> : null}
        <Text style={styles.meta}>
          {formatRegion(detail.region)} · 크루장 {detail.leaderNickname} · 멤버 {detail.memberCount}/{detail.maxMembers}명
        </Text>

        <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} style={styles.segment} />

        <View style={styles.statsRow}>
          <Stat value={detail.rank ? `${detail.rank}위` : '-'} label="크루 순위" highlight />
          <Stat value={formatKm(detail.distanceMeters, 1)} unit="km" label="크루 누적" />
          {isMember ? <Stat value={`${myShare}%`} label="내 기여도" /> : <Stat value={`${detail.memberCount}`} unit="명" label="멤버" />}
        </View>

        {detail.membership === 'leader' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>크루장 관리</Text>
            <PaceButton label="크루 정보 수정" variant="secondary" disabled={busy}
              onPress={() => router.push({ pathname: '/crew-edit', params: { crewId: detail.id } })} />
            <View style={styles.codeRow}>
              <View>
                <Text style={styles.codeLabel}>초대 코드</Text>
                <Text style={styles.code} selectable>{detail.inviteCode}</Text>
              </View>
              <PaceButton
                label="새로 발급"
                variant="secondary"
                loading={busy}
                onPress={() => void runAction(() => regenerateCrewInviteCode(detail.id))}
                style={styles.smallButton}
              />
            </View>
            <Text style={styles.cardCaption}>
              코드를 받은 사람은 바로 가입돼요. 새로 발급하면 이전 코드는 사용할 수 없어요.
            </Text>
            <View style={styles.divider} />
            <Text style={styles.requestText}>
              가입 신청 <Text style={styles.requestCount}>{detail.pendingRequestCount}건</Text> 대기 중
            </Text>
            {state?.requests.map((request) => (
              <View key={request.userId} style={styles.requestRow}>
                <Text style={styles.memberName}>{request.nickname}</Text>
                <PaceButton label="승인" loading={busy} style={styles.smallButton}
                  onPress={() => void runAction(() => reviewCrewJoinRequest(detail.id, request.userId, true))} />
                <PaceButton label="거절" variant="secondary" loading={busy} style={styles.smallButton}
                  onPress={() => void runAction(() => reviewCrewJoinRequest(detail.id, request.userId, false))} />
              </View>
            ))}
            {detail.members.filter((member) => !member.isMe).map((member) => (
              <View key={member.userId} style={styles.requestRow}>
                <Text style={styles.memberName}>{member.nickname}</Text>
                <PaceButton label="크루장 위임" variant="secondary" loading={busy} style={styles.smallButton}
                  onPress={() => setTransferTarget({ userId: member.userId, nickname: member.nickname })} />
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>멤버별 거리</Text>
        <View style={[styles.card, styles.memberCard]}>
          {detail.members.length === 0 ? (
            <Text style={[styles.cardCaption, { padding: 18 }]}>아직 멤버가 없어요.</Text>
          ) : detail.members.map((member, index) => (
            <View key={member.userId} style={[styles.memberRow, index > 0 && styles.memberBorder, member.isMe && styles.memberMine]}>
              <Text style={[styles.memberRank, index < 3 && styles.memberRankTop, member.isMe && styles.mineText]}>{index + 1}</Text>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{member.nickname.slice(0, 1)}</Text>
              </View>
              <View style={styles.memberBody}>
                <View style={styles.memberNameRow}>
                  <Text style={[styles.memberName, member.isMe && styles.mineText]}>{member.nickname}</Text>
                  {member.role === 'leader' ? <Text style={[styles.leaderTag, member.isMe && styles.mineText]}>크루장</Text> : null}
                  {member.isMe ? <Text style={styles.meTag}>나</Text> : null}
                </View>
                <View style={[styles.barTrack, member.isMe && styles.mineTrack]}>
                  <View style={[styles.barFill, member.isMe && styles.mineFill, { width: `${(member.distanceMeters / topDistance) * 100}%` }]} />
                </View>
              </View>
              <View style={styles.memberValue}>
                <Text style={[styles.memberKm, member.isMe && styles.mineText]}>{formatKm(member.distanceMeters, 1)}<Text style={[styles.memberUnit, member.isMe && styles.mineText]}> km</Text></Text>
                <Text style={[styles.memberRuns, member.isMe && styles.mineText]}>{member.runCount}회</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.footnote}>크루 가입 이후에 달린 기록만 합산돼요. 주간은 월요일 00시(KST) 기준이에요.</Text>

        <View style={styles.actions}>
          {detail.membership === 'none' ? (
            <PaceButton
              label="가입 신청하기"
              loading={busy}
              onPress={() => void runAction(() => requestToJoinCrew(detail.id))}
              accessibilityHint="크루장이 승인하면 가입돼요."
            />
          ) : null}
          {detail.membership === 'pending' ? (
            <>
              <Text style={styles.pendingText}>가입 신청을 보냈어요. 크루장의 승인을 기다리는 중이에요.</Text>
              <PaceButton
                label="신청 취소"
                variant="secondary"
                loading={busy}
                onPress={() => void runAction(cancelCrewJoinRequest)}
              />
            </>
          ) : null}
          {isMember && confirmLeave ? (
            <Text style={styles.pendingText}>
              나가면 {CREW_REJOIN_COOLDOWN_HOURS}시간 동안 다른 크루에 들어갈 수 없고, 이번 기간에 달린 거리는 크루 합계에서
              빠져요.
            </Text>
          ) : null}
          {isMember ? (
            <PaceButton
              label={confirmLeave ? '한 번 더 누르면 크루를 나가요' : '크루 나가기'}
              variant="danger"
              loading={busy}
              onPress={() => {
                if (!confirmLeave) {
                  setConfirmLeave(true);
                  return;
                }
                void runAction(() => leaveCrew(detail.id), () => router.replace('/crew'));
              }}
            />
          ) : null}
        </View>
      </ScrollView>
      <PaceErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} title="요청 실패" />
      <PaceConfirmDialog visible={transferTarget !== null} title="크루장을 위임할까요?"
        message={`${transferTarget?.nickname ?? ''}님이 새 크루장이 됩니다. 이후에는 초대 코드와 가입 신청을 관리할 수 없어요.`}
        onCancel={() => setTransferTarget(null)}
        onConfirm={() => { if (transferTarget) void runAction(() => transferCrewLeadership(detail.id, transferTarget.userId)); }} />
    </SafeAreaView>
  );
}

function Stat({ value, unit, label, highlight = false }: Readonly<{ value: string; unit?: string; label: string; highlight?: boolean }>) {
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>
        {value}
        {unit ? <Text style={[styles.statUnit, highlight && styles.statValueHighlight]}> {unit}</Text> : null}
      </Text>
      <Text style={[styles.statLabel, highlight && styles.statLabelHighlight]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  requestRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  missing: { marginTop: 40, color: C.muted, fontSize: 13, textAlign: 'center' },
  previewBadge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: '#20251B' },
  previewLabel: { color: C.accent, fontSize: 9, fontWeight: '600' },
  eyebrow: { marginTop: 16, color: C.accent, fontSize: 9, fontWeight: '600', letterSpacing: 2 },
  title: { marginTop: 8, color: C.text, fontSize: 25, fontWeight: '700', letterSpacing: -0.6 },
  intro: { marginTop: 6, color: C.muted, fontSize: 13, lineHeight: 19 },
  meta: { marginTop: 8, color: C.subtle, fontSize: 11 },
  segment: { marginTop: 20 },
  statsRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 14, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  statHighlight: { backgroundColor: C.accent, borderColor: C.accent },
  statValue: { color: C.text, fontSize: 19, fontWeight: '700' },
  statValueHighlight: { color: C.accentInk },
  statUnit: { color: C.muted, fontSize: 11, fontWeight: '600' },
  statLabel: { marginTop: 4, color: C.subtle, fontSize: 10 },
  statLabelHighlight: { color: C.accentInk, opacity: 0.7 },
  card: { marginTop: 14, padding: 18, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '700' },
  cardCaption: { marginTop: 8, color: C.subtle, fontSize: 11, lineHeight: 16 },
  codeRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' },
  codeLabel: { color: C.subtle, fontSize: 10 },
  code: { marginTop: 3, color: C.accent, fontSize: 22, fontWeight: '700', letterSpacing: 3 },
  smallButton: { minHeight: 40, paddingHorizontal: 14 },
  divider: { marginVertical: 14, height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  requestText: { color: C.text, fontSize: 13 },
  requestCount: { color: C.accent, fontSize: 13, fontWeight: '700' },
  sectionTitle: { marginTop: 26, color: C.text, fontSize: 16, fontWeight: '700' },
  memberCard: { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' },
  memberRow: { minHeight: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 11 },
  memberBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  memberMine: { backgroundColor: C.accent },
  mineText: { color: C.accentInk },
  mineTrack: { backgroundColor: '#A4BD56' },
  mineFill: { backgroundColor: C.accentInk },
  memberRank: { width: 16, color: C.subtle, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  memberRankTop: { color: C.accent },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.raised },
  avatarText: { color: C.text, fontSize: 13, fontWeight: '700' },
  memberBody: { flex: 1, gap: 7 },
  memberNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  memberName: { flexShrink: 1, color: C.text, fontSize: 13, fontWeight: '600' },
  leaderTag: { color: C.accent, fontSize: 9, fontWeight: '700' },
  meTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, overflow: 'hidden', color: C.accentInk, backgroundColor: C.accent, fontSize: 9, fontWeight: '700' },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: C.raised },
  barFill: { height: 4, borderRadius: 2, backgroundColor: C.accent },
  memberValue: { minWidth: 58, alignItems: 'flex-end' },
  memberKm: { color: C.text, fontSize: 14, fontWeight: '700' },
  memberUnit: { color: C.subtle, fontSize: 10 },
  memberRuns: { marginTop: 2, color: C.subtle, fontSize: 10 },
  footnote: { marginTop: 10, color: C.subtle, fontSize: 10, lineHeight: 15 },
  actions: { marginTop: 24, gap: 10 },
  pendingText: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
