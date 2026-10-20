import { StyleSheet, View } from 'react-native';

type PaceIconName = 'run' | 'stats' | 'home' | 'social' | 'profile' | 'comment' | 'send';

type PaceIconProps = Readonly<{
  name: PaceIconName;
  color: string;
  size?: number;
}>;

export function PaceIcon({ name, color, size = 22 }: PaceIconProps) {
  const scale = size / 22;
  const line = { backgroundColor: color };
  const circle = { backgroundColor: color, borderRadius: size };

  switch (name) {
    case 'run':
      return (
        <View accessible={false} style={{ width: size, height: size }}>
          <View style={[styles.runnerHead, circle, { width: 5 * scale, height: 5 * scale, top: 1 * scale, right: 4 * scale }]} />
          <View style={[styles.runnerTorso, line, { width: 3 * scale, height: 8 * scale, top: 6 * scale, left: 10 * scale }]} />
          <View style={[styles.runnerLimb, line, { width: 3 * scale, height: 7 * scale, top: 7 * scale, left: 5 * scale, transform: [{ rotate: '-42deg' }] }]} />
          <View style={[styles.runnerLimb, line, { width: 3 * scale, height: 8 * scale, top: 12 * scale, left: 8 * scale, transform: [{ rotate: '35deg' }] }]} />
          <View style={[styles.runnerLimb, line, { width: 3 * scale, height: 8 * scale, top: 13 * scale, left: 12 * scale, transform: [{ rotate: '-32deg' }] }]} />
          <View style={[styles.runnerLimb, line, { width: 3 * scale, height: 7 * scale, top: 7 * scale, left: 13 * scale, transform: [{ rotate: '48deg' }] }]} />
        </View>
      );
    case 'stats':
      return (
        <View accessible={false} style={[styles.bars, { width: size, height: size }]}>
          <View style={[styles.bar, line, { height: 8 * scale }]} />
          <View style={[styles.bar, line, { height: 13 * scale }]} />
          <View style={[styles.bar, line, { height: 18 * scale }]} />
        </View>
      );
    case 'home':
      return (
        <View accessible={false} style={{ width: size, height: size }}>
          <View style={[styles.roofLeft, line, { width: 12 * scale, height: 2 * scale, top: 5 * scale, left: 1 * scale }]} />
          <View style={[styles.roofRight, line, { width: 12 * scale, height: 2 * scale, top: 5 * scale, right: 1 * scale }]} />
          <View style={[styles.house, { width: 14 * scale, height: 12 * scale, top: 8 * scale, left: 4 * scale, borderColor: color, borderTopWidth: 0, borderWidth: 2 * scale }]} />
          <View style={[styles.door, line, { width: 3 * scale, height: 6 * scale, bottom: 2 * scale, left: 9.5 * scale }]} />
        </View>
      );
    case 'social':
      return (
        <View accessible={false} style={{ width: size, height: size }}>
          <View style={[styles.personHead, circle, { width: 7 * scale, height: 7 * scale, top: 2 * scale, left: 3 * scale }]} />
          <View style={[styles.personHead, circle, { width: 7 * scale, height: 7 * scale, top: 2 * scale, right: 3 * scale }]} />
          <View style={[styles.personShoulder, line, { width: 10 * scale, height: 7 * scale, bottom: 2 * scale, left: 0, borderTopLeftRadius: 7 * scale, borderTopRightRadius: 7 * scale }]} />
          <View style={[styles.personShoulder, line, { width: 10 * scale, height: 7 * scale, bottom: 2 * scale, right: 0, borderTopLeftRadius: 7 * scale, borderTopRightRadius: 7 * scale }]} />
        </View>
      );
    case 'profile':
      return (
        <View accessible={false} style={{ width: size, height: size }}>
          <View style={[styles.personHead, circle, { width: 8 * scale, height: 8 * scale, top: 1 * scale, left: 7 * scale }]} />
          <View style={[styles.profileShoulders, line, { width: 16 * scale, height: 9 * scale, bottom: 1 * scale, left: 3 * scale, borderTopLeftRadius: 9 * scale, borderTopRightRadius: 9 * scale }]} />
        </View>
      );
    case 'comment':
      return (
        <View accessible={false} style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View style={[styles.commentBubble, { width: 15 * scale, height: 12 * scale, borderColor: color, borderWidth: 1.7 * scale, borderRadius: 4 * scale }]} />
          <View style={[styles.commentTail, { borderTopColor: color, borderTopWidth: 2 * scale, borderRightColor: color, borderRightWidth: 2 * scale, bottom: 3 * scale, left: 4 * scale, transform: [{ rotate: '15deg' }] }]} />
        </View>
      );
    case 'send':
      return (
        <View accessible={false} style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View style={[styles.sendShape, { borderLeftColor: color, borderLeftWidth: 15 * scale, borderTopWidth: 8 * scale, borderBottomWidth: 8 * scale }]} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  runnerHead: { position: 'absolute' },
  runnerTorso: { position: 'absolute', borderRadius: 3 },
  runnerLimb: { position: 'absolute', borderRadius: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  bar: { width: 4, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  roofLeft: { position: 'absolute', borderRadius: 2, transform: [{ rotate: '-42deg' }] },
  roofRight: { position: 'absolute', borderRadius: 2, transform: [{ rotate: '42deg' }] },
  house: { position: 'absolute', borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  door: { position: 'absolute', borderTopLeftRadius: 1, borderTopRightRadius: 1 },
  personHead: { position: 'absolute' },
  personShoulder: { position: 'absolute' },
  profileShoulders: { position: 'absolute' },
  commentBubble: { position: 'absolute', top: 3 },
  commentTail: { position: 'absolute', width: 5, height: 5, borderBottomWidth: 0, borderLeftWidth: 0 },
  sendShape: { width: 0, height: 0, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderTopWidth: 8, borderBottomWidth: 8, transform: [{ rotate: '-35deg' }] },
});
