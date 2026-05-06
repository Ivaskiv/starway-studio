import type { Intent } from '../mentor/types.js'
import type { Channel } from '../orchestrator/channelRouter.js'
import { send as sendMiniapp } from './miniappSender.js'
import { send as sendTelegram } from './telegramSender.js'
import { send as sendWeb } from './webSocketSender.js'

export type DeliveryEnvelope = {
  userId: string
  delivery: {
    channel: Channel
    adaptedMessage: string
    meta?: Record<string, unknown>
  }
  intent?: Intent
}

const lastDeliveryAt = new Map<string, number>()
const lastIntentSent = new Map<string, Intent>()
const RATE_LIMIT_MS = 60 * 1000

function varyRepeatedIntentMessage(message: string, intent: Intent, channel: Channel) {
  const prefix = channel === 'telegram'
    ? 'Новий кут:'
    : channel === 'miniapp'
      ? 'Інший фокус:'
      : 'Спрямую трохи інакше:'

  return `${prefix} ${message}`.trim()
}

export async function dispatch(event: DeliveryEnvelope) {
  const now = Date.now()
  const lastAt = lastDeliveryAt.get(event.userId) ?? 0

  if (now - lastAt < RATE_LIMIT_MS) {
    console.log('[AI DELIVERY]', {
      userId: event.userId,
      channel: event.delivery.channel,
      skipped: true,
      reason: 'rate_limited',
    })
    return { delivered: false, skipped: true, reason: 'rate_limited' as const }
  }

  const previousIntent = lastIntentSent.get(event.userId)
  const message = event.intent && previousIntent === event.intent
    ? varyRepeatedIntentMessage(event.delivery.adaptedMessage, event.intent, event.delivery.channel)
    : event.delivery.adaptedMessage

  try {
    switch (event.delivery.channel) {
      case 'telegram':
        await sendTelegram(message, event.userId)
        break
      case 'miniapp':
        await sendMiniapp(message, event.userId, event.delivery.meta)
        break
      case 'web':
      default:
        await sendWeb(message, event.userId, event.delivery.meta)
        break
    }

    lastDeliveryAt.set(event.userId, now)
    if (event.intent) lastIntentSent.set(event.userId, event.intent)

    console.log('[DELIVERY]', {
      userId: event.userId,
      channel: event.delivery.channel,
      status: 'success',
      intent: event.intent ?? null,
    })

    return { delivered: true, skipped: false }
  } catch (error) {
    console.warn('[DELIVERY]', {
      userId: event.userId,
      channel: event.delivery.channel,
      failed: true,
      reason: error instanceof Error ? error.message : 'unknown_error',
    })

    if (event.delivery.channel !== 'web') {
      try {
        await sendWeb(message, event.userId, event.delivery.meta)
        lastDeliveryAt.set(event.userId, now)
        if (event.intent) lastIntentSent.set(event.userId, event.intent)
        console.log('[DELIVERY]', {
          userId: event.userId,
          channel: 'web',
          status: 'fallback_success',
          originalChannel: event.delivery.channel,
        })
        return { delivered: true, skipped: false, fallback: 'web' as const }
      } catch (fallbackError) {
        console.warn('[DELIVERY]', {
          userId: event.userId,
          channel: 'web',
          failed: true,
          reason: fallbackError instanceof Error ? fallbackError.message : 'unknown_error',
        })
      }
    }

    return { delivered: false, skipped: false, reason: 'fallback_to_existing_flow' as const }
  }
}
