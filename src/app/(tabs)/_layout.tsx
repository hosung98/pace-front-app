import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaceIcon } from '@/components/pace-icon';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

const tabItems = [
  { route: 'runs', label: '기록', icon: 'run' },
  { route: 'stats', label: '통계', icon: 'stats' },
  { route: 'main', label: '홈', icon: 'home' },
  { route: 'social', label: '소셜', icon: 'social' },
  { route: 'profile', label: '마이', icon: 'profile' },
] as const;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'web'
    ? Math.min(insets.bottom, 34)
    : insets.bottom;

  return (
    <Tabs
      initialRouteName="main"
      screenOptions={{ headerShown: false, sceneStyle: styles.scene }}
      tabBar={({ state, navigation }) => (
        <View
          style={[
            styles.tabBar,
            { paddingBottom: Math.max(bottomInset, 8) },
          ]}>
          {tabItems.map(({ route, label, icon }) => {
            const index = state.routes.findIndex((item) => item.name === route);
            const isActive = state.index === index;

            return (
              <Pressable
                key={route}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: isActive }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                    (error: unknown) => {
                      console.error('Unable to play tab haptic feedback.', error);
                    },
                  );

                  const event = navigation.emit({
                    type: 'tabPress',
                    target: state.routes[index]?.key,
                    canPreventDefault: true,
                  });

                  if (!isActive && !event.defaultPrevented) {
                    navigation.navigate(route);
                  }
                }}
                style={({ pressed }) => [
                  styles.tab,
                  pressed && styles.pressed,
                ]}>
                <PaceIcon
                  name={icon}
                  size={21}
                  color={isActive ? C.accent : C.subtle}
                />
                <Text style={[styles.label, isActive && styles.activeLabel]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}>
      <Tabs.Screen name="runs" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="main" />
      <Tabs.Screen name="social" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: { backgroundColor: C.background },
  tabBar: {
    minHeight: 62,
    paddingTop: 8,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: C.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: { color: C.subtle, fontSize: 10, fontWeight: '500' },
  activeLabel: { color: C.accent, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
