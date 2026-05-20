export type WelcomeTestAnalyticsEvent = {
  name: string
  payload: Record<string, unknown>
  at: number
}

const pendingEvents: WelcomeTestAnalyticsEvent[] = []

export function trackEvent(eventName: string, payload: Record<string, unknown> = {}): void {
  const event: WelcomeTestAnalyticsEvent = {
    name: eventName,
    payload,
    at: Date.now(),
  }

  pendingEvents.push(event)

  if (import.meta.env.DEV) {
    console.debug('[welcome-test]', eventName, payload)
  }
}

export function drainPendingWelcomeTestEvents(): WelcomeTestAnalyticsEvent[] {
  if (pendingEvents.length === 0) return []
  return pendingEvents.splice(0, pendingEvents.length)
}
