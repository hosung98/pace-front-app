import { StyleSheet, Text, View } from 'react-native';

import { PaceColors as C } from '@/constants/pace';
import { APP_ENV } from '@/constants/api';

export function PaceMark({ size = 27 }: { size?: number }) {
  return (
    <View
      accessible={false}
      style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', gap: size * 0.12 }}>
      {[0.46, 0.73, 1].map((height) => (
        <View
          key={height}
          style={{
            width: size * 0.22,
            height: size * height,
            backgroundColor: C.accent,
            borderRadius: size * 0.035,
            transform: [{ skewX: '-18deg' }],
          }}
        />
      ))}
    </View>
  );
}

export function PaceBrand({ large = false }: { large?: boolean }) {
  return (
    <View accessible accessibilityLabel={APP_ENV === 'development' ? 'PACE 개발 환경' : 'PACE'}
      style={[styles.brand, large && styles.largeBrand]}>
      <PaceMark size={large ? 44 : 23} />
      <Text style={[styles.name, large && styles.largeName]}>PACE</Text>
      {APP_ENV === 'development' ? <Text style={styles.environment}>DEV</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  largeBrand: { gap: 19 },
  name: { color: C.text, fontSize: 25, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1 },
  largeName: { fontSize: 58, letterSpacing: -3 },
  environment: {
    color: C.accent, backgroundColor: '#252E1B', borderRadius: 5,
    paddingHorizontal: 5, paddingVertical: 3, overflow: 'hidden',
    fontSize: 9, fontWeight: '700', letterSpacing: 0.5,
  },
});
