import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../src/modules/deeplinks/service.js', () => ({
  generateCoachZoomWebDeepLink: vi.fn(async () => 'https://miniapp.example/miniapp/zoom-calendar?dl=coach-token'),
  COACH_AGENTS_RETURN_TARGET: '/app/dashboard/admin/studio?tab=agents&item=agents.overview',
  COACH_ZOOM_RETURN_TARGET: '/miniapp/zoom-calendar',
  generateCoachAgentsWebDeepLink: vi.fn(async () =>
    'https://miniapp.example/app/dashboard/admin/studio?tab=agents&item=agents.overview&dl=coach-agents-token',
  ),
}))

vi.mock('../../../../../src/config/webapp.js', () => ({
  resolveCoachWebAppBaseUrl: vi.fn(() => 'https://miniapp.example'),
  resolveTelegramWebappBaseUrl: vi.fn(() => 'https://miniapp.example'),
}))

vi.mock('../../../../../src/bot/handlers/coach/access.js', () => ({
  resolveCoachUserId: vi.fn(async () => 'coach-user-id'),
}))

vi.mock('../../../../../src/bot/handlers/coach-content/shared.js', () => ({
  buildExpertScopeWhere: vi.fn(() => ({})),
  replyOrEditPanelMessage: vi.fn(async () => undefined),
  resolveCoachAccess: vi.fn(async () => ({
    id: 'coach-user-id',
    role: 'EXPERT',
    expertId: 'expert-1',
  })),
}))

import { formatTelegramMessage } from '../../../../../src/lib/telegram/messageFormatter.js'
import { coachBotContent } from '../../../../../src/bot/content/coachBot.content.ts'
import { generateCoachAgentsWebDeepLink } from '../../../../../src/modules/deeplinks/service.js'
import { replyOrEditPanelMessage, resolveCoachAccess } from '../../../../../src/bot/handlers/coach-content/shared.js'
import {
  buildCoachMainMenuReplyMarkup,
  MENU_ANALYTICS_PATTERN,
  MENU_SETTINGS_PATTERN,
  showCoachAgentsMenu,
  showCoachSystemMenu,
} from '../../../../../src/bot/handlers/coach/menu.ts'

function createCoachCtx() {
  return {
    chat: { id: 42, type: 'private' },
    from: { id: 99 },
    telegram: {
      deleteMessage: vi.fn(async () => true),
    },
    reply: vi
      .fn()
      .mockResolvedValueOnce({ message_id: 1001 })
      .mockResolvedValueOnce({ message_id: 1002 }),
  }
}

describe('showCoachAgentsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the previous agents card before sending a fresh one in the same chat', async () => {
    const ctx = createCoachCtx()

    await showCoachAgentsMenu(ctx as never)
    await showCoachAgentsMenu(ctx as never)

    expect(generateCoachAgentsWebDeepLink).toHaveBeenCalledWith('coach-user-id')
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith('42', 1001)
    expect(ctx.reply).toHaveBeenNthCalledWith(
      2,
      formatTelegramMessage(`${coachBotContent.system.agentsTitle}\n\n${coachBotContent.system.agentsSubtitle}`).text,
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [[expect.objectContaining({
            text: coachBotContent.system.agentsCta,
            web_app: {
              url: 'https://miniapp.example/app/dashboard/admin/studio?tab=agents&item=agents.overview&dl=coach-agents-token',
            },
          })]],
        }),
      }),
    )
  })
})

describe('showCoachSystemMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders superadmin settings as a read-only second-level workspace through the canonical formatter', async () => {
    vi.mocked(resolveCoachAccess).mockResolvedValueOnce({
      id: 'coach-superadmin-id',
      role: 'SUPERADMIN',
      expertId: null,
    } as never)
    const ctx = createCoachCtx()

    await showCoachSystemMenu(ctx as never)

    expect(replyOrEditPanelMessage).toHaveBeenCalledTimes(1)
    const [, text, extra] = vi.mocked(replyOrEditPanelMessage).mock.calls[0]
    expect(text).toBe(`${coachBotContent.system.title}\n\n${coachBotContent.system.subtitle}`)
    expect(JSON.stringify(extra?.reply_markup?.inline_keyboard ?? [])).toContain(coachBotContent.system.actions.back)
    expect(text).not.toContain('DATABASE_URL')
    expect(text).not.toContain('token')
    expect(text).not.toContain('diagnostics/status')
  })

  it('denies non-superadmin access to coach settings', async () => {
    vi.mocked(resolveCoachAccess).mockResolvedValueOnce(null as never)
    const ctx = createCoachCtx()

    await showCoachSystemMenu(ctx as never)

    expect(replyOrEditPanelMessage).not.toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalledWith('Налаштування доступні лише SUPERADMIN.', { parse_mode: 'HTML' })
  })
})

describe('canonical coach main menu', () => {
  it('preserves calendar auth URL and routes Battle through the existing calendar', () => {
    const url = 'https://miniapp.example/miniapp/zoom-calendar?dl=coach-token'
    const { reply_markup } = buildCoachMainMenuReplyMarkup('EXPERT', url)
    expect(reply_markup.keyboard).toEqual([
      ['👥 УЧАСНИКИ', expect.objectContaining({ text: '⚔️ BATTLE', web_app: { url: `${url}#battle` } })],
      ['📊 АНАЛІТИКА', '⚙️ ЩЕ'],
    ])
    expect(reply_markup.resize_keyboard).toBe(true)
    expect(reply_markup.is_persistent).toBe(true)
    expect(MENU_ANALYTICS_PATTERN.test('📊 АНАЛІТИКА')).toBe(true)
    expect(MENU_SETTINGS_PATTERN.test('⚙️ ЩЕ')).toBe(true)
    expect(coachBotContent.menu.members).toBe('👥 УЧАСНИКИ')
  })
})
