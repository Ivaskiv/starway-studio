import { useEffect } from 'react'

import { useTrackFrontendEventMutation } from '@/features/analytics/services/events.api'
import {
  drainPendingWelcomeTestEvents,
  trackEvent,
} from '@/features/welcome-test/utils/analytics'

export function useWelcomeTestAnalytics(sessionId: string | null) {
  const [trackFrontendEvent] = useTrackFrontendEventMutation()

  useEffect(() => {
    const pending = drainPendingWelcomeTestEvents()
    if (pending.length === 0) return

    for (const event of pending) {
      void trackFrontendEvent({
        type: event.name,
        source: 'web',
        state: sessionId,
        payload: {
          funnel: 'welcome_test',
          ...event.payload,
        },
      })
    }
  }, [sessionId, trackFrontendEvent])

  return {
    trackWelcomeTestEvent: (eventName: string, payload: Record<string, unknown> = {}) => {
      trackEvent(eventName, payload)
      void trackFrontendEvent({
        type: eventName,
        source: 'web',
        state: sessionId,
        payload: {
          funnel: 'welcome_test',
          ...payload,
        },
      })
    },
  }
}
