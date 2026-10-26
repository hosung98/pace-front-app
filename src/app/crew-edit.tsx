import { CommunityAccess } from '@/features/crew/community-access';
import { CrewEditScreen } from '@/features/crew/crew-edit-screen';

export default function CrewEditRoute() {
  return <CommunityAccess><CrewEditScreen /></CommunityAccess>;
}
