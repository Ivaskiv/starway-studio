import { prisma as dbPrisma, withRetry } from '@starway/db'
import type { PrismaClient as GeneratedPrismaClient } from '@starway/db/prisma-client'

export const prisma: GeneratedPrismaClient = dbPrisma as unknown as GeneratedPrismaClient

export async function ensureDbConnected(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    console.warn('[prisma] connection lost, attempting reconnect...')
    await prisma.$disconnect().catch(() => undefined)
    await prisma.$connect().catch(() => undefined)
  }
}

export { withRetry }
