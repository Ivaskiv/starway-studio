import { Prisma, type ZoomCommerceKind, type ZoomCommerceRequest } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { buildShortWayForPayCheckoutUrl } from '../../subscriptions/payments/wayforpay/checkout.js'
import { buildPaymentRequest } from '../../subscriptions/payments/wayforpay/service.js'
import { buildZoomCalendarUrl } from '../urls.js'
import {
  getIndividualAvailabilityForScheduledAt,
  resolveIndividualPaymentDeadline,
} from '../booking/zoom.availability.service.js'
export { resolveIndividualPaymentDeadline } from '../booking/zoom.availability.service.js'

type Db = typeof prisma
type Tx = Prisma.TransactionClient
type PaymentInput = {
  orderReference: string; userId: string; zoomSessionId: string | null
  paymentKind: string; amount: number; currency: string
}
const pendingStatuses = ['CREATED', 'OPENED', 'PROCESSING'] as const
const PRODUCTION_INDIVIDUAL_PAYMENT = { amount: 60, currency: 'EUR' } as const
const DEVELOPMENT_INDIVIDUAL_PAYMENT = { amount: 1, currency: 'UAH' } as const

export function resolveZoomIndividualPaymentTerms() {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    ? DEVELOPMENT_INDIVIDUAL_PAYMENT
    : PRODUCTION_INDIVIDUAL_PAYMENT
}

export type LegacyIndividualOrphanClassification = 'PROVEN_PAID' | 'PROVEN_UNPAID' | 'AMBIGUOUS'

export type LegacyIndividualOrphanRow = {
  SESSION_ID: string
  USER_ID: string
  SCHEDULED_AT: string
  TOPIC: string
  ATTENDEE_PRESENT: boolean
  PAYMENT_EVIDENCE: string[]
  CLASSIFICATION: LegacyIndividualOrphanClassification
  REASON: string
}

function jsonRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export function isLegacyIndividualSession(session: { type: string; requests: unknown }) {
  return session.type === 'PRIVATE' || session.type === 'INDIVIDUAL'
    || jsonRecord(session.requests)?.type === 'individual'
}

function legacyBoundUserIds(session: {
  requests: unknown
  attendees: Array<{ userId: string }>
}, financialUserId?: string): Set<string> {
  const ids = new Set(session.attendees.map(attendee => attendee.userId))
  const requests = jsonRecord(session.requests)
  if (typeof requests?.participantUserId === 'string') ids.add(requests.participantUserId)
  if (typeof requests?.userId === 'string') ids.add(requests.userId)
  if (Array.isArray(requests?.participantUserIds)) {
    for (const value of requests.participantUserIds) {
      if (typeof value === 'string') ids.add(value)
    }
  }
  if (financialUserId) ids.add(financialUserId)
  return ids
}

async function loadLegacyFinancialEvidence(
  db: Pick<Tx, 'paymentLog' | 'checkoutSession'>,
  userId: string,
  sessionId: string,
) {
  const [paymentLogs, checkouts] = await Promise.all([
    db.paymentLog.findMany({ where: { userId } }),
    db.checkoutSession.findMany({ where: { userId } }),
  ])
  const exactPaymentLogs = paymentLogs.filter((row) =>
    jsonRecord(row.metadata)?.zoomSessionId === sessionId)
  const exactCheckouts = checkouts.filter((row) =>
    jsonRecord(row.payload)?.zoomSessionId === sessionId)
  const paymentEvidence = [
    ...exactPaymentLogs.map(row => `PaymentLog:${row.status}:${row.orderReference ?? row.id}`),
    ...exactCheckouts.map(row => `CheckoutSession:${row.status}:${row.orderReference}`),
  ]
  const validPaidLogs = exactPaymentLogs.filter((row) => {
    const metadata = jsonRecord(row.metadata)
    return row.status === 'SUCCESS' && row.amountCents === 6000
      && row.currency.toUpperCase() === 'EUR'
      && (metadata?.paymentKind === 'zoom_individual' || metadata?.type === 'zoom_individual')
  })
  const validPaidCheckouts = exactCheckouts.filter((row) => {
    const payload = jsonRecord(row.payload)
    return row.status === 'COMPLETED' && row.amount === 60
      && row.currency.toUpperCase() === 'EUR' && row.productCode === 'zoom_individual'
      && payload?.paymentKind === 'zoom_individual' && payload.userId === userId
  })

  return {
    paymentEvidence,
    hasFinancialEvidence: exactPaymentLogs.length > 0 || exactCheckouts.length > 0,
    hasValidPaidEvidence: validPaidLogs.length > 0 || validPaidCheckouts.length > 0,
    hasConflictingEvidence:
      validPaidLogs.length !== exactPaymentLogs.length
      || validPaidCheckouts.length !== exactCheckouts.length,
  }
}

