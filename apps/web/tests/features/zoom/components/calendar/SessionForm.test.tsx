import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { COACH_ZOOM_SESSION_TYPES } from '@/features/zoom/zoom.types'

vi.mock('@/features/zoom/services/zoom.api', () => ({
  useGetAttendeesQuery: (sessionId?: string) => ({
    data: sessionId ? [{ userId: 'user-1' }] : [],
    isFetching: false,
  }),
}))

vi.mock('@/features/zoom/zoom.api', () => ({
  useGetAvailabilityQuery: () => ({
    data: [
      {
        id: 'thu-group',
        dayOfWeek: 4,
        hour: 19,
        minute: 0,
        timezone: 'Europe/Kyiv',
        sessionType: 'group_practice',
        maxSlots: 50,
        priceCents: 0,
        durationMinutes: 60,
        active: true,
      },
    ],
  }),
}))

describe('SessionForm', () => {
  it('prefills the existing form for coach edit flow', async () => {
    const { SessionForm } = await import('@/features/zoom/components/calendar/SessionForm')
    const markup = renderToStaticMarkup(
      createElement(SessionForm, {
        defaultDate: new Date('2026-09-03T16:30:00.000Z'),
        initialValues: {
          scheduledAt: '2026-09-03T16:30:00.000Z',
          topic: 'Редагована Zoom сесія',
          type: 'individual',
          zoomLink: 'https://zoom.us/j/123',
        },
        sessionId: 'session-1',
        participants: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: 'Vira',
            lastName: 'Nova',
            role: 'USER',
          } as never,
        ],
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isLoading: false,
        title: 'Редагування сесії',
        submitLabel: 'Зберегти',
      }),
    )

    expect(markup).toContain('Редагування сесії')
    expect(markup).toContain('value="Редагована Zoom сесія"')
    expect(markup).toContain('value="https://zoom.us/j/123"')
    expect(markup).toContain('type="date"')
    expect(markup).toContain('value="2026-09-03"')
    expect(markup).toContain('type="time"')
    expect(markup).toContain('aria-label="Обрати час"')
    expect(markup).toContain('value="19:30"')
    expect(markup).toContain('>Зберегти<')
    expect(markup).toContain('>Назад<')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('>Індивідуальна<')
    expect(markup).toContain('Vira Nova')
    expect(markup).toContain('selected')
  })

  it('prefills a new group form from the selected calendar day and its normal schedule', async () => {
    const { SessionForm } = await import('@/features/zoom/components/calendar/SessionForm')
    const markup = renderToStaticMarkup(
      createElement(SessionForm, {
        defaultDate: new Date('2026-09-03T16:30:00.000Z'),
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isLoading: false,
      }),
    )

    expect(markup).toContain('>Групова практика<')
    expect(markup).toContain('type="date"')
    expect(markup).toContain('aria-label="Обрати дату"')
    expect(markup).toContain('placeholder="Обрати дату"')
    expect(markup).toContain('value="2026-09-03"')
    expect(markup).toContain('type="time"')
    expect(markup).toContain('aria-label="Обрати час"')
    expect(markup).toContain('value="19:00"')
    expect(markup).toContain('Місткість')
    expect(markup).toContain('Час відповідає звичному графіку: 19:00.')
  })

  it('renders the individual participant select for coach create flow', async () => {
    const { SessionForm } = await import('@/features/zoom/components/calendar/SessionForm')
    const markup = renderToStaticMarkup(
      createElement(SessionForm, {
        defaultDate: new Date('2026-09-03T16:30:00.000Z'),
        initialValues: {
          type: 'individual',
        },
        participants: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: 'Vira',
            lastName: 'Nova',
            role: 'USER',
          } as never,
        ],
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isLoading: false,
      }),
    )

    expect(markup).toContain('>Індивідуальна<')
    expect(markup).toContain('Оберіть користувача')
    expect(markup).toContain('Vira Nova')
    expect(markup).not.toContain('Місткість')
  })

  it('uses the existing coach-supported type contract for create/edit parity', async () => {
    expect(COACH_ZOOM_SESSION_TYPES).toEqual([
      'group_practice',
      'individual',
      'intensive',
      'battle_review',
    ])

    const { SessionForm } = await import('@/features/zoom/components/calendar/SessionForm')
    const markup = renderToStaticMarkup(
      createElement(SessionForm, {
        defaultDate: new Date('2026-09-03T16:30:00.000Z'),
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isLoading: false,
      }),
    )

    expect(markup).toContain('>Групова практика<')
    expect(markup).toContain('>Індивідуальна<')
    expect(markup).toContain('>Інтенсив<')
    expect(markup).toContain('>Zoom Battle<')
  })

  it('renders intensive through the shared form without group or individual-only fields', async () => {
    const { SessionForm } = await import('@/features/zoom/components/calendar/SessionForm')
    const markup = renderToStaticMarkup(
      createElement(SessionForm, {
        defaultDate: new Date('2026-09-03T16:30:00.000Z'),
        initialValues: {
          scheduledAt: '2026-09-03T16:30:00.000Z',
          topic: 'Інтенсив AB System',
          type: 'intensive',
          zoomLink: 'https://zoom.us/j/intensive',
        },
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isLoading: false,
      }),
    )

    expect(markup).toContain('>Інтенсив<')
    expect(markup).toContain('value="Інтенсив AB System"')
    expect(markup).toContain('value="https://zoom.us/j/intensive"')
    expect(markup).not.toContain('Місткість')
    expect(markup).not.toContain('Учасник')
  })

  it('renders battle review participant multi-select without group or individual-only fields', async () => {
    const { SessionForm } = await import('@/features/zoom/components/calendar/SessionForm')
    const markup = renderToStaticMarkup(
      createElement(SessionForm, {
        defaultDate: new Date('2026-09-03T16:30:00.000Z'),
        initialValues: {
          scheduledAt: '2026-09-03T16:30:00.000Z',
          topic: 'Battle Review',
          type: 'battle_review',
          zoomLink: 'https://zoom.us/j/battle',
          participantUserIds: ['user-1', 'user-2'],
        },
        participants: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: 'Vira',
            lastName: 'Nova',
            role: 'USER',
          } as never,
          {
            id: 'user-2',
            email: 'user2@example.com',
            firstName: 'Marta',
            lastName: 'Koval',
            role: 'USER',
          } as never,
        ],
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isLoading: false,
      }),
    )

    expect(markup).toContain('>Zoom Battle<')
    expect(markup).toContain('value="Battle Review"')
    expect(markup).toContain('value="https://zoom.us/j/battle"')
    expect(markup).toContain('Учасник 1')
    expect(markup).toContain('Учасник 2')
    expect(markup).toContain('Vira Nova')
    expect(markup).toContain('Marta Koval')
    expect(markup).not.toContain('multiple')
    expect(markup).not.toContain('Місткість')
  })

  it('renders format pricing from the shared Zoom pricing owner and marks active type clearly', async () => {
    const { SessionForm } = await import('@/features/zoom/components/calendar/SessionForm')
    const markup = renderToStaticMarkup(
      createElement(SessionForm, {
        defaultDate: new Date('2026-09-03T16:30:00.000Z'),
        initialValues: { type: 'battle_review' },
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isLoading: false,
      }),
    )

    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('Входить у підписку')
    expect(markup).toContain('60 €')
    expect(markup).toContain('0 € / 25 €')
  })

  it('maps picker date values into the existing form date state format', async () => {
    const {
      formatDatePickerValue,
      parseDatePickerValue,
    } = await import('@/features/zoom/components/calendar/SessionForm')

    expect(parseDatePickerValue('2026-09-17')).toBe('17.09.2026')
    expect(formatDatePickerValue('17.09.2026')).toBe('2026-09-17')
  })

  it('serializes the coach wall-clock time in Kyiv so availability receives the same instant', async () => {
    const { buildScheduledAtIso } = await import('@/features/zoom/components/calendar/SessionForm')

    expect(buildScheduledAtIso('17.09.2026', '19:00')).toBe('2026-09-17T16:00:00.000Z')
  })

  it('blocks only impossible creates: a busy conflict or an outside-schedule group slot', async () => {
    const {
      getGroupPracticeScheduleState,
      isSessionFormCreationBlocked,
    } = await import('@/features/zoom/components/calendar/SessionForm')
    const schedule = [{
      id: 'thu-group', dayOfWeek: 4, hour: 19, minute: 0,
      timezone: 'Europe/Kyiv', sessionType: 'group_practice', maxSlots: 50,
      priceCents: 0, durationMinutes: 60, active: true,
    }] as never

    expect(getGroupPracticeScheduleState('03.09.2026', '19:00', schedule, true)).toMatchObject({
      kind: 'success', blocksCreation: false,
    })
    expect(getGroupPracticeScheduleState('03.09.2026', '18:00', schedule, true)).toMatchObject({
      kind: 'warning', blocksCreation: true,
    })
    expect(isSessionFormCreationBlocked({
      isLoading: false, isSubmitConflict: false, date: '03.09.2026', time: '19:00', topic: 'Фокус',
      type: 'individual', maxAttendees: 1, groupScheduleBlocked: false,
      participantUserId: 'user-1', participantUserIds: [],
    })).toBe(false)
    expect(isSessionFormCreationBlocked({
      isLoading: false, isSubmitConflict: true, date: '03.09.2026', time: '19:00', topic: 'Фокус',
      type: 'individual', maxAttendees: 1, groupScheduleBlocked: false,
      participantUserId: 'user-1', participantUserIds: [],
    })).toBe(true)
  })

  it('uses a Telegram WebView-compatible native date input tap target', async () => {
    const { SessionForm } = await import('@/features/zoom/components/calendar/SessionForm')
    const markup = renderToStaticMarkup(
      createElement(SessionForm, {
        defaultDate: new Date('2026-09-03T16:30:00.000Z'),
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isLoading: false,
      }),
    )

    expect(markup).toContain('type="date"')
    expect(markup).toContain('aria-label="Обрати дату"')
    expect(markup).not.toContain('onMouse')
  })

  it('uses a Telegram WebView-compatible native time input tap target', async () => {
    const { SessionForm } = await import('@/features/zoom/components/calendar/SessionForm')
    const markup = renderToStaticMarkup(
      createElement(SessionForm, {
        defaultDate: new Date('2026-09-03T16:30:00.000Z'),
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isLoading: false,
      }),
    )

    expect(markup).toContain('type="time"')
    expect(markup).toContain('aria-label="Обрати час"')
    expect(markup).not.toContain('onMouse')
  })

  it('renders a single form title with a back action for create/edit views', async () => {
    const { SessionForm } = await import('@/features/zoom/components/calendar/SessionForm')
    const markup = renderToStaticMarkup(
      createElement(SessionForm, {
        defaultDate: new Date('2026-09-03T16:30:00.000Z'),
        initialValues: {
          scheduledAt: '2026-09-03T16:30:00.000Z',
          topic: 'Редагована Zoom сесія',
          type: 'group_practice',
        },
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isLoading: false,
        title: 'Редагування сесії',
        submitLabel: 'Зберегти',
      }),
    )

    expect(markup.match(/Редагування сесії/g)).toHaveLength(1)
    expect(markup).toContain('>Назад<')
    expect(markup).not.toContain('>Скасувати<')
  })
})
