// packages/backend/src/db/client.ts

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found!');
  console.error('📝 Available env keys:', Object.keys(process.env).slice(0, 10));
  process.exit(1);
}

console.log('✅ Connecting to database...');

export const sql = neon(DATABASE_URL);

// Test connection
sql`SELECT 1 as test`
  .then(() => {
    console.log('✅ Database connected');
  })
  .catch((err) => {
    console.error('❌ Database failed:', err.message);
    process.exit(1);
  });