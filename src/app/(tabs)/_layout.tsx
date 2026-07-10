import { Tabs } from 'expo-router';
import { Activity, BadgeCheck, Dumbbell, History, ShieldCheck, TrendingUp } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';

import { theme } from '@/core/theme';

const compactTabBarBreakpoint = 390;

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const compactTabBar = width < compactTabBarBreakpoint;

  return (
    <Tabs
      detachInactiveScreens
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarItemStyle: {
          minWidth: 44,
        },
        tabBarShowLabel: !compactTabBar,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.line,
          height: compactTabBar ? 60 : 68,
          paddingBottom: compactTabBar ? 8 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: 'Analyze',
          title: 'Analyze',
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          tabBarAccessibilityLabel: 'Sessions',
          title: 'Sessions',
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="drills"
        options={{
          tabBarAccessibilityLabel: 'Drills',
          title: 'Drills',
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarAccessibilityLabel: 'Progress',
          title: 'Progress',
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          tabBarAccessibilityLabel: 'Plan',
          title: 'Plan',
          tabBarIcon: ({ color, size }) => <BadgeCheck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="privacy"
        options={{
          tabBarAccessibilityLabel: 'Privacy',
          title: 'Privacy',
          tabBarIcon: ({ color, size }) => <ShieldCheck color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
