import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../src/modules/deeplinks/service.js', () => ({
  COACH_AGENTS_RETURN_TARGET: '/app/dashboard/admin/studio?tab=agents&item=agents.overview',
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

import { coachBotContent } from '../../../../../src/bot/content/coachBot.content.ts'
import { generateCoachAgentsWebDeepLink } from '../../../../../src/modules/deeplinks/service.js'
import { showCoachAgentsMenu } from '../../../../../src/bot/handlers/coach/menu.ts'

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
      `${coachBotContent.system.agentsTitle}\n\n${coachBotContent.system.agentsSubtitle}`,
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
