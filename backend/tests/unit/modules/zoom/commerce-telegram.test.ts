import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rows: [] as any[], requests: new Map<string, any>(), next: 100,
  pending: [] as any[], expired: [] as any[],
  deliveries: [] as any[],
  deliveryUpdate: vi.fn(),
  send: vi.fn(), deliver: vi.fn(), opsDeliver: vi.fn(), coachDeliver: vi.fn(), coach: null as any, approve: vi.fn(), reject: vi.fn(), checkout: vi.fn(), deadline: vi.fn(), checkoutSession: vi.fn(),
}))
vi.mock('../../../../src/db/client.js', () => ({ prisma: {
  zoomCommerceRequest: {
    findUnique: vi.fn(async ({ where }: any) => where.id
      ? mocks.requests.get(where.id)
      : Array.from(mocks.requests.values()).find(
        request => request.checkoutOrderReference === where.checkoutOrderReference,
      )),
    findMany: vi.fn(async ({ where }: any) => where.status === 'EXPIRED' ? mocks.expired : mocks.pending),
  },
  checkoutSession: { findFirst: (...args: any[]) => mocks.checkoutSession(...args) },
  user: { findFirst: vi.fn(async () => mocks.coach) },
  event: {
    findUnique: vi.fn(async ({ where }: any) => mocks.rows.find(r => r.id === where.id)),
    create: vi.fn(async ({ data }: any) => {
      if (data.id && mocks.rows.some((row) => row.id === data.id)) throw new Error('unique_event_id')
      const { deliveries, ...eventData } = data
      const row = { ...eventData, id: eventData.id ?? `event-${mocks.next++}` }; mocks.rows.push(row)
      for (const delivery of deliveries?.create ?? []) {
        mocks.deliveries.push({ id: `delivery-${mocks.next++}`, eventId: row.id, state: 'PENDING', attemptCount: 0, createdAt: new Date(), ...delivery })
      }
      return row
    }),
    update: vi.fn(async ({ where, data }: any) => Object.assign(mocks.rows.find(r => r.id === where.id), data)),
    updateMany: vi.fn(async ({ where, data }: any) => {
      const states = Array.isArray(where.state?.in) ? where.state.in : [where.state]
      const row = mocks.rows.find(r => r.id === where.id && states.includes(r.state))
      if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 }
    }),
    findFirst: vi.fn(async ({ where }: any) => mocks.rows.find(r => r.state === where.state
      && where.AND.every((filter: any) => r.payload[filter.payload.path[0]] === filter.payload.equals))),
  },
  eventDelivery: {
    count: vi.fn(async ({ where }: any) => mocks.deliveries.filter((delivery) => delivery.eventId === where.eventId).length),
    findMany: vi.fn(async ({ where }: any) => mocks.deliveries.filter((delivery) => delivery.eventId === where.eventId)),
    findFirst: vi.fn(async ({ where }: any) => mocks.deliveries
      .filter((delivery) => delivery.eventId === where.eventId && delivery.state === where.state)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null),
    updateMany: (...args: any[]) => mocks.deliveryUpdate(...args),
  },
} }))
vi.mock('../../../../src/lib/telegram.js', () => ({
  bot: {}, coachBot: {}, resolveOpsChatId: () => '-100', sendUserTelegramMessage: mocks.deliver,
  sendDedupedTelegramMessage: mocks.coachDeliver,
  sendOpsTelegramMessage: mocks.opsDeliver,
}))
vi.mock('../../../../src/lib/telegram/send.js', () => ({ sendTelegramMessage: mocks.send }))
vi.mock('../../../../src/modules/zoom/commerce/zoom.commerce-request.service.js', () => ({
  approveRequest: mocks.approve, rejectRequest: mocks.reject, getCommerceCheckoutUrl: mocks.checkout,
  resolveIndividualPaymentDeadline: mocks.deadline,
}))
import {
  commerceActions,
  handleCommerceCallback,
  handleCommerceReply,
  notifyCommerceExpired,
  notifyCommercePaid,
  deliverIndividualPaymentReminder,
  processZoomPaymentLifecycleNotifications,
  sendCommerceTicket,
} from '../../../../src/modules/zoom/commerce/zoom.commerce-telegram.js'

