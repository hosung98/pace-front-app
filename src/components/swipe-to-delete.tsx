import { useState, type PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { PaceText as Text } from '@/components/pace-text';

const ACTION_WIDTH = 84;
const OPEN_THRESHOLD = ACTION_WIDTH / 2;

type SwipeToDeleteProps = PropsWithChildren<{
  onPress: () => void;
  onDelete: () => void;
  accessibilityLabel?: string;
  deleteLabel?: string;
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
}>;

export function SwipeToDelete({
  onPress,
  onDelete,
  accessibilityLabel,
  deleteLabel = '삭제',
  style,
  pressedStyle,
  children,
}: SwipeToDeleteProps) {
  const [swipe] = useState(createSwipeState);
  const { translateX, snapTo, panHandlers } = swipe;

  // A drag must not also count as a tap, and tapping an opened row only closes it.
  const handlePress = () => {
    if (swipe.consumeDrag()) return;
    if (swipe.isOpen()) {
      snapTo(0);
      return;
    }
    onPress();
  };

  const handleDelete = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    snapTo(0);
    onDelete();
  };

  const actionOpacity = translateX.interpolate({
    inputRange: [-ACTION_WIDTH, -12, 0],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={styles.container}
      accessibilityActions={[{ name: 'delete', label: deleteLabel }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'delete') handleDelete();
      }}>
      <Animated.View style={[styles.actionArea, { opacity: actionOpacity }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
          onPress={handleDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
          <Text style={styles.deleteIcon}>✕</Text>
          <Text style={styles.deleteText}>{deleteLabel}</Text>
        </Pressable>
      </Animated.View>
      <Animated.View
        {...panHandlers}
        style={{ transform: [{ translateX }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPressIn={swipe.resetDrag}
          onPress={handlePress}
          style={({ pressed }) => [style, pressed && pressedStyle]}>
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function createSwipeState() {
  const translateX = new Animated.Value(0);
  let offset = 0;
  let dragged = false;

  const snapTo = (value: number) => {
    offset = value;
    Animated.spring(translateX, {
      toValue: value,
      useNativeDriver: Platform.OS !== 'web',
      bounciness: 0,
      speed: 18,
    }).start();
  };

  const { panHandlers } = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
      Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      dragged = true;
    },
    onPanResponderMove: (_, { dx }) => {
      translateX.setValue(Math.min(0, Math.max(-ACTION_WIDTH * 1.4, offset + dx)));
    },
    onPanResponderRelease: (_, { dx, vx }) => {
      const shouldOpen = offset + dx < -OPEN_THRESHOLD || vx < -0.5;
      if (shouldOpen && offset === 0 && Platform.OS !== 'web') {
        Haptics.selectionAsync().catch(() => {});
      }
      snapTo(shouldOpen && vx <= 0.5 ? -ACTION_WIDTH : 0);
    },
    onPanResponderTerminate: () => snapTo(offset),
  });

  const consumeDrag = () => {
    const wasDragged = dragged;
    dragged = false;
    return wasDragged;
  };

  return {
    translateX,
    snapTo,
    panHandlers,
    consumeDrag,
    resetDrag: () => {
      dragged = false;
    },
    isOpen: () => offset !== 0,
  };
}

const styles = StyleSheet.create({
  container: { marginTop: 14 },
  actionArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  deleteButton: {
    width: ACTION_WIDTH - 10,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 18,
    backgroundColor: '#E5484D',
  },
  deleteIcon: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  deleteText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
