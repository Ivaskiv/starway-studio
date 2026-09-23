import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rows: [] as any[], requests: new Map<string, any>(), next: 100,
  send: vi.fn(), deliver: vi.fn(), approve: vi.fn(), reject: vi.fn(), checkout: vi.fn(),
}))
vi.mock('../../../../src/db/client.js', () => ({ prisma: {
  zoomCommerceRequest: { findUnique: vi.fn(async ({ where }: any) => mocks.requests.get(where.id)) },
  event: {
    findUnique: vi.fn(async ({ where }: any) => mocks.rows.find(r => r.id === where.id)),
    create: vi.fn(async ({ data }: any) => {
      const row = { id: `event-${mocks.next++}`, ...data }; mocks.rows.push(row); return row
    }),
    update: vi.fn(async ({ where, data }: any) => Object.assign(mocks.rows.find(r => r.id === where.id), data)),
    updateMany: vi.fn(async ({ where, data }: any) => {
      const row = mocks.rows.find(r => r.id === where.id && r.state === where.state)
      if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 }
    }),
    findFirst: vi.fn(async ({ where }: any) => mocks.rows.find(r => r.state === where.state
      && where.AND.every((filter: any) => r.payload[filter.payload.path[0]] === filter.payload.equals))),
  },
} }))
vi.mock('../../../../src/lib/telegram.js', () => ({
  bot: {}, resolveOpsChatId: () => '-100', sendUserTelegramMessage: mocks.deliver,
}))
vi.mock('../../../../src/lib/telegram/send.js', () => ({ sendTelegramMessage: mocks.send }))
vi.mock('../../../../src/modules/zoom/commerce/zoom.commerce-request.service.js', () => ({
  approveRequest: mocks.approve, rejectRequest: mocks.reject, getCommerceCheckoutUrl: mocks.checkout,
}))
import {
  commerceActions,
  handleCommerceCallback,
  handleCommerceReply,
  sendCommerceTicket,
} from '../../../../src/modules/zoom/commerce/zoom.commerce-telegram.js'

function callback(id: string, operator: number, verb = 'ask') {
  return { chat: { id: -100 }, from: { id: operator }, callbackQuery: { id: `${id}-${operator}-${verb}`,
    data: `ops:zoom:${verb}:${id}` }, answerCbQuery: vi.fn() } as any
}
function reply(chatId: number, operator: number, promptId: number, text = 'Уточнення') {
  return { chat: { id: chatId }, from: { id: operator }, message: { message_id: mocks.next++, text,
    reply_to_message: { message_id: promptId } } } as any
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.rows.length = 0; mocks.requests.clear(); mocks.next = 100
  mocks.send.mockImplementation(async () => ({ message_id: mocks.next++ }))
  mocks.deliver.mockResolvedValue(true)
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
    mocks.approve.mockResolvedValue({ request: { status: 'APPROVED_PENDING_PAYMENT' } })
    mocks.checkout.mockResolvedValue('https://checkout.example/existing')
    await handleCommerceCallback(callback(id, 1, 'approve'))
    expect(mocks.approve).toHaveBeenCalledWith(id, 'expert')
    expect(mocks.deliver).toHaveBeenCalledWith(
      id === 'individual' ? '11' : '22',
      expect.stringContaining('✅ СЕСІЮ ПІДТВЕРДЖЕНО'),
      {
        reply_markup: {
          inline_keyboard: [[{
            text: expect.stringMatching(/^💳 ОПЛАТИТИ /),
            url: 'https://checkout.example/existing',
          }]],
        },
      },
    )
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

it.each(['individual', 'battle'])('uses canonical request actions for %s', requestId => {
  expect(commerceActions(requestId)).toEqual({ inline_keyboard: [[
    { text: '✅ ПІДТВЕРДИТИ', callback_data: `ops:zoom:approve:${requestId}` },
    { text: '❌ ВІДХИЛИТИ', callback_data: `ops:zoom:reject:${requestId}` },
  ]] })
})

it('does not expose raw commerce enum names in the coach ticket', async () => {
  await sendCommerceTicket('individual')
  const message = String(mocks.deliver.mock.calls.at(-1)?.[1] ?? '')
  expect(message).toContain('НОВИЙ ЗАПИТ НА ІНДИВІДУАЛЬНУ СЕСІЮ')
  expect(message).toContain('Очікує рішення')
  expect(message).not.toContain('REQUESTED')
  expect(message).not.toContain('APPROVED_PENDING_PAYMENT')
})
