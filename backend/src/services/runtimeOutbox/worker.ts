import { processRuntimeOutbox } from '../../core/runtime/runtimeOutbox.js'

const OUTBOX_WORKER_DISABLED = process.env.DISABLE_RUNTIME_OUTBOX_WORKER === 'true'
const POLL_INTERVAL_MS = 5_000
const OUTBOX_BATCH_LIMIT = 25

let workerTimer: NodeJS.Timeout | null = null
let workerRunning = false
let workerStopping = false

export async function processDueRuntimeOutbox(limit = OUTBOX_BATCH_LIMIT) {
  if (workerRunning || workerStopping) return
  workerRunning = true

  try {
    await processRuntimeOutbox(limit)
  } finally {
    workerRunning = false
  }
}

export function startRuntimeOutboxWorker() {
  if (OUTBOX_WORKER_DISABLED) {
    console.log('🔕 [runtime] runtime outbox worker disabled (DISABLE_RUNTIME_OUTBOX_WORKER=true)')
    return
  }

  if (workerTimer) {
    console.log('🔁 [runtime] runtime outbox worker already running, skip duplicate startup')
    return
  }

  workerStopping = false
  workerTimer = setInterval(() => {
    if (workerStopping) return
    void processDueRuntimeOutbox().catch((error) => {
      console.error('[RuntimeOutboxWorker] process failed', error)
    })
  }, POLL_INTERVAL_MS)
  workerTimer.unref()
  console.log(`📦 [runtime] runtime outbox worker enabled (interval=${POLL_INTERVAL_MS}ms)`)
}

export function stopRuntimeOutboxWorker() {
  workerStopping = true
  if (!workerTimer) return
  clearInterval(workerTimer)
  workerTimer = null
  console.log('🛑 [runtime] runtime outbox worker stopped')
}
