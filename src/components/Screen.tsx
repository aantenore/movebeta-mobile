import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DisclaimerFooter } from './DisclaimerFooter';
import { theme } from '@/core/theme';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
}>;

export function Screen({ children, scroll = true }: ScreenProps) {
  const content = (
    <View style={styles.content}>
      {children}
      <DisclaimerFooter />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  scrollContent: {
    paddingBottom: 112,
  },
  content: {
    alignSelf: 'center',
    gap: theme.spacing.lg,
    maxWidth: 860,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    width: '100%',
  },
});
