import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { PaceBrand, PaceMark } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

import { homeDashboardData } from './home-dashboard-data';

function SectionHeading({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

function TodayRunCard({ onStartRun }: { onStartRun: () => void }) {
  return (
    <View style={styles.todayCard}>
      <View style={styles.todayCardTop}>
        <View>
          <Text style={styles.eyebrow}>TODAY&apos;S PACE</Text>
          <Text style={styles.todayTitle}>오늘도 가볍게 달려볼까요?</Text>
        </View>
        <View style={styles.todayMark}>
          <PaceMark size={25} />
        </View>
      </View>

      <View style={styles.todayMetric}>
        <Text style={styles.todayDistance}>0.00</Text>
        <Text style={styles.todayUnit}>km</Text>
      </View>
      <Text style={styles.todayCaption}>오늘의 러닝 거리를 채워보세요</Text>

      <Pressable
        accessibilityRole="button"
        onPress={onStartRun}
        style={({ pressed }) => [
          styles.startButton,
          pressed && styles.pressed,
        ]}>
        <Text style={styles.startButtonText}>러닝 시작하기</Text>
        <Text style={styles.startButtonArrow}>→</Text>
      </Pressable>
    </View>
  );
}

function WeeklyProgressCard() {
  const { weeklyDistanceKm, weeklyGoalKm, weeklyRunCount, weeklyRuns } =
    homeDashboardData;
  const progress = Math.min(weeklyDistanceKm / weeklyGoalKm, 1);

  return (
    <View style={styles.weeklyCard}>
      <View style={styles.weeklySummary}>
        <View>
          <Text style={styles.eyebrow}>THIS WEEK</Text>
          <View style={styles.weeklyDistanceRow}>
            <Text style={styles.weeklyDistance}>
              {weeklyDistanceKm.toFixed(1)}
            </Text>
            <Text style={styles.weeklyUnit}>km</Text>
          </View>
        </View>
        <View style={styles.weeklyRunCount}>
          <Text style={styles.weeklyRunCountValue}>{weeklyRunCount}</Text>
          <Text style={styles.weeklyRunCountLabel}>회 달렸어요</Text>
        </View>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityLabel="이번 주 목표 달성률"
        accessibilityValue={{
          min: 0,
          max: weeklyGoalKm,
          now: weeklyDistanceKm,
        }}
        style={styles.goalTrack}>
        <View style={[styles.goalProgress, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.goalCaption}>
        이번 주 목표 {weeklyGoalKm}km까지{' '}
        <Text style={styles.goalRemaining}>
          {(weeklyGoalKm - weeklyDistanceKm).toFixed(1)}km
        </Text>
      </Text>

      <View style={styles.weekChart}>
        {weeklyRuns.map(({ day, distanceKm }) => {
          const hasRun = distanceKm > 0;
          const height = hasRun
            ? Math.max(12, (distanceKm / weeklyGoalKm) * 68)
            : 5;

          return (
            <View key={day} style={styles.weekDay}>
              <View style={styles.weekBarTrack}>
                <View
                  style={[
                    styles.weekBar,
                    { height },
                    hasRun && styles.weekBarActive,
                  ]}
                />
              </View>
              <Text style={[styles.weekDayLabel, hasRun && styles.weekDayActive]}>
                {day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function RecentRunCard() {
  const { recentRun } = homeDashboardData;
  const metrics = [
    { label: '거리', value: recentRun.distanceKm.toFixed(2), unit: 'km' },
    { label: '시간', value: recentRun.duration },
    { label: '평균 페이스', value: recentRun.averagePace, unit: '/km' },
  ];

  return (
    <View style={styles.recentCard}>
      <View style={styles.recentHeader}>
        <View>
          <Text style={styles.eyebrow}>RECENT RUN</Text>
          <Text style={styles.recentDate}>{recentRun.dateLabel}</Text>
        </View>
        <View style={styles.recentIcon}>
          <Text style={styles.recentIconText}>↗</Text>
        </View>
      </View>
      <View style={styles.recentMetrics}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.recentMetric}>
            <Text style={styles.recentMetricLabel}>{metric.label}</Text>
            <View style={styles.recentValueRow}>
              <Text style={styles.recentMetricValue}>{metric.value}</Text>
              {metric.unit ? (
                <Text style={styles.recentMetricUnit}>{metric.unit}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.fixedContainer}>
        <View style={styles.header}>
          <PaceBrand />
          <View style={styles.sampleBadge}>
            <View style={styles.sampleDot} />
            <Text style={styles.sampleLabel}>미리보기</Text>
          </View>
        </View>
        <View style={styles.greeting}>
          <Text style={styles.greetingEyebrow}>GOOD MORNING</Text>
          <Text style={styles.greetingTitle}>오늘도 나만의 페이스로.</Text>
          <Text style={styles.greetingDescription}>
            작은 한 걸음이 멋진 기록이 돼요.
          </Text>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <TodayRunCard
            onStartRun={() => router.push('/run-tracking')}
          />

          <View style={styles.section}>
            <SectionHeading title="이번 주 러닝" detail="주간 목표" />
            <WeeklyProgressCard />
          </View>

          <View style={styles.section}>
            <SectionHeading title="최근 러닝" detail="샘플 기록" />
            <RecentRunCard />
          </View>

          <Text style={styles.disclaimer}>
            화면에 표시된 기록은 백엔드 연동 전 샘플 데이터입니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fixedContainer: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sampleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#20251B',
  },
  sampleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  sampleLabel: {
    color: C.accent,
    fontSize: 10,
    fontWeight: '600',
  },
  greeting: {
    paddingTop: 24,
    paddingBottom: 22,
  },
  greetingEyebrow: {
    color: C.accent,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
  },
  greetingTitle: {
    marginTop: 9,
    color: C.text,
    fontSize: 25,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  greetingDescription: {
    marginTop: 5,
    color: C.muted,
    fontSize: 12,
  },
  todayCard: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  todayCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    color: C.muted,
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: '600',
  },
  todayTitle: {
    marginTop: 9,
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  todayMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252E1B',
  },
  todayMetric: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 24,
  },
  todayDistance: {
    color: C.text,
    fontSize: 56,
    lineHeight: 62,
    fontWeight: '700',
    letterSpacing: -2.5,
    fontVariant: ['tabular-nums'],
  },
  todayUnit: {
    marginLeft: 8,
    marginBottom: 8,
    color: C.muted,
    fontSize: 15,
  },
  todayCaption: {
    marginTop: 4,
    color: C.muted,
    fontSize: 11,
  },
  startButton: {
    minHeight: 54,
    marginTop: 23,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: C.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  startButtonText: {
    color: C.accentInk,
    fontSize: 14,
    fontWeight: '700',
  },
  startButtonArrow: {
    color: C.accentInk,
    fontSize: 20,
  },
  runMessage: {
    marginTop: 10,
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  section: {
    marginTop: 30,
  },
  sectionHeading: {
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionDetail: {
    color: C.subtle,
    fontSize: 10,
  },
  weeklyCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  weeklySummary: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  weeklyDistanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 7,
  },
  weeklyDistance: {
    color: C.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  weeklyUnit: {
    marginLeft: 6,
    marginBottom: 5,
    color: C.muted,
    fontSize: 12,
  },
  weeklyRunCount: {
    alignItems: 'flex-end',
  },
  weeklyRunCountValue: {
    color: C.accent,
    fontSize: 20,
    fontWeight: '700',
  },
  weeklyRunCountLabel: {
    marginTop: 2,
    color: C.muted,
    fontSize: 10,
  },
  goalTrack: {
    height: 5,
    marginTop: 17,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: C.raised,
  },
  goalProgress: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  goalCaption: {
    marginTop: 8,
    color: C.muted,
    fontSize: 10,
  },
  goalRemaining: {
    color: C.text,
    fontWeight: '600',
  },
  weekChart: {
    height: 92,
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  weekBarTrack: {
    height: 68,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  weekBar: {
    width: '70%',
    borderRadius: 5,
    backgroundColor: C.raised,
  },
  weekBarActive: {
    backgroundColor: '#A6C94A',
  },
  weekDayLabel: {
    color: C.subtle,
    fontSize: 9,
  },
  weekDayActive: {
    color: C.accent,
  },
  recentCard: {
    padding: 19,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentDate: {
    marginTop: 7,
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
  },
  recentIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#252E1B',
  },
  recentIconText: {
    color: C.accent,
    fontSize: 18,
  },
  recentMetrics: {
    marginTop: 20,
    flexDirection: 'row',
  },
  recentMetric: {
    flex: 1,
    gap: 6,
  },
  recentMetricLabel: {
    color: C.subtle,
    fontSize: 9,
  },
  recentValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  recentMetricValue: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  recentMetricUnit: {
    marginBottom: 1,
    color: C.muted,
    fontSize: 9,
  },
  disclaimer: {
    marginTop: 22,
    color: C.subtle,
    fontSize: 9,
    lineHeight: 15,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
