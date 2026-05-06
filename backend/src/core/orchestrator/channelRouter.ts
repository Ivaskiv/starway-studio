import type { Intent, MentorChannel, MentorMessage } from '../mentor/types.js'

export type Channel = 'web' | 'telegram' | 'miniapp'

export type ChannelContext = {
  lastActiveChannel: Channel | null
  telegramConnected: boolean
  webSessionActive: boolean
  miniappActive: boolean
  lastSeenAt: number
}

const ACTIVE_WINDOW_MS = 5 * 60 * 1000
const TELEGRAM_MAX_LENGTH = 120

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  const sliced = text.slice(0, Math.max(0, maxLength - 1)).trim()
  return sliced.endsWith('.') ? sliced : `${sliced}.`
}

function currentSessionChannel(context: ChannelContext): Channel | null {
  if (context.lastActiveChannel === 'miniapp' && context.miniappActive) return 'miniapp'
  if (context.lastActiveChannel === 'web' && context.webSessionActive) return 'web'
  if (context.lastActiveChannel === 'telegram' && context.telegramConnected) return 'telegram'
  if (context.webSessionActive) return 'web'
  if (context.miniappActive) return 'miniapp'
  if (context.telegramConnected) return 'telegram'
  return null
}

function isRecentlyActive(context: ChannelContext, now = Date.now()) {
  return now - context.lastSeenAt <= ACTIVE_WINDOW_MS
}

export function resolveChannel(
  intent: Intent,
  pattern: string | null,
  context: ChannelContext,
): Channel {
  const activeChannel = currentSessionChannel(context)
  const procrastinationHigh = pattern === 'procrastination'

  if (isRecentlyActive(context) && activeChannel) {
    console.log('[AI ROUTER]', { pattern, intent, channel: activeChannel })
    return activeChannel
  }

  if ((pattern === 'drop_off' || procrastinationHigh) && context.telegramConnected) {
    console.log('[AI ROUTER]', { pattern, intent, channel: 'telegram' })
    return 'telegram'
  }

  if (intent === 'increase_clarity' || intent === 'stabilize_habit') {
    const reflectiveChannel = context.miniappActive ? 'miniapp' : 'web'
    console.log('[AI ROUTER]', { pattern, intent, channel: reflectiveChannel })
    return reflectiveChannel
  }

  if (pattern === 'high_engagement' && activeChannel) {
    console.log('[AI ROUTER]', { pattern, intent, channel: activeChannel })
    return activeChannel
  }

  if (!context.telegramConnected) {
    const fallback = context.miniappActive ? 'miniapp' : 'web'
    console.log('[AI ROUTER]', { pattern, intent, channel: fallback })
    return fallback
  }

  const channel = activeChannel ?? (intent === 'reengage' ? 'telegram' : 'web')
  console.log('[AI ROUTER]', { pattern, intent, channel })
  return channel
}

export function adaptMessageForChannel(message: MentorMessage, channel: Channel): MentorMessage {
  if (channel === 'telegram') {
    return {
      channel,
      text: truncate(message.text, TELEGRAM_MAX_LENGTH),
    }
  }

  if (channel === 'miniapp') {
    return {
      channel,
      text: truncate(`${message.text} CTA: Відкрити наступний крок.`, 160),
    }
  }

  return {
    channel,
    text: truncate(message.text, 220),
  }
}
