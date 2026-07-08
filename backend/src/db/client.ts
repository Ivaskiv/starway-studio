import { prisma as dbPrisma, withRetry } from '@starway/db'
import type { PrismaClient as GeneratedPrismaClient } from '@starway/db/prisma-client'

export const prisma: GeneratedPrismaClient = dbPrisma as unknown as GeneratedPrismaClient

export async function ensureDbConnected(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (error) {
    console.warn('[prisma] connection check failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export { withRetry }
