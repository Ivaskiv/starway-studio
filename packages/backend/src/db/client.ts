// packages/backend/src/db/client.ts

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL is not set. Using mock database.')
  // В dev режимі можна використати mock
}

export const sql = DATABASE_URL 
  ? neon(DATABASE_URL)
  : (() => {
      console.warn('🔴 Using MOCK database - data will not persist!')
      return async () => []
    }) as any