async function classifyLegacyIndividualSession(
  db: Pick<Tx, 'paymentLog' | 'checkoutSession'>,
  session: {
    id: string; expertId: string | null; scheduledAt: Date; topic: string; status: string
    type: string; requests: unknown; attendees: Array<{ userId: string; attended: boolean }>
  },
  userId: string,
): Promise<LegacyIndividualOrphanRow> {
  const financial = await loadLegacyFinancialEvidence(db, userId, session.id)
  const boundUserIds = legacyBoundUserIds(
    session,
    financial.hasFinancialEvidence ? userId : undefined,
  )
  const attendee = session.attendees.find(row => row.userId === userId)
  const base = {
    SESSION_ID: session.id,
    USER_ID: userId,
    SCHEDULED_AT: session.scheduledAt.toISOString(),
    TOPIC: session.topic,
    ATTENDEE_PRESENT: Boolean(attendee),
    PAYMENT_EVIDENCE: financial.paymentEvidence.length > 0 ? financial.paymentEvidence : ['NONE'],
  }

  if (!session.expertId) {
    return { ...base, CLASSIFICATION: 'AMBIGUOUS', REASON: 'Session has no expert ownership' }
  }
  if (boundUserIds.size !== 1 || !boundUserIds.has(userId)) {
    return { ...base, CLASSIFICATION: 'AMBIGUOUS', REASON: 'Session/user binding is not unique' }
  }
  if (financial.hasValidPaidEvidence && !financial.hasConflictingEvidence) {
    return { ...base, CLASSIFICATION: 'PROVEN_PAID', REASON: 'Exact successful 60 EUR payment evidence exists' }
  }
  if (financial.hasFinancialEvidence) {
    return { ...base, CLASSIFICATION: 'AMBIGUOUS', REASON: 'Financial evidence exists but does not prove a completed exact payment' }
  }
  if (session.status !== 'SCHEDULED' || session.scheduledAt <= new Date() || attendee?.attended) {
    return { ...base, CLASSIFICATION: 'AMBIGUOUS', REASON: 'Historical or attended session cannot be safely treated as an erroneous pending booking' }
  }
  return { ...base, CLASSIFICATION: 'PROVEN_UNPAID', REASON: 'Unique user binding and no persisted financial evidence' }
}

function paymentKind(request: ZoomCommerceRequest) {
  return request.kind === 'INDIVIDUAL' ? 'zoom_individual' : 'battle_entry'
}

function checkoutBaseUrl() {
  const base = process.env.PUBLIC_API_URL?.trim() || process.env.APP_URL?.trim()
  if (!base) throw new Error('COMMERCE_CHECKOUT_BASE_URL_MISSING')
  return base.replace(/\/$/, '')
}

function zoomIndividualPaymentReturnUrl() {
  const target = new URL(buildZoomCalendarUrl())
  target.searchParams.set('zoomRole', 'user')
  return `${checkoutBaseUrl()}/api/subscriptions/payments/wayforpay/return?target=${encodeURIComponent(target.toString())}`
}

async function lockRequest(tx: Tx, id: string, expertId?: string) {
  const original = await tx.zoomCommerceRequest.findUniqueOrThrow({ where: { id } })
  if (expertId && original.expertId !== expertId) throw new Error('COMMERCE_COACH_MISMATCH')
  // Lock a stable coach row: competing requests may reference different session rows.
  await tx.$queryRaw`SELECT id FROM "Expert" WHERE id = ${original.expertId} FOR UPDATE`
  await tx.$queryRaw`SELECT id FROM "ZoomCommerceRequest" WHERE id = ${id} FOR UPDATE`
  return tx.zoomCommerceRequest.findUniqueOrThrow({ where: { id } })
}

