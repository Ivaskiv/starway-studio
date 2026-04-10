import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '../generated/prisma/index.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = dirname(currentFilePath)

loadEnv({ path: resolve(currentDirPath, '../../../.env') })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function isRecoverableConnectionMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('error in postgresql connection') ||
    normalized.includes('connection closed') ||
    normalized.includes('kind: closed') ||
    normalized.includes('server closed the connection')
  )
}

const prismaClientSingleton = () =>
  new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

;(prisma as any).$on('error', (event: { message: string }) => {
  if (isRecoverableConnectionMessage(event.message)) {
    return
  }
  console.error('prisma:error', event.message)
})

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

  return isRecoverableConnectionMessage(error.message)
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
