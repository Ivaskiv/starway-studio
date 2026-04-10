export type AssistantMode = 'product_assistant' | 'chat' | 'sales_guide' | 'quick_actions'

export type AssistantGuideId = 'sales'

export type OpenAssistantDetail = {
  mode?: AssistantMode
  guideId?: AssistantGuideId
  prompt?: string
}

const OPEN_ASSISTANT_EVENT = 'starway:assistant:open'

export function openGlobalAssistant(detail: OpenAssistantDetail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<OpenAssistantDetail>(OPEN_ASSISTANT_EVENT, { detail }))
}

export function onOpenGlobalAssistant(listener: (detail: OpenAssistantDetail) => void) {
  if (typeof window === 'undefined') return () => undefined

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<OpenAssistantDetail>
    listener(customEvent.detail ?? {})
  }

  window.addEventListener(OPEN_ASSISTANT_EVENT, handler as EventListener)
  return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, handler as EventListener)
}
