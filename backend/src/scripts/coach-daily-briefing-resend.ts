import { pathToFileURL } from 'node:url'

import { prisma } from '../db/client.js'
import { runManualCoachDailyBriefing, type ManualCoachBriefingArgs } from '../services/scheduler/daily/coach/manual-resend.js'

export function parseArgs(argv = process.argv.slice(2)): ManualCoachBriefingArgs {
  let send = false
  let runId: string | null = null
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--send') { send = true; continue }
    if (arg === '--dry-run') continue
    if (arg === '--run-id') {
      runId = argv[index + 1]?.trim() || null
      if (!runId) throw new Error('MANUAL_COACH_BRIEFING_RUN_ID_VALUE_MISSING')
      index += 1
      continue
    }
    throw new Error(`MANUAL_COACH_BRIEFING_UNKNOWN_ARGUMENT:${arg}`)
  }
  if (send && !runId) throw new Error('MANUAL_COACH_BRIEFING_SEND_REQUIRES_RUN_ID')
  return { send, runId }
}

async function main(): Promise<void> {
  const result = await runManualCoachDailyBriefing(parseArgs())
  console.log(JSON.stringify(result))
  if (result.mode === 'UNKNOWN') process.exitCode = 2
}

const entryFileUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (entryFileUrl && import.meta.url === entryFileUrl) {
  main()
    .catch((error) => {
      console.error('[coach-daily-briefing-resend] failed', error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
    .finally(async () => prisma.$disconnect())
}
