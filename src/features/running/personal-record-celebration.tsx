import { useEffect, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { PaceMark } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceButton } from '@/components/pace-button';
import { PaceColors as C } from '@/constants/pace';
import { formatDuration } from '@/lib/format';
import type { PersonalRecord } from './progress';

export function PersonalRecordCelebration({ records, visible, onClose }: Readonly<{
  records: PersonalRecord[]; visible: boolean; onClose: () => void;
}>) {
  const reduceMotion = useReducedMotion();
  const [entrance] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) { entrance.setValue(1); return; }
    entrance.setValue(0);
    const animation = Animated.spring(entrance, { toValue: 1, damping: 16, stiffness: 140,
      mass: 1, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [visible, reduceMotion, entrance]);
  return <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Animated.View accessibilityViewIsModal style={[styles.card, { opacity: entrance,
        transform: [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View accessible={false} style={styles.symbol}><PaceMark size={38} /></View>
        <Text style={styles.eyebrow}>A NEW PERSONAL RECORD</Text>
        <Text accessibilityRole="header" style={styles.title}>새로운 기록을 세웠어요!</Text>
        <Text style={styles.caption}>오늘 만든 새로운 개인 기록을 축하해요.</Text>
        {records.map((record) => <View key={record.id} style={styles.record}>
          <Text style={styles.label}>{record.title}</Text>
          <Text style={styles.value}>{record.unit === 'km' ? `${record.value.toFixed(2)} km` : `${formatDuration(Math.round(record.value))} /km`}</Text>
        </View>)}
        </ScrollView>
        <PaceButton label="멋져요! · 결과 보기" onPress={onClose} />
      </Animated.View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, padding: 24, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 400, maxHeight: '100%', padding: 24, borderRadius: 28, backgroundColor: C.surface, gap: 16,
    borderWidth: 1, borderColor: C.border },
  scroll: { flexShrink: 1 },
  scrollContent: { gap: 16 },
  symbol: { alignItems: 'center', paddingVertical: 12 },
  eyebrow: { color: C.accent, fontSize: 10, letterSpacing: 1.5, textAlign: 'center' },
  title: { color: C.text, fontSize: 23, fontWeight: '700', textAlign: 'center' },
  caption: { color: C.muted, fontSize: 12, lineHeight: 19, textAlign: 'center' },
  record: { padding: 16, backgroundColor: C.background, borderRadius: 16, gap: 8 },
  label: { color: C.muted, fontSize: 13 },
  value: { color: C.accent, fontSize: 28, fontWeight: '700' },
});
