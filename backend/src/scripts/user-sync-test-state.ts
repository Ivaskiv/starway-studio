import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { prisma } from '../db/client.js'
import { findLinkedUserId } from '../modules/telegram-mentor/services/identity/linking.js'
import {
  activateProductSubscription,
  type ActivationResult,
} from '../modules/subscriptions/payments/activation.js'
import { getUserAccessState } from '../modules/subscriptions/payments/focus-access.js'
import {
  getUpcomingZoomBookingView,
  registerAttendee,
  unbookSlot,
} from '../modules/zoom/service.js'

type ScriptArgs = {
  telegramId: string
  snapshotFile: string
}

type FocusSnapshot = {
  active: boolean
  expiresAt: string | null
}

type TrialZoomSnapshot = {
  eligible: boolean
}

type ZoomSnapshot = {
  sessionId: string
  startsAt: string
  status: 'SCHEDULED'
  booked: boolean
}

export type UserTestStateSnapshot = {
  telegramFromId: string
  focus?: FocusSnapshot
  trialZoom?: TrialZoomSnapshot
  zoom?: ZoomSnapshot
}

type SyncReport = {
  telegramFromId: string
  userId: string
  actions: {
    focus: 'noop' | 'activated'
    trialZoom: 'noop' | 'reset'
    zoom: 'noop' | 'booked' | 'unbooked' | 'rebooked'
  }
  before: {
    access: Awaited<ReturnType<typeof getUserAccessState>>
    zoom: Awaited<ReturnType<typeof getUpcomingZoomBookingView>>
  }
  after: {
    access: Awaited<ReturnType<typeof getUserAccessState>>
    zoom: Awaited<ReturnType<typeof getUpcomingZoomBookingView>>
  }
}

function parseIsoDate(value: string | null | undefined, field: string): Date | null {
  if (value == null) return null
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`Invalid ${field}: ${value}`)
  }
  return parsed
}

function parseArgs(argv = process.argv.slice(2)): ScriptArgs {
  let telegramId = ''
  let snapshotFile = ''

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--telegram-id') {
      telegramId = String(argv[index + 1] ?? '').trim()
      index += 1
      continue
    }

    if (arg === '--snapshot-file') {
      snapshotFile = String(argv[index + 1] ?? '').trim()
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  if (!telegramId) {
    throw new Error('Missing required --telegram-id')
  }

  if (!snapshotFile) {
    throw new Error('Missing required --snapshot-file')
  }

  return { telegramId, snapshotFile }
}

export function loadSnapshot(snapshotFile: string): UserTestStateSnapshot {
  const raw = readFileSync(resolve(snapshotFile), 'utf8')
  const parsed = JSON.parse(raw) as UserTestStateSnapshot

  if (String(parsed?.telegramFromId ?? '').trim() === '') {
    throw new Error('Snapshot must contain telegramFromId')
  }

  if (!parsed?.focus && !parsed?.trialZoom && !parsed?.zoom) {
    throw new Error('Snapshot must contain at least one of focus, trialZoom, or zoom')
  }

  if (parsed?.focus && typeof parsed.focus.active !== 'boolean') {
    throw new Error('Snapshot focus must contain active')
  }

  if (parsed?.trialZoom && typeof parsed.trialZoom.eligible !== 'boolean') {
    throw new Error('Snapshot trialZoom must contain eligible')
  }

  if (parsed?.zoom) {
    if (String(parsed.zoom.sessionId ?? '').trim() === '') {
      throw new Error('Snapshot must contain zoom.sessionId')
    }

    if (String(parsed.zoom.startsAt ?? '').trim() === '') {
      throw new Error('Snapshot must contain zoom.startsAt')
    }

    if (parsed.zoom.status !== 'SCHEDULED') {
      throw new Error('Snapshot currently supports only zoom.status=SCHEDULED')
    }

    if (typeof parsed.zoom.booked !== 'boolean') {
      throw new Error('Snapshot must contain zoom.booked')
    }
  }

  return parsed
}

function sameInstant(left: Date | null, right: Date | null): boolean {
  return (left?.getTime() ?? null) === (right?.getTime() ?? null)
}

async function resolveCanonicalUserId(telegramFromId: string): Promise<string> {
  const userId = await findLinkedUserId({
    chatId: telegramFromId,
    telegramUserId: telegramFromId,
    telegramUserName: null,
  })

  if (!userId) {
    throw new Error(`Local canonical user not found for telegramFromId=${telegramFromId}`)
  }

  return userId
}

function shouldSyncFocusAccess(params: {
  current: Awaited<ReturnType<typeof getUserAccessState>>
  desired: FocusSnapshot
}): boolean {
  const desiredExpiresAt = parseIsoDate(params.desired.expiresAt, 'focus.expiresAt')
  return (
    params.current.state !== 'FOCUS_ACTIVE'
    || !sameInstant(params.current.expiresAt, desiredExpiresAt)
  )
}