async function checkoutFor(tx: Tx, request: ZoomCommerceRequest) {
  if (!request.checkoutOrderReference) return null
  await tx.$queryRaw`SELECT id FROM "CheckoutSession" WHERE "orderReference" = ${request.checkoutOrderReference} FOR UPDATE`
  const checkouts = await tx.checkoutSession.findMany({
    where: { orderReference: request.checkoutOrderReference },
  })
  if (checkouts.length !== 1) throw new Error('COMMERCE_CHECKOUT_BINDING_INVALID')
  return checkouts[0]
}

function isActive(checkout: Awaited<ReturnType<typeof checkoutFor>>, now: Date) {
  return Boolean(checkout && checkout.expiresAt > now && !checkout.invalidatedAt
    && pendingStatuses.some(status => status === checkout.status))
}

function assertPaymentBinding(
  request: ZoomCommerceRequest,
  checkout: NonNullable<Awaited<ReturnType<typeof checkoutFor>>>,
  input: PaymentInput,
) {
  const payload = checkout.payload as Record<string, unknown>
  if (input.userId !== request.requesterUserId || input.zoomSessionId !== request.zoomSessionId
    || input.paymentKind !== paymentKind(request) || input.amount !== Number(request.amount)
    || input.currency !== request.currency || checkout.userId !== input.userId
    || checkout.amount !== input.amount || checkout.currency !== input.currency
    || checkout.productCode !== input.paymentKind || payload.paymentKind !== input.paymentKind
    || payload.zoomCommerceRequestId !== request.id || payload.zoomSessionId !== request.zoomSessionId
    || payload.userId !== request.requesterUserId
    || (request.kind === 'INDIVIDUAL' && (
      input.amount !== resolveZoomIndividualPaymentTerms().amount
      || input.currency !== resolveZoomIndividualPaymentTerms().currency
    ))) {
    throw new Error('COMMERCE_PAYMENT_BINDING_MISMATCH')
  }
}

async function expireApprovals(tx: Tx, expertId: string) {
  const now = new Date()
  const requests = await tx.zoomCommerceRequest.findMany({
    where: { expertId, status: 'APPROVED_PENDING_PAYMENT' },
  })

  for (const request of requests) {
    const approvedAt = request.approvedAt
    const checkout = await checkoutFor(tx, request)

    if (
      request.kind === 'INDIVIDUAL'
      && approvedAt
      && (
        resolveIndividualPaymentDeadline({
          approvedAt,
          scheduledAt: request.scheduledAt,
        }) <= now
        || !isActive(checkout, now)
      )
    ) {
      await tx.zoomCommerceRequest.update({
        where: { id: request.id },
        data: { status: 'EXPIRED' },
      })
      continue
    }

    // Preserve legacy checkout-expiry semantics for non-individual commerce.
    if (
      request.kind !== 'INDIVIDUAL'
      && !isActive(checkout, now)
    ) {
      await tx.zoomCommerceRequest.update({
        where: { id: request.id },
        data: { status: 'EXPIRED' },
      })
    }
  }
}

