import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { prisma } from '../db/client.js'
import {
  activateProductSubscription,
  type GrantSource,
} from '../modules/subscriptions/payments/paymentActivation.service.js'

const FOCUS_PRODUCT_CODE = 'focus'
const LEGACY_FOCUS_EXPIRES_AT = new Date('2027-07-20T23:59:59Z')
const LEGACY_GIFT_NOTE = 'Legacy Gift Focus until 20.07.2027'
const LEGACY_GIFT_SOURCE: GrantSource = 'admin_manual'

type ScriptArgs = {
  telegramIds: string[]
  jsonPath: string | null
  dryRun: boolean
  apply: boolean
}

type JsonInputEntry = string | { telegramUserId?: unknown }

type CurrentFocusAccess = {
  status: string
  expiresAt: string | null
  paidAt: string | null
  manuallyGrantedBy: string | null
  manualGrantNote: string | null
}

type ImportStatus =
  | 'NOT_FOUND'
  | 'DRY_RUN'
  | 'GRANTED'
  | 'SKIPPED_ALREADY_GRANTED'
  | 'SKIPPED_LATER_ACCESS'
  | 'SKIPPED_PAID_SUBSCRIPTION'
  | 'ERROR'

export type LegacyFocusGiftImportRow = {
  telegramUserId: string
  userId: string | null
  status: ImportStatus
  plannedAction: string
  plannedExpiresAt: string
  currentFocusAccess: CurrentFocusAccess | null
}

type FocusSubscriptionSnapshot = {
  status: string
  expiresAt: Date | null
  paidAt: Date | null
  manuallyGrantedBy: string | null
  manualGrantNote: string | null
}

type ImportDecision =
  | { type: 'grant'; plannedAction: string }
  | { type: 'skip'; status: Exclude<ImportStatus, 'NOT_FOUND' | 'DRY_RUN' | 'GRANTED' | 'ERROR'>; plannedAction: string }

function normalizeTelegramId(value: unknown): string | null {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : null
}

function toCurrentFocusAccess(
  subscription: FocusSubscriptionSnapshot | null,
): CurrentFocusAccess | null {
  if (!subscription) return null
  return {
    status: subscription.status,
    expiresAt: subscription.expiresAt?.toISOString() ?? null,
    paidAt: subscription.paidAt?.toISOString() ?? null,
    manuallyGrantedBy: subscription.manuallyGrantedBy ?? null,
    manualGrantNote: subscription.manualGrantNote ?? null,
  }
}

function resolveImportDecision(subscription: FocusSubscriptionSnapshot | null): ImportDecision {
  if (!subscription) {
    return {
      type: 'grant',
      plannedAction: 'create gifted Focus subscription',
    }
  }

  if (subscription.paidAt) {
    return {
      type: 'skip',
      status: 'SKIPPED_PAID_SUBSCRIPTION',
      plannedAction: 'leave existing paid Focus subscription unchanged',
    }
  }

  if (!subscription.expiresAt) {
    return {
      type: 'skip',
      status: 'SKIPPED_LATER_ACCESS',
      plannedAction: 'leave existing unlimited Focus access unchanged',
    }
  }

  if (subscription.expiresAt.getTime() > LEGACY_FOCUS_EXPIRES_AT.getTime()) {
    return {
      type: 'skip',
      status: 'SKIPPED_LATER_ACCESS',
      plannedAction: 'leave existing longer Focus access unchanged',
    }
  }

  if (subscription.expiresAt.getTime() === LEGACY_FOCUS_EXPIRES_AT.getTime()) {
    return {
      type: 'skip',
      status: 'SKIPPED_ALREADY_GRANTED',
      plannedAction: 'leave existing Legacy Gift Focus access unchanged',
    }
  }

  return {
    type: 'grant',
    plannedAction: 'extend Focus access to Legacy Gift expiry',
  }
}

function parseArgs(argv = process.argv.slice(2)): ScriptArgs {
  const telegramIds: string[] = []
  let jsonPath: string | null = null
  let dryRun = true
  let apply = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--telegram-id') {
      const value = argv[index + 1]
      if (!value) throw new Error('Missing value for --telegram-id')
      telegramIds.push(value)
      index += 1
      continue
    }

    if (arg === '--json') {
      const value = argv[index + 1]
      if (!value) throw new Error('Missing value for --json')
      jsonPath = value
      index += 1
      continue
    }

    if (arg === '--dry-run') {
      dryRun = true
      apply = false
      continue
    }

    if (arg === '--apply') {
      apply = true
      dryRun = false
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return { telegramIds, jsonPath, dryRun, apply }
}