function callback(id: string, operator: number, verb = 'ask') {
  return { chat: { id: -100 }, from: { id: operator }, callbackQuery: { id: `${id}-${operator}-${verb}`,
    data: `ops:zoom:${verb}:${id}` }, answerCbQuery: vi.fn(), editMessageReplyMarkup: vi.fn().mockResolvedValue(undefined) } as any
}
function reply(chatId: number, operator: number, promptId: number, text = 'Уточнення') {
  return { chat: { id: chatId }, from: { id: operator }, message: { message_id: mocks.next++, text,
    reply_to_message: { message_id: promptId } } } as any
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.rows.length = 0; mocks.requests.clear(); mocks.pending.length = 0; mocks.expired.length = 0; mocks.deliveries.length = 0; mocks.next = 100
  mocks.send.mockImplementation(async () => ({ message_id: mocks.next++ }))
  mocks.deliver.mockImplementation(async (_chat, _text, _options, onDelivered) => { await onDelivered?.({ messageId: String(mocks.next++) }); return true })
  mocks.opsDeliver.mockImplementation(async (_text, _options, _routeMeta, onDelivered) => { await onDelivered?.({ messageId: String(mocks.next++) }); return true })
  mocks.coachDeliver.mockImplementation(async (_chat, _text, _options, _bot, onDelivered) => { await onDelivered?.({ messageId: String(mocks.next++) }); return true })
  mocks.coach = null
  mocks.checkoutSession.mockReset()
  mocks.deliveryUpdate.mockImplementation(async ({ where, data }: any) => {
    const rows = mocks.deliveries.filter((delivery) => (
      (!where.id || delivery.id === where.id)
      && (!where.eventId || delivery.eventId === where.eventId)
      && (!where.state || delivery.state === where.state)
      && (!where.leaseToken || delivery.leaseToken === where.leaseToken)
      && (!where.leaseExpiresAt?.lt || delivery.leaseExpiresAt < where.leaseExpiresAt.lt)
    ))
    for (const row of rows) {
      const { attemptCount, ...rest } = data
      Object.assign(row, rest)
      if (attemptCount?.increment) row.attemptCount = (row.attemptCount ?? 0) + attemptCount.increment
    }
    return { count: rows.length }
  })
  mocks.deadline.mockImplementation(({ approvedAt }: { approvedAt: Date }) => new Date(approvedAt.getTime() + 60 * 60 * 1000))
  for (const [id, kind, userChatId] of [['individual', 'INDIVIDUAL', '11'], ['battle', 'BATTLE', '22']]) {
    mocks.requests.set(id, {
      id,
      kind,
      status: 'REQUESTED',
      requesterUserId: `user-${userChatId}`,
      expertId: 'expert',
      scheduledAt: new Date(Date.now() + 86400000),
      amount: kind === 'INDIVIDUAL' ? 60 : 99,
      currency: kind === 'INDIVIDUAL' ? 'EUR' : 'UAH',
      requester: {
        firstName: 'Учасниця',
        telegramChatId: userChatId,
        telegramLinks: [],
      },
      zoomSession: { topic: 'Сесія', requests: {} },
    })
  }
})
describe('request-scoped commerce dialogue', () => {
  it('keeps two requests from the same operator and another operator isolated', async () => {
    await handleCommerceCallback(callback('individual', 1))
    await handleCommerceCallback(callback('battle', 1))
    await handleCommerceCallback(callback('battle', 2))
    const prompts = mocks.rows.filter(r => r.state === 'ARMED')
    expect(prompts).toHaveLength(3)
    const first = prompts[0]
    expect(await handleCommerceReply(reply(-100, 2, first.payload.promptMessageId))).toBe(false)
    expect(await handleCommerceReply(reply(-100, 1, first.payload.promptMessageId))).toBe(true)
    const userPrompt = mocks.rows.find(r => r.payload.direction === 'user')
    expect(userPrompt.payload.requestId).toBe('individual')
    expect(userPrompt.payload.userChatId).toBe('11')
    expect(await handleCommerceReply(reply(22, 22, userPrompt.payload.promptMessageId))).toBe(false)
    expect(await handleCommerceReply(reply(11, 11, userPrompt.payload.promptMessageId, 'Моя відповідь'))).toBe(true)
    expect(mocks.deliver).toHaveBeenLastCalledWith('-100', expect.stringContaining('Моя відповідь'),
      { reply_markup: commerceActions('individual') })
    expect(prompts[1].state).toBe('ARMED')
    expect(prompts[2].state).toBe('ARMED')
    expect(await handleCommerceReply(reply(11, 11, userPrompt.payload.promptMessageId))).toBe(false)
  })
  it.each(['individual', 'battle'])('uses approval and checkout owner for %s', async id => {
    mocks.approve.mockResolvedValue({ request: {
      status: 'APPROVED_PENDING_PAYMENT', kind: id === 'individual' ? 'INDIVIDUAL' : 'BATTLE',
      approvedAt: new Date('2026-09-26T12:27:00.000Z'),
      scheduledAt: new Date('2026-09-26T16:00:00.000Z'),
    } })
    mocks.checkout.mockResolvedValue('https://checkout.example/existing')
    await handleCommerceCallback(callback(id, 1, 'approve'))
    expect(mocks.approve).toHaveBeenCalledWith(id, 'expert')
    const userDelivery = mocks.deliver.mock.calls.find(call => call[0] === (id === 'individual' ? '11' : '22'))
    expect(userDelivery?.[1]).toContain('🕒 ОЧІКУЄ ОПЛАТИ')
    expect(userDelivery?.[2]).toEqual(expect.objectContaining({
      reply_markup: expect.objectContaining({
        inline_keyboard: expect.arrayContaining([[
          expect.objectContaining({ text: expect.stringMatching(/^💳 ОПЛАТИТИ /), url: 'https://checkout.example/existing' }),
        ]]),
      }),
    }))
  })

  it('shows the canonical individual payment deadline in the approval message', async () => {
    const deadline = new Date('2026-09-26T13:30:00.000Z')
    mocks.deadline.mockReturnValue(deadline)
    mocks.approve.mockResolvedValue({ request: {
      status: 'APPROVED_PENDING_PAYMENT', kind: 'INDIVIDUAL',
      approvedAt: new Date('2026-09-26T12:27:00.000Z'),
      scheduledAt: new Date('2026-09-26T16:00:00.000Z'),
    } })
    mocks.checkout.mockResolvedValue('https://checkout.example/existing')

    await handleCommerceCallback(callback('individual', 1, 'approve'))

    expect(mocks.deadline).toHaveBeenCalledWith({
      approvedAt: new Date('2026-09-26T12:27:00.000Z'),
      scheduledAt: new Date('2026-09-26T16:00:00.000Z'),
    })
    expect(mocks.deliver.mock.calls.find(call => call[0] === '11')?.[1])
      .toContain('Заверши оплату до 16:30 (час за Києвом).')
  })
  it('keeps a persisted approval successful when downstream Telegram delivery fails', async () => {
    mocks.approve.mockResolvedValue({ request: {
      status: 'APPROVED_PENDING_PAYMENT', kind: 'INDIVIDUAL',
      approvedAt: new Date('2026-09-26T12:27:00.000Z'),
      scheduledAt: new Date('2026-09-26T16:00:00.000Z'),
    } })
    mocks.checkout.mockResolvedValue('https://checkout.example/existing')
    mocks.deliver.mockRejectedValueOnce(new Error('telegram delivery failed'))

    await handleCommerceCallback(callback('individual', 1, 'approve'))

    expect(mocks.approve).toHaveBeenCalledTimes(1)
    expect(mocks.checkout).toHaveBeenCalledTimes(1)
    expect(mocks.deliver).toHaveBeenLastCalledWith(
      '-100',
      expect.stringContaining('Сесію підтверджено.'),
    )
    expect(mocks.deliver.mock.calls.some(call => String(call[1]).includes('Не вдалося виконати дію або доставити'))).toBe(false)
  })
  it.each(['individual', 'battle'])('rejects %s without checkout', async id => {
    mocks.reject.mockResolvedValue({ status: 'REJECTED' })
    await handleCommerceCallback(callback(id, 1, 'reject'))
    expect(mocks.reject).toHaveBeenCalledWith(id, 'expert')
    expect(mocks.checkout).not.toHaveBeenCalled()
    expect(mocks.deliver).toHaveBeenCalledWith(id === 'individual' ? '11' : '22', expect.stringContaining('ЗАПИТ ВІДХИЛЕНО'))
  })
  it('does not invent a payment CTA when approval has no valid checkout', async () => {
    mocks.approve.mockResolvedValue({ request: { status: 'APPROVED_PENDING_PAYMENT' } })
    mocks.checkout.mockResolvedValue(null)
    await handleCommerceCallback(callback('battle', 1, 'approve'))
    expect(mocks.deliver.mock.calls.some(call => call[2]?.reply_markup)).toBe(false)
  })
})

