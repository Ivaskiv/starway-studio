import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    expert: {
      findFirst: vi.fn(),
    },
    zoomSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('../../../../../src/modules/zoom/booking/zoom.availability.service.js', () => ({
  generateSessionsFromAvailability: vi.fn(async () => undefined),
}))

vi.mock('../../../../../src/bot/handlers/coach/access.js', () => ({
  resolveCoachUserId: vi.fn(async () => 'coach-user-id'),
}))

vi.mock('../../../../../src/bot/handlers/coach/menu.js', () => ({
  buildCoachMainMenuReplyMarkup: vi.fn(() => ({ reply_markup: { keyboard: [] } })),
}))

vi.mock('../../../../../src/bot/handlers/coach-content/shared.js', () => ({
  resolveCoachAccess: vi.fn(async () => ({
    id: 'coach-user-id',
    role: 'EXPERT',
    expertId: 'expert-1',
  })),
}))

vi.mock('../../../../../src/services/notifications/NotificationService.js', () => ({
  notificationService: {
    sendZoomBookingOpenedNotification: vi.fn(async () => true),
  },
}))

import { prisma } from '../../../../../src/db/client.ts'
import { notificationService } from '../../../../../src/services/notifications/NotificationService.js'
import {
  confirmCoachZoomSession,
  showCoachNewZoomPrompt,
} from '../../../../../src/bot/handlers/coach/zoom.ts'

function createCtx() {
  return {
    chat: { id: 42, type: 'private' },
    from: { id: 99 },
    reply: vi.fn(async () => undefined),
    answerCbQuery: vi.fn(async () => undefined),
  }
}

describe('coach zoom presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      expertId: 'expert-1',
    } as never)
    vi.mocked(prisma.user.findMany).mockResolvedValue([])
    vi.mocked(prisma.expert.findFirst).mockResolvedValue({
      id: 'expert-1',
    } as never)
  })

  it('renders new zoom preview without exposing sessionId', async () => {
    vi.mocked(prisma.zoomSession.findFirst).mockResolvedValue({
      id: 'session-123',
      scheduledAt: new Date('2026-09-07T16:00:00.000Z'),
      topic: 'ФОКУС · Zoom-практика',
      status: 'SCHEDULED',
      requests: { type: 'group_practice' },
    } as never)

    const ctx = createCtx()

    await showCoachNewZoomPrompt(ctx as never)

    const [text, payload] = ctx.reply.mock.calls[0]
    expect(text).toContain('Новий Zoom')
    expect(text).toContain('Нова групова Zoom-практика')
    expect(text).toContain('Дата:')
    expect(text).toContain('Час:')
    expect(text).toContain('Zoom-посилання: ще не додано')
    expect(text).toContain('2 години — увімкнено')
    expect(text).toContain('5 хвилин — увімкнено')
    expect(text).not.toContain('24 години')
    expect(text).not.toContain('sessionId')
    expect(text).not.toContain('session-123')
    expect(payload.reply_markup.inline_keyboard).toEqual([
      [expect.objectContaining({ text: 'ВІДКРИТИ СЕСІЮ' })],
    ])
  })

  it('opens the session once and notifies eligible focus users through the canonical pipeline', async () => {
    vi.mocked(prisma.zoomSession.findUnique).mockResolvedValue({
      id: 'session-123',
      scheduledAt: new Date('2026-09-07T16:00:00.000Z'),
      status: 'SCHEDULED',
      topic: 'ФОКУС · Zoom-практика',
      requests: { type: 'group_practice' },
    } as never)
    vi.mocked(prisma.zoomSession.update).mockResolvedValue({
      id: 'session-123',
    } as never)
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'focus-user-1' },
      { id: 'focus-user-2' },
    ] as never)

    const ctx = createCtx()

    await confirmCoachZoomSession(ctx as never, 'session-123')

    expect(prisma.zoomSession.update).toHaveBeenCalledTimes(1)
    expect(notificationService.sendZoomBookingOpenedNotification).toHaveBeenCalledTimes(2)
    expect(notificationService.sendZoomBookingOpenedNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: 'focus-user-1',
        sessionId: 'session-123',
      }),
    )
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Сесію відкрито')
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Сесію відкрито')
    )
    const [text] = ctx.reply.mock.calls[0]
    expect(text).toContain('Учасники вже можуть записуватися та додавати питання до практики.')
    expect(text).not.toContain('sessionId')
    expect(text).not.toContain('session-123')
  })

  it('does not mutate or notify again when the session is already open', async () => {
    vi.mocked(prisma.zoomSession.findUnique).mockResolvedValue({
      id: 'session-123',
      scheduledAt: new Date('2026-09-07T16:00:00.000Z'),
      status: 'SCHEDULED',
      topic: 'ФОКУС · Zoom-практика',
      requests: {
        type: 'group_practice',
        coachConfirmedAt: '2026-09-03T10:00:00.000Z',
      },
    } as never)

    const ctx = createCtx()

    await confirmCoachZoomSession(ctx as never, 'session-123')

    expect(prisma.zoomSession.update).not.toHaveBeenCalled()
    expect(notificationService.sendZoomBookingOpenedNotification).not.toHaveBeenCalled()
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Сесію вже відкрито')
    expect(ctx.reply).not.toHaveBeenCalled()
  })
})
