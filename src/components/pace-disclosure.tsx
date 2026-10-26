import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

export function PaceDisclosure({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  const [expanded, setExpanded] = useState(false);
  return <View style={styles.container}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} aria-expanded={expanded}
      onPress={() => setExpanded((value) => !value)} style={styles.toggle}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.indicator}>{expanded ? '−' : '+'}</Text>
    </Pressable>
    {expanded ? <View style={styles.body}>{children}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  toggle: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, color: C.muted, fontSize: 13 },
  indicator: { color: C.muted, fontSize: 20 },
  body: { paddingBottom: 16, gap: 14 },
});