async function syncFocusAccess(params: {
  userId: string
  snapshot: FocusSnapshot
  current: Awaited<ReturnType<typeof getUserAccessState>>
}): Promise<{ action: 'noop' | 'activated'; activationResult: ActivationResult | null }> {
  if (!params.snapshot.active) {
    throw new Error('focus.active=false is unsupported without a canonical revoke path')
  }

  if (!shouldSyncFocusAccess({ current: params.current, desired: params.snapshot })) {
    return { action: 'noop', activationResult: null }
  }

  const desiredExpiresAt = parseIsoDate(params.snapshot.expiresAt, 'focus.expiresAt')
  if (!desiredExpiresAt) {
    throw new Error('focus.expiresAt is required when focus.active=true')
  }

  const activationResult = await activateProductSubscription({
    userId: params.userId,
    productCode: 'focus',
    source: 'admin_manual',
    manualNote: 'codex parity sync',
    expiresAtOverride: desiredExpiresAt,
    autoBookGroupSessions: false,
  })

  if (!activationResult.success) {
    throw new Error(`Focus activation failed: ${activationResult.message}`)
  }

  return { action: 'activated', activationResult }
}

type TrialZoomResetResult = {
  action: 'noop' | 'reset'
  dryRun: {
    subscriptions: number
    paymentLogs: number
    checkoutSessions: number
  }
  mutated: {
    subscriptions: number
    paymentLogs: number
    checkoutSessions: number
  }
}

async function resetTrialZoomUsage(params: {
  userId: string
  snapshot: TrialZoomSnapshot
}): Promise<TrialZoomResetResult> {
  if (!params.snapshot.eligible) {
    return {
      action: 'noop',
      dryRun: { subscriptions: 0, paymentLogs: 0, checkoutSessions: 0 },
      mutated: { subscriptions: 0, paymentLogs: 0, checkoutSessions: 0 },
    }
  }

  const trialProducts = await prisma.product.findMany({
    where: { code: { equals: 'trial_zoom', mode: 'insensitive' } },
    select: { id: true },
  })
  const trialProductIds = trialProducts.map((product) => product.id)

  const [subscriptions, paymentLogs, checkoutSessions] = await Promise.all([
    trialProductIds.length > 0
      ? prisma.productSubscription.count({
          where: {
            userId: params.userId,
            productId: { in: trialProductIds },
          },
        })
      : Promise.resolve(0),
    prisma.paymentLog.count({
      where: {
        userId: params.userId,
        OR: [
          { orderReference: { startsWith: 'trial_zoom_single_' } },
          { metadata: { path: ['productId'], equals: 'trial_zoom' } },
        ],
      },
    }),
    prisma.checkoutSession.count({
      where: {
        userId: params.userId,
        productCode: 'trial_zoom',
      },
    }),
  ])

  if (subscriptions === 0 && paymentLogs === 0 && checkoutSessions === 0) {
    return {
      action: 'noop',
      dryRun: { subscriptions, paymentLogs, checkoutSessions },
      mutated: { subscriptions: 0, paymentLogs: 0, checkoutSessions: 0 },
    }
  }

  const [deletedSubscriptions, deletedPaymentLogs, deletedCheckoutSessions] = await prisma.$transaction(
    async (tx) => Promise.all([
      trialProductIds.length > 0
        ? tx.productSubscription.deleteMany({
            where: {
              userId: params.userId,
              productId: { in: trialProductIds },
            },
          })
        : Promise.resolve({ count: 0 }),
      tx.paymentLog.deleteMany({
        where: {
          userId: params.userId,
          OR: [
            { orderReference: { startsWith: 'trial_zoom_single_' } },
            { metadata: { path: ['productId'], equals: 'trial_zoom' } },
          ],
        },
      }),
      tx.checkoutSession.deleteMany({
        where: {
          userId: params.userId,
          productCode: 'trial_zoom',
        },
      }),
    ]),
  )

  return {
    action: 'reset',
    dryRun: { subscriptions, paymentLogs, checkoutSessions },
    mutated: {
      subscriptions: deletedSubscriptions.count,
      paymentLogs: deletedPaymentLogs.count,
      checkoutSessions: deletedCheckoutSessions.count,
    },
  }
}

async function resolveTargetZoomSession(snapshot: ZoomSnapshot) {
  const session = await prisma.zoomSession.findUnique({
    where: { id: snapshot.sessionId },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
    },
  })

  if (!session) {
    throw new Error(`Zoom session not found locally: ${snapshot.sessionId}`)
  }

  if (session.status !== snapshot.status) {
    throw new Error(`Local zoom session ${session.id} has status=${session.status}, expected=${snapshot.status}`)
  }

  const desiredStartsAt = parseIsoDate(snapshot.startsAt, 'zoom.startsAt')
  if (!desiredStartsAt || session.scheduledAt.getTime() !== desiredStartsAt.getTime()) {
    throw new Error(
      `Local zoom session ${session.id} has scheduledAt=${session.scheduledAt.toISOString()}, expected=${snapshot.startsAt}`,
    )
  }

  return session
}

