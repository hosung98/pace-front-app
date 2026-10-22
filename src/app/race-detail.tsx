import { CommunityAccess } from '@/features/crew/community-access';
import { RaceDetailScreen } from '@/features/race/race-detail-screen';

export default function RaceDetailRoute() {
  return <CommunityAccess><RaceDetailScreen /></CommunityAccess>;
}
