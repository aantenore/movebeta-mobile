import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/core/theme';

type StateViewProps = {
  title: string;
  message?: string;
  loading?: boolean;
};

export function StateView({ title, message, loading = false }: StateViewProps) {
  return (
    <View style={styles.wrap}>
      {loading ? <ActivityIndicator color={theme.colors.brand} size="large" /> : null}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    minHeight: 220,
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
