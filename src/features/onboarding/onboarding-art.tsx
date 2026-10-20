import { StyleSheet, View } from 'react-native';

import { PaceMark } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

type Point = readonly [number, number];

const route: readonly Point[] = [
  [87, 186], [65, 156], [78, 116], [115, 99], [141, 58],
  [190, 68], [207, 103], [247, 128], [229, 168], [189, 183],
  [166, 222], [121, 210], [108, 184],
];

function RouteLine() {
  return (
    <View style={StyleSheet.absoluteFill}>
      {route.slice(0, -1).map(([x, y], index) => {
        const [nextX, nextY] = route[index + 1];
        const length = Math.hypot(nextX - x, nextY - y);
        return (
          <View
            key={index}
            style={{
              position: 'absolute', left: (x + nextX) / 2 - length / 2,
              top: (y + nextY) / 2 - 2, width: length, height: 4,
              borderRadius: 2, backgroundColor: C.accent,
              transform: [{ rotate: `${Math.atan2(nextY - y, nextX - x)}rad` }],
            }}
          />
        );
      })}
      <View style={[styles.routePoint, { left: 81, top: 180 }]} />
      <View style={[styles.routePoint, styles.routeEnd, { left: 101, top: 177 }]} />
    </View>
  );
}

function MapArt() {
  return (
    <>
      <View style={styles.mapCard}>
        <View style={styles.mapGrid}>
          {Array.from({ length: 8 }, (_, index) => (
            <View key={`v${index}`} style={[styles.road, { left: index * 48, top: -60, height: 440, width: 1 }]} />
          ))}
          {Array.from({ length: 9 }, (_, index) => (
            <View key={`h${index}`} style={[styles.road, { top: index * 43, left: -50, width: 420, height: 1 }]} />
          ))}
          <View style={styles.park} />
          <View style={[styles.park, styles.parkSmall]} />
          <View style={styles.river} />
        </View>
        <Text allowFontScaling={false} style={styles.mapPlace}>SEOUL FOREST</Text>
        <RouteLine />
        <View style={styles.mapLabel}>
          <View style={styles.liveDot} />
          <Text allowFontScaling={false} style={styles.smallLabel}>오늘의 러닝</Text>
          <Text allowFontScaling={false} style={styles.mapTime}>06:32 AM</Text>
        </View>
        <View style={styles.distanceBubble}>
          <Text allowFontScaling={false} style={styles.bubbleText}>나만의 길을 만드는 중</Text>
        </View>
      </View>
      <View style={styles.runSummary}>
        <View style={styles.summaryTop}>
          <Text allowFontScaling={false} style={styles.eyebrow}>MORNING RUN</Text>
          <Text allowFontScaling={false} style={styles.limeText}>↗</Text>
        </View>
        <View style={styles.metrics}>
          <View style={styles.distanceMetric}>
            <Text allowFontScaling={false} style={styles.distance}>5.24<Text style={styles.unit}> km</Text></Text>
            <Text allowFontScaling={false} style={styles.metricLabel}>달린 거리</Text>
          </View>
          <View style={styles.metric}>
            <Text allowFontScaling={false} style={styles.metricValue}>6&apos;12&quot;</Text>
            <Text allowFontScaling={false} style={styles.metricLabel}>평균 페이스</Text>
          </View>
          <View style={styles.metric}>
            <Text allowFontScaling={false} style={styles.metricValue}>32:29</Text>
            <Text allowFontScaling={false} style={styles.metricLabel}>러닝 시간</Text>
          </View>
        </View>
      </View>
      <View style={styles.floatingLabel}>
        <View style={styles.liveDot} />
        <Text allowFontScaling={false} style={styles.floatingText}>모든 발걸음이 기록이 되니까</Text>
      </View>
    </>
  );
}

