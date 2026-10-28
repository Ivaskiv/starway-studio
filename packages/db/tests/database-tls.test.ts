import { afterEach, describe, expect, it, vi } from 'vitest'
import { requireVerifiedDatabaseTls } from '../src/database-tls.js'

const { prismaClientOptions } = vi.hoisted(() => ({
  prismaClientOptions: [] as Array<{ datasources?: { db?: { url?: string } } }>,
}))

vi.mock('../generated/client/index.js', () => ({
  PrismaClient: class {
    constructor(options: { datasources?: { db?: { url?: string } } }) {
      prismaClientOptions.push(options)
    }

    $on() {}
  },
}))

const originalEnvironment = {
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  NODE_ENV: process.env.NODE_ENV,
}

function restoreEnvironment(): void {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function clearPrismaGlobal(): void {
  const globalState = globalThis as typeof globalThis & {
    prisma?: unknown
    __starwayDbKeepAliveInterval?: NodeJS.Timeout
  }

  if (globalState.__starwayDbKeepAliveInterval) {
    clearInterval(globalState.__starwayDbKeepAliveInterval)
  }
  delete globalState.prisma
  delete globalState.__starwayDbKeepAliveInterval
}

afterEach(() => {
  restoreEnvironment()
  clearPrismaGlobal()
  prismaClientOptions.length = 0
  vi.resetModules()
})

describe('requireVerifiedDatabaseTls', () => {
  it('rejects the insecure TLS fallback instead of passing it to Prisma', () => {
    expect(() =>
      requireVerifiedDatabaseTls('postgresql://user:password@db.example.test:5432/app?sslmode=no-verify')
    ).toThrow('insecure TLS mode')
  })

  it('rejects disabled global certificate verification', () => {
    expect(() =>
      requireVerifiedDatabaseTls(
        'postgresql://user:password@db.example.test:5432/app?sslmode=require',
        { NODE_TLS_REJECT_UNAUTHORIZED: '0' },
      )
    ).toThrow('global TLS certificate verification is disabled')
  })

  it('rejects Prisma’s certificate-validation bypass outside local development', () => {
    expect(() =>
      requireVerifiedDatabaseTls(
        'postgresql://user:password@db.example.test:5432/app?sslmode=require&sslaccept=accept_invalid_certs',
        { NODE_ENV: 'production' },
      )
    ).toThrow('certificate validation must be strict')
  })

  it('uses Prisma’s connector-scoped local certificate override while requiring TLS', () => {
    const normalized = requireVerifiedDatabaseTls(
      'postgresql://user:password@db.example.test:5432/app?sslmode=require',
      { NODE_ENV: 'development' },
    )
    const url = new URL(normalized)

    expect(url.searchParams.get('sslmode')).toBe('require')
    expect(url.searchParams.get('sslaccept')).toBe('accept_invalid_certs')
  })

  it('uses Prisma system trust with strict validation while preserving the target', () => {
    const normalized = requireVerifiedDatabaseTls(
      'postgresql://user:password@db.example.test:5432/app?sslmode=require&connection_limit=3',
      { NODE_ENV: 'production' },
    )
    const url = new URL(normalized)

    expect(url.hostname).toBe('db.example.test')
    expect(url.port).toBe('5432')
    expect(url.searchParams.get('sslmode')).toBe('require')
    expect(url.searchParams.get('sslaccept')).toBe('strict')
    expect(url.searchParams.has('sslcert')).toBe(false)
    expect(url.searchParams.get('connection_limit')).toBe('3')
  })

  it('removes an inherited certificate override so Prisma uses system trust', () => {
    const normalized = requireVerifiedDatabaseTls(
      'postgresql://user:password@db.example.test:5432/app?sslmode=require&sslcert=/stale-ca.pem',
      { NODE_ENV: 'production' },
    )

    expect(new URL(normalized).searchParams.has('sslcert')).toBe(false)
  })

  it('uses the strict direct URL for local development instead of the pooler', async () => {
    clearPrismaGlobal()
    prismaClientOptions.length = 0
    vi.resetModules()
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'postgresql://user:password@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'
    process.env.DIRECT_URL = 'postgresql://user:password@db.chshznqddpynpufuxbmt.supabase.co:5432/postgres'

    const { getRuntimePrismaDatasourceTarget } = await import('../src/client.js')

    const runtimeUrl = new URL(prismaClientOptions.at(-1)?.datasources?.db?.url)
    expect(runtimeUrl.hostname).toBe('db.chshznqddpynpufuxbmt.supabase.co')
    expect(runtimeUrl.searchParams.get('connection_limit')).toBe('1')
    expect(runtimeUrl.searchParams.get('sslaccept')).toBe('strict')
    expect(getRuntimePrismaDatasourceTarget()).toEqual({
      configured: true,
      source: 'direct',
      host: 'db.chshznqddpynpufuxbmt.supabase.co',
      port: '5432',
    })
  })

  it('fails closed in local development when DIRECT_URL is unavailable', async () => {
    clearPrismaGlobal()
    vi.resetModules()
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'postgresql://user:password@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'
    // Keep the key present so client.ts cannot refill it from a local env file.
    process.env.DIRECT_URL = ''

    await expect(import('../src/client.js')).rejects.toThrow(
      'DIRECT_URL must be configured for local development; refusing pooler fallback'
    )
  })
})