describe('Individual payment lifecycle notifications', () => {
  it('rechecks the persisted request and deadline before sending the durable reminder', async () => {
    const deadline = new Date(Date.now() + 30 * 60 * 1000)
    const request = {
      ...mocks.requests.get('individual'), id: 'lifecycle', status: 'APPROVED_PENDING_PAYMENT',
      checkoutOrderReference: 'zoom_commerce_individual_lifecycle',
    }
    mocks.requests.set('lifecycle', request)
    mocks.checkoutSession.mockResolvedValue({
      expiresAt: deadline, status: 'CREATED', invalidatedAt: null,
    })
    mocks.checkout.mockResolvedValue('https://checkout.example/existing')

    await expect(deliverIndividualPaymentReminder({
      requestId: 'lifecycle', expectedDeadline: deadline.toISOString(),
    })).resolves.toBe('sent')

    expect(mocks.deliver).toHaveBeenCalledWith('11', expect.stringContaining('НАГАДУВАННЯ ПРО ОПЛАТУ.'), {
      reply_markup: { inline_keyboard: [[{
        text: 'ОПЛАТИТИ', url: 'https://checkout.example/existing',
      }]], },
    })
    expect(mocks.deliver.mock.calls.at(-1)?.[1]).toContain('час за Києвом')
  })

  it('skips a paid request or a revised deadline without opening checkout', async () => {
    const deadline = new Date(Date.now() + 30 * 60 * 1000)
    mocks.requests.set('lifecycle', {
      ...mocks.requests.get('individual'), id: 'lifecycle', status: 'PAID',
      checkoutOrderReference: 'zoom_commerce_individual_lifecycle',
    })
    expect(await deliverIndividualPaymentReminder({
      requestId: 'lifecycle', expectedDeadline: deadline.toISOString(),
    })).toBe('skipped')

    mocks.requests.set('lifecycle', {
      ...mocks.requests.get('individual'), id: 'lifecycle', status: 'APPROVED_PENDING_PAYMENT',
      checkoutOrderReference: 'zoom_commerce_individual_lifecycle',
    })
    mocks.checkoutSession.mockResolvedValue({
      expiresAt: new Date(deadline.getTime() + 60_000), status: 'CREATED', invalidatedAt: null,
    })
    expect(await deliverIndividualPaymentReminder({
      requestId: 'lifecycle', expectedDeadline: deadline.toISOString(),
    })).toBe('skipped')
    expect(mocks.checkout).not.toHaveBeenCalled()
  })

  it('uses the approved terminal copy without a payment CTA after expiration', async () => {
    const request = { ...mocks.requests.get('individual'), status: 'EXPIRED', approvedAt: new Date() }
    mocks.requests.set('individual', request)

    await notifyCommerceExpired('individual')

    const userDelivery = mocks.deliver.mock.calls.find(call => call[0] === '11')
    expect(userDelivery?.[1]).toContain('Час на оплату завершився. Слот звільнено.')
    expect(userDelivery?.[1]).toContain('🟣 ІНДИВІДУАЛЬНА СЕСІЯ')
    expect(userDelivery?.[1]).toContain('📅')
    expect(userDelivery?.[1]).toContain('час за Києвом')
    expect(userDelivery?.[1]).toContain('🆔 Запит DIVIDUAL')
    expect(userDelivery?.[2]?.reply_markup.inline_keyboard.flat().some((button: any) => button.text.includes('ОПЛАТИТИ'))).toBe(false)
    expect(mocks.opsDeliver.mock.calls[0]?.[0]).toContain('🧾 Запит individual')
  })

  it('limits request context to the owner, authorized coach, and OPS formats', async () => {
    const request = { ...mocks.requests.get('individual'), status: 'EXPIRED', approvedAt: new Date() }
    mocks.requests.set('individual', request)
    mocks.coach = { telegramChatId: '33', telegramLinks: [] }

    await notifyCommerceExpired('individual')

    expect(mocks.deliver).toHaveBeenCalledWith('11', expect.not.stringContaining('🧾 Запит individual'), expect.anything())
    expect(mocks.coachDeliver).toHaveBeenCalledWith('33', expect.stringContaining('🆔 Запит DIVIDUAL'), undefined, expect.anything())
    expect(mocks.opsDeliver).toHaveBeenCalledWith(expect.stringContaining('🧾 Запит individual'), undefined, expect.anything())
  })

  it('delivers distinct expiry context for two requests with the same event type and scan time', async () => {
    const first = { ...mocks.requests.get('individual'), id: 'request-00000001', status: 'EXPIRED', approvedAt: new Date() }
    const second = { ...mocks.requests.get('individual'), id: 'request-00000002', status: 'EXPIRED', approvedAt: new Date(), requesterUserId: 'user-12', requester: { firstName: 'Інша', telegramChatId: '12', telegramLinks: [] } }
    mocks.requests.set(first.id, first)
    mocks.requests.set(second.id, second)
    mocks.expired.push(first, second)

    await processZoomPaymentLifecycleNotifications(new Date('2026-10-22T10:00:00.000Z'))

    expect(mocks.rows.filter(row => row.id.startsWith('zoom-commerce-expired:')))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'zoom-commerce-expired:request-00000001', state: 'DELIVERED' }),
        expect.objectContaining({ id: 'zoom-commerce-expired:request-00000002', state: 'DELIVERED' }),
      ]))
    expect(mocks.deliver.mock.calls.map(call => call[1])).toEqual(expect.arrayContaining([
      expect.stringContaining('🆔 Запит 00000001'),
      expect.stringContaining('🆔 Запит 00000002'),
    ]))
    expect(mocks.deliveries.filter((delivery) => delivery.state === 'DELIVERED')).toHaveLength(4)
    expect(mocks.deliveries.filter((delivery) => delivery.state === 'SKIPPED')).toHaveLength(2)
    expect(mocks.deliveries.filter((delivery) => delivery.state === 'DELIVERED').every((delivery) => delivery.telegramMessageId)).toBe(true)
  })

  it('claims each future expiry recipient once across concurrent scheduler scans', async () => {
    const request = { ...mocks.requests.get('individual'), id: 'request-concurrent', status: 'EXPIRED', approvedAt: new Date() }
    mocks.requests.set(request.id, request)
    mocks.expired.push(request)

    await Promise.all([
      processZoomPaymentLifecycleNotifications(new Date('2026-10-22T10:00:00.000Z')),
      processZoomPaymentLifecycleNotifications(new Date('2026-10-22T10:00:00.000Z')),
    ])

    expect(mocks.deliveries.filter((delivery) => delivery.eventId === 'zoom-commerce-expired:request-concurrent')).toHaveLength(3)
    expect(mocks.deliver).toHaveBeenCalledTimes(1)
    expect(mocks.opsDeliver).toHaveBeenCalledTimes(1)
  })

  it('marks an expired recipient lease UNKNOWN without resending it', async () => {
    const request = { ...mocks.requests.get('individual'), id: 'request-stale', status: 'EXPIRED', approvedAt: new Date() }
    const eventId = `zoom-commerce-expired:${request.id}`
    mocks.requests.set(request.id, request)
    mocks.expired.push(request)
    mocks.rows.push({ id: eventId, state: 'SENDING', payload: { requestId: request.id } })
    mocks.deliveries.push({ id: 'stale-user', eventId, recipient: 'USER', state: 'SENDING', leaseToken: 'old', leaseExpiresAt: new Date('2026-10-22T09:59:59.000Z'), attemptCount: 1, createdAt: new Date() })

    await processZoomPaymentLifecycleNotifications(new Date('2026-10-22T10:00:00.000Z'))

    expect(mocks.deliver).not.toHaveBeenCalled()
    expect(mocks.deliveries.find((delivery) => delivery.id === 'stale-user')).toMatchObject({ state: 'UNKNOWN', leaseToken: null })
    expect(mocks.rows.find((row) => row.id === eventId)).toMatchObject({ state: 'UNKNOWN' })
  })

  it('preserves an ambiguous post-attempt timeout as UNKNOWN and does not retry it', async () => {
    const request = { ...mocks.requests.get('individual'), id: 'request-timeout', status: 'EXPIRED', approvedAt: new Date() }
    mocks.requests.set(request.id, request)
    mocks.expired.push(request)
    mocks.deliver.mockRejectedValueOnce(new Error('telegram timeout'))
    const now = new Date('2026-10-22T10:00:00.000Z')

    await processZoomPaymentLifecycleNotifications(now)
    await processZoomPaymentLifecycleNotifications(now)

    const eventId = `zoom-commerce-expired:${request.id}`
    expect(mocks.deliver).toHaveBeenCalledTimes(1)
    expect(mocks.deliveries.find((delivery) => delivery.eventId === eventId && delivery.recipient === 'USER'))
      .toMatchObject({ state: 'UNKNOWN', attemptCount: 1 })
    expect(mocks.rows.find((row) => row.id === eventId)).toMatchObject({ state: 'UNKNOWN' })
  })

  it('does not resend when Telegram succeeded but receipt persistence crashes', async () => {
    const request = { ...mocks.requests.get('individual'), id: 'request-receipt-crash', status: 'EXPIRED', approvedAt: new Date() }
    mocks.requests.set(request.id, request)
    mocks.expired.push(request)
    const originalUpdate = mocks.deliveryUpdate.getMockImplementation()
    mocks.deliveryUpdate.mockImplementation(async (input: any) => {
      if (input.data?.state === 'DELIVERED') throw new Error('receipt_write_crash')
      return originalUpdate(input)
    })
    const now = new Date('2026-10-22T10:00:00.000Z')

    await processZoomPaymentLifecycleNotifications(now)
    await processZoomPaymentLifecycleNotifications(now)

    const userDelivery = mocks.deliveries.find((delivery) => delivery.eventId === `zoom-commerce-expired:${request.id}` && delivery.recipient === 'USER')
    expect(mocks.deliver).toHaveBeenCalledTimes(1)
    expect(userDelivery).toMatchObject({ state: 'UNKNOWN', attemptCount: 1 })
  })

  it('records a proven no-send recipient as SKIPPED before delivery begins', async () => {
    const request = {
      ...mocks.requests.get('individual'), id: 'request-no-chat', status: 'EXPIRED', approvedAt: new Date(),
      requester: { firstName: 'Учасниця', telegramChatId: null, telegramLinks: [] },
    }
    mocks.requests.set(request.id, request)
    mocks.expired.push(request)

    await processZoomPaymentLifecycleNotifications(new Date('2026-10-22T10:00:00.000Z'))

    expect(mocks.deliver).not.toHaveBeenCalled()
    expect(mocks.deliveries.find((delivery) => delivery.eventId === `zoom-commerce-expired:${request.id}` && delivery.recipient === 'USER'))
      .toMatchObject({ state: 'SKIPPED', attemptCount: 1, lastError: 'user_chat_unavailable' })
  })
})

