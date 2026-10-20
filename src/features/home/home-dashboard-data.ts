export type WeeklyRunDay = {
  day: string;
  distanceKm: number;
};

export type RecentRun = {
  dateLabel: string;
  distanceKm: number;
  duration: string;
  averagePace: string;
};

export type HomeDashboardData = {
  weeklyDistanceKm: number;
  weeklyGoalKm: number;
  weeklyRunCount: number;
  weeklyRuns: WeeklyRunDay[];
  recentRun: RecentRun;
};

export const homeDashboardData: HomeDashboardData = {
  weeklyDistanceKm: 12.4,
  weeklyGoalKm: 20,
  weeklyRunCount: 3,
  weeklyRuns: [
    { day: '월', distanceKm: 2.8 },
    { day: '화', distanceKm: 0 },
    { day: '수', distanceKm: 4.36 },
    { day: '목', distanceKm: 0 },
    { day: '금', distanceKm: 0 },
    { day: '토', distanceKm: 5.24 },
    { day: '일', distanceKm: 0 },
  ],
  recentRun: {
    dateLabel: '10월 18일 토요일',
    distanceKm: 5.24,
    duration: '32:29',
    averagePace: "6'12''",
  },
};