export async function expireDueIndividualPaymentWindows(
  now = new Date(),
  db: Db = prisma,
) {
  const candidates = await db.zoomCommerceRequest.findMany({
    where: {
      kind: 'INDIVIDUAL',
      status: 'APPROVED_PENDING_PAYMENT',
      approvedAt: { not: null },
      scheduledAt: { gt: now },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  const expired = []

  for (const candidate of candidates) {
    const approvedAt = candidate.approvedAt
    if (!approvedAt) continue

    const deadline = resolveIndividualPaymentDeadline({
      approvedAt,
      scheduledAt: candidate.scheduledAt,
    })

    if (deadline > now) continue

    const transitioned = await db.$transaction(async tx => {
      await tx.$queryRaw`
        SELECT id
        FROM "ZoomCommerceRequest"
        WHERE id = ${candidate.id}
        FOR UPDATE
      `

      const current = await tx.zoomCommerceRequest.findUniqueOrThrow({
        where: { id: candidate.id },
      })

      // Payment wins if another transaction already completed it.
      if (current.status !== 'APPROVED_PENDING_PAYMENT') return null

      return tx.zoomCommerceRequest.update({
        where: { id: current.id },
        data: { status: 'EXPIRED' },
      })
    })

    if (transitioned) expired.push(transitioned)
  }

  return expired
}

async function assertSlot(tx: Tx, request: ZoomCommerceRequest) {
  if (request.zoomSessionId) {
    await tx.$queryRaw`SELECT id FROM "ZoomSession" WHERE id = ${request.zoomSessionId} FOR UPDATE`
    const session = await tx.zoomSession.findUniqueOrThrow({ where: { id: request.zoomSessionId } })
    if (session.expertId !== request.expertId || session.scheduledAt.getTime() !== request.scheduledAt.getTime()
      || session.status !== 'SCHEDULED') throw new Error('COMMERCE_SESSION_MISMATCH')
    if (request.kind === 'INDIVIDUAL' && session.type !== 'PRIVATE'
      && (session.requests as Record<string, unknown> | null)?.type !== 'individual') {
      throw new Error('COMMERCE_SESSION_KIND_MISMATCH')
    }
  }
  if (request.kind !== 'INDIVIDUAL') return
  const availability = await getIndividualAvailabilityForScheduledAt({
    expertId: request.expertId,
    scheduledAt: request.scheduledAt,
    db: tx,
    excludeCommerceRequestId: request.id,
  })
  if (!availability.candidate.available) throw new Error('COMMERCE_SLOT_OCCUPIED')
}

function readBattleMeta(requests: unknown) {
  if (!requests || typeof requests !== 'object' || Array.isArray(requests)) {
    throw new Error('COMMERCE_BATTLE_METADATA_MISSING')
  }
  const meta = requests as Record<string, unknown>
  if (meta.type !== 'battle_review' || typeof meta.challengerId !== 'string'
    || typeof meta.opponentId !== 'string') throw new Error('COMMERCE_BATTLE_METADATA_MISSING')
  return {
    expertId: null as string | null,
    challengerId: meta.challengerId,
    opponentId: meta.opponentId,
    goalA: typeof meta.goalA === 'string' ? meta.goalA : null,
    goalB: typeof meta.goalB === 'string' ? meta.goalB : null,
    scheduledAt: null as string | null,
  }
}

export async function createRequest(input: {
  kind: ZoomCommerceKind; requesterUserId: string; expertId: string
  zoomSessionId?: string | null; scheduledAt: Date; amount: number; currency: string
}, db: Db = prisma) {
  if (!Number.isFinite(input.amount) || input.amount <= 0 || !/^[A-Z]{3}$/.test(input.currency)
    || !Number.isFinite(input.scheduledAt.getTime()) || input.scheduledAt <= new Date()) {
    throw new Error('COMMERCE_INVALID_REQUEST')
  }
  const individualPayment = resolveZoomIndividualPaymentTerms()
  if (input.kind === 'INDIVIDUAL' && (
    input.amount !== individualPayment.amount || input.currency !== individualPayment.currency
  )) {
    throw new Error('COMMERCE_INDIVIDUAL_PRICE_MISMATCH')
  }
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`zoom-intent:${input.kind}:${input.requesterUserId}:${input.expertId}`}))`
    return createRequestInTransaction(tx, input)
  })
}

async function createRequestInTransaction(
  tx: Tx,
  input: {
    kind: ZoomCommerceKind; requesterUserId: string; expertId: string
    zoomSessionId?: string | null; scheduledAt: Date; amount: number; currency: string
  },
) {
  const existing = await tx.zoomCommerceRequest.findFirst({
    where: { kind: input.kind, requesterUserId: input.requesterUserId, expertId: input.expertId,
      ...(input.kind === 'INDIVIDUAL' ? { zoomSessionId: input.zoomSessionId, scheduledAt: input.scheduledAt } : {}),
      status: { in: ['REQUESTED', 'APPROVED_PENDING_PAYMENT', 'PAID'] },
      scheduledAt: input.kind === 'BATTLE' ? { gt: new Date() } : input.scheduledAt },
    orderBy: { createdAt: 'desc' },
  })
  return existing ?? tx.zoomCommerceRequest.create({ data: input })
}

export async function createUserIndividualRequest(input: {
  requesterUserId: string
  scheduledAt: Date
  questionText: string
}, db: Db = prisma) {
  const questionText = input.questionText.trim()
  if (!Number.isFinite(input.scheduledAt.getTime()) || input.scheduledAt <= new Date() || !questionText) {
    throw new Error('COMMERCE_INVALID_REQUEST')
  }

  return db.$transaction(async tx => {
    const requester = await tx.user.findUnique({
      where: { id: input.requesterUserId },
      select: { expertId: true },
    })
    if (process.env.NODE_ENV !== 'production') {
      console.info('[USER_INDIVIDUAL_REQUEST_TRACE]', {
        phase: 'expert_resolved',
        expertId: requester?.expertId ?? null,
      })
    }
    if (!requester?.expertId) {
      throw new Error('COMMERCE_EXPERT_CONTEXT_REQUIRED')
    }

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`zoom-calendar:INDIVIDUAL:${requester.expertId}:${input.scheduledAt.toISOString().slice(0, 10)}`}))`
    const existing = await tx.zoomCommerceRequest.findFirst({
      where: {
        kind: 'INDIVIDUAL',
        requesterUserId: input.requesterUserId,
        expertId: requester.expertId,
        scheduledAt: input.scheduledAt,
        status: { in: ['REQUESTED', 'APPROVED_PENDING_PAYMENT', 'PAID'] },
      },
      include: { zoomSession: true },
      orderBy: { createdAt: 'desc' },
    })
    if (existing?.zoomSession) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[USER_INDIVIDUAL_REQUEST_TRACE]', {
          phase: 'persistence_result',
          requestId: existing.id,
          sessionId: existing.zoomSession.id,
          status: existing.status,
        })
      }
      return { request: existing, session: existing.zoomSession, duplicate: true }
    }

    const availability = await getIndividualAvailabilityForScheduledAt({
      expertId: requester.expertId,
      scheduledAt: input.scheduledAt,
      db: tx,
    })
    if (!availability.candidate.available) {
      const error = new Error('COMMERCE_SLOT_UNAVAILABLE') as Error & {
        reason?: string
        alternatives?: unknown
      }
      error.reason = availability.candidate.reason ?? 'Час уже заброньований'
      error.alternatives = availability.alternatives
      throw error
    }

    const individualPayment = resolveZoomIndividualPaymentTerms()
    const session = await tx.zoomSession.create({
      data: {
        expertId: requester.expertId,
        scheduledAt: input.scheduledAt,
        topic: 'Індивідуальна сесія',
        type: 'PRIVATE',
        capacity: 1,
        requests: { type: 'individual', maxAttendees: 1 },
      },
    })
    const request = await createRequestInTransaction(tx, {
      kind: 'INDIVIDUAL',
      requesterUserId: input.requesterUserId,
      expertId: requester.expertId,
      zoomSessionId: session.id,
      scheduledAt: input.scheduledAt,
      amount: individualPayment.amount,
      currency: individualPayment.currency,
    })
    await tx.event.upsert({
      where: { id: `zoom-context:${request.id}` },
      update: {},
      create: {
        id: `zoom-context:${request.id}`,
        userId: input.requesterUserId,
        type: 'ZOOM_COMMERCE_CONTEXT',
        source: 'web',
        payload: { requestId: request.id, questionText },
      },
    })

    if (process.env.NODE_ENV !== 'production') {
      console.info('[USER_INDIVIDUAL_REQUEST_TRACE]', {
        phase: 'persistence_result',
        requestId: request.id,
        sessionId: session.id,
        status: request.status,
      })
    }
    return { request, session, duplicate: false }
  })
}

