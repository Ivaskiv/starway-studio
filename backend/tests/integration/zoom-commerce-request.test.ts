import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parse } from 'dotenv'
import { PrismaClient } from '@starway/db/prisma-client'
import express from 'express'

const env = parse(readFileSync('packages/db/.env'))
const url = env.DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error('Commerce integration tests require a local PostgreSQL database')
}
process.env.DATABASE_URL = url
process.env.DIRECT_URL = url
process.env.PUBLIC_API_URL = 'http://localhost:3001'
const db = new PrismaClient({ datasources: { db: { url } } })
const suffix = randomUUID()
let owner: typeof import('../../src/modules/zoom/commerce/zoom.commerce-request.service.js')
let processPaymentWebhook: typeof import('../../src/modules/subscriptions/payments/callback/processing.js').processPaymentWebhook
let expertId: string
let userId: string
let otherId: string
let coachUserId: string
let sessionId: string
let scheduledAt: Date
let individualPayment: { amount: number; currency: string }

beforeAll(async () => {
  owner = await import('../../src/modules/zoom/commerce/zoom.commerce-request.service.js')
  individualPayment = owner.resolveZoomIndividualPaymentTerms()
  ;({ processPaymentWebhook } = await import('../../src/modules/subscriptions/payments/callback/processing.js'))
  expertId = (await db.expert.create({ data: {
    email: `${suffix}@coach.test`,
    displayName: 'Commerce test',
    zoomAvailability: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      id: `individual-${dayOfWeek}`,
      dayOfWeek,
      hour: 0,
      minute: 0,
      endHour: 23,
      endMinute: 59,
      timezone: 'Europe/Kyiv',
      sessionType: 'individual',
      maxSlots: 1,
      priceCents: 0,
      durationMinutes: 60,
      active: true,
    })),
  } })).id
  userId = (await db.user.create({ data: {
    email: `${suffix}@user.test`, expertId, role: 'EXPERT', activeRole: 'USER',
  } })).id
  otherId = (await db.user.create({ data: { email: `${suffix}@other.test`, expertId } })).id
  coachUserId = (await db.user.create({ data: {
    email: `${suffix}@coach-user.test`, expertId, role: 'EXPERT', activeRole: 'EXPERT',
  } })).id
  scheduledAt = new Date(Date.now() + 86400000)
  scheduledAt.setMinutes(0, 0, 0)
  sessionId = (await db.zoomSession.create({ data: {
    expertId, scheduledAt, topic: 'Commerce regression', type: 'PRIVATE', capacity: 1,
  } })).id
}, 30000)

afterAll(async () => {
  if (expertId) {
    await db.paymentLog.deleteMany({ where: { expertId } })
    await db.zoomCommerceRequest.deleteMany({ where: { expertId } })
    await db.checkoutSession.deleteMany({ where: { userId: { in: [userId, otherId] } } })
    await db.zoomSession.deleteMany({ where: { expertId } })
    await db.user.deleteMany({ where: { id: { in: [userId, otherId, coachUserId] } } })
    await db.expert.delete({ where: { id: expertId } })
  }
  await db.$disconnect()
})

function create(overrides: Partial<Parameters<typeof owner.createRequest>[0]> = {}) {
  return owner.createRequest({ kind: 'INDIVIDUAL', requesterUserId: userId, expertId,
    zoomSessionId: sessionId, scheduledAt, ...individualPayment, ...overrides }, db)
}

function payment(request: { checkoutOrderReference: string | null; zoomSessionId: string | null }) {
  return { orderReference: request.checkoutOrderReference!, userId, zoomSessionId: request.zoomSessionId,
    paymentKind: 'zoom_individual', ...individualPayment }
}

async function openCheckout(token: string) {
  const { renderWayForPayCheckoutPageHandler } = await import('../../src/modules/subscriptions/api/checkout.js')
  const app = express()
  app.get('/checkout/:token', renderWayForPayCheckoutPageHandler)
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No test listener')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/checkout/${token}`)
    return { status: response.status, html: await response.text() }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
}

