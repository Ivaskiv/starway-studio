import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUserFindMany = vi.fn()
const mockSendTelegramMessage = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
  },
}))

vi.mock('../../../../src/lib/telegram/messageFormatter.js', () => ({
  sendTelegramMessage: (...args: unknown[]) => mockSendTelegramMessage(...args),
}))

vi.mock('../../../../src/modules/zoom/urls.js', () => ({
  buildZoomCalendarUrl: () => 'https://example.test/miniapp',
}))

import { notifySubscribersNewSession } from '../../../../src/modules/zoom/notifications/zoom.subscriber-notifications.service.js'

describe('notifySubscribersNewSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendTelegramMessage.mockResolvedValue(undefined)
  })

  it('uses Group/Focus-specific no-access copy', async () => {
    mockUserFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        firstName: 'Олена',
        testResultType: 'GOAL',
        telegramChatId: '123',
        telegramLinks: [],
      }])

    await notifySubscribersNewSession({} as never, {
      id: 'group-session',
      scheduledAt: new Date('2026-10-05T16:00:00.000Z'),
      topic: 'ФОКУС · Zoom-практика',
      requests: { type: 'group_practice' },
    } as never)

    expect(mockSendTelegramMessage).toHaveBeenCalledWith(
      expect.anything(),
      '123',
      expect.stringContaining('Ця групова Zoom-практика доступна учасникам ФОКУСУ.'),
      expect.objectContaining({
        replyMarkup: {
          inline_keyboard: [[{
            text: 'АКТИВУВАТИ ФОКУС',
            callback_data: 'open_focus_payment',
          }]],
        },
      }),
    )
  })
})
