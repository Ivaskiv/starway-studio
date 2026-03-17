export type AssistantEvent = 'assistant.open' | 'assistant.close'

export function logAssistantEvent(event: AssistantEvent, payload: Record<string, any> = {}) {
  const detail = { event, ...payload }
  if (typeof window !== 'undefined') {
    if ((window as any).dataLayer) {
      ;(window as any).dataLayer.push(detail)
      return
    }
    if ((window as any).gtag) {
      ;(window as any).gtag('event', event, payload)
      return
    }
  }
  // Fallback: console debug
  console.debug('[assistant analytics]', detail)
}