export async function listLegacyIndividualOrphans(
  userId: string,
  db: Db = prisma,
): Promise<LegacyIndividualOrphanRow[]> {
  const [paymentLogs, checkouts] = await Promise.all([
    db.paymentLog.findMany({ where: { userId }, select: { metadata: true } }),
    db.checkoutSession.findMany({ where: { userId }, select: { payload: true } }),
  ])
  const financialSessionIds = [...new Set([
    ...paymentLogs.map(row => jsonRecord(row.metadata)?.zoomSessionId),
    ...checkouts.map(row => jsonRecord(row.payload)?.zoomSessionId),
  ].filter((value): value is string => typeof value === 'string' && Boolean(value)))]
  const sessions = await db.zoomSession.findMany({
    where: {
      commerceRequests: { none: {} },
      AND: [
        { OR: [
          { type: { in: ['PRIVATE', 'INDIVIDUAL'] } },
          { requests: { path: ['type'], equals: 'individual' } },
        ] },
        { OR: [
          { attendees: { some: { userId } } },
          { id: { in: financialSessionIds } },
          { requests: { path: ['participantUserId'], equals: userId } },
          { requests: { path: ['userId'], equals: userId } },
          { requests: { path: ['participantUserIds'], array_contains: [userId] } },
        ] },
      ],
    },
    include: { attendees: { select: { userId: true, attended: true } } },
    orderBy: { scheduledAt: 'asc' },
  })

  return Promise.all(sessions.map(session => classifyLegacyIndividualSession(db, session, userId)))
}

