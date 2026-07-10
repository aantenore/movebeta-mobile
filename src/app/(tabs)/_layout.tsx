import { Tabs } from 'expo-router';
import { BadgeCheck, Dumbbell, History, ScanLine, ShieldCheck, TrendingUp } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';

import { appConfig } from '@/core/config';
import { theme } from '@/core/theme';

const compactTabBarBreakpoint = 390;

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const compactTabBar = width < compactTabBarBreakpoint;
  const diagnosticExperience = appConfig.productExperience === 'diagnostic';

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
          tabBarAccessibilityLabel: 'Coach',
          title: 'Coach',
          tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          tabBarAccessibilityLabel: 'Attempts',
          title: 'Attempts',
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="drills"
        options={
          diagnosticExperience
            ? {
                tabBarAccessibilityLabel: 'Drills',
                title: 'Drills',
                tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
              }
            : { href: null }
        }
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
        options={
          diagnosticExperience
            ? {
                tabBarAccessibilityLabel: 'Plan',
                title: 'Plan',
                tabBarIcon: ({ color, size }) => <BadgeCheck color={color} size={size} />,
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        name="privacy"
        options={{
          tabBarAccessibilityLabel: 'Settings',
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <ShieldCheck color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
