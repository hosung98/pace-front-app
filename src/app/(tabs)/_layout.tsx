import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

const tabItems = [
  { route: 'runs', label: '기록', icon: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' } },
  { route: 'stats', label: '통계', icon: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' } },
  { route: 'main', label: '홈', icon: { ios: 'house.fill', android: 'home', web: 'home' } },
  { route: 'social', label: '소셜', icon: { ios: 'person.2.fill', android: 'group', web: 'group' } },
  { route: 'profile', label: '마이', icon: { ios: 'person.fill', android: 'person', web: 'person' } },
] as const;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="main"
      screenOptions={{ headerShown: false, sceneStyle: styles.scene }}
      tabBar={({ state, navigation }) => (
        <View
          style={[
            styles.tabBar,
            { paddingBottom: Math.max(insets.bottom, 8) },
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
                <SymbolView
                  name={icon}
                  size={21}
                  tintColor={isActive ? C.accent : C.subtle}
                  weight="medium"
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
