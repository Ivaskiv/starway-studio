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
    expect(markup).toContain('value="18:30"')
    expect(markup).toContain('>Зберегти<')
    expect(markup).toContain('>Назад<')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('>Індивідуальна<')
    expect(markup).toContain('Vira Nova')
    expect(markup).toContain('selected')
  })

  it('renders the new group form without a stale date and with capacity', async () => {
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
    expect(markup).toContain('value=""')
    expect(markup).toContain('type="time"')
    expect(markup).toContain('aria-label="Обрати час"')
    expect(markup).toContain('value="19:00"')
    expect(markup).toContain('Місткість')
    expect(markup).not.toContain('09.2026')
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

  it('keeps scheduledAt payload composition in the existing local date/time owner', async () => {
    const { buildScheduledAtIso } = await import('@/features/zoom/components/calendar/SessionForm')

    expect(buildScheduledAtIso('17.09.2026', '19:00')).toBe(
      new Date(2026, 8, 17, 19, 0, 0).toISOString(),
    )
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