function loadTelegramIdsFromJson(jsonPath: string): string[] {
  const raw = readFileSync(resolve(jsonPath), 'utf8')
  const parsed = JSON.parse(raw) as JsonInputEntry[]
  if (!Array.isArray(parsed)) {
    throw new Error('JSON input must be an array of telegram IDs or { telegramUserId } objects')
  }

  return parsed.flatMap((entry) => {
    if (typeof entry === 'string') return [entry]
    const telegramUserId = normalizeTelegramId(entry?.telegramUserId)
    return telegramUserId ? [telegramUserId] : []
  })
}

function collectTelegramIds(input: ScriptArgs): string[] {
  const ids = [
    ...input.telegramIds,
    ...(input.jsonPath ? loadTelegramIdsFromJson(input.jsonPath) : []),
  ]

  return [...new Set(ids.map((value) => normalizeTelegramId(value)).filter((value): value is string => Boolean(value)))]
}

export async function importLegacyFocusGifts(input: {
  telegramIds: string[]
  dryRun: boolean
}): Promise<LegacyFocusGiftImportRow[]> {
  const rows: LegacyFocusGiftImportRow[] = []

  for (const telegramUserId of input.telegramIds) {
    const user = await prisma.user.findUnique({
      where: { telegramUserId },
      select: {
        id: true,
        telegramUserId: true,
        productSubscriptions: {
          where: {
            product: {
              code: { equals: FOCUS_PRODUCT_CODE, mode: 'insensitive' },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            expiresAt: true,
            paidAt: true,
            manuallyGrantedBy: true,
            manualGrantNote: true,
          },
        },
      },
    })

    if (!user) {
      rows.push({
        telegramUserId,
        userId: null,
        status: 'NOT_FOUND',
        plannedAction: 'skip missing user',
        plannedExpiresAt: LEGACY_FOCUS_EXPIRES_AT.toISOString(),
        currentFocusAccess: null,
      })
      continue
    }

    const currentFocusSubscription = user.productSubscriptions[0] ?? null
    const decision = resolveImportDecision(currentFocusSubscription)

    if (input.dryRun) {
      rows.push({
        telegramUserId,
        userId: user.id,
        status: 'DRY_RUN',
        plannedAction: decision.plannedAction,
        plannedExpiresAt: LEGACY_FOCUS_EXPIRES_AT.toISOString(),
        currentFocusAccess: toCurrentFocusAccess(currentFocusSubscription),
      })
      continue
    }

    if (decision.type === 'skip') {
      rows.push({
        telegramUserId,
        userId: user.id,
        status: decision.status,
        plannedAction: decision.plannedAction,
        plannedExpiresAt: LEGACY_FOCUS_EXPIRES_AT.toISOString(),
        currentFocusAccess: toCurrentFocusAccess(currentFocusSubscription),
      })
      continue
    }

    const activationResult = await activateProductSubscription({
      userId: user.id,
      productCode: FOCUS_PRODUCT_CODE,
      source: LEGACY_GIFT_SOURCE,
      manualNote: LEGACY_GIFT_NOTE,
      expiresAtOverride: LEGACY_FOCUS_EXPIRES_AT,
      autoBookGroupSessions: false,
    })

    rows.push({
      telegramUserId,
      userId: user.id,
      status: activationResult.success ? 'GRANTED' : 'ERROR',
      plannedAction: decision.plannedAction,
      plannedExpiresAt: LEGACY_FOCUS_EXPIRES_AT.toISOString(),
      currentFocusAccess: toCurrentFocusAccess(currentFocusSubscription),
    })
  }

  return rows
}

async function main() {
  const args = parseArgs()
  const telegramIds = collectTelegramIds(args)

  if (telegramIds.length === 0) {
    throw new Error('Provide at least one --telegram-id or a --json file')
  }

  const report = await importLegacyFocusGifts({
    telegramIds,
    dryRun: args.dryRun || !args.apply,
  })

  console.log(JSON.stringify({
    mode: args.apply ? 'apply' : 'dry-run',
    focusProductCode: FOCUS_PRODUCT_CODE,
    expiresAt: LEGACY_FOCUS_EXPIRES_AT.toISOString(),
    source: LEGACY_GIFT_SOURCE,
    note: LEGACY_GIFT_NOTE,
    rows: report,
  }, null, 2))
}

const entryFileUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : null

if (entryFileUrl && import.meta.url === entryFileUrl) {
  main()
    .catch((error) => {
      console.error('[legacy-focus-gift-import] failed', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

export {
  FOCUS_PRODUCT_CODE,
  LEGACY_FOCUS_EXPIRES_AT,
  LEGACY_GIFT_NOTE,
  LEGACY_GIFT_SOURCE,
  collectTelegramIds,
  parseArgs,
}