export async function backfillCancelledLegacyIndividual(
  input: { sessionId: string; userId: string },
  db: Db = prisma,
) {
  return db.$transaction(async tx => {
    const original = await tx.zoomSession.findUniqueOrThrow({ where: { id: input.sessionId } })
    if (!original.expertId) throw new Error('COMMERCE_LEGACY_EXPERT_MISSING')
    await tx.$queryRaw`SELECT id FROM "Expert" WHERE id = ${original.expertId} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM "ZoomSession" WHERE id = ${input.sessionId} FOR UPDATE`
    const session = await tx.zoomSession.findUniqueOrThrow({
      where: { id: input.sessionId },
      include: {
        attendees: { select: { userId: true, attended: true } },
        commerceRequests: true,
      },
    })
    if (!isLegacyIndividualSession(session)) throw new Error('COMMERCE_LEGACY_NOT_INDIVIDUAL')
    if (!session.expertId) throw new Error('COMMERCE_LEGACY_EXPERT_MISSING')

    if (session.commerceRequests.length > 0) {
      const existing = session.commerceRequests.find(request =>
        request.kind === 'INDIVIDUAL' && request.status === 'CANCELLED'
        && request.requesterUserId === input.userId && request.expertId === session.expertId
        && request.scheduledAt.getTime() === session.scheduledAt.getTime())
      if (existing && session.commerceRequests.length === 1) {
        return { request: existing, duplicate: true, attendeeRemoved: false }
      }
      throw new Error('COMMERCE_LEGACY_SESSION_ALREADY_OWNED')
    }

    const classification = await classifyLegacyIndividualSession(tx, session, input.userId)
    if (classification.CLASSIFICATION !== 'PROVEN_UNPAID') {
      throw new Error(`COMMERCE_LEGACY_${classification.CLASSIFICATION}`)
    }
    const request = await tx.zoomCommerceRequest.create({ data: {
      kind: 'INDIVIDUAL',
      status: 'CANCELLED',
      requesterUserId: input.userId,
      expertId: session.expertId,
      zoomSessionId: session.id,
      scheduledAt: session.scheduledAt,
      amount: 60,
      currency: 'EUR',
    } })
    const removed = await tx.zoomSessionAttendee.deleteMany({
      where: { sessionId: session.id, userId: input.userId, attended: false },
    })
    return { request, duplicate: false, attendeeRemoved: removed.count === 1 }
  })
}

export async function approveRequest(id: string, expertId: string, db: Db = prisma) {
  return db.$transaction(async tx => {
    await lockRequest(tx, id, expertId)
    await expireApprovals(tx, expertId)
    const request = await tx.zoomCommerceRequest.findUniqueOrThrow({ where: { id } })
    if (request.status === 'APPROVED_PENDING_PAYMENT' || request.status === 'PAID') {
      const checkout = await checkoutFor(tx, request)
      return { request, checkoutUrl: request.status === 'PAID' ? null
        : `${checkoutBaseUrl()}/api/payments/wayforpay/checkout/${checkout!.token}` }
    }
    if (request.status !== 'REQUESTED') throw new Error('COMMERCE_ILLEGAL_TRANSITION')
    if (request.scheduledAt <= new Date()) throw new Error('COMMERCE_SLOT_PAST')
    await assertSlot(tx, request)
    const approvedAt = new Date()
    const paymentDeadline = request.kind === 'INDIVIDUAL'
      ? resolveIndividualPaymentDeadline({ approvedAt, scheduledAt: request.scheduledAt })
      : undefined
    if (paymentDeadline && paymentDeadline <= approvedAt) {
      throw new Error('COMMERCE_PAYMENT_WINDOW_UNAVAILABLE')
    }
    const kind = paymentKind(request)
    const orderReference = `zoom_commerce_${request.kind.toLowerCase()}_${request.id}`
    const approved = await tx.zoomCommerceRequest.update({ where: { id }, data: {
      status: 'APPROVED_PENDING_PAYMENT', approvedAt, checkoutOrderReference: orderReference,
    } })
    const payment = buildPaymentRequest({ userId: request.requesterUserId, productId: kind,
      amount: Number(request.amount), currency: request.currency, payRef: orderReference })
    if (request.kind === 'INDIVIDUAL') {
      payment.returnUrl = zoomIndividualPaymentReturnUrl()
    }
    const battleEntryMeta = request.kind === 'BATTLE'
      ? readBattleMeta((await tx.zoomSession.findUniqueOrThrow({ where: { id: request.zoomSessionId! } })).requests)
      : undefined
    if (battleEntryMeta) {
      battleEntryMeta.expertId = request.expertId
      battleEntryMeta.scheduledAt = request.scheduledAt.toISOString()
      const battleSession = await tx.zoomSession.findUniqueOrThrow({ where: { id: request.zoomSessionId! } })
      await tx.zoomSession.update({ where: { id: battleSession.id }, data: {
        requests: { ...(battleSession.requests as Record<string, unknown>), paymentOrderReference: orderReference },
      } })
    }
    const checkoutUrl = await buildShortWayForPayCheckoutUrl(checkoutBaseUrl(), {
      ...payment, paymentKind: kind, zoomCommerceRequestId: id,
      zoomSessionId: request.zoomSessionId, userId: request.requesterUserId, battleEntryMeta,
    }, undefined, tx, paymentDeadline)
    return { request: approved, checkoutUrl }
  })
}

