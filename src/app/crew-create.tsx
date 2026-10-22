import { CommunityAccess } from '@/features/crew/community-access';
import { CrewCreateScreen } from '@/features/crew/crew-create-screen';

export default function CrewCreateRoute() {
  return <CommunityAccess><CrewCreateScreen /></CommunityAccess>;
}
