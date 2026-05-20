import { defineConfig } from 'vitest/config'
import path from 'node:path'

const PROD_DB_PATTERNS = ['supabase.com', 'neon.tech', 'planetscale.com', 'railway.app', 'render.com']

function checkDbSafety() {
  const url = process.env.DATABASE_URL ?? ''
  const hit = PROD_DB_PATTERNS.find((p) => url.includes(p))
  if (hit) {
    console.warn(`\n⚠️  WARNING: DATABASE_URL points to a production host (${hit}).\n   Integration tests will run against the real database.\n   Set DATABASE_URL to a local test DB to avoid data pollution.\n`)
  }
}

checkDbSafety()

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'backend/src') },
      { find: '@shared', replacement: path.resolve(__dirname, 'packages/shared/src') },
    ],
  },
  test: {
    include: ['backend/**/*.test.ts', 'apps/**/*.test.ts', 'packages/**/*.test.ts'],
    exclude: ['e2e/**', '.claude/**', '**/node_modules/**', '**/dist/**'],
  },
})
