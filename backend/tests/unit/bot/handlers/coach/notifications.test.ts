import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: {
    zoomSession: {
      findMany: vi.fn(),
    },
    notificationJob: {
      findMany: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
    },
  },
}))

const { replyOrEditPanelMessage, showCoachMenu } = vi.hoisted(() => ({
  replyOrEditPanelMessage: vi.fn(async () => undefined),
  showCoachMenu: vi.fn(async () => undefined),
}))

vi.mock('../../../../../src/bot/handlers/coach-content/shared.ts', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../../src/bot/handlers/coach-content/shared.ts')
  >('../../../../../src/bot/handlers/coach-content/shared.ts')

  return {
    ...actual,
    buildExpertScopeWhere: vi.fn(() => ({ expertId: 'expert-1' })),
    resolveCoachAccess: vi.fn(async () => ({
      id: 'coach-user-id',
      role: 'EXPERT',
      expertId: 'expert-1',
    })),
    replyOrEditPanelMessage,
  }
})

vi.mock('../../../../../src/bot/handlers/coach/menu.ts', () => ({
  showCoachMenu,
}))

import { prisma } from '../../../../../src/db/client.ts'
import { coachBotContent } from '../../../../../src/bot/content/coachBot.content.ts'
import { handleCoachNotifyCommand } from '../../../../../src/bot/handlers/coach-content/notifications.ts'

function createCtx() {
  return {
    chat: { id: 42, type: 'private' },
    from: { id: 99 },
    reply: vi.fn(async () => undefined),
    answerCbQuery: vi.fn(async () => undefined),
  }
}

describe('coach reminders workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders human reminder workspace with real supported windows only', async () => {
    vi.mocked(prisma.zoomSession.findMany).mockResolvedValue([
      {
        id: 'session-1',
        topic: 'Практика ФОКУСУ',
        scheduledAt: new Date('2026-09-05T08:00:00.000Z'),
      },
    ] as never)
    vi.mocked(prisma.notificationJob.findMany).mockResolvedValue([
      {
        id: 'job-1',
        status: 'PENDING',
        lastError: null,
        payload: {
          payload: {
            sessionId: 'session-1',
            flow_timer_id: 'ZOOM_REMINDER_2H',
          },
        },
      },
      {
        id: 'job-2',
        status: 'DONE',
        lastError: null,
        payload: {
          payload: {
            sessionId: 'session-1',
            flow_timer_id: 'ZOOM_REMINDER_5M',
          },
        },
      },
    ] as never)
    vi.mocked(prisma.notification.findMany).mockResolvedValue([] as never)

    const ctx = createCtx()
    const handled = await handleCoachNotifyCommand(ctx as never, '')

    expect(handled).toBe(true)
    expect(replyOrEditPanelMessage).toHaveBeenCalledTimes(1)
    expect(ctx.reply).not.toHaveBeenCalled()

    const [, text, extra] = replyOrEditPanelMessage.mock.calls[0]
    expect(text).toContain(coachBotContent.notify.title)
    expect(text).toContain(coachBotContent.notify.upcomingZoom)
    expect(text).toContain('2 години: заплановано')
    expect(text).toContain('5 хвилин: надіслано')
    expect(text).not.toContain('/notify')
    expect(text).not.toContain('24 години')
    expect(text).not.toContain('job-1')
    expect(text).not.toContain('queueId')
    expect(text).not.toContain('NotificationJob')

    expect(extra).toMatchObject({
      reply_markup: {
        inline_keyboard: [
          [{ text: coachBotContent.notify.actions.zoom, callback_data: 'coach:notifications:zoom' }],
          [{ text: coachBotContent.notify.actions.queue, callback_data: 'coach:notifications:queue' }],
          [{ text: coachBotContent.notify.actions.back, callback_data: 'coach:notifications:back' }],
        ],
      },
    })

    expect(prisma.notificationJob.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.notification.findMany).toHaveBeenCalledTimes(1)
  })

  it('renders queue view from existing notification pipeline without raw ids', async () => {
    vi.mocked(prisma.zoomSession.findMany).mockResolvedValue([
      {
        id: 'session-1',
        topic: 'Розбір кейсів',
        scheduledAt: new Date('2026-09-05T08:00:00.000Z'),
      },
      {
        id: 'session-2',
        topic: 'Практика Zoom',
        scheduledAt: new Date('2026-09-05T12:00:00.000Z'),
      },
    ] as never)
    vi.mocked(prisma.notificationJob.findMany)
      .mockResolvedValueOnce([
        {
          id: 'job-pending',
          status: 'PENDING',
          lastError: null,
          payload: {
            payload: {
              sessionId: 'session-1',
              flow_timer_id: 'ZOOM_REMINDER_2H',
            },
          },
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: 'job-processing',
          status: 'PROCESSING',
          lastError: null,
          payload: {
            payload: {
              sessionId: 'session-2',
              flow_timer_id: 'ZOOM_REMINDER_5M',
            },
          },
        },
      ] as never)
    vi.mocked(prisma.notification.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)

    const ctx = createCtx()
    await handleCoachNotifyCommand(ctx as never, 'queue')

    const [, text] = replyOrEditPanelMessage.mock.calls[0]
    expect(text).toContain(coachBotContent.notify.queueTitle)
    expect(text).toContain('У черзі: 2')
    expect(text).toContain('2 години: заплановано')
    expect(text).toContain('5 хвилин: очікується')
    expect(text).not.toContain('job-pending')
    expect(text).not.toContain('/notify')
  })

  it('returns to the existing coach menu on back action', async () => {
    const ctx = createCtx()

    const handled = await handleCoachNotifyCommand(ctx as never, 'back')

    expect(handled).toBe(true)
    expect(showCoachMenu).toHaveBeenCalledWith(ctx)
    expect(replyOrEditPanelMessage).not.toHaveBeenCalled()
  })

  it('does not keep direct telegram send or AI provider ownership in coach reminders', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'backend/src/bot/handlers/coach-content/notifications.ts'),
      'utf8',
    )

    expect(source).not.toContain('sendUserTelegramMessage')
    expect(source).not.toContain('anthropic')
    expect(source).not.toContain('openai')
  })
})
