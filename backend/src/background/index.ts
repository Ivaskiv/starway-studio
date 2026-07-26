import { prisma } from '../db/client.js'
import { seedDefaultAvailability } from '../modules/zoom/index.js'
import { readCoachBotToken } from '../modules/telegram-mentor/runtime/botConfig.js'
import { stopScheduler, startScheduler } from '../services/scheduler/index.js'
import { startDnaQueueTelemetry } from '../core/dna/telemetry/dna.queue-telemetry.js'
import { startDnaQueueWorkers, stopDnaQueueWorkers } from '../core/dna/queues/dna.workers.js'
import {
  connectDatabaseWithRetry,
  describeDatabaseTarget,
  loadRuntimeEnv,
  registerRuntimeProcessHandlers,
  runShutdownStep,
  safePrismaDisconnect,
  startRuntimeEventLoopMonitor,
} from '../runtime/runtimeBootstrap.js'

loadRuntimeEnv()

const stopEventLoopMonitor = startRuntimeEventLoopMonitor()
let isShuttingDown = false

function describeBackgroundRuntime() {
  return {
    runtime: 'background',
    env: process.env.NODE_ENV || 'development',
    schedulerEnabled: process.env.DISABLE_SCHEDULERS !== 'true',
    notificationWorkerEnabled: process.env.DISABLE_NOTIFICATION_JOB_WORKER !== 'true',
    runtimeOutboxWorkerEnabled: process.env.DISABLE_RUNTIME_OUTBOX_WORKER !== 'true',
    dnaQueueEnabled: process.env.DNA_DISTRIBUTED_QUEUE_ENABLED === 'true',
    telegramOwnership: 'interactive_only',
    coachBotConfigured: Boolean(readCoachBotToken()),
  }
}

async function bootstrap() {
  console.log('🚀 [runtime] background bootstrap starting', describeBackgroundRuntime())

  try {
    const databaseTarget = describeDatabaseTarget(process.env.DATABASE_URL?.trim())
    await connectDatabaseWithRetry()
    console.log('✅ Background runtime ready', {
      ...describeBackgroundRuntime(),
      dbHost: databaseTarget.host,
    })
  } catch (err: unknown) {
    console.error('❌ [BOOT] Background DB unavailable, runtime cannot continue', {
      target: describeDatabaseTarget(process.env.DATABASE_URL?.trim()),
      error: err instanceof Error ? err.message : err,
    })
    process.exit(1)
  }

  startScheduler()
  startDnaQueueTelemetry()
  await startDnaQueueWorkers().catch((error) => {
    console.warn('⚠️ [DNA][queue] workers startup skipped', {
      error: error instanceof Error ? error.message : String(error),
    })
  })

  if (process.env.NODE_ENV !== 'production') {
    prisma.expert.findFirst().then((expert) => {
      if (expert) {
        seedDefaultAvailability(expert.id).catch(() => undefined)
      }
    }).catch(() => undefined)
  }
}

async function shutdown(signal: string) {
  if (isShuttingDown) {
    console.log(`[shutdown] ${signal} received again, background shutdown already in progress`)
    return
  }

  isShuttingDown = true
  console.log(`[shutdown] background ${signal}`)

  const forceKill = setTimeout(() => {
    console.error('⚠️ Forced background shutdown after timeout')
    process.exit(1)
  }, 5000).unref()

  try {
    await runShutdownStep('stop scheduler', async () => {
      stopScheduler()
    })

    await runShutdownStep('stop dna workers', async () => {
      await stopDnaQueueWorkers().catch(() => undefined)
    })

    await runShutdownStep('disconnect prisma', async () => {
      await safePrismaDisconnect(`background:${signal}`)
      console.log('🔌 Background database disconnected')
    })

    stopEventLoopMonitor?.()
    console.log('✅ Background shutdown complete')
    clearTimeout(forceKill)
    setImmediate(() => process.exit(0))
  } catch (error) {
    console.error('⚠️ Background shutdown error:', error)
    clearTimeout(forceKill)
    process.exit(1)
  }
}

registerRuntimeProcessHandlers(shutdown)
void bootstrap()