async function syncZoomBooking(params: {
  userId: string
  snapshot: ZoomSnapshot
  current: Awaited<ReturnType<typeof getUpcomingZoomBookingView>>
}): Promise<'noop' | 'booked' | 'unbooked' | 'rebooked'> {
  const targetSession = await resolveTargetZoomSession(params.snapshot)
  const currentBookedSessionId = params.current?.isMyBooking ? params.current.id : null

  if (params.snapshot.booked) {
    if (currentBookedSessionId === targetSession.id) {
      return 'noop'
    }

    if (currentBookedSessionId && currentBookedSessionId !== targetSession.id) {
      await unbookSlot(currentBookedSessionId, params.userId)
      await registerAttendee(params.userId, targetSession.id)
      return 'rebooked'
    }

    await registerAttendee(params.userId, targetSession.id)
    return 'booked'
  }

  if (!currentBookedSessionId) {
    return 'noop'
  }

  await unbookSlot(currentBookedSessionId, params.userId)
  return 'unbooked'
}

export async function syncUserTestState(input: {
  telegramId: string
  snapshot: UserTestStateSnapshot
}): Promise<SyncReport> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('user-sync-test-state is disabled in production')
  }

  if (input.telegramId !== input.snapshot.telegramFromId) {
    throw new Error(
      `CLI telegram id ${input.telegramId} does not match snapshot telegramFromId ${input.snapshot.telegramFromId}`,
    )
  }

  const userId = await resolveCanonicalUserId(input.telegramId)
  const beforeAccess = await getUserAccessState(userId)
  const beforeZoom = await getUpcomingZoomBookingView(userId)

  const trialZoomResult = input.snapshot.trialZoom
    ? await resetTrialZoomUsage({
        userId,
        snapshot: input.snapshot.trialZoom,
      })
    : {
        action: 'noop' as const,
        dryRun: { subscriptions: 0, paymentLogs: 0, checkoutSessions: 0 },
        mutated: { subscriptions: 0, paymentLogs: 0, checkoutSessions: 0 },
      }

  const focusResult = input.snapshot.focus
    ? await syncFocusAccess({
        userId,
        snapshot: input.snapshot.focus,
        current: beforeAccess,
      })
    : { action: 'noop' as const, activationResult: null }

  const zoomAction = input.snapshot.zoom
    ? await syncZoomBooking({
        userId,
        snapshot: input.snapshot.zoom,
        current: beforeZoom,
      })
    : 'noop'

  const afterAccess = await getUserAccessState(userId)
  const afterZoom = await getUpcomingZoomBookingView(userId)
  const desiredFocusExpiresAt = input.snapshot.focus
    ? parseIsoDate(input.snapshot.focus.expiresAt, 'focus.expiresAt')
    : null

  if (input.snapshot.focus?.active) {
    if (afterAccess.state !== 'FOCUS_ACTIVE') {
      throw new Error(`Focus parity verification failed: got ${afterAccess.state}`)
    }
    if (!sameInstant(afterAccess.expiresAt, desiredFocusExpiresAt)) {
      throw new Error(
        `Focus parity verification failed: got expiresAt=${afterAccess.expiresAt?.toISOString() ?? null}`,
      )
    }
  }

  if (input.snapshot.trialZoom?.eligible) {
    const trialEligibilityProbe = await prisma.productSubscription.findFirst({
      where: {
        userId,
        product: {
          code: { equals: 'trial_zoom', mode: 'insensitive' },
        },
      },
      select: { id: true },
    })
    if (trialEligibilityProbe) {
      throw new Error('Trial parity verification failed: trial_zoom subscription still exists')
    }
  }

  if (input.snapshot.zoom?.booked) {
    if (!afterZoom?.isMyBooking || afterZoom.id !== input.snapshot.zoom.sessionId) {
      throw new Error('Zoom parity verification failed: expected booked target session')
    }
  } else if (input.snapshot.zoom && afterZoom?.isMyBooking) {
    throw new Error(`Zoom parity verification failed: still booked on session ${afterZoom.id}`)
  }

  return {
    telegramFromId: input.telegramId,
    userId,
    actions: {
      focus: focusResult.action,
      trialZoom: trialZoomResult.action,
      zoom: zoomAction,
    },
    before: {
      access: beforeAccess,
      zoom: beforeZoom,
    },
    after: {
      access: afterAccess,
      zoom: afterZoom,
    },
  }
}

async function main() {
  const args = parseArgs()
  const snapshot = loadSnapshot(args.snapshotFile)
  const report = await syncUserTestState({
    telegramId: args.telegramId,
    snapshot,
  })
  console.log(JSON.stringify(report, null, 2))
}

const entryFileUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : null

if (entryFileUrl && import.meta.url === entryFileUrl) {
  main()
    .catch((error) => {
      console.error('[user-sync-test-state] failed', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

export {
  parseArgs,
}