export async function rejectRequest(id: string, expertId: string, db: Db = prisma) {
  return db.$transaction(async tx => {
    const request = await lockRequest(tx, id, expertId)
    if (request.status === 'REJECTED') return request
    if (request.status !== 'REQUESTED') throw new Error('COMMERCE_ILLEGAL_TRANSITION')
    return tx.zoomCommerceRequest.update({ where: { id }, data: { status: 'REJECTED', rejectedAt: new Date() } })
  })
}

export async function cancelRequest(id: string, requesterUserId: string, db: Db = prisma) {
  return db.$transaction(async tx => {
    const request = await lockRequest(tx, id)
    if (request.requesterUserId !== requesterUserId) throw new Error('COMMERCE_REQUESTER_MISMATCH')
    if (request.kind !== 'INDIVIDUAL') throw new Error('COMMERCE_CANCEL_KIND_UNSUPPORTED')
    if (request.status === 'CANCELLED') return request
    if (request.status !== 'REQUESTED' && request.status !== 'APPROVED_PENDING_PAYMENT') {
      throw new Error('COMMERCE_ILLEGAL_TRANSITION')
    }
    const checkout = await checkoutFor(tx, request)
    if (checkout) {
      await tx.checkoutSession.update({ where: { id: checkout.id }, data: {
        status: 'INVALIDATED', invalidatedAt: new Date(),
      } })
    }
    return tx.zoomCommerceRequest.update({ where: { id }, data: { status: 'CANCELLED' } })
  })
}

export async function resolveByPaymentReference(orderReference: string, db: Db = prisma) {
  return db.zoomCommerceRequest.findUnique({ where: { checkoutOrderReference: orderReference } })
}

export async function getRequestById(id: string, db: Db = prisma) {
  return db.zoomCommerceRequest.findUnique({ where: { id } })
}

export async function getUserCalendarRequestsForWindow(input: {
  requesterUserId: string
  from: Date
  to: Date
  includeInactive?: boolean
}, db: Db = prisma) {
  return db.$transaction(async tx => {
    const approvals = await tx.zoomCommerceRequest.findMany({
      where: {
        requesterUserId: input.requesterUserId,
        scheduledAt: { gte: input.from, lt: input.to },
        status: 'APPROVED_PENDING_PAYMENT',
      },
      select: { expertId: true },
      distinct: ['expertId'],
    })

    for (const expertId of approvals.map(row => row.expertId).sort()) {
      await tx.$queryRaw`SELECT id FROM "Expert" WHERE id = ${expertId} FOR UPDATE`
      await expireApprovals(tx, expertId)
    }

    return tx.zoomCommerceRequest.findMany({
      where: {
        requesterUserId: input.requesterUserId,
        scheduledAt: { gte: input.from, lt: input.to },
        ...(input.includeInactive
          ? {}
          : {
              status: {
                in: ['REQUESTED', 'APPROVED_PENDING_PAYMENT', 'PAID'] as const,
              },
            }),
      },
      include: {
        zoomSession: {
          select: {
            id: true,
            scheduledAt: true,
            topic: true,
            status: true,
            type: true,
            requests: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
    })
  })
}

export async function getCalendarRequests(input: {
  zoomSessionIds: string[]
  requesterUserId?: string
  includeInactive?: boolean
}, db: Db = prisma) {
  if (input.zoomSessionIds.length === 0) return []
  return db.zoomCommerceRequest.findMany({
      where: {
        zoomSessionId: { in: input.zoomSessionIds },
        requesterUserId: input.requesterUserId,
        ...(input.includeInactive ? {} : { status: { in: ['REQUESTED', 'APPROVED_PENDING_PAYMENT', 'PAID'] as const } }),
      },
      orderBy: { createdAt: 'desc' },
  })
}

export async function getPendingForCoach(expertId: string, db: Db = prisma) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Expert" WHERE id = ${expertId} FOR UPDATE`
    await expireApprovals(tx, expertId)
    return tx.zoomCommerceRequest.findMany({ where: {
      expertId, status: { in: ['REQUESTED', 'APPROVED_PENDING_PAYMENT'] },
    }, orderBy: { createdAt: 'asc' } })
  })
}

