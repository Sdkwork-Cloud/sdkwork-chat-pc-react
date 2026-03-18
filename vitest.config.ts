

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const modulePackageNames = [
  'agents',
  'agent',
  'app',
  'appstore',
  'appointments',
  'auth',
  'chat',
  'commerce',
  'communication',
  'contacts',
  'content',
  'core',
  'i18n',
  'creation',
  'device',
  'discover',
  'drive',
  'im',
  'look',
  'media',
  'moments',
  'nearby',
  'notification',
  'order-center',
  'rtc',
  'search',
  'settings',
  'shopping',
  'skills',
  'skill',
  'social',
  'terminal',
  'tool',
  'tools',
  'user',
  'video',
  'vip',
  'wallet',
  'commons',
  'ui',
  'kernel',
  'contracts',
] as const;

const workspacePackageAlias = Object.fromEntries(
  modulePackageNames.map((name) => [
    `@sdkwork/openchat-pc-${name}`,
    path.resolve(__dirname, `./packages/sdkwork-openchat-pc-${name}/src/index.ts`),
  ])
);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'src/tests/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@sdkwork/app-sdk': path.resolve(
        __dirname,
        '../../spring-ai-plus-app-api/sdkwork-sdk-app/sdkwork-app-sdk-typescript/src/index.ts'
      ),
      '@sdkwork/sdk-common': path.resolve(
        __dirname,
        '../../sdk/sdkwork-sdk-commons/sdkwork-sdk-common-typescript/src/index.ts'
      ),
      ...workspacePackageAlias,
    },
  },
});
