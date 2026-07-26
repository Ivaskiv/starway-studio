import { parse as parseEnv } from 'dotenv'
import type { Express } from 'express'
import { existsSync, readFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { Socket } from 'node:net'
import { dirname, resolve } from 'node:path'
import { monitorEventLoopDelay } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

import { prisma, withRetry } from '../db/client.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = dirname(currentFilePath)
const backendEnvPath = resolve(currentDirPath, '../../.env')
const backendLocalEnvPath = resolve(currentDirPath, '../../.env.local')
const rootEnvPath = resolve(currentDirPath, '../../../.env')
const rootLocalEnvPath = resolve(currentDirPath, '../../../.env.local')
let envLoaded = false
let prismaDisconnectPromise: Promise<void> | null = null

export function loadRuntimeEnv(): void {
  if (envLoaded) return

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

  envLoaded = true
}

export function startRuntimeEventLoopMonitor(): (() => void) | null {
  const dbForensicLogging = process.env.DB_FORENSIC_LOGGING === 'true'
  if (!dbForensicLogging) {
    return null
  }

  const eventLoopMonitor = monitorEventLoopDelay({ resolution: 20 })
  eventLoopMonitor.enable()

  const forensicEventLoopInterval = setInterval(() => {
    console.log('[EVENT_LOOP]', {
      mean: Math.round(eventLoopMonitor.mean / 1e6),
      max: Math.round(eventLoopMonitor.max / 1e6),
    })
    eventLoopMonitor.reset()
  }, 30000)
  forensicEventLoopInterval.unref?.()

  return () => {
    clearInterval(forensicEventLoopInterval)
    eventLoopMonitor.disable()
  }
}

export async function runShutdownStep(name: string, step: () => void | Promise<void>) {
  const startedAt = Date.now()
  console.log(`[shutdown] START ${name}`)
  try {
    await step()
  } finally {
    console.log(`[shutdown] STOP ${name} duration=${Date.now() - startedAt}ms`)
  }
}

export function describeDatabaseTarget(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return {
      configured: false,
      host: 'missing',
      port: 'missing',
    }
  }

  try {
    const parsed = new URL(databaseUrl)
    return {
      configured: true,
      host: parsed.hostname || 'unknown',
      port: parsed.port || 'default',
    }
  } catch {
    return {
      configured: true,
      host: 'invalid-url',
      port: 'invalid-url',
    }
  }
}

export async function connectDatabaseWithRetry(retries = 3, delayMs = 3000): Promise<void> {
  for (let index = 0; index < retries; index += 1) {
    try {
      await withRetry(() => prisma.$connect())
      await withRetry(() => prisma.$queryRaw`SELECT 1`)
      return
    } catch (error) {
      if (index < retries - 1) {
        console.log(`⚠️ DB retry ${index + 1}/${retries}...`)
        await wait(delayMs)
        continue
      }
      throw error
    }
  }
}

export async function safePrismaDisconnect(reason: string) {
  if (prismaDisconnectPromise) {
    return prismaDisconnectPromise
  }

  prismaDisconnectPromise = prisma
    .$disconnect()
    .catch((error) => {
      console.warn(`⚠️ [PRISMA] Disconnect failed during ${reason}:`, error)
    })
    .finally(() => {
      prismaDisconnectPromise = null
    })

  return prismaDisconnectPromise
}

export function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export async function startHttpServer(input: {
  app: Express
  port: number
  isProduction: boolean
  onStarted?: (server: Server) => void
}): Promise<Server> {
  const maxPortRetries = input.isProduction ? 1 : 20
  const portRetryDelayMs = 250

  for (let attempt = 1; attempt <= maxPortRetries; attempt += 1) {
    try {
      const server = await new Promise<Server>((resolve, reject) => {
        const candidate = input.app.listen(input.port, '0.0.0.0')
        candidate.once('listening', () => resolve(candidate))
        candidate.once('error', (error) => reject(error))
      })

      input.onStarted?.(server)
      return server
    } catch (error) {
      const bindError = error as NodeJS.ErrnoException
      const canRetry =
        bindError?.code === 'EADDRINUSE' &&
        !input.isProduction &&
        attempt < maxPortRetries

      if (canRetry) {
        console.warn(
          `[dev-reload] port ${input.port} still busy, waiting for previous process to exit (${attempt}/${maxPortRetries - 1})`,
        )
        await wait(portRetryDelayMs)
        continue
      }

      if (bindError?.code === 'EADDRINUSE') {
        console.error(`❌ Port ${input.port} is already in use. Stop existing process or change PORT.`)
        process.exit(1)
      }

      console.error('❌ Server error:', error)
      process.exit(1)
    }
  }

  throw new Error(`failed to bind port ${input.port}`)
}

export function createConnectionTracker() {
  const connections = new Set<Socket>()

  return {
    attach(server: Server) {
      server.on('connection', (socket) => {
        connections.add(socket)
        socket.once('close', () => connections.delete(socket))
      })
    },
    destroyAll() {
      connections.forEach((socket) => socket.destroy())
      connections.clear()
    },
  }
}

export function registerRuntimeProcessHandlers(shutdown: (signal: string) => Promise<void>) {
  process.once('exit', (code) => {
    console.log('[shutdown] process exit, code:', code)
  })

  process.once('SIGINT', () => {
    void shutdown('SIGINT')
  })

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM')
  })

  process.on('unhandledRejection', (reason) => {
    console.error('[unhandled]', reason)
  })
}
