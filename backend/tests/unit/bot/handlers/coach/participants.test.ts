import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../src/db/client.ts', () => ({
  prisma: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    zoomSession: {
      findFirst: vi.fn(),
    },
    zoomSessionAttendee: {
      findMany: vi.fn(),
    },
  },
}))

const { replyOrEditPanelMessage } = vi.hoisted(() => ({
  replyOrEditPanelMessage: vi.fn(async () => undefined),
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

import { prisma } from '../../../../../src/db/client.ts'
import { coachBotContent } from '../../../../../src/bot/content/coachBot.content.ts'
import {
  PARTICIPANTS_UPCOMING_CALLBACK,
  handleCoachUsersCommand,
} from '../../../../../src/bot/handlers/coach-content/users.ts'

function createCtx() {
  return {
    chat: { id: 42, type: 'private' },
    reply: vi.fn(async () => undefined),
  }
}

describe('coach participants presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(5 as never)
      .mockResolvedValueOnce(2 as never)
    vi.mocked(prisma.zoomSession.findFirst).mockResolvedValue({
      id: 'session-1',
      scheduledAt: new Date('2026-09-04T10:00:00.000Z'),
      _count: { attendees: 3 },
      attendees: [
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' },
      ],
    } as never)
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 'user-1',
        firstName: 'Ірина',
        lastName: 'Коваль',
        focusPaid: true,
        createdAt: new Date('2026-09-01T09:00:00.000Z'),
        testResultType: 'ACTION',
      },
    ] as never)
    vi.mocked(prisma.zoomSessionAttendee.findMany).mockResolvedValue([
      {
        userId: 'user-1',
        session: {
          scheduledAt: new Date('2026-09-04T10:00:00.000Z'),
          status: 'SCHEDULED',
        },
      },
      {
        userId: 'user-1',
        session: {
          scheduledAt: new Date('2026-08-28T10:00:00.000Z'),
          status: 'COMPLETED',
        },
      },
    ] as never)
  })

  it('renders human participants workspace via canonical formatter without raw admin fields', async () => {
    const ctx = createCtx()

    const result = await handleCoachUsersCommand(ctx as never, '')

    expect(result).toBe(true)
    expect(replyOrEditPanelMessage).toHaveBeenCalledTimes(1)
    expect(ctx.reply).not.toHaveBeenCalled()

    const [, text, extra] = replyOrEditPanelMessage.mock.calls[0]

    expect(text).toContain(coachBotContent.users.title)
    expect(text).toContain('Активні у ФОКУСІ: 5')
    expect(text).toContain('Записані на найближчий Zoom: 3')
    expect(text).toContain('Нові цього тижня: 2')
    expect(text).toContain('Ірина Коваль')
    expect(text).toContain('ФОКУС: активний')
    expect(text).toContain('Остання точка: ДІЯ')
    expect(text).toContain('Zoom: 2')

    expect(text).not.toContain('user-1')
    expect(text).not.toContain('id:')
    expect(text).not.toContain('email')
    expect(text).not.toContain('telegram')
    expect(text).not.toContain('role')

    expect(extra).toEqual({
      reply_markup: {
        inline_keyboard: [
          [{ text: coachBotContent.users.actions.all, callback_data: 'coach:participants' }],
          [{ text: coachBotContent.users.actions.upcoming, callback_data: PARTICIPANTS_UPCOMING_CALLBACK }],
        ],
      },
    })

    const buttons = JSON.stringify(extra.reply_markup.inline_keyboard)
    expect(buttons).not.toContain('ПОТРЕБУЮТЬ УВАГИ')
    expect(buttons).not.toContain('ПОШУК УЧАСНИКА')

    expect(prisma.user.count).toHaveBeenNthCalledWith(1, {
      where: {
        deletedAt: null,
        expertId: 'expert-1',
        focusPaid: true,
      },
    })
    expect(prisma.zoomSession.findFirst).toHaveBeenCalled()
  })

  it('renders upcoming zoom filter without unsupported actions when no upcoming session exists', async () => {
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(1 as never)
      .mockResolvedValueOnce(0 as never)
    vi.mocked(prisma.zoomSession.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never)

    const ctx = createCtx()

    await handleCoachUsersCommand(ctx as never, 'upcoming')

    const [, text, extra] = replyOrEditPanelMessage.mock.calls[0]
    expect(text).toContain(coachBotContent.users.empty)
    expect(text).not.toContain('Потребують уваги')
    expect(extra).toEqual({
      reply_markup: {
        inline_keyboard: [
          [{ text: coachBotContent.users.actions.all, callback_data: 'coach:participants' }],
        ],
      },
    })
  })
})
