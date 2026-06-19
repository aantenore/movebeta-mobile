import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function selectionFeedback() {
  if (Platform.OS !== 'web') {
    void Haptics.selectionAsync();
  }
}
