

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // babel: {
      //   plugins: [
      //     ...(mode === 'production' ? [['babel-plugin-react-compiler', {}]] : []),
      //   ],
      // },
    }),
    mode === 'analyze' &&
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      }),
    mode === 'production' &&
      compression({
        algorithm: 'brotliCompress',
        exclude: [/\.(br)$/, /\.(gz)$/],
      }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@sdkwork/app-sdk': path.resolve(__dirname, '../../spring-ai-plus-app-api/sdkwork-sdk-app/sdkwork-app-sdk-typescript/src/index.ts'),
      ...workspacePackageAlias,
    },
  },

  server: {
    port: 5173,
    strictPort: false,
    // https: true,
  },

  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: mode !== 'production',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      external: ['easyjssdk'],
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-state': ['zustand', 'immer', '@tanstack/react-query', '@tanstack/react-virtual'],
          'vendor-ui': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-placeholder'],
          // Markdown
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'remark-breaks'],
          'vendor-syntax': ['react-syntax-highlighter', 'highlight.js'],
          'vendor-i18n': ['react-i18next', 'i18next', 'i18next-browser-languagedetector'],
          'vendor-utils': ['lodash-es', 'date-fns', 'clsx', 'tailwind-merge'],
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (info.endsWith('.css')) {
            return 'assets/[name]-[hash][extname]';
          }
          if (/(png|jpe?g|gif|svg|webp|ico)$/.test(info)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/(woff2?|ttf|otf|eot)$/.test(info)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    polyfillModulePreload: true,
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@tanstack/react-query',
    ],
    exclude: [
      'xterm',
      'xterm-addon-fit',
      'easyjssdk',
    ],
  },

  preview: {
    port: 4173,
    strictPort: false,
  },
}));
