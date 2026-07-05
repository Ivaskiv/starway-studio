import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '../generated/client/index.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = dirname(currentFilePath)
const backendEnvPath = resolve(currentDirPath, '../../../backend/.env')
const rootEnvPath = resolve(currentDirPath, '../../../.env')
if (existsSync(rootEnvPath)) {
  loadEnv({ path: rootEnvPath })
}
if (existsSync(backendEnvPath)) {
  loadEnv({ path: backendEnvPath, override: true })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const globalPrismaKeepAlive = globalThis as typeof globalThis & {
  __starwayDbKeepAliveInterval?: NodeJS.Timeout
}
type PrismaErrorListenerClient = PrismaClient & {
  $on(event: 'error', callback: (event: { message: string }) => void): void
}

function normalizeDatabaseUrl(input: string | undefined): string | undefined {
  const raw = String(input ?? '').trim()
  if (!raw) {
    return undefined
  }

  try {
    const url = new URL(raw)
    if (url.hostname.includes('pooler.supabase.com')) {
      url.searchParams.set('pgbouncer', 'true')
      url.searchParams.set('connection_limit', '1')
      return url.toString()
    }
  } catch {
    return raw
  }

  return raw
}

function resolveSupabasePassword(input: string | undefined): string | undefined {
  const raw = String(input ?? '').trim()
  if (!raw) {
    return undefined
  }

  const password = process.env.SUPABASE_DB_PASSWORD?.trim()
  if (!password) {
    return normalizeDatabaseUrl(raw)
  }

  try {
    const url = new URL(raw)
    url.password = password
    return normalizeDatabaseUrl(url.toString())
  } catch {
    return normalizeDatabaseUrl(raw.replace(/\$\{SUPABASE_DB_PASSWORD\}/g, password))
  }
}

function applyRuntimePoolLimit(input: string | undefined): string | undefined {
  const raw = String(input ?? '').trim()
  if (!raw) {
    return undefined
  }

  try {
    const url = new URL(raw)
    if (!url.searchParams.has('connection_limit')) {
      const configuredLimit =
        process.env.PRISMA_POOL_CONNECTION_LIMIT?.trim() || '5'
      url.searchParams.set('connection_limit', configuredLimit)
    }
    return url.toString()
  } catch {
    return raw
  }
}

const databaseUrl = resolveSupabasePassword(process.env.DATABASE_URL)
const directUrl = applyRuntimePoolLimit(
  resolveSupabasePassword(process.env.DIRECT_URL)
)

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl
}
if (directUrl) {
  process.env.DIRECT_URL = directUrl
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
    log: ['error'],
    datasources: {
      db: {
        url: directUrl ?? databaseUrl,
      },
    },
  })

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

;(prisma as PrismaErrorListenerClient).$on('error', (event) => {
  if (isRecoverableConnectionMessage(event.message)) {
    return
  }
  console.error('prisma:error', event.message)
})

if (!globalPrismaKeepAlive.__starwayDbKeepAliveInterval) {
  globalPrismaKeepAlive.__starwayDbKeepAliveInterval = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      // reconnect automatically on the next query
    }
  }, 4 * 60 * 1000)

  globalPrismaKeepAlive.__starwayDbKeepAliveInterval.unref?.()
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

if (!databaseUrl) {
  console.warn('[db] DATABASE_URL is not configured; Prisma will remain unavailable until env is loaded correctly')
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

export async function ensureDbConnected(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    console.warn('[prisma] connection lost, attempting reconnect...')
    await reconnectPrisma()
  }
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