describe('persisted commerce approval core', () => {
  it('creates one user-originated Individual request shell without prepayment access', async () => {
    const scheduled = new Date(Date.now() + 5 * 86400000)
    scheduled.setMinutes(0, 0, 0)
    const input = { requesterUserId: userId, scheduledAt: scheduled, questionText: 'Потрібен розбір стратегії.' }
    const first = await owner.createUserIndividualRequest(input, db)
    const second = await owner.createUserIndividualRequest(input, db)

    expect(first.request.status).toBe('REQUESTED')
    expect(first.request.zoomSessionId).toBe(first.session.id)
    expect(second.request.id).toBe(first.request.id)
    expect(second.session.id).toBe(first.session.id)
    expect(second.duplicate).toBe(true)
    expect(await db.zoomSessionAttendee.count({ where: { sessionId: first.session.id, userId } })).toBe(0)
    expect(await db.checkoutSession.count({ where: { userId, productCode: 'zoom_individual' } })).toBe(0)
    expect(await db.event.findUnique({ where: { id: `zoom-context:${first.request.id}` } })).toMatchObject({
      payload: expect.objectContaining({ questionText: input.questionText }),
    })
    expect((await owner.rejectRequest(first.request.id, expertId, db)).status).toBe('REJECTED')
  })

  it('allows concurrent REQUESTED Individual intents without reserving coach inventory', async () => {
    const candidate = new Date(Date.now() + 9 * 86400000)
    candidate.setMinutes(0, 0, 0)
    const [first, second] = await Promise.allSettled([
      owner.createUserIndividualRequest({ requesterUserId: userId, scheduledAt: candidate, questionText: 'Перший запит.' }, db),
      owner.createUserIndividualRequest({ requesterUserId: otherId, scheduledAt: candidate, questionText: 'Другий запит.' }, db),
    ])

    const fulfilled = [first, second].filter((result): result is PromiseFulfilledResult<Awaited<typeof first>> => result.status === 'fulfilled')
    expect(fulfilled).toHaveLength(2)
    expect(await db.zoomCommerceRequest.count({
      where: { expertId, scheduledAt: candidate, status: 'REQUESTED' },
    })).toBe(2)
    await Promise.all(fulfilled.map((result) => owner.rejectRequest(result.value.request.id, expertId, db)))
  })

  it('self-book entry creates REQUESTED without checkout or attendee', async () => {
    const { bookPrivateSlot } = await import('../../src/modules/zoom/private/zoom.private-booking.service.js')
    const result = await bookPrivateSlot(userId, sessionId)
    expect(result.request.status).toBe('REQUESTED')
    expect(result.request.checkoutOrderReference).toBeNull()
    expect(await db.checkoutSession.count({ where: { userId } })).toBe(0)
    expect(await db.zoomSessionAttendee.count({ where: { sessionId } })).toBe(0)
    await owner.rejectRequest(result.request.id, expertId, db)
  })

  it('persists REQUESTED without checkout; rejects illegal transitions and early payment', async () => {
    const request = await create()
    expect(request.status).toBe('REQUESTED')
    expect(request.checkoutOrderReference).toBeNull()
    expect(await db.checkoutSession.count({ where: { userId } })).toBe(0)
    await expect(owner.markRequestPaid({ ...payment(request), orderReference: `zoom_commerce_individual_${request.id}` }, db)).rejects.toThrow()
    await expect(owner.approveRequest(request.id, otherId, db)).rejects.toThrow('COMMERCE_COACH_MISMATCH')
    expect((await owner.rejectRequest(request.id, expertId, db)).status).toBe('REJECTED')
    expect((await owner.rejectRequest(request.id, expertId, db)).status).toBe('REJECTED')
    await expect(owner.approveRequest(request.id, expertId, db)).rejects.toThrow('COMMERCE_ILLEGAL_TRANSITION')
    await expect(owner.markRequestPaid({ ...payment(request), orderReference: `zoom_commerce_individual_${request.id}` }, db)).rejects.toThrow()
  })

  it('keeps the database amount invariant positive for commerce requests', async () => {
    const base = {
      kind: 'BATTLE' as const,
      requesterUserId: userId,
      expertId,
      scheduledAt,
      currency: 'UAH',
    }

    await expect(db.zoomCommerceRequest.create({ data: { ...base, amount: 0 } })).rejects.toThrow()
    await expect(db.zoomCommerceRequest.create({ data: { ...base, amount: -1 } })).rejects.toThrow()
  })

  it('cancels unpaid Individual requests idempotently and releases an approved slot', async () => {
    const cancelScheduledAt = new Date(Date.now() + 3 * 86400000)
    cancelScheduledAt.setMinutes(0, 0, 0)
    const cancelSession = await db.zoomSession.create({ data: {
      expertId, scheduledAt: cancelScheduledAt, topic: 'Cancellation regression', type: 'PRIVATE', capacity: 1,
    } })
    const requested = await owner.createRequest({ kind: 'INDIVIDUAL', requesterUserId: userId,
      expertId, zoomSessionId: cancelSession.id, scheduledAt: cancelScheduledAt, ...individualPayment }, db)
    expect((await owner.cancelRequest(requested.id, userId, db)).status).toBe('CANCELLED')
    expect((await owner.cancelRequest(requested.id, userId, db)).status).toBe('CANCELLED')
    await expect(owner.approveRequest(requested.id, expertId, db)).rejects.toThrow('COMMERCE_ILLEGAL_TRANSITION')

    const approvedCandidate = await owner.createRequest({ kind: 'INDIVIDUAL', requesterUserId: userId,
      expertId, zoomSessionId: cancelSession.id, scheduledAt: cancelScheduledAt, ...individualPayment }, db)
    const approved = await owner.approveRequest(approvedCandidate.id, expertId, db)
    expect((await owner.cancelRequest(approvedCandidate.id, userId, db)).status).toBe('CANCELLED')
    await expect(owner.markRequestPaid(payment(approved.request), db)).rejects.toThrow('COMMERCE_ILLEGAL_TRANSITION')
    const checkout = await db.checkoutSession.findFirstOrThrow({
      where: { orderReference: approved.request.checkoutOrderReference! },
    })
    expect(checkout.status).toBe('INVALIDATED')
    expect(checkout.invalidatedAt).not.toBeNull()
    expect(await db.zoomSessionAttendee.count({ where: { sessionId: cancelSession.id } })).toBe(0)

    const replacement = await owner.createRequest({ kind: 'INDIVIDUAL', requesterUserId: otherId,
      expertId, zoomSessionId: cancelSession.id, scheduledAt: cancelScheduledAt, ...individualPayment }, db)
    expect((await owner.approveRequest(replacement.id, expertId, db)).request.status).toBe('APPROVED_PENDING_PAYMENT')
  })

  it('serializes competing approvals, reuses checkout, expires hold, validates callback and pays once', async () => {
    const focusBefore = await db.user.findUniqueOrThrow({ where: { id: userId } })
    const subscriptionsBefore = await db.subscription.findMany({ where: { userId } })
    const [a, b] = await Promise.all([create(), create({ requesterUserId: otherId })])
    const results = await Promise.allSettled([
      owner.approveRequest(a.id, expertId, db), owner.approveRequest(b.id, expertId, db),
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
    const approvedRequest = results[0].status === 'fulfilled' ? a : b
    const rejectedRequest = results[0].status === 'rejected' ? a : b
    expect(approvedRequest.id).not.toBe(rejectedRequest.id)
    const approved = await db.zoomCommerceRequest.findUniqueOrThrow({ where: { id: approvedRequest.id } })
    expect(approved.status).toBe('APPROVED_PENDING_PAYMENT')
    expect((await db.zoomCommerceRequest.findUniqueOrThrow({ where: { id: rejectedRequest.id } })).status).toBe('REQUESTED')
    const retry = await owner.approveRequest(approved.id, expertId, db)
    expect(retry.request.checkoutOrderReference).toBe(approved.checkoutOrderReference)
    expect(await db.checkoutSession.count({ where: { orderReference: approved.checkoutOrderReference! } })).toBe(1)
    const checkout = await db.checkoutSession.findFirstOrThrow({ where: { orderReference: approved.checkoutOrderReference! } })
    expect(Number(approved.amount)).toBe(individualPayment.amount)
    expect(approved.currency).toBe(individualPayment.currency)
    expect(checkout).toMatchObject(individualPayment)
    expect(checkout.expiresAt).toEqual(owner.resolveIndividualPaymentDeadline({
      approvedAt: approved.approvedAt!,
      scheduledAt: approved.scheduledAt,
    }))
    expect(checkout.payload).toMatchObject({
      amount: individualPayment.amount,
      currency: individualPayment.currency,
      productPrice: [individualPayment.amount],
    })
    const returnUrl = new URL(String((checkout.payload as Record<string, unknown>).returnUrl))
    expect(returnUrl.pathname).toBe('/api/subscriptions/payments/wayforpay/return')
    const returnTarget = new URL(returnUrl.searchParams.get('target')!)
    expect(returnTarget.pathname).toBe('/miniapp/zoom-calendar')
    expect(returnTarget.searchParams.get('zoomRole')).toBe('user')
    for (let index = 0; index < 2; index++) {
      const page = await openCheckout(checkout.token)
      expect(page.status).toBe(200)
      expect(page.html).toContain(`value="${approved.checkoutOrderReference}"`)
      expect(page.html).toContain(`name="amount" value="${individualPayment.amount}"`)
      expect(page.html).toContain(`name="currency" value="${individualPayment.currency}"`)
      expect(page.html).toContain(`name="productPrice" value="${individualPayment.amount}"`)
    }
    expect((await db.checkoutSession.findUniqueOrThrow({ where: { id: checkout.id } })).orderReference).toBe(approved.checkoutOrderReference)
    await expect(owner.rejectRequest(approved.id, expertId, db)).rejects.toThrow('COMMERCE_ILLEGAL_TRANSITION')
    await db.checkoutSession.updateMany({ where: { orderReference: approved.checkoutOrderReference! }, data: { expiresAt: new Date(Date.now() - 1000) } })
    await expect(owner.markRequestPaid({ ...payment(approved), userId: approved.requesterUserId }, db)).rejects.toThrow('COMMERCE_APPROVAL_EXPIRED')
    const expiredCheckoutPage = await openCheckout(checkout.token)
    expect(expiredCheckoutPage.status).toBe(410)
    expect(expiredCheckoutPage.html).toContain('Час оплати вичерпано')
    expect(expiredCheckoutPage.html).not.toContain('Commerce checkout expired or unavailable')
    expect((await owner.getPendingForCoach(expertId, db)).some(row => row.id === approved.id)).toBe(false)
    const fresh = await create({ requesterUserId: approved.requesterUserId })
    expect(fresh.id).not.toBe(approvedRequest.id)
    expect(fresh.id).not.toBe(rejectedRequest.id)
    const { request } = await owner.approveRequest(fresh.id, expertId, db)
    expect(request.status).toBe('APPROVED_PENDING_PAYMENT')
    expect((await db.zoomCommerceRequest.findUniqueOrThrow({ where: { id: approved.id } })).status).toBe('EXPIRED')
    expect((await owner.resolveByPaymentReference(request.checkoutOrderReference!, db))?.id).toBe(fresh.id)
    const otherRequesterId = request.requesterUserId === userId ? otherId : userId
    for (const wrong of [{ userId: otherRequesterId }, { zoomSessionId: randomUUID() }, { amount: 59 }, { currency: 'EUR' }, { paymentKind: 'focus' }]) {
      await expect(owner.markRequestPaid({ ...payment(request), userId: request.requesterUserId, ...wrong }, db)).rejects.toThrow('COMMERCE_PAYMENT_BINDING_MISMATCH')
    }
    const callback = { order_reference: request.checkoutOrderReference!, ...individualPayment, transaction_status: 'Approved', clientAccountId: request.requesterUserId }
    await expect(processPaymentWebhook({ ...callback, clientAccountId: otherRequesterId }, db)).rejects.toThrow('COMMERCE_PAYMENT_BINDING_MISMATCH')
    const boundCheckout = await db.checkoutSession.findFirstOrThrow({ where: { orderReference: request.checkoutOrderReference! } })
    await db.checkoutSession.update({ where: { id: boundCheckout.id }, data: {
      payload: { ...(boundCheckout.payload as Record<string, string>), zoomSessionId: randomUUID() },
    } })
    await expect(processPaymentWebhook(callback, db)).rejects.toThrow('COMMERCE_PAYMENT_BINDING_MISMATCH')
    await db.checkoutSession.update({ where: { id: boundCheckout.id }, data: { payload: boundCheckout.payload! } })
    const paidResults = await Promise.all([processPaymentWebhook(callback, db), processPaymentWebhook(callback, db)])
    expect(paidResults.map(result => result.duplicate).sort()).toEqual([false, true])
    expect((await owner.markRequestPaid({ ...payment(request), userId: request.requesterUserId }, db)).duplicate).toBe(true)
    expect((await owner.approveRequest(request.id, expertId, db)).request.status).toBe('PAID')
    await expect(owner.cancelRequest(request.id, request.requesterUserId, db)).rejects.toThrow('COMMERCE_ILLEGAL_TRANSITION')
    expect(await db.paymentLog.count({ where: { orderReference: request.checkoutOrderReference! } })).toBe(1)
    expect(await db.zoomSessionAttendee.count({ where: { sessionId, userId: request.requesterUserId } })).toBe(1)
    expect((await db.zoomCommerceRequest.findUniqueOrThrow({ where: { id: rejectedRequest.id } })).status).toBe('REQUESTED')
    await expect(owner.approveRequest(rejectedRequest.id, expertId, db)).rejects.toThrow('COMMERCE_SLOT_OCCUPIED')
    expect(await db.user.findUniqueOrThrow({ where: { id: userId } })).toEqual(focusBefore)
    expect(await db.subscription.findMany({ where: { userId } })).toEqual(subscriptionsBefore)
  })

  it('coach-created Individual implicitly approves through the same owner without attendee', async () => {
    const scheduled = new Date(Date.now() + 2 * 86400000)
    scheduled.setMinutes(0, 0, 0)
    const session = await db.zoomSession.create({ data: { expertId, scheduledAt: scheduled,
      topic: 'Coach-created Individual', type: 'PRIVATE', capacity: 1, requests: { type: 'individual' } } })
    const request = await owner.createRequest({ kind: 'INDIVIDUAL', requesterUserId: otherId,
      expertId, zoomSessionId: session.id, scheduledAt: scheduled, ...individualPayment }, db)
    const approval = await owner.approveRequest(request.id, expertId, db)
    expect(approval.request.status).toBe('APPROVED_PENDING_PAYMENT')
    expect(approval.checkoutUrl).toContain('/api/payments/wayforpay/checkout/')
    expect(await db.zoomSessionAttendee.count({ where: { sessionId: session.id } })).toBe(0)
  })

  it('paid Battle entry has no checkout before approval and uses existing Battle financial processing once', async () => {
    const initiate = async () => {
      const scheduled = new Date(Date.now() + 7 * 86400000)
      const battle = await db.zoomSession.create({ data: { expertId, scheduledAt: scheduled,
        topic: 'Paid Battle', requests: { type: 'battle_review', battleStatus: 'pending',
          challengerId: userId, opponentId: otherId, goalA: 'A', goalB: 'B' } } })
      const request = await owner.createRequest({ kind: 'BATTLE', requesterUserId: userId,
        expertId, zoomSessionId: battle.id, scheduledAt: scheduled, amount: 99, currency: 'UAH' }, db)
      return { request, battle }
    }
    const rejectedResponse = await initiate()
    const rejected = await owner.rejectRequest(rejectedResponse.request.id, expertId, db)
    expect(rejected.status).toBe('REJECTED')
    expect(await db.checkoutSession.count({ where: { userId, productCode: 'battle_entry' } })).toBe(0)

    const response = await initiate()
    const requested = response.request
    expect(requested.status).toBe('REQUESTED')
    expect(await db.checkoutSession.count({ where: { userId, productCode: 'battle_entry' } })).toBe(0)
    expect(await db.zoomSessionAttendee.count({ where: { sessionId: response.battle.id } })).toBe(0)

    const approved = await owner.approveRequest(requested.id, expertId, db)
    expect(approved.checkoutUrl).toContain('/api/payments/wayforpay/checkout/')
    const callback = { order_reference: approved.request.checkoutOrderReference!, amount: 99,
      currency: 'UAH', transaction_status: 'Approved', clientAccountId: userId }
    const results = await Promise.all([processPaymentWebhook(callback, db), processPaymentWebhook(callback, db)])
    expect(results.map(result => result.duplicate).sort()).toEqual([false, true])
    expect((await owner.getRequestById(requested.id, db))?.status).toBe('PAID')
    expect(await db.paymentLog.count({ where: { orderReference: approved.request.checkoutOrderReference! } })).toBe(1)
    expect(await db.zoomSessionAttendee.count({ where: { sessionId: response.battle.id } })).toBe(2)
  })
})
