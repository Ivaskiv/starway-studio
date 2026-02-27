// backend/src/db/client.ts
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/db/generated/prisma/client.js';

function normalizeDatabaseUrl(rawUrl?: string): string {
  if (!rawUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const url = new URL(rawUrl);
  const sslmode = url.searchParams.get('sslmode');

  if (sslmode === 'prefer' || sslmode === 'require' || sslmode === 'verify-ca') {
    url.searchParams.set('sslmode', 'verify-full');
  }

  return url.toString();
}

const adapter = new PrismaPg({
  connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL),
});

export const prisma = new PrismaClient({ adapter });
export const Prisma = prisma;
