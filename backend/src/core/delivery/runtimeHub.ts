export type DeliveryChannel = 'web' | 'miniapp'

export type DeliveryPacket = {
  type: 'AI_MESSAGE'
  payload: {
    text: string
    meta?: Record<string, unknown>
  }
}

type DeliveryEmitter = (packet: DeliveryPacket) => void | Promise<void>

const listeners = new Map<string, Set<DeliveryEmitter>>()

function makeKey(channel: DeliveryChannel, userId: string) {
  return `${channel}:${userId}`
}

export function registerDeliveryTarget(
  channel: DeliveryChannel,
  userId: string,
  emitter: DeliveryEmitter,
) {
  const key = makeKey(channel, userId)
  const bucket = listeners.get(key) ?? new Set<DeliveryEmitter>()
  bucket.add(emitter)
  listeners.set(key, bucket)

  console.log('[DELIVERY]', { channel, userId, status: 'registered', listeners: bucket.size })

  return () => {
    const current = listeners.get(key)
    if (!current) return
    current.delete(emitter)
    if (current.size === 0) listeners.delete(key)
    console.log('[DELIVERY]', { channel, userId, status: 'unregistered', listeners: current.size })
  }
}

export async function emitToDeliveryTarget(
  channel: DeliveryChannel,
  userId: string,
  packet: DeliveryPacket,
) {
  const key = makeKey(channel, userId)
  const bucket = listeners.get(key)
  if (!bucket?.size) {
    console.log('[DELIVERY]', { channel, userId, status: 'no_active_target' })
    return { delivered: false, listeners: 0 }
  }

  await Promise.all([...bucket].map(listener => Promise.resolve(listener(packet))))
  console.log('[DELIVERY]', { channel, userId, status: 'emitted', listeners: bucket.size })
  return { delivered: true, listeners: bucket.size }
}
