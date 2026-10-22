import { CommunityAccess } from '@/features/crew/community-access';
import { RaceSearchScreen } from '@/features/race/race-search-screen';

export default function RaceSearchRoute() {
  return <CommunityAccess><RaceSearchScreen /></CommunityAccess>;
}
