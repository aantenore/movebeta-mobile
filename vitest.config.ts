import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'expo-constants': path.resolve(__dirname, 'tests/mocks/expoConstants.ts'),
      'movebeta-pose': path.resolve(__dirname, 'tests/mocks/movebetaPose.ts'),
    },
  },
  test: {
    environment: 'node',
  },
});
