import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/index.js'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () =>
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

function isPrismaP1001(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P1001'
}

function isRecoverableConnectionError(error: unknown): boolean {
  if (isPrismaP1001(error)) {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('error in postgresql connection') ||
    message.includes('connection closed') ||
    message.includes('kind: closed') ||
    message.includes('server closed the connection')
  )
}

async function reconnectPrisma() {
  await prisma.$disconnect().catch(() => undefined)
  await prisma.$connect().catch(() => undefined)
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  for (let index = 0; index < retries; index += 1) {
    try {
      return await fn()
    } catch (error: unknown) {
      if (isRecoverableConnectionError(error) && index < retries - 1) {
        await new Promise<void>(resolve => setTimeout(resolve, delayMs * (index + 1)))
        await reconnectPrisma()
        continue
      }

      throw error
    }
  }

  throw new Error('withRetry exhausted')
}
