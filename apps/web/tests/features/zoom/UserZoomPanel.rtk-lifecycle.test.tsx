import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    },
  })
})

import { api } from '@/services/api'
import { store } from '@/app/store'
import { zoomCalendarApi } from '@/features/zoom/zoom.api'
import { retainUserCalendarQueryWindow, UserZoomPanel } from '@/features/zoom/UserZoomPanel'
import { getMySessionsFilterPresentation, mergeUserSessionHistoryEntries } from '@/features/zoom/utils/userPanelPresentation'
import type { ZoomCalendarSession } from '@/features/zoom/zoom.types'
import { SessionOrchestratorProvider } from '@/features/auth/context/SessionOrchestratorContext'
import { ThemeProvider } from '@/theme/ThemeProvider'

class RelativeRequest {
  readonly url: string
  readonly method: string
  readonly headers: Headers

  constructor(url: string, init?: RequestInit) {
    this.url = url
    this.method = init?.method ?? 'GET'
    this.headers = new Headers(init?.headers)
  }
}

describe('USER calendar RTK lifecycle', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps one cache key through pending rerenders and fulfills three owned cancelled records', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T14:58:12.806Z'))
    vi.stubGlobal('Request', RelativeRequest as unknown as typeof Request)

    let resolveTransport: ((response: Response) => void) | null = null
    const transport = vi.fn(() => new Promise<Response>((resolve) => {
      resolveTransport = resolve
    }))
    vi.stubGlobal('fetch', transport)

    store.dispatch(api.util.resetApiState())
    const firstWindow = retainUserCalendarQueryWindow(null, new Date())
    const args = {
      from: firstWindow.monthStart,
      to: firstWindow.monthEnd,
      role: 'user' as const,
      userId: 'e8262934-9454-4926-b734-65d03bca699e',
    }
    const firstSubscription = store.dispatch(
      zoomCalendarApi.endpoints.getCalendarSessions.initiate(args),
    )
    await Promise.resolve()

    vi.setSystemTime(new Date('2026-10-26T14:58:12.884Z'))
    const rerenderWindow = retainUserCalendarQueryWindow(firstWindow, new Date())
    const rerenderArgs = { ...args, to: rerenderWindow.monthEnd }
    const rerenderSubscription = store.dispatch(
      zoomCalendarApi.endpoints.getCalendarSessions.initiate(rerenderArgs),
    )

    expect(rerenderWindow).toBe(firstWindow)
    expect(rerenderArgs).toEqual(args)
    expect(transport).toHaveBeenCalledTimes(1)
    expect(zoomCalendarApi.endpoints.getCalendarSessions.select(args)(store.getState()).status).toBe('pending')

    const ownCancelled = (id: string, status: ZoomCalendarSession['status']): ZoomCalendarSession => ({
      id,
      scheduledAt: '2026-10-18T12:00:00.000Z',
      topic: 'Individual session',
      status,
      type: 'individual',
      zoomLink: '',
      canEdit: false,
      commerceRequestId: `${id}-request`,
      commerceStatus: 'CANCELLED',
    })
    const responseEnvelope: ZoomCalendarSession[] = [
      ownCancelled('468b9f94', 'CANCELLED'),
      ownCancelled('ded5b039', 'SCHEDULED'),
      ownCancelled('6ee1c946', 'SCHEDULED'),
      {
        id: 'foreign-cancelled',
        scheduledAt: '2026-10-18T13:00:00.000Z',
        topic: 'Foreign session',
        status: 'CANCELLED',
        type: 'individual',
        zoomLink: '',
        canEdit: false,
        commerceRequestId: null,
        commerceStatus: 'CANCELLED',
      },
    ]
    resolveTransport?.(new Response(JSON.stringify(responseEnvelope), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

    await firstSubscription.unwrap()
    await rerenderSubscription.unwrap()

    const result = zoomCalendarApi.endpoints.getCalendarSessions.select(args)(store.getState())
    const cancelled = getMySessionsFilterPresentation(
      mergeUserSessionHistoryEntries([], result.data ?? []),
      'cancelled',
      new Date('2026-10-26T14:58:20.000Z'),
    )

    expect(result.status).toBe('fulfilled')
    expect(result.data).toEqual(responseEnvelope)
    expect(cancelled.counts.cancelled).toBe(3)
    expect(cancelled.sessions.map((session) => session.id)).toEqual([
      '468b9f94',
      'ded5b039',
      '6ee1c946',
    ])

    vi.setSystemTime(new Date('2026-10-26T14:58:12.806Z'))
    const markup = renderToStaticMarkup(
      createElement(
        Provider,
        { store },
        createElement(
          ThemeProvider,
          undefined,
          createElement(
            MemoryRouter,
            undefined,
            createElement(
              SessionOrchestratorProvider,
              undefined,
              createElement(UserZoomPanel, { userId: args.userId }),
            ),
          ),
        ),
      ),
    )

    expect(markup).not.toContain('Діагностика історії')
    expect(markup).toMatch(/Скасовані<\/span><span[^>]*>3<\/span>/)

    firstSubscription.unsubscribe()
    rerenderSubscription.unsubscribe()
    store.dispatch(zoomCalendarApi.util.resetApiState())
  })
})
