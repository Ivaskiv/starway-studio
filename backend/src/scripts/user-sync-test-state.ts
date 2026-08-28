import type { Prisma, UserLifecycleState } from '@starway/db/prisma-client'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { prisma } from '../db/client.js'
import { buildAbTestProgressPatch } from '../core/state-machine/abTestFoundation.js'
import { syncLifecycleForUser } from '../modules/flow-control/service.js'
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
import {
  loadAbTestProgress,
  saveAbTestProgress,
} from '../products/ab-system/telegram/progress.js'

type ScriptArgs = {
  telegramId: string
  snapshotFile: string
}

type FocusSnapshot = {
  state: 'FOCUS_ACTIVE' | 'NO_ACCESS' | 'EXPIRED_FOCUS'
  expiresAt: string | null
}

type TrialZoomSnapshot = {
  state: 'ELIGIBLE' | 'TRIAL_ACTIVE' | 'NONE'
  trialEndsAt?: string | null
}

type AbTestSnapshot = {
  lifecycleState: UserLifecycleState
  resultKey: 'state' | 'goal' | 'choice' | 'decision' | 'action' | null
  status: 'idle' | 'active' | 'completed' | 'abandoned'
  emailStage: 'pending' | 'captured' | 'skipped' | null
  testCompletedAt?: string | null
  offerShownAt?: string | null
  firstName?: string | null
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
  abTest?: AbTestSnapshot
  zoom?: ZoomSnapshot
}

