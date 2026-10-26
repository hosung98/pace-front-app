import { CommunityAccess } from '@/features/crew/community-access';
import { RaceEditScreen } from '@/features/race/race-edit-screen';

export default function RaceEditRoute() {
  return <CommunityAccess><RaceEditScreen /></CommunityAccess>;
}
