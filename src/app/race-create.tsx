import { CommunityAccess } from '@/features/crew/community-access';
import { RaceCreateScreen } from '@/features/race/race-create-screen';

export default function RaceCreateRoute() {
  return <CommunityAccess><RaceCreateScreen /></CommunityAccess>;
}
