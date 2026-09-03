import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

describe('SessionForm', () => {
  it('prefills the existing form for coach edit flow', async () => {
    const { SessionForm } = await import('./SessionForm')
    const markup = renderToStaticMarkup(
      createElement(SessionForm, {
        defaultDate: new Date('2026-09-03T16:30:00.000Z'),
        initialValues: {
          scheduledAt: '2026-09-03T16:30:00.000Z',
          topic: 'Редагована Zoom сесія',
          type: 'individual',
          zoomLink: 'https://zoom.us/j/123',
        },
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
    expect(markup).toContain('value="18:30"')
    expect(markup).toContain('>Зберегти<')
  })
})
