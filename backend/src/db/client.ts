import { prisma as dbPrisma, withRetry } from '@starway/db'
import type { PrismaClient as GeneratedPrismaClient } from '@starway/db/prisma-client'

export const prisma: GeneratedPrismaClient = dbPrisma as unknown as GeneratedPrismaClient
export { withRetry }
