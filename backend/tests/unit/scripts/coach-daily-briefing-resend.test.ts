import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  existing: null as { state: string; deliveries: Array<{ state: string; telegramMessageId: string | null }> } | null,
  senderResult: true,
  sent: [] as unknown[][],
  updateMany: vi.fn(async () => ({ count: 1 })),
  eventUpdate: vi.fn(async () => ({})),
  eventCreate: vi.fn(async () => ({ state: 'PENDING', deliveries: [{ state: 'PENDING', telegramMessageId: null }] })),
  load: vi.fn(async () => ({ monthNow: new Date('2026-10-28T08:00:00.000Z') })),
  build: vi.fn(async () => '<b>canonical briefing</b>'),
  buttons: vi.fn(() => [[{ text: 'Агенти', url: 'https://example.test/agents' }]]),
  agentsUrl: vi.fn(async () => 'https://example.test/agents'),
}))

vi.mock('../../../src/db/client.ts', () => ({
  prisma: {
    event: {
      findUnique: vi.fn(async () => state.existing),
      create: (...args: unknown[]) => state.eventCreate(...args),
      update: (...args: unknown[]) => state.eventUpdate(...args),
    },
    eventDelivery: { updateMany: (...args: unknown[]) => state.updateMany(...args) },
    $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations)),
  },
}))

vi.mock('../../../src/lib/telegram.ts', () => ({
  bot: { telegram: { getMe: vi.fn(async () => ({ username: 'starway_prod_bot' })), getChat: vi.fn(async () => ({ type: 'supergroup' })) } },
  resolveOpsChatId: vi.fn(() => '-1003829747010'),
  sendOpsTelegramMessage: vi.fn(async (...args: unknown[]) => {
    state.sent.push(args)
    const receipt = args[3] as ((input: { messageId: string | null }) => Promise<void>) | undefined
    if (state.senderResult && receipt) await receipt({ messageId: '42' })
    return state.senderResult
  }),
}))

vi.mock('../../../src/modules/telegram-mentor/runtime/botConfig.ts', () => ({
  requireTelegramBotConfig: vi.fn(() => ({ token: 'configured', username: 'starway_prod_bot' })),
  assertTelegramBotIdentity: vi.fn(() => 'starway_prod_bot'),
}))

vi.mock('../../../src/services/scheduler/daily/coach/data.ts', () => ({
  loadDailyCoachBriefingData: (...args: unknown[]) => state.load(...args),
}))
vi.mock('../../../src/services/scheduler/daily/coach/report.ts', () => ({
  buildCoachDailyBriefingText: (...args: unknown[]) => state.build(...args),
}))
vi.mock('../../../src/services/scheduler/daily/coach/cron.ts', () => ({
  buildCoachDailyBriefingButtons: (...args: unknown[]) => state.buttons(...args),
}))
vi.mock('../../../src/services/scheduler/daily/shared.ts', () => ({
  formatKyivDate: () => '28.10.2026',
  resolveCoachAgentsUrl: (...args: unknown[]) => state.agentsUrl(...args),
}))

import { parseArgs } from '../../../src/scripts/coach-daily-briefing-resend.ts'
import { runManualCoachDailyBriefing } from '../../../src/services/scheduler/daily/coach/manual-resend.ts'

describe('coach daily briefing manual resend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.existing = null
    state.senderResult = true
    state.sent = []
    process.env.NODE_ENV = 'production'
    process.env.APP_ENV = 'production'
    process.env.TELEGRAM_BOT_TOKEN = 'configured'
    process.env.STARWAY_OPS_CHAT_ID = '-1003829747010'
    delete process.env.OPS_TELEGRAM_CHAT_ID
  })

  it('defaults to a dry run and never sends', async () => {
    const result = await runManualCoachDailyBriefing({ send: false, runId: null })
    expect(result).toMatchObject({ mode: 'DRY_RUN', reportDate: '28.10.2026', destination: '-1003829747010' })
    expect(state.sent).toEqual([])
    expect(state.load).toHaveBeenCalledTimes(1)
  })

  it('fails ambiguous destination configuration before building or sending', async () => {
    process.env.OPS_TELEGRAM_CHAT_ID = '-1009999999999'
    await expect(runManualCoachDailyBriefing({ send: false, runId: null })).rejects.toThrow('AMBIGUOUS_OPS_DESTINATION')
    expect(state.load).not.toHaveBeenCalled()
    expect(state.sent).toEqual([])
  })

  it('fails a missing production runtime before building or sending', async () => {
    process.env.NODE_ENV = 'development'
    await expect(runManualCoachDailyBriefing({ send: false, runId: null })).rejects.toThrow('REQUIRES_NODE_ENV_PRODUCTION')
    expect(state.load).not.toHaveBeenCalled()
    expect(state.sent).toEqual([])
  })

  it('requires a run id for --send', () => {
    expect(() => parseArgs(['--send'])).toThrow('SEND_REQUIRES_RUN_ID')
  })

  it('does not resend a completed run id', async () => {
    state.existing = { state: 'DELIVERED', deliveries: [{ state: 'DELIVERED', telegramMessageId: '9' }] }
    await expect(runManualCoachDailyBriefing({ send: true, runId: 'ops-20261028-1' }))
      .resolves.toMatchObject({ mode: 'ALREADY_SENT', messageId: '9' })
    expect(state.sent).toEqual([])
  })

  it('marks a Telegram failure unknown rather than sent', async () => {
    state.senderResult = false
    await expect(runManualCoachDailyBriefing({ send: true, runId: 'ops-20261028-2' }))
      .resolves.toMatchObject({ mode: 'UNKNOWN', messageId: null })
    expect(state.updateMany).toHaveBeenCalled()
  })

  it('passes canonical text and CTA unchanged to the OPS sender', async () => {
    await runManualCoachDailyBriefing({ send: true, runId: 'ops-20261028-3' })
    const [text, options, meta] = state.sent[0] as [string, { reply_markup: unknown }, { allowCoachFallback: boolean }]
    expect(text).toBe('<b>canonical briefing</b>')
    expect(JSON.stringify(options.reply_markup)).toContain('https://example.test/agents')
    expect(meta.allowCoachFallback).toBe(false)
  })
})
