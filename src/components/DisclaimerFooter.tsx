import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/core/theme';

export function DisclaimerFooter() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>SAFETY NOTE</Text>
      <Text style={styles.copy}>
        Climbing is dangerous. Movement feedback is educational and cannot replace coaching, spotting, medical advice,
        or gym safety rules. Ask permission before recording other people.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopColor: theme.colors.line,
    borderTopWidth: 1,
    gap: 4,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  title: {
    color: theme.colors.coral,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  copy: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
});
