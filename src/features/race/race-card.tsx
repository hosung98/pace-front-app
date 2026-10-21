import { Pressable, StyleSheet, View } from 'react-native';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

import {
  formatRaceDistance,
  formatRaceStart,
  formatTimeUntil,
  getJoinDeadline,
  getRaceStatus,
  RACE_STATUS_LABELS,
} from './race-status';
import type { RaceStatus, RaceSummary } from './types';

const STATUS_COLORS: Record<RaceStatus, { background: string; text: string }> = {
  recruiting: { background: '#20251B', text: C.accent },
  confirmed: { background: '#1B2330', text: '#8EC5FF' },
  live: { background: '#2E2414', text: '#FFC266' },
  finished: { background: C.raised, text: C.muted },
  cancelled: { background: '#2A1C1C', text: '#FF8A80' },
};

export function RaceStatusBadge({ status }: Readonly<{ status: RaceStatus }>) {
  const color = STATUS_COLORS[status];
  return (
    <View style={[styles.badge, { backgroundColor: color.background }]}>
      {status === 'live' ? <View style={[styles.liveDot, { backgroundColor: color.text }]} /> : null}
      <Text style={[styles.badgeText, { color: color.text }]}>{RACE_STATUS_LABELS[status]}</Text>
    </View>
  );
}

function statusCaption(race: RaceSummary, status: RaceStatus, now: number): string {
  switch (status) {
    case 'recruiting': {
      const missing = race.minParticipants - race.participantCount;
      const deadline = `마감까지 ${formatTimeUntil(getJoinDeadline(race), now)}`;
      return missing > 0 ? `${deadline} · ${missing}명 더 필요` : `${deadline} · 인원 충족`;
    }
    case 'confirmed':
      return `시작까지 ${formatTimeUntil(race.startsAt, now)}`;
    case 'live':
      return '지금 달리는 중';
    case 'finished':
      return '결과 확인하기';
    case 'cancelled':
      return race.participantCount < race.minParticipants ? '최소 인원 미달로 취소' : '방장이 취소함';
  }
}

export function RaceCard({
  race,
  now,
  onPress,
}: Readonly<{ race: RaceSummary; now: number; onPress: () => void }>) {
  const status = getRaceStatus(race, now);
  const fillRatio = Math.min(1, race.participantCount / race.maxParticipants);
  const minRatio = race.minParticipants / race.maxParticipants;
  const dimmed = status === 'cancelled' || status === 'finished';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${race.title}, ${formatRaceDistance(race.distanceMeters)}, ${formatRaceStart(race.startsAt, now)}, ${RACE_STATUS_LABELS[status]}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, dimmed && styles.dimmed, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={styles.distancePill}>
          <Text style={styles.distanceText}>{formatRaceDistance(race.distanceMeters)}</Text>
        </View>
        <View style={styles.badges}>
          {race.visibility === 'private' ? <Text style={styles.lock}>비공개</Text> : null}
          {race.isHost ? <Text style={styles.host}>방장</Text> : null}
          <RaceStatusBadge status={status} />
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>{race.title}</Text>
      <Text style={styles.start}>{formatRaceStart(race.startsAt, now)} 시작</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${fillRatio * 100}%` }]} />
        <View style={[styles.minMarker, { left: `${minRatio * 100}%` }]} />
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.count}>
          <Text style={styles.countStrong}>{race.participantCount}</Text>
          {` / ${race.maxParticipants}명 · 최소 ${race.minParticipants}명`}
        </Text>
        <Text style={styles.caption}>{statusCaption(race, status, now)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 17,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  dimmed: { opacity: 0.7 },
  pressed: { opacity: 0.8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  distancePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: C.accent },
  distanceText: { color: C.accentInk, fontSize: 12, fontWeight: '700' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lock: { color: C.muted, fontSize: 10, fontWeight: '600' },
  host: { color: C.accent, fontSize: 10, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  title: { marginTop: 13, color: C.text, fontSize: 16, fontWeight: '700' },
  start: { marginTop: 4, color: C.muted, fontSize: 12 },
  progressTrack: { marginTop: 15, height: 6, borderRadius: 3, backgroundColor: C.raised, overflow: 'visible' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: C.accent },
  minMarker: { position: 'absolute', top: -3, width: 2, height: 12, marginLeft: -1, borderRadius: 1, backgroundColor: C.text },
  bottomRow: { marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  count: { color: C.subtle, fontSize: 11 },
  countStrong: { color: C.text, fontSize: 11, fontWeight: '700' },
  caption: { flexShrink: 1, color: C.muted, fontSize: 11, textAlign: 'right' },
});
