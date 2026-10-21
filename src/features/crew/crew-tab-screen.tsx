import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { SegmentedControl } from '@/components/segmented-control';
import { CrewSection } from '@/features/crew/crew-section';
import { TabScreenShell } from '@/features/navigation/tab-screen-shell';
import { RaceSection } from '@/features/race/race-section';

type Section = 'crew' | 'race';

const SECTION_OPTIONS = [
  { value: 'crew', label: '크루' },
  { value: 'race', label: '대결' },
] as const;

export function CrewTabScreen() {
  const [section, setSection] = useState<Section>('crew');

  return (
    <TabScreenShell
      eyebrow="CREW & RACE"
      title={section === 'crew' ? '함께 쌓는 거리' : '같은 시간, 다른 곳에서'}
      description={
        section === 'crew'
          ? '크루원들의 거리를 모아 주간·월간 순위를 겨뤄요.'
          : '시간을 정해 방을 열고, 모이면 동시에 출발해요.'
      }
      disclaimer="크루·대결 데이터는 백엔드 연동 전 샘플입니다.">
      <SegmentedControl options={SECTION_OPTIONS} value={section} onChange={setSection} style={styles.segment} />
      {section === 'crew' ? <CrewSection /> : <RaceSection />}
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  segment: { marginTop: 4 },
});
