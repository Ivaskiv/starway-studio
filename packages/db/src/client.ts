import { parse as parseEnv } from 'dotenv'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '../generated/client/index.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = dirname(currentFilePath)
const backendEnvPath = resolve(currentDirPath, '../../../backend/.env')
const backendLocalEnvPath = resolve(currentDirPath, '../../../backend/.env.local')
const rootEnvPath = resolve(currentDirPath, '../../../.env')
const rootLocalEnvPath = resolve(currentDirPath, '../../../.env.local')

{
  const protectedKeys = new Set(Object.keys(process.env))
  const applyEnvFile = (path: string) => {
    if (!existsSync(path)) return

    const parsed = parseEnv(readFileSync(path))
    for (const [key, value] of Object.entries(parsed)) {
      if (protectedKeys.has(key)) continue
      process.env[key] = value
    }
  }

  applyEnvFile(rootEnvPath)
  applyEnvFile(rootLocalEnvPath)
  applyEnvFile(backendEnvPath)
  applyEnvFile(backendLocalEnvPath)
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const globalPrismaKeepAlive = globalThis as typeof globalThis & {
  __starwayDbKeepAliveInterval?: NodeJS.Timeout
}
const DB_FORENSIC_LOGGING = process.env.DB_FORENSIC_LOGGING === 'true'
const RUNTIME_APPLICATION_NAME = `starway-backend-${process.env.NODE_ENV ?? 'development'}-${process.pid}`
type PrismaErrorListenerClient = PrismaClient & {
  $on(event: 'error', callback: (event: { message: string }) => void): void
  $on(
    event: 'warn',
    callback: (event: { message: string }) => void
  ): void
  $on(
    event: 'query',
    callback: (event: { query: string; duration: number; target: string }) => void
  ): void
}
type ForensicQuerySnapshot = {
  at: string
  target: string
  duration: number
  query: string
}
const forensicQueryRingBuffer: ForensicQuerySnapshot[] = []
let lastForensicSnapshotAt = 0

function ensureRuntimeApplicationName(url: URL): void {
  if (!url.searchParams.has('application_name')) {
    url.searchParams.set('application_name', RUNTIME_APPLICATION_NAME)
  }
}

function pushForensicQuerySnapshot(snapshot: ForensicQuerySnapshot): void {
  if (!DB_FORENSIC_LOGGING) {
    return
  }

  forensicQueryRingBuffer.push(snapshot)
  if (forensicQueryRingBuffer.length > 5) {
    forensicQueryRingBuffer.shift()
  }
}

function dumpForensicQuerySnapshots(source: string): void {
  if (!DB_FORENSIC_LOGGING) {
    return
  }

  console.warn('[DB_FORENSIC_LAST_QUERIES]', {
    source,
    lastQueries: forensicQueryRingBuffer,
  })
}

function normalizeDatabaseUrl(input: string | undefined): string | undefined {
  const raw = String(input ?? '').trim()
  if (!raw) {
    return undefined
  }

  try {
    const url = new URL(raw)
    ensureRuntimeApplicationName(url)
    if (url.hostname.includes('pooler.supabase.com')) {
      url.searchParams.set('pgbouncer', 'true')
      url.searchParams.set(
        'connection_limit',
        getConfiguredPoolLimit({
          url,
          envKey: 'PRISMA_POOL_CONNECTION_LIMIT',
          fallback: '10',
        })
      )
      return url.toString()
    }
  } catch {
    return raw
  }

  return raw
}

function getConfiguredPoolLimit(input: {
  url: URL
  envKey: string
  fallback: string
}): string {
  const configured = process.env[input.envKey]?.trim() || input.fallback
  const parsed = Number.parseInt(configured, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return input.fallback
  }

  // Keep pool sizes conservative by default to avoid exhausting Postgres slots
  // across multiple backend instances while still allowing normal request parallelism.
  if (input.url.hostname.includes('pooler.supabase.com')) {
    return String(Math.min(parsed, 10))
  }

  return String(Math.min(parsed, 5))
}

function shouldInjectSupabasePassword(url: URL, raw: string): boolean {
  if (raw.includes('${SUPABASE_DB_PASSWORD}')) {
    return true
  }

  return (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('pooler.supabase.com')
  )
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
    if (!shouldInjectSupabasePassword(url, raw)) {
      return normalizeDatabaseUrl(raw)
    }
    url.password = password
    return normalizeDatabaseUrl(url.toString())
  } catch {
    if (!raw.includes('${SUPABASE_DB_PASSWORD}')) {
      return normalizeDatabaseUrl(raw)
    }

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
    ensureRuntimeApplicationName(url)
    if (!url.searchParams.has('connection_limit')) {
      const envKey = url.hostname.includes('pooler.supabase.com')
        ? 'PRISMA_POOL_CONNECTION_LIMIT'
        : 'PRISMA_DIRECT_CONNECTION_LIMIT'
      const fallback = url.hostname.includes('pooler.supabase.com') ? '5' : '3'
      url.searchParams.set(
        'connection_limit',
        getConfiguredPoolLimit({ url, envKey, fallback })
      )
    }
    return url.toString()
  } catch {
    return raw
  }
}

