import { Pressable as NativePressable, type PressableProps } from 'react-native';

export function Pressable({ accessibilityRole = 'button', ...props }: PressableProps) {
  return <NativePressable accessibilityRole={accessibilityRole} {...props} />;
}
