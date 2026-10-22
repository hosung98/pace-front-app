import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/segmented-control';
import { CommunitySignIn } from '@/features/crew/community-access';
import { CrewSection } from '@/features/crew/crew-section';
import { RaceSection } from '@/features/race/race-section';
import { useSession } from '@/features/auth/session-store';
import { TabScreenShell } from '@/features/navigation/tab-screen-shell';

type Section = 'crew' | 'race';

const SECTION_OPTIONS = [
  { value: 'crew', label: '크루' },
  { value: 'race', label: '대결' },
] as const;

export function CrewTabScreen() {
  const [section, setSection] = useState<Section>('crew');
  const { session } = useSession();

  return (
    <TabScreenShell
      eyebrow="CREW & RACE"
      title={section === 'crew' ? '함께 쌓는 거리' : '같은 시간, 다른 곳에서'}
      description={
        section === 'crew'
          ? '크루원들의 거리를 모아 주간·월간 순위를 겨뤄요.'
          : '시간을 정해 방을 열고, 모이면 동시에 출발해요.'
      }
      badge={session ? '계정 연결' : '로그인 필요'}
      disclaimer="크루·대결 목록은 서버에 저장된 데이터입니다. 대결 자동 출발과 GPS 결과 등록은 아직 지원하지 않습니다.">
      <SegmentedControl options={SECTION_OPTIONS} value={section} onChange={setSection} style={styles.segment} />
      {!session ? <CommunitySignIn /> : (
        <View key={session.user.id}>
          {section === 'crew' ? <CrewSection /> : <RaceSection />}
        </View>
      )}
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  segment: { marginTop: 4 },
});
