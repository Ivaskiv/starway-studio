import { pathToFileURL } from 'node:url'

import { prisma } from '../db/client.js'
import {
  backfillCancelledLegacyIndividual,
  listLegacyIndividualOrphans,
} from '../modules/zoom/commerce/zoom.commerce-request.service.js'

type ScriptArgs = {
  userId: string
  sessionIds: string[]
  apply: boolean
}

function parseArgs(argv = process.argv.slice(2)): ScriptArgs {
  let userId = ''
  const sessionIds: string[] = []
  let apply = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--user-id') {
      userId = argv[index + 1]?.trim() ?? ''
      if (!userId) throw new Error('Missing value for --user-id')
      index += 1
      continue
    }
    if (arg === '--session-id') {
      const sessionId = argv[index + 1]?.trim() ?? ''
      if (!sessionId) throw new Error('Missing value for --session-id')
      sessionIds.push(sessionId)
      index += 1
      continue
    }
    if (arg === '--apply') {
      apply = true
      continue
    }
    if (arg === '--dry-run') continue
    throw new Error(`Unknown argument: ${arg}`)
  }

  if (!userId) throw new Error('Provide --user-id <UUID>')
  if (apply && sessionIds.length === 0) {
    throw new Error('Apply mode requires at least one explicit --session-id')
  }
  return { userId, sessionIds: [...new Set(sessionIds)], apply }
}

export async function runLegacyIndividualCommerceCleanup(args: ScriptArgs) {
  const orphans = await listLegacyIndividualOrphans(args.userId)
  const bySessionId = new Map(orphans.map(row => [row.SESSION_ID, row]))
  const cancellations: Array<Record<string, unknown>> = []

  if (args.apply) {
    for (const sessionId of args.sessionIds) {
      const orphan = bySessionId.get(sessionId)
      if (orphan && orphan.CLASSIFICATION !== 'PROVEN_UNPAID') {
        cancellations.push({
          SESSION_ID: sessionId,
          RESULT: 'SKIPPED',
          CLASSIFICATION: orphan.CLASSIFICATION,
          REASON: orphan.REASON,
        })
        continue
      }
      try {
        const result = await backfillCancelledLegacyIndividual({
          sessionId,
          userId: args.userId,
        })
        cancellations.push({
          SESSION_ID: sessionId,
          RESULT: result.duplicate ? 'ALREADY_CANCELLED' : 'CANCELLED',
          COMMERCE_REQUEST_ID: result.request.id,
          ATTENDEE_REMOVED: result.attendeeRemoved,
        })
      } catch (error) {
        cancellations.push({
          SESSION_ID: sessionId,
          RESULT: 'SKIPPED',
          REASON: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  return {
    MODE: args.apply ? 'CANCEL_SELECTED' : 'DRY_RUN',
    USER_ID: args.userId,
    ORPHANS: orphans,
    CANCELLATIONS: cancellations,
  }
}

async function main() {
  console.log(JSON.stringify(
    await runLegacyIndividualCommerceCleanup(parseArgs()),
    null,
    2,
  ))
}

const entryFileUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : null

if (entryFileUrl && import.meta.url === entryFileUrl) {
  main()
    .catch((error) => {
      console.error('[legacy-individual-commerce-cleanup] failed', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

export { parseArgs }
