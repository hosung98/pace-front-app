import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaceBrand } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function PaceSplash({ onFinish }: { onFinish: () => void }) {
  const reducedMotion = useReducedMotion();
  const [logo] = useState(() => new Animated.Value(0));
  const [tagline] = useState(() => new Animated.Value(0));
  const [orbit] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const staticSplash = reducedMotion !== false;

  useEffect(() => {
    if (reducedMotion === null) return;
    if (reducedMotion) {
      const timer = setTimeout(onFinish, 800);
      return () => clearTimeout(timer);
    }

    logo.setValue(0);
    tagline.setValue(0);
    orbit.setValue(0);
    opacity.setValue(1);
    const useNativeDriver = Platform.OS !== 'web';
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(logo, {
          toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver,
        }),
        Animated.sequence([
          Animated.delay(260),
          Animated.timing(tagline, { toValue: 1, duration: 550, useNativeDriver }),
        ]),
        Animated.timing(orbit, {
          toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver,
        }),
      ]),
      Animated.delay(450),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver }),
    ]);
    animation.start(({ finished }) => { if (finished) onFinish(); });
    return () => animation.stop();
  }, [reducedMotion, logo, tagline, orbit, opacity, onFinish]);

  return (
    <SafeAreaView style={styles.screen}>
      <Animated.View style={[styles.screen, { width: '100%', opacity: staticSplash ? 1 : opacity }]}>
        <View style={styles.center}>
          <Animated.View style={[styles.orbitContainer, {
            opacity: staticSplash ? 1 : orbit,
            transform: [{ scale: staticSplash ? 1 : orbit.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }],
          }]}>
            <View style={styles.orbit} />
            <View style={[styles.orbit, styles.innerOrbit]} />
          </Animated.View>
          <Animated.View style={{
            opacity: staticSplash ? 1 : logo,
            transform: [
              { translateY: staticSplash ? 0 : logo.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              { scale: staticSplash ? 1 : logo.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            ],
          }}>
            <PaceBrand large />
          </Animated.View>
          <Animated.View style={{ opacity: staticSplash ? 1 : tagline }}>
            <Text style={styles.tagline}>EVERY PACE MATTERS.</Text>
          </Animated.View>
        </View>
        <Text style={styles.footer}>너만의 속도로, 너만의 러닝.</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 22, overflow: 'hidden' },
  orbitContainer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  orbit: {
    position: 'absolute', width: 480, height: 480, borderRadius: 240,
    borderWidth: 1, borderColor: '#20241A', transform: [{ scaleX: 0.65 }, { rotate: '-35deg' }],
  },
  innerOrbit: { width: 360, height: 360, borderRadius: 180, borderColor: '#191D16' },
  tagline: { color: C.muted, fontSize: 10, fontWeight: '600', letterSpacing: 4 },
  footer: { color: C.muted, fontSize: 12, padding: 28, letterSpacing: 0.5 },
});