it.each(['individual', 'battle'])('uses canonical request actions for %s', requestId => {
  expect(commerceActions(requestId)).toEqual({ inline_keyboard: [[
    { text: '✅ ПІДТВЕРДИТИ', callback_data: `ops:zoom:approve:${requestId}` },
    { text: '❌ ВІДХИЛИТИ', callback_data: `ops:zoom:reject:${requestId}` },
  ]] })
})

it('renders one compact individual OPS ticket with the meaningful user context', async () => {
  const request = mocks.requests.get('individual')
  request.zoomSession.topic = 'Індивідуальна сесія'
  mocks.rows.push({
    id: 'zoom-context:individual',
    payload: { questionText: 'Потрібен розбір стратегії' },
  })

  await sendCommerceTicket('individual')
  const message = String(mocks.deliver.mock.calls.at(-1)?.[1] ?? '')
  expect(message).toContain('🟣 НОВИЙ ЗАПИТ НА СЕСІЮ')
  expect(message).toContain('💬 Потрібен розбір стратегії')
  expect(message).toContain('Очікує рішення')
  expect(message).not.toContain('ІНДИВІДУАЛЬНА СЕСІЯ')
  expect(message).not.toContain('Запит користувача:')
  expect(message).not.toContain('REQUESTED')
  expect(message).not.toContain('APPROVED_PENDING_PAYMENT')
  expect(mocks.deliver.mock.calls.at(-1)?.[2]).toEqual({
    reply_markup: commerceActions('individual'),
  })
})

