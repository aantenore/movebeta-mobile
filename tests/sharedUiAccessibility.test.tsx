import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const viewport = vi.hoisted(() => ({ width: 320 }));

vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Platform: { OS: 'web' },
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
  useWindowDimensions: () => ({ height: 700, width: viewport.width }),
}));

vi.mock('expo-router', () => {
  const Tabs = Object.assign(() => null, { Screen: () => null });
  return { Tabs };
});

vi.mock('lucide-react-native', () => ({
  BadgeCheck: () => null,
  Dumbbell: () => null,
  History: () => null,
  ScanLine: () => null,
  ShieldCheck: () => null,
  TrendingUp: () => null,
}));

vi.mock('../src/core/config', () => ({
  appConfig: { productExperience: 'consumer' },
}));

import TabsLayout from '../src/app/(tabs)/_layout';
import { Header } from '../src/components/Header';
import { Section } from '../src/components/Section';
import { StateView } from '../src/components/StateView';

type TestElement = ReactElement<Record<string, unknown>>;

function elementsIn(node: ReactNode): TestElement[] {
  if (!isValidElement(node)) return [];

  const element = node as TestElement;
  return [element, ...Children.toArray(element.props.children as ReactNode).flatMap(elementsIn)];
}

describe('shared UI accessibility', () => {
  it('exposes page and section titles with ordered web heading levels', () => {
    const page = Header({ eyebrow: 'Coach', title: 'Analyze movement' });
    const section = Section({ children: null, title: 'Movement metrics' });

    const pageHeading = elementsIn(page).find((element) => element.props.accessibilityRole === 'header');
    const sectionHeading = elementsIn(section).find((element) => element.props.accessibilityRole === 'header');

    expect(pageHeading?.props['aria-level']).toBe(1);
    expect(sectionHeading?.props['aria-level']).toBe(2);
  });

  it('announces dynamic states politely and exposes loading state', () => {
    const state = StateView({ loading: true, message: 'Analyzing locally', title: 'Working' }) as TestElement;

    expect(state.props.role).toBe('status');
    expect(state.props.accessibilityLiveRegion).toBe('polite');
    expect(state.props.accessibilityState).toEqual({ busy: true });
  });

  it('uses an icon-only detached tab bar on narrow screens', () => {
    viewport.width = 320;
    const tabs = TabsLayout() as TestElement;
    const screenOptions = tabs.props.screenOptions as Record<string, unknown>;
    const tabBarStyle = screenOptions.tabBarStyle as Record<string, unknown>;

    expect(tabs.props.detachInactiveScreens).toBe(true);
    expect(screenOptions.lazy).toBe(true);
    expect(screenOptions.tabBarShowLabel).toBe(false);
    expect(tabBarStyle.height).toBe(60);

    const screens = Children.toArray(tabs.props.children as ReactNode).filter(isValidElement) as TestElement[];
    const visibleScreens = screens.filter(
      (screen) => (screen.props.options as Record<string, unknown>).href !== null,
    );
    expect(screens).toHaveLength(6);
    expect(visibleScreens).toHaveLength(4);
    expect(
      visibleScreens.map((screen) => (screen.props.options as Record<string, unknown>).tabBarAccessibilityLabel),
    ).toEqual(['Coach', 'Attempts', 'Progress', 'Settings']);
  });

  it('restores visible tab labels when enough width is available', () => {
    viewport.width = 400;
    const tabs = TabsLayout() as TestElement;
    const screenOptions = tabs.props.screenOptions as Record<string, unknown>;
    const tabBarStyle = screenOptions.tabBarStyle as Record<string, unknown>;

    expect(screenOptions.tabBarShowLabel).toBe(true);
    expect(tabBarStyle.height).toBe(68);
  });
});
