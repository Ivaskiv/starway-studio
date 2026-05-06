import { emitToDeliveryTarget } from './runtimeHub.js'

async function sendRestFallback(message: string, userId: string, meta?: Record<string, unknown>) {
  const target = process.env.MINIAPP_PUSH_URL?.trim()
    || (process.env.FRONTEND_URL?.trim() ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/miniapp/push` : '')

  if (!target) {
    throw new Error('miniapp_push_url_missing')
  }

  const response = await fetch(target, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId, message, meta }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`miniapp_rest_failed:${response.status}:${details}`)
  }
}

export async function send(message: string, userId: string, meta?: Record<string, unknown>) {
  const emitted = await emitToDeliveryTarget('miniapp', userId, {
    type: 'AI_MESSAGE',
    payload: {
      text: message,
      meta,
    },
  })

  if (emitted.delivered) {
    console.log('[DELIVERY]', { channel: 'miniapp', userId, status: 'sent', mode: 'hub', listeners: emitted.listeners })
    return { delivered: true, channel: 'miniapp' as const, listeners: emitted.listeners }
  }

  await sendRestFallback(message, userId, meta)
  console.log('[DELIVERY]', { channel: 'miniapp', userId, status: 'sent', mode: 'rest' })
  return { delivered: true, channel: 'miniapp' as const, listeners: 0 }
}
