import { prisma } from '../db/client.js'
import { Prisma } from '@starway/db/prisma-client'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as JsonRecord
}

function isBlank(value: string | null | undefined): boolean {
  return !value || !value.trim()
}

function normalizeName(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim()
  return normalized ? normalized : null
}

function parseArgs() {
  const args = new Set(process.argv.slice(2))
  return {
    apply: args.has('--apply'),
    limit: Number(process.env.BACKFILL_LIMIT ?? '0') || 0,
  }
}

async function main() {
  const { apply, limit } = parseArgs()
  const users = await prisma.user.findMany({
    ...(limit > 0 ? { take: limit } : {}),
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      settings: true,
      currentStep: true,
      currentState: true,
      funnelStage: true,
    },
  })

  let willUpdate = 0
  let settingsUiMergeCount = 0

  for (const user of users) {
    const patch: {
      settings?: Prisma.InputJsonValue
    } = {}

    const rootSettings = asRecord(user.settings) ?? {}
    const nestedUi = asRecord(rootSettings.ui) ?? {}
    if (Object.keys(nestedUi).length > 0) {
      patch.settings = { ...rootSettings, ui: nestedUi } as Prisma.InputJsonValue
      settingsUiMergeCount += 1
    }

    const hasPatch =
      Object.prototype.hasOwnProperty.call(patch, 'settings')
    if (!hasPatch) continue
    willUpdate += 1

    if (apply) {
      await prisma.user.update({
        where: { id: user.id },
        data: patch,
      })
    }
  }

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    scannedUsers: users.length,
    willUpdate,
    settingsUiMergeCount,
    note: 'Legacy columns were dropped. Script now only verifies/settings.ui normalization.',
  }

  console.log(JSON.stringify(report, null, 2))
}

main()
  .catch((error) => {
    console.error('[user-consolidation-backfill] failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
