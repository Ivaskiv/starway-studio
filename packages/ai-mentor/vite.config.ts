// packages/ai-mentor/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths()
  ],
  resolve: {
    alias: {
      '@starway-studio/shared': path.resolve(__dirname, '../shared/src/index.ts'),
      '@ai-mentor': path.resolve(__dirname, './src'),
    }
  },
  server: {
    port: 5174,
    open: true
  }
});