import { configureStore } from '@reduxjs/toolkit'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Provider } from 'react-redux'
import { describe, expect, it, vi } from 'vitest'
import { useCalendar, type CalendarProps } from '../../../src/features/zoom/hooks/useCalendar'
import { zoomCalendarApi } from '../../../src/features/zoom/zoom.api'
import type { ZoomCalendarSession } from '../../../src/features/zoom/zoom.types'
import { endOf, startOf } from '../../../src/features/zoom/utils/calendar-range'

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    },
    configurable: true,
  })
})

describe('calendar source ownership', () => {
  const now = new Date()
  const from = startOf('week', now).toISOString()
  const to = endOf('week', now).toISOString()
  const session: ZoomCalendarSession = {
    id: 'parent-session', scheduledAt: now.toISOString(), topic: 'Parent session',
    status: 'SCHEDULED', type: 'group_practice', zoomLink: '', canEdit: false,
  }

  function render(source?: CalendarProps['sessionSource']) {
    const store = configureStore({
      reducer: { [zoomCalendarApi.reducerPath]: zoomCalendarApi.reducer },
      middleware: getDefault => getDefault().concat(zoomCalendarApi.middleware),
    })
    store.dispatch(zoomCalendarApi.util.upsertQueryEntries([{
      endpointName: 'getCalendarSessions',
      arg: { from, to, role: 'user', userId: 'calendar-user' },
      value: [{ ...session, id: 'own-query-session' }],
    }]))
    function Probe() {
      const calendar = useCalendar({ mode: 'user', userId: 'calendar-user', sessionSource: source })
      return createElement('div', null, calendar.sessions.map(row => row.id).join(','))
    }
    try {
      return renderToStaticMarkup(createElement(Provider, { store, children: createElement(Probe) }))
    } finally {
      store.dispatch(zoomCalendarApi.util.resetApiState())
    }
  }

  it('uses the parent result when its range covers the visible week', () => {
    expect(render({ from, to, sessions: [session] })).toBe('<div>parent-session</div>')
  })

  it('keeps the parent as owner while its result is empty or loading', () => {
    expect(render({ from, to, sessions: [] })).toBe('<div></div>')
  })

  it.each(['start', 'end'] as const)('uses its own query when the source misses the week %s', boundary => {
    expect(render({
      from: boundary === 'start' ? new Date(Date.parse(from) + 1).toISOString() : from,
      to: boundary === 'end' ? new Date(Date.parse(to) - 1).toISOString() : to,
      sessions: [session],
    })).toBe('<div>own-query-session</div>')
  })

  it('retains the standalone calendar query', () => {
    expect(render()).toBe('<div>own-query-session</div>')
  })

  it('filters parent sessions outside the visible week', () => {
    expect(render({ from, to, sessions: [session, {
      ...session, id: 'outside-week', scheduledAt: new Date(Date.parse(to) + 1).toISOString(),
    }] })).toBe('<div>parent-session</div>')
  })
})