it('delivers each canonical paid confirmation once across callback retries', async () => {
  const request = mocks.requests.get('individual')
  request.status = 'PAID'
  request.checkoutOrderReference = 'zoom_commerce_individual_individual'
  mocks.rows.push({
    id: 'zoom-context:individual',
    payload: { questionText: 'Потрібен розбір стратегії' },
  })

  await notifyCommercePaid(request.checkoutOrderReference)
  await notifyCommercePaid(request.checkoutOrderReference)

  expect(mocks.deliver).toHaveBeenCalledTimes(1)
  expect(mocks.deliver).toHaveBeenCalledWith(
    '11',
    expect.stringContaining('✅ ОПЛАТУ ПІДТВЕРДЖЕНО'),
    expect.any(Object),
  )
  expect(mocks.deliver.mock.calls[0][1]).toContain('💬 Потрібен розбір стратегії')
  expect(mocks.opsDeliver).toHaveBeenCalledTimes(1)
  expect(mocks.opsDeliver.mock.calls[0][0]).toContain(`🧾 ${request.checkoutOrderReference}`)
  expect(mocks.opsDeliver.mock.calls[0][0]).toContain('Статус: ОПЛАЧЕНО')
  expect(mocks.rows.find(row => row.id === 'zoom-commerce-paid:user:individual'))
    .toMatchObject({ state: 'DELIVERED' })
  expect(mocks.rows.find(row => row.id === 'zoom-commerce-paid:ops:individual'))
    .toMatchObject({ state: 'DELIVERED' })
})
