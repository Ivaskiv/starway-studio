import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rows: [] as any[], requests: new Map<string, any>(), next: 100,
  pending: [] as any[],
  send: vi.fn(), deliver: vi.fn(), opsDeliver: vi.fn(), approve: vi.fn(), reject: vi.fn(), checkout: vi.fn(), deadline: vi.fn(),
}))
vi.mock('../../../../src/db/client.js', () => ({ prisma: {
  zoomCommerceRequest: {
    findUnique: vi.fn(async ({ where }: any) => where.id
      ? mocks.requests.get(where.id)
      : Array.from(mocks.requests.values()).find(
        request => request.checkoutOrderReference === where.checkoutOrderReference,
      )),
    findMany: vi.fn(async ({ where }: any) => where.status === 'EXPIRED' ? [] : mocks.pending),
  },
  user: { findFirst: vi.fn().mockResolvedValue(null) },
  event: {
    findUnique: vi.fn(async ({ where }: any) => mocks.rows.find(r => r.id === where.id)),
    create: vi.fn(async ({ data }: any) => {
      const row = { ...data, id: data.id ?? `event-${mocks.next++}` }; mocks.rows.push(row); return row
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
} }))
vi.mock('../../../../src/lib/telegram.js', () => ({
  bot: {}, resolveOpsChatId: () => '-100', sendUserTelegramMessage: mocks.deliver,
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
  processZoomPaymentLifecycleNotifications,
  resolvePaymentNudges,
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
  vi.clearAllMocks(); mocks.rows.length = 0; mocks.requests.clear(); mocks.pending.length = 0; mocks.next = 100
  mocks.send.mockImplementation(async () => ({ message_id: mocks.next++ }))
  mocks.deliver.mockResolvedValue(true)
  mocks.opsDeliver.mockResolvedValue(true)
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
    expect(userDelivery?.[1]).toContain('✅ СЕСІЮ ПІДТВЕРДЖЕНО')
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
      .toContain('Заверши оплату до 16:30.')
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

describe('Individual payment lifecycle nudges', () => {
  it('derives the midpoint and final nudge from one canonical deadline', () => {
    const approvedAt = new Date('2026-09-26T12:27:00.000Z')
    const deadline = new Date('2026-09-26T13:30:00.000Z')
    const nudges = resolvePaymentNudges({ approvedAt, deadline })

    expect(nudges).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'INDIVIDUAL_MID_WINDOW', dueAt: new Date('2026-09-26T12:58:30.000Z') }),
      expect.objectContaining({ kind: 'INDIVIDUAL_DEADLINE_MINUS_10M', dueAt: new Date('2026-09-26T13:20:00.000Z') }),
    ]))
    expect(nudges.map(nudge => nudge.text).join('\n')).toContain('Заверши оплату до 16:30.')
  })

  it('skips invalid short-window nudges and prefers the final nudge on a collision', () => {
    const approvedAt = new Date('2026-09-26T12:00:00.000Z')
    expect(resolvePaymentNudges({ approvedAt, deadline: new Date('2026-09-26T12:10:00.000Z') }))
      .toEqual([expect.objectContaining({ kind: 'INDIVIDUAL_MID_WINDOW' })])
    expect(resolvePaymentNudges({ approvedAt, deadline: new Date('2026-09-26T12:20:00.000Z') }))
      .toEqual([expect.objectContaining({ kind: 'INDIVIDUAL_DEADLINE_MINUS_10M' })])
  })

  it('uses a capped canonical deadline without scheduling a nudge beyond it', () => {
    const approvedAt = new Date('2026-09-26T12:00:00.000Z')
    const cappedDeadline = new Date('2026-09-26T12:20:00.000Z')
    const nudges = resolvePaymentNudges({ approvedAt, deadline: cappedDeadline })

    expect(nudges).toEqual([expect.objectContaining({
      kind: 'INDIVIDUAL_DEADLINE_MINUS_10M',
      dueAt: new Date('2026-09-26T12:10:00.000Z'),
    })])
    expect(nudges.every(nudge => nudge.dueAt < cappedDeadline)).toBe(true)
  })

  it('revalidates current PAID status before sending a stale pending reminder', async () => {
    const approvedAt = new Date('2026-09-26T12:00:00.000Z')
    const deadline = new Date('2026-09-26T13:00:00.000Z')
    mocks.deadline.mockReturnValue(deadline)
    const snapshot = {
      ...mocks.requests.get('individual'), id: 'lifecycle', status: 'APPROVED_PENDING_PAYMENT', approvedAt,
    }
    mocks.pending.push(snapshot)
    mocks.requests.set('lifecycle', { ...snapshot, status: 'PAID' })
    mocks.checkout.mockResolvedValue('https://checkout.example/existing')

    await processZoomPaymentLifecycleNotifications(new Date('2026-09-26T12:55:00.000Z'))

    expect(mocks.deliver).not.toHaveBeenCalled()
    expect(mocks.checkout).not.toHaveBeenCalled()
  })

  it('claims each due nudge once across repeated lifecycle scans', async () => {
    const approvedAt = new Date('2026-09-26T12:00:00.000Z')
    const deadline = new Date('2026-09-26T13:00:00.000Z')
    mocks.deadline.mockReturnValue(deadline)
    const request = {
      ...mocks.requests.get('individual'), id: 'lifecycle', status: 'APPROVED_PENDING_PAYMENT', approvedAt,
    }
    mocks.pending.push(request)
    mocks.requests.set('lifecycle', request)
    mocks.checkout.mockResolvedValue('https://checkout.example/existing')
    const now = new Date('2026-09-26T12:55:00.000Z')

    await processZoomPaymentLifecycleNotifications(now)
    await processZoomPaymentLifecycleNotifications(now)

    expect(mocks.deliver).toHaveBeenCalledTimes(2)
    expect(mocks.rows.filter(row => row.state === 'DELIVERED').map(row => row.id).sort()).toEqual([
      'zoom-payment-nudge:lifecycle:INDIVIDUAL_DEADLINE_MINUS_10M',
      'zoom-payment-nudge:lifecycle:INDIVIDUAL_MID_WINDOW',
    ])
  })

  it('does not send a nudge at the deadline or when checkout is unavailable', async () => {
    const approvedAt = new Date('2026-09-26T12:00:00.000Z')
    const deadline = new Date('2026-09-26T13:00:00.000Z')
    mocks.deadline.mockReturnValue(deadline)
    const request = {
      ...mocks.requests.get('individual'), id: 'lifecycle', status: 'APPROVED_PENDING_PAYMENT', approvedAt,
    }
    mocks.pending.push(request)
    mocks.requests.set('lifecycle', request)
    mocks.checkout.mockResolvedValue('https://checkout.example/existing')

    await processZoomPaymentLifecycleNotifications(deadline)
    expect(mocks.deliver).not.toHaveBeenCalled()

    mocks.checkout.mockResolvedValue(null)
    await processZoomPaymentLifecycleNotifications(new Date('2026-09-26T12:55:00.000Z'))
    expect(mocks.deliver).not.toHaveBeenCalled()
  })

  it('uses the approved terminal copy without a payment CTA after expiration', async () => {
    const request = { ...mocks.requests.get('individual'), status: 'EXPIRED', approvedAt: new Date() }
    mocks.requests.set('individual', request)

    await notifyCommerceExpired('individual')

    const userDelivery = mocks.deliver.mock.calls.find(call => call[0] === '11')
    expect(userDelivery?.[1]).toContain('Час на оплату завершився. Слот звільнено.')
    expect(userDelivery?.[2]?.reply_markup.inline_keyboard.flat().some((button: any) => button.text.includes('ОПЛАТИТИ'))).toBe(false)
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
  expect(mocks.opsDeliver.mock.calls[0][0]).toContain('Статус: PAID')
  expect(mocks.rows.find(row => row.id === 'zoom-commerce-paid:user:individual'))
    .toMatchObject({ state: 'DELIVERED' })
  expect(mocks.rows.find(row => row.id === 'zoom-commerce-paid:ops:individual'))
    .toMatchObject({ state: 'DELIVERED' })
})
