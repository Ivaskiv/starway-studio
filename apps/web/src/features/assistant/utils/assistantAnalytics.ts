// frontend/src/features/assistant/utils/assistantAnalytics.ts

export type AssistantEvent = 
  | 'assistant_opened'
  | 'assistant_closed'
  | 'assistant_action'
  | 'assistant_message_sent'

export interface AssistantEventData {
  action?: string
  step?: string
  message?: string
  [key: string]: any
}

export function logAssistantEvent(
  event: AssistantEvent, 
  data?: AssistantEventData
): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Analytics: ${event}`, data)
  }

  // Send to analytics service (Google Analytics, Mixpanel, etc.)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, data)
  }

  // Add other analytics providers here
  // Example: Mixpanel
  // if (typeof window !== 'undefined' && (window as any).mixpanel) {
  //   (window as any).mixpanel.track(event, data)
  // }
}