async function captureForensicPgStatActivitySnapshot(): Promise<void> {
  if (!DB_FORENSIC_LOGGING || !directUrl) {
    return
  }

  const now = Date.now()
  if (now - lastForensicSnapshotAt < 60_000) {
    return
  }
  lastForensicSnapshotAt = now

  const directClient = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: directUrl,
      },
    },
  })

  try {
    const snapshot = await directClient.$queryRaw<
      Array<{
        application_name: string | null
        state: string | null
        count: bigint
      }>
    >`SELECT application_name, state, count(*)
      FROM pg_stat_activity
      GROUP BY application_name, state
      ORDER BY count(*) DESC`

    console.warn('[DB_FORENSIC_SNAPSHOT]', {
      at: new Date(now).toISOString(),
      rows: snapshot.map((row) => ({
        application_name: row.application_name,
        state: row.state,
        count: Number(row.count),
      })),
    })
  } catch (error) {
    console.warn('[DB_FORENSIC_SNAPSHOT_FAILED]', {
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    await directClient.$disconnect().catch(() => undefined)
  }
}

const databaseUrl = applyRuntimePoolLimit(
  resolveSupabasePassword(process.env.DATABASE_URL)
)
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
    log: DB_FORENSIC_LOGGING
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : ['error'],
    datasources: {
      db: {
        url: databaseUrl ?? directUrl,
      },
    },
  })

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (DB_FORENSIC_LOGGING) {
  ;(prisma as PrismaErrorListenerClient).$on('query', (event) => {
    if (event.duration <= 500) {
      return
    }

    const snapshot = {
      at: new Date().toISOString(),
      target: event.target,
      duration: event.duration,
      query: event.query.slice(0, 200),
    }
    pushForensicQuerySnapshot(snapshot)
    console.warn('[DB_SLOW_QUERY]', snapshot)
  })

  ;(prisma as PrismaErrorListenerClient).$on('warn', (event) => {
    console.warn('[PRISMA_WARN]', event.message)
  })
}

;(prisma as PrismaErrorListenerClient).$on('error', (event) => {
  if (DB_FORENSIC_LOGGING && isRecoverableConnectionMessage(event.message)) {
    dumpForensicQuerySnapshots('prisma_error_event')
    void captureForensicPgStatActivitySnapshot()
  }
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
        dumpForensicQuerySnapshots('withRetry_recoverable_connection_error')
        await new Promise<void>(resolve => setTimeout(resolve, delayMs * (index + 1)))
        continue
      }

      throw error
    }
  }

  throw new Error('withRetry exhausted')
}
