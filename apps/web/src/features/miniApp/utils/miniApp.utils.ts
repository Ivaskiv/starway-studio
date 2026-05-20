import { createAppRequestHeaders } from '@/lib/miniapp/apiClient'

export const duplicateToMiniApp = async (
  userId: string,
  payload: Record<string, unknown>,
  type: 'question' | 'microTask' | 'report',
) => {
  try {
    await fetch('/api/miniapp/duplicate', {
      method: 'POST',
      headers: createAppRequestHeaders(undefined, true),
      body: JSON.stringify({ userId, payload, type }),
    })

    await fetch('/api/events/track', {
      method: 'POST',
      headers: createAppRequestHeaders(undefined, true),
      body: JSON.stringify({
        userId,
        type: 'miniapp_duplicate_requested',
        source: 'miniapp',
        state: 'day',
        payload: {
          type,
          payload,
        },
      }),
    })
  } catch (err) {
    console.error(`[MiniApp] duplication error for type ${type}`, err)
  }
}