type SyncReport = {
  telegramFromId: string
  userId: string
  actions: {
    focus: 'noop' | 'activated'
    trialZoom: 'noop' | 'reset' | 'activated'
    abTest: 'noop' | 'synced'
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

type SyncMode = 'dry-run' | 'apply'

type SyncExecutionOptions = {
  mode?: SyncMode
  allowProduction?: boolean
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

  if (!parsed?.focus && !parsed?.trialZoom && !parsed?.zoom && !parsed?.abTest) {
    throw new Error('Snapshot must contain at least one of focus, trialZoom, abTest, or zoom')
  }

  if (
    parsed?.focus &&
    !['FOCUS_ACTIVE', 'NO_ACCESS', 'EXPIRED_FOCUS'].includes(String(parsed.focus.state ?? ''))
  ) {
    throw new Error('Snapshot focus must contain state')
  }

  if (
    parsed?.trialZoom &&
    !['ELIGIBLE', 'TRIAL_ACTIVE', 'NONE'].includes(String(parsed.trialZoom.state ?? ''))
  ) {
    throw new Error('Snapshot trialZoom must contain state')
  }

  if (parsed?.abTest) {
    if (String(parsed.abTest.lifecycleState ?? '').trim() === '') {
      throw new Error('Snapshot abTest must contain lifecycleState')
    }
    if (!['idle', 'active', 'completed', 'abandoned'].includes(String(parsed.abTest.status ?? ''))) {
      throw new Error('Snapshot abTest must contain status')
    }
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

function isApplyMode(mode: SyncMode): boolean {
  return mode === 'apply'
}

function shouldSyncFocusAccess(params: {
  current: Awaited<ReturnType<typeof getUserAccessState>>
  desired: FocusSnapshot
}): boolean {
  const desiredExpiresAt = parseIsoDate(params.desired.expiresAt, 'focus.expiresAt')
  return (
    (params.desired.state === 'FOCUS_ACTIVE' && (
      params.current.state !== 'FOCUS_ACTIVE'
      || !sameInstant(params.current.expiresAt, desiredExpiresAt)
    ))
    || (params.desired.state !== 'FOCUS_ACTIVE' && (
      params.current.state !== 'NO_ACCESS'
      || !sameInstant(params.current.expiresAt, desiredExpiresAt)
    ))
  )
}

async function syncFocusAccess(params: {
  userId: string
  snapshot: FocusSnapshot
  current: Awaited<ReturnType<typeof getUserAccessState>>
  mode: SyncMode
}): Promise<{ action: 'noop' | 'activated'; activationResult: ActivationResult | null }> {
  const desiredExpiresAt = parseIsoDate(params.snapshot.expiresAt, 'focus.expiresAt')

  if (!shouldSyncFocusAccess({ current: params.current, desired: params.snapshot })) {
    return { action: 'noop', activationResult: null }
  }

  if (!isApplyMode(params.mode)) {
    return { action: 'activated', activationResult: null }
  }

  if (params.snapshot.state === 'FOCUS_ACTIVE') {
    if (!desiredExpiresAt) {
      throw new Error('focus.expiresAt is required when focus.state=FOCUS_ACTIVE')
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

  const focusProduct = await prisma.product.findFirst({
    where: { code: { equals: 'focus', mode: 'insensitive' } },
    select: { id: true },
  })
  if (!focusProduct) {
    throw new Error('Focus product not found')
  }

  const now = new Date()
  const expiredAt = desiredExpiresAt ?? new Date(now.getTime() - 60_000)

  await prisma.$transaction(async (tx) => {
    await tx.productSubscription.upsert({
      where: { userId_productId: { userId: params.userId, productId: focusProduct.id } },
      create: {
        userId: params.userId,
        productId: focusProduct.id,
        status: 'expired',
        paidAt: null,
        expiresAt: expiredAt,
        amount: 0,
        manuallyGrantedBy: 'admin_manual',
        manualGrantNote: 'codex parity sync expired focus',
      },
      update: {
        status: 'expired',
        expiresAt: expiredAt,
        trialEndsAt: null,
        paidAt: null,
        manuallyGrantedBy: 'admin_manual',
        manualGrantNote: 'codex parity sync expired focus',
      },
    })

    const existingSubscription = await tx.subscription.findFirst({
      where: { userId: params.userId, productId: focusProduct.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (existingSubscription) {
      await tx.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: 'EXPIRED',
          currentPeriodEnd: expiredAt,
          trialEndsAt: null,
        },
      })
    } else {
      await tx.subscription.create({
        data: {
          userId: params.userId,
          productId: focusProduct.id,
          startsAt: new Date(expiredAt.getTime() - 30 * 24 * 60 * 60 * 1000),
          status: 'EXPIRED',
          planCode: 'focus_expired',
          currentPeriodEnd: expiredAt,
        },
      })
    }

    await tx.user.update({
      where: { id: params.userId },
      data: {
        focusPaid: false,
      },
    })
  })

  return { action: 'activated', activationResult: null }
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
  mode: SyncMode
}): Promise<TrialZoomResetResult> {
  if (params.snapshot.state !== 'ELIGIBLE') {
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

  if (!isApplyMode(params.mode)) {
    return {
      action: 'reset',
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

async function syncTrialZoomAccess(params: {
  userId: string
  snapshot: TrialZoomSnapshot
  mode: SyncMode
}): Promise<'noop' | 'activated'> {
  if (params.snapshot.state === 'NONE') {
    const trialProduct = await prisma.product.findFirst({
      where: { code: { equals: 'trial_zoom', mode: 'insensitive' } },
      select: { id: true },
    })
    if (!trialProduct) {
      throw new Error('trial_zoom product not found')
    }

    const existing = await prisma.productSubscription.findUnique({
      where: { userId_productId: { userId: params.userId, productId: trialProduct.id } },
      select: { status: true },
    })
    if (!existing) {
      return 'noop'
    }

    if (!isApplyMode(params.mode)) {
      return 'activated'
    }

    await prisma.$transaction(async (tx) => {
      await tx.productSubscription.deleteMany({
        where: {
          userId: params.userId,
          productId: trialProduct.id,
        },
      })
      await tx.subscription.deleteMany({
        where: {
          userId: params.userId,
          productId: trialProduct.id,
        },
      })
    })

    return 'activated'
  }

  if (params.snapshot.state !== 'TRIAL_ACTIVE') {
    return 'noop'
  }

  const desiredTrialEndsAt = parseIsoDate(params.snapshot.trialEndsAt, 'trialZoom.trialEndsAt')
  if (!desiredTrialEndsAt) {
    throw new Error('trialZoom.trialEndsAt is required when state=TRIAL_ACTIVE')
  }

  const trialProduct = await prisma.product.findFirst({
    where: { code: { equals: 'trial_zoom', mode: 'insensitive' } },
    select: { id: true },
  })
  if (!trialProduct) {
    throw new Error('trial_zoom product not found')
  }

  const existing = await prisma.productSubscription.findUnique({
    where: { userId_productId: { userId: params.userId, productId: trialProduct.id } },
    select: {
      status: true,
      trialEndsAt: true,
    },
  })
  if (
    existing?.status?.toLowerCase() === 'trial' &&
    sameInstant(existing.trialEndsAt ?? null, desiredTrialEndsAt)
  ) {
    return 'noop'
  }

  if (!isApplyMode(params.mode)) {
    return 'activated'
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.productSubscription.upsert({
      where: { userId_productId: { userId: params.userId, productId: trialProduct.id } },
      create: {
        userId: params.userId,
        productId: trialProduct.id,
        status: 'trial',
        paidAt: now,
        trialEndsAt: desiredTrialEndsAt,
        expiresAt: null,
        amount: 0,
        manuallyGrantedBy: 'admin_manual',
        manualGrantNote: 'codex parity sync trial zoom',
      },
      update: {
        status: 'trial',
        paidAt: now,
        trialEndsAt: desiredTrialEndsAt,
        expiresAt: null,
        manuallyGrantedBy: 'admin_manual',
        manualGrantNote: 'codex parity sync trial zoom',
      },
    })

    const existingSubscription = await tx.subscription.findFirst({
      where: { userId: params.userId, productId: trialProduct.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    if (existingSubscription) {
      await tx.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: 'TRIAL',
          startsAt: now,
          planCode: 'trial_zoom',
          trialEndsAt: desiredTrialEndsAt,
          currentPeriodEnd: null,
        },
      })
    } else {
      await tx.subscription.create({
        data: {
          userId: params.userId,
          productId: trialProduct.id,
          status: 'TRIAL',
          planCode: 'trial_zoom',
          startsAt: now,
          trialEndsAt: desiredTrialEndsAt,
          autoRenew: false,
        },
      })
    }
  })

  return 'activated'
}

async function syncAbTestState(params: {
  userId: string
  snapshot: AbTestSnapshot
  mode: SyncMode
}): Promise<'noop' | 'synced'> {
  const currentProgress = await loadAbTestProgress(params.userId)
  const desiredTestCompletedAt = parseIsoDate(params.snapshot.testCompletedAt, 'abTest.testCompletedAt')
  const desiredOfferShownAt = parseIsoDate(params.snapshot.offerShownAt, 'abTest.offerShownAt')
  const currentUser = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      lifecycleState: true,
      testResultType: true,
      testCompletedAt: true,
      offerShownAt: true,
      firstName: true,
    },
  })
  if (!currentUser) {
    throw new Error('User not found for abTest sync')
  }

  const desiredProgress = buildAbTestProgressPatch(currentProgress, {
    status: params.snapshot.status,
    result_key: params.snapshot.resultKey,
    email_stage: params.snapshot.emailStage,
    ...(params.snapshot.status === 'completed'
      ? { stage: 'S3_TEST_RESULT' as const }
      : {}),
  })

  const progressUnchanged =
    currentProgress.status === desiredProgress.status &&
    currentProgress.result_key === desiredProgress.result_key &&
    currentProgress.email_stage === desiredProgress.email_stage &&
    currentProgress.stage === desiredProgress.stage

  const userUnchanged =
    currentUser.lifecycleState === params.snapshot.lifecycleState &&
    currentUser.testResultType === params.snapshot.resultKey &&
    sameInstant(currentUser.testCompletedAt, desiredTestCompletedAt) &&
    sameInstant(currentUser.offerShownAt, desiredOfferShownAt) &&
    (params.snapshot.firstName === undefined || currentUser.firstName === params.snapshot.firstName)

  if (progressUnchanged && userUnchanged) {
    return 'noop'
  }

  if (!isApplyMode(params.mode)) {
    return 'synced'
  }

  await prisma.user.update({
    where: { id: params.userId },
    data: {
      lifecycleState: params.snapshot.lifecycleState,
      testResultType: params.snapshot.resultKey,
      testCompletedAt: desiredTestCompletedAt,
      offerShownAt: desiredOfferShownAt,
      ...(params.snapshot.firstName === undefined ? {} : { firstName: params.snapshot.firstName }),
    },
  })
  await saveAbTestProgress(params.userId, desiredProgress)

  return 'synced'
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
  options?: SyncExecutionOptions
}): Promise<SyncReport> {
  const mode = input.options?.mode ?? 'apply'
  const allowProduction = input.options?.allowProduction === true

  if (process.env.NODE_ENV === 'production' && !allowProduction) {
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
        mode,
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
        mode,
      })
    : { action: 'noop' as const, activationResult: null }

  const trialZoomActivation = input.snapshot.trialZoom
    ? await syncTrialZoomAccess({
        userId,
        snapshot: input.snapshot.trialZoom,
        mode,
      })
    : 'noop'

  const abTestAction = input.snapshot.abTest
    ? await syncAbTestState({
        userId,
        snapshot: input.snapshot.abTest,
        mode,
      })
    : 'noop'

  const zoomAction = input.snapshot.zoom
    ? await syncZoomBooking({
        userId,
        snapshot: input.snapshot.zoom,
        current: beforeZoom,
      })
    : 'noop'

  if (isApplyMode(mode)) {
    await syncLifecycleForUser(userId)
  }

  if (!isApplyMode(mode)) {
    return {
      telegramFromId: input.telegramId,
      userId,
      actions: {
        focus: focusResult.action,
        trialZoom: trialZoomActivation === 'activated' ? 'activated' : trialZoomResult.action,
        abTest: abTestAction,
        zoom: zoomAction,
      },
      before: {
        access: beforeAccess,
        zoom: beforeZoom,
      },
      after: {
        access: beforeAccess,
        zoom: beforeZoom,
      },
    }
  }

  const afterAccess = await getUserAccessState(userId)
  const afterZoom = await getUpcomingZoomBookingView(userId)
  const desiredFocusExpiresAt = input.snapshot.focus
    ? parseIsoDate(input.snapshot.focus.expiresAt, 'focus.expiresAt')
    : null

  if (input.snapshot.focus?.state === 'FOCUS_ACTIVE') {
    if (afterAccess.state !== 'FOCUS_ACTIVE') {
      throw new Error(`Focus parity verification failed: got ${afterAccess.state}`)
    }
    if (!sameInstant(afterAccess.expiresAt, desiredFocusExpiresAt)) {
      throw new Error(
        `Focus parity verification failed: got expiresAt=${afterAccess.expiresAt?.toISOString() ?? null}`,
      )
    }
  }

  if (input.snapshot.focus && input.snapshot.focus.state !== 'FOCUS_ACTIVE') {
    if (afterAccess.state === 'FOCUS_ACTIVE') {
      throw new Error(`Focus parity verification failed: expected non-active state, got ${afterAccess.state}`)
    }
  }

  if (input.snapshot.trialZoom?.state === 'ELIGIBLE') {
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

  if (input.snapshot.trialZoom?.state === 'TRIAL_ACTIVE' && afterAccess.state !== 'PREMIUM') {
    throw new Error(`Trial parity verification failed: got ${afterAccess.state}`)
  }
  if (input.snapshot.trialZoom?.state === 'NONE' && afterAccess.state === 'PREMIUM') {
    throw new Error('Trial parity verification failed: trial_zoom access still active')
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
      trialZoom: trialZoomActivation === 'activated' ? 'activated' : trialZoomResult.action,
      abTest: abTestAction,
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
