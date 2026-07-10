import { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/core/theme';

type SectionProps = {
  title: string;
  caption?: string;
  trailing?: ReactNode;
  children: ReactNode;
};

const webHeadingLevel = Platform.OS === 'web' ? ({ 'aria-level': 2 } as const) : {};

export function Section({ title, caption, trailing, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text accessibilityRole="header" {...webHeadingLevel} style={styles.title}>
            {title}
          </Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
        {trailing}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  caption: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
