import { StyleSheet, View } from 'react-native';
import { PaceIcon } from '@/components/pace-icon';
import { PaceText as Text } from '@/components/pace-text';

const DESIGNS: Record<string, { label: string; category: string; color: string; icon?: 'run' | 'crew' }> = {
  'first-run': { label: '01', category: 'FIRST STEP', color: '#D4F77D', icon: 'run' },
  single3k: { label: '3', category: 'KILOMETERS', color: '#8DE5CB' },
  single5k: { label: '5', category: 'KILOMETERS', color: '#8BC8F8' },
  single10k: { label: '10', category: 'KILOMETERS', color: '#BDA3F5' },
  total30k: { label: '30', category: 'DISTANCE CLUB', color: '#EDC38D' },
  total100k: { label: '100', category: 'DISTANCE CLUB', color: '#F3D882' },
  total300k: { label: '300', category: 'DISTANCE CLUB', color: '#F2A7A7' },
  weekly3days: { label: '3', category: 'DAYS A WEEK', color: '#A5D99D' },
  monthly10runs: { label: '10', category: 'MONTHLY RUNS', color: '#B4B6F8' },
  'crew-goal': { label: '', category: 'CREW TOGETHER', color: '#E9BAE7', icon: 'crew' },
};

export function BadgeEmblem({ id, earned, size = 88 }: Readonly<{
  id: string; earned: boolean; size?: number;
}>) {
  const design = DESIGNS[id] ?? { label: 'P', category: 'PACE ACHIEVEMENT', color: '#D4F77D' };
  const ink = earned ? design.color : '#757A83';
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.medal, { transform: [{ scale: size / 88 }], borderColor: ink,
      backgroundColor: earned ? '#24292A' : '#202227' }]}>
      <View style={[styles.inner, { borderColor: ink }]}>
        <Text allowFontScaling={false} style={[styles.brand, { color: ink }]}>PACE</Text>
        {design.icon ? <PaceIcon name={design.icon} color={ink} size={28} />
          : <Text allowFontScaling={false} style={[styles.number, { color: ink }]}>{design.label}</Text>}
        <Text allowFontScaling={false} style={[styles.category, { color: ink }]}>{design.category}</Text>
      </View>
      <View style={[styles.notch, styles.left, { backgroundColor: ink }]} />
      <View style={[styles.notch, styles.right, { backgroundColor: ink }]} />
      <View style={[styles.gem, { backgroundColor: ink }]} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  medal: { width: 80, height: 80, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 68, height: 68, borderRadius: 22, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center', gap: 2 },
  brand: { fontSize: 6, letterSpacing: 3, fontWeight: '700', marginLeft: 3 },
  number: { fontSize: 29, lineHeight: 33, fontWeight: '700', letterSpacing: -1 },
  category: { fontSize: 4.5, letterSpacing: 0.8, fontWeight: '700' },
  notch: { position: 'absolute', width: 3, height: 16, borderRadius: 2 },
  left: { left: -2 },
  right: { right: -2 },
  gem: { position: 'absolute', bottom: -3, width: 6, height: 6, transform: [{ rotate: '45deg' }] },
});
