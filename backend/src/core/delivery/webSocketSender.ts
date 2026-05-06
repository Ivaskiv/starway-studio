import { emitToDeliveryTarget } from './runtimeHub.js'

export async function send(message: string, userId: string, meta?: Record<string, unknown>) {
  const emitted = await emitToDeliveryTarget('web', userId, {
    type: 'AI_MESSAGE',
    payload: {
      text: message,
      meta,
    },
  })

  if (!emitted.delivered) {
    throw new Error(`web_delivery_target_missing:${userId}`)
  }

  console.log('[DELIVERY]', { channel: 'web', userId, status: 'sent', listeners: emitted.listeners })
  return { delivered: true, channel: 'web' as const, listeners: emitted.listeners }
}
