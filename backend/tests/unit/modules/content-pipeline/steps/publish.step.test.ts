import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSendTelegramVideo, mockContentBot } = vi.hoisted(() => ({
  mockSendTelegramVideo: vi.fn(),
  mockContentBot: { __owner: 'contentBot' },
}))

vi.mock('../../../../lib/telegram.ts', () => ({
  contentBot: mockContentBot,
}))

vi.mock('../../../../lib/telegram/messageFormatter.ts', () => ({
  sendTelegramVideo: (...args: unknown[]) => mockSendTelegramVideo(...args),
}))

import { publishContent } from '../publish.step.ts'

describe('publishContent telegram routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.META_ACCESS_TOKEN
    delete process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
    process.env.FOCUS_TELEGRAM_CHANNEL_ID = '@focus-channel'
  })

  it('publishes FOCUS channel video via contentBot owner', async () => {
    mockSendTelegramVideo.mockResolvedValue({ message_id: 321 })

    const result = await publishContent(
      {} as never,
      {
        scenes: ['https://cdn.example/video.mp4'],
        audio: '',
      },
      '<b>caption</b>',
    )

    expect(mockSendTelegramVideo).toHaveBeenCalledTimes(1)
    expect(mockSendTelegramVideo).toHaveBeenCalledWith(
      mockContentBot,
      '@focus-channel',
      'https://cdn.example/video.mp4',
      {
        caption: '<b>caption</b>',
        parse_mode: 'HTML',
      },
    )
    expect(result.telegram).toBe(321)
  })
})
