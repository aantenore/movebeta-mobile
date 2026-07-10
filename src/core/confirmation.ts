import { Alert, Platform } from 'react-native';

export function confirmDestructiveAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const browserConfirm = (globalThis as typeof globalThis & { confirm?: (value?: string) => boolean }).confirm;
    return Promise.resolve(browserConfirm ? browserConfirm(`${title}\n\n${message}`) : false);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { onPress: () => resolve(false), style: 'cancel', text: 'Cancel' },
      { onPress: () => resolve(true), style: 'destructive', text: 'Continue' },
    ]);
  });
}