function GrowthArt() {
  return (
    <>
      <View style={styles.growthCard}>
        <View style={styles.summaryTop}>
          <Text allowFontScaling={false} style={styles.smallLabel}>조금씩, 더 멀리</Text>
          <Text allowFontScaling={false} style={styles.metricLabel}>이번 주</Text>
        </View>
        <Text allowFontScaling={false} style={styles.weekDistance}>24.8<Text style={styles.unit}> km</Text></Text>
        <View style={styles.growthPill}>
          <Text allowFontScaling={false} style={styles.growthPillText}>↗ 지난주보다 18% 더 달렸어요</Text>
        </View>
        <View style={styles.chart}>
          <View style={styles.chartGrid} />
          <View style={[styles.chartGrid, { top: 48 }]} />
          <View style={[styles.chartGrid, { top: 96 }]} />
          {[['월', 48], ['화', 82], ['수', 60], ['목', 110], ['금', 74], ['토', 136], ['일', 18]].map(([day, height], index) => (
            <View key={day} style={styles.barColumn}>
              <View style={[styles.bar, { height: Number(height) }, index === 5 && styles.activeBar]} />
              <Text allowFontScaling={false} style={[styles.day, index === 5 && styles.activeDay]}>{day}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.goalCard}>
        <View style={styles.goalIcon}><Text allowFontScaling={false} style={styles.goalStar}>✳</Text></View>
        <View style={styles.goalCopy}>
          <Text allowFontScaling={false} style={styles.smallLabel}>어제보다 한 걸음 더</Text>
          <Text allowFontScaling={false} style={styles.goalDetail}>이번 달 목표까지 80%</Text>
          <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
        </View>
        <Text allowFontScaling={false} style={styles.limeText}>80<Text style={styles.percent}>%</Text></Text>
      </View>
      <View style={[styles.floatingLabel, styles.personalBest]}>
        <Text allowFontScaling={false} style={styles.floatingText}>↗  나의 새로운 가능성</Text>
      </View>
    </>
  );
}

function CommunityArt() {
  return (
    <>
      <View style={styles.communityOrbit} />
      <View style={[styles.communityOrbit, styles.communityOrbitInner]} />
      <View style={styles.crewCard}>
        <View style={styles.summaryTop}>
          <Text allowFontScaling={false} style={styles.eyebrow}>BETTER TOGETHER</Text>
          <PaceMark size={18} />
        </View>
        <View style={styles.avatars}>
          {[
            { initials: '규', color: '#D6D5C4', rotation: '-10deg' },
            { initials: '호', color: C.accent, rotation: '5deg' },
            { initials: '현', color: '#B6BDD0', rotation: '-6deg' },
          ].map(({ initials, color, rotation }) => (
            <View key={initials} style={[styles.avatar, { backgroundColor: color, transform: [{ rotate: rotation }] }]}>
              <Text allowFontScaling={false} style={styles.avatarInitial}>{initials}</Text>
              <View style={styles.avatarShirt} />
            </View>
          ))}
        </View>
        <Text allowFontScaling={false} style={styles.crewTitle}>같이 달릴래요?</Text>
        <Text allowFontScaling={false} style={styles.crewDescription}>서로 다른 속도, 같은 즐거움.</Text>
        <View style={styles.crewDivider} />
        <View style={styles.crewFooter}>
          <View style={styles.liveDot} />
          <Text allowFontScaling={false} style={styles.metricLabel}>우리의 러닝은 계속되는 중</Text>
        </View>
      </View>
      <View style={styles.cheerBubble}>
        <Text allowFontScaling={false} style={styles.cheerIcon}>↗</Text>
        <View>
          <Text allowFontScaling={false} style={styles.cheerTitle}>멋진 페이스예요!</Text>
          <Text allowFontScaling={false} style={styles.cheerSubtitle}>응원이 모이면, 한 걸음 더</Text>
        </View>
      </View>
      <View style={styles.socialBadge}><Text allowFontScaling={false} style={styles.socialBadgeText}>RUN. CONNECT. REPEAT.</Text></View>
    </>
  );
}

export function OnboardingArt({ page, width }: { page: number; width: number }) {
  const scale = Math.min(width / 360, 1.16);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width: 360 * scale, height: 390 * scale, alignSelf: 'center' }}>
      <View style={[styles.canvas, { transform: [{ scale }], transformOrigin: 'top left' }]}>
        <View style={styles.backdropCircle} />
        {page === 0 ? <MapArt /> : page === 1 ? <GrowthArt /> : <CommunityArt />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { width: 360, height: 390 },
  backdropCircle: { position: 'absolute', width: 310, height: 310, borderRadius: 155, top: 25, left: 25, borderWidth: 1, borderColor: '#20251B', backgroundColor: '#11150F' },
  mapCard: { position: 'absolute', top: 17, left: 29, width: 302, height: 275, borderRadius: 23, backgroundColor: '#191E1D', borderWidth: 1, borderColor: '#343B32', overflow: 'hidden', transform: [{ rotate: '-5deg' }] },
  mapGrid: { ...StyleSheet.absoluteFill, transform: [{ rotate: '-15deg' }], opacity: 0.7 },
  road: { position: 'absolute', backgroundColor: '#3A4240' },
  park: { position: 'absolute', top: 78, left: 98, width: 88, height: 112, borderRadius: 18, backgroundColor: '#2A382B', borderWidth: 1, borderColor: '#364A32' },
  parkSmall: { top: 8, left: 235, width: 55, height: 48, borderRadius: 8 },
  river: { position: 'absolute', top: 20, left: -50, width: 68, height: 390, backgroundColor: '#263438', transform: [{ rotate: '-10deg' }] },
  mapPlace: { position: 'absolute', top: 145, left: 102, color: '#75836D', letterSpacing: 1.4, fontSize: 8, fontWeight: '600' },
  routePoint: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: C.background, borderWidth: 3, borderColor: C.accent },
  routeEnd: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.accent, borderColor: '#F4F5F0' },
  mapLabel: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  smallLabel: { color: C.text, fontSize: 12, fontWeight: '600' },
  mapTime: { marginLeft: 'auto', color: C.muted, fontSize: 9, fontWeight: '500', letterSpacing: 1 },
  distanceBubble: { position: 'absolute', top: 207, left: 132, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, backgroundColor: C.accent },
  bubbleText: { color: C.accentInk, fontSize: 9, fontWeight: '700' },
  runSummary: { position: 'absolute', top: 255, left: 17, right: 17, backgroundColor: C.raised, borderRadius: 20, borderWidth: 1, borderColor: '#3A3F37', padding: 19 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: C.muted, fontSize: 9, letterSpacing: 2, fontWeight: '600' },
  limeText: { color: C.accent, fontSize: 21, fontWeight: '600' },
  metrics: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  distanceMetric: { flex: 1.4 },
  distance: { color: C.text, fontSize: 33, fontWeight: '700', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  unit: { color: C.muted, fontSize: 13, fontWeight: '400', letterSpacing: 0 },
  metric: { flex: 1, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#3A3E40', gap: 6 },
  metricValue: { color: C.text, fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  metricLabel: { color: C.muted, fontSize: 9 },
  floatingLabel: { position: 'absolute', top: 7, right: 3, flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: '#2A3022', borderWidth: 1, borderColor: '#465035', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 10, transform: [{ rotate: '4deg' }] },
  floatingText: { color: C.accent, fontSize: 10, fontWeight: '600' },
  growthCard: { position: 'absolute', top: 22, left: 27, right: 27, padding: 23, borderRadius: 23, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, transform: [{ rotate: '-3deg' }] },
  weekDistance: { color: C.text, fontSize: 48, letterSpacing: -2, fontWeight: '700', marginTop: 18 },
  growthPill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 6, backgroundColor: '#293321', marginTop: 8 },
  growthPillText: { color: C.accent, fontSize: 9, fontWeight: '500' },
  chart: { height: 160, flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 23 },
  chartGrid: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: '#2C3030' },
  barColumn: { flex: 1, alignItems: 'center', gap: 10 },
  bar: { width: '100%', backgroundColor: '#3D4734', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  activeBar: { backgroundColor: C.accent },
  day: { color: C.subtle, fontSize: 9 },
  activeDay: { color: C.accent },
  goalCard: { position: 'absolute', left: 13, right: 6, top: 291, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, backgroundColor: C.raised, borderRadius: 18, borderWidth: 1, borderColor: '#3A3F37', transform: [{ rotate: '3deg' }] },
  goalIcon: { width: 39, height: 39, backgroundColor: '#303925', borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  goalStar: { color: C.accent, fontSize: 28 },
  goalCopy: { flex: 1, gap: 6 },
  goalDetail: { color: C.muted, fontSize: 9 },
  progressTrack: { height: 3, backgroundColor: '#41463B', borderRadius: 2, marginTop: 3 },
  progressFill: { height: 3, width: '80%', backgroundColor: C.accent, borderRadius: 2 },
  percent: { fontSize: 11 },
  personalBest: { top: 2, right: 6, transform: [{ rotate: '6deg' }] },
  communityOrbit: { position: 'absolute', top: 24, left: 5, width: 350, height: 300, borderWidth: 1, borderColor: '#30342A', borderRadius: 175, transform: [{ rotate: '-35deg' }] },
  communityOrbitInner: { top: 54, left: 35, width: 290, height: 240, borderColor: '#24291E' },
  crewCard: { position: 'absolute', left: 32, right: 32, top: 41, padding: 23, borderRadius: 24, borderWidth: 1, borderColor: '#393E33', backgroundColor: C.surface, transform: [{ rotate: '-4deg' }] },
  avatars: { flexDirection: 'row', justifyContent: 'center', paddingTop: 30, paddingBottom: 23, paddingLeft: 12 },
  avatar: { width: 72, height: 82, borderRadius: 25, borderWidth: 4, borderColor: C.surface, marginLeft: -12, alignItems: 'center', overflow: 'hidden' },
  avatarInitial: { color: '#272B23', fontSize: 30, fontWeight: '800', fontStyle: 'italic', marginTop: 7 },
  avatarShirt: { width: 70, height: 45, borderRadius: 30, backgroundColor: '#343B31', marginTop: 2 },
  crewTitle: { color: C.text, fontSize: 25, fontWeight: '700', textAlign: 'center', letterSpacing: -1 },
  crewDescription: { color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 10 },
  crewDivider: { height: 1, backgroundColor: C.border, marginVertical: 21 },
  crewFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  cheerBubble: { position: 'absolute', bottom: 13, right: 4, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 17, backgroundColor: C.accent, paddingVertical: 15, paddingHorizontal: 18, transform: [{ rotate: '4deg' }] },
  cheerIcon: { color: C.accentInk, fontSize: 29, fontWeight: '500' },
  cheerTitle: { color: C.accentInk, fontSize: 13, fontWeight: '700' },
  cheerSubtitle: { color: '#4E5C2D', fontSize: 9, marginTop: 4 },
  socialBadge: { position: 'absolute', top: 22, left: 2, backgroundColor: '#2A3022', borderWidth: 1, borderColor: '#465035', borderRadius: 8, padding: 10, transform: [{ rotate: '-10deg' }] },
  socialBadgeText: { color: C.accent, fontSize: 8, letterSpacing: 1.5, fontWeight: '600' },
});
