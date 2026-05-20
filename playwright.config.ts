import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
})