export async function markRequestPaid(
  input: PaymentInput,
  db: Db = prisma,
  finalize?: (tx: Tx, request: ZoomCommerceRequest) => Promise<void>,
) {
  return db.$transaction(async tx => {
    const original = await tx.zoomCommerceRequest.findUniqueOrThrow({
      where: { checkoutOrderReference: input.orderReference },
    })
    const request = await lockRequest(tx, original.id)
    const checkout = await checkoutFor(tx, request)
    if (!checkout) throw new Error('COMMERCE_CHECKOUT_BINDING_INVALID')
    assertPaymentBinding(request, checkout, input)
    if (request.status === 'PAID') return { request, duplicate: true }
    if (request.status !== 'APPROVED_PENDING_PAYMENT') throw new Error('COMMERCE_ILLEGAL_TRANSITION')
    if (!isActive(checkout, new Date())) throw new Error('COMMERCE_APPROVAL_EXPIRED')
    await assertSlot(tx, request)
    const paidAt = new Date()
    if (finalize) await finalize(tx, request)
    if (request.kind === 'INDIVIDUAL') {
      await tx.zoomSessionAttendee.upsert({
        where: { sessionId_userId: { sessionId: request.zoomSessionId!, userId: request.requesterUserId } },
        create: { sessionId: request.zoomSessionId!, userId: request.requesterUserId }, update: {},
      })
    }
    const paid = await tx.zoomCommerceRequest.update({ where: { id: request.id }, data: { status: 'PAID', paidAt } })
    await tx.checkoutSession.update({ where: { id: checkout.id }, data: { status: 'COMPLETED', completedAt: paidAt } })
    if (!finalize) await tx.paymentLog.create({ data: {
      userId: request.requesterUserId, expertId: request.expertId, orderReference: input.orderReference,
      status: 'SUCCESS', amountCents: Math.round(input.amount * 100), currency: input.currency,
      metadata: { paymentKind: input.paymentKind, zoomCommerceRequestId: request.id, zoomSessionId: request.zoomSessionId },
    } })
    return { request: paid, duplicate: false }
  })
}

export async function hasPaidIndividualParticipation(
  userId: string, sessionId: string, db: Pick<Tx, 'zoomCommerceRequest'> = prisma,
): Promise<boolean> {
  return Boolean(await db.zoomCommerceRequest.findFirst({
    where: { requesterUserId: userId, zoomSessionId: sessionId, kind: 'INDIVIDUAL', status: 'PAID' },
    select: { id: true },
  }))
}

export async function getCommerceCheckoutUrl(requestId: string, userId: string): Promise<string | null> {
  return prisma.$transaction(async tx => {
    const request = await tx.zoomCommerceRequest.findUnique({ where: { id: requestId } })
    if (!request || request.requesterUserId !== userId
      || request.status !== 'APPROVED_PENDING_PAYMENT' || request.scheduledAt <= new Date()) return null
    const session = request.zoomSessionId
      ? await tx.zoomSession.findUnique({ where: { id: request.zoomSessionId } }) : null
    if (!session || session.status !== 'SCHEDULED') return null
    const checkout = await checkoutFor(tx, request)
    return isActive(checkout, new Date())
      ? `${checkoutBaseUrl()}/api/payments/wayforpay/checkout/${checkout!.token}` : null
  })
}
