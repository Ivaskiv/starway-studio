import { readTelegramBotConfig } from '../runtime/botConfig.js'

const API_BASE_URL = process.env.INTERNAL_API_URL || `http://127.0.0.1:${process.env.PORT || '3001'}/api`

function getBotSecret(): string {
  return process.env.INTERNAL_BOT_API_SECRET || readTelegramBotConfig().token || ''
}

type RequestOptions = {
  method?: 'GET' | 'POST'
  chatId: string
  body?: Record<string, unknown>
}

function extractErrorMessage(data: unknown): string {
  if (typeof data !== 'object' || data === null) {
    return 'api_request_failed'
  }

  const payload = data as { message?: unknown; error?: unknown }

  if (typeof payload.message === 'string') {
    return payload.message
  }

  if (typeof payload.error === 'string') {
    return payload.error
  }

  return 'api_request_failed'
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-bot-secret': getBotSecret(),
        'x-telegram-chat-id': options.chatId,
      },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(extractErrorMessage(data))
  }

  return data as T
}

export function getUserState(chatId: string) {
  return request<{
    state: string
    step: string
    accessControl: Record<string, unknown>
  }>('/user/state', { chatId })
}

export function getGamificationSummary(chatId: string) {
  return request<{
    success: boolean
    summary: {
      streak: {
        current: number
        longest: number
        lastActivityAt: string | null
      }
      xp: {
        total: number
        level: number
        currentLevelXp: number
        nextLevelXp: number
      }
      rewards: {
        bitMind: number
        neuroGems: number
      }
      flags: {
        streakAtRisk: boolean
        levelUpAvailable: boolean
      }
    }
  }>('/gamification/summary', { chatId })
}

export function postMorningAction(chatId: string) {
  return request<{ text: string; category: string; generatedAt: string }>('/ai/actions/morning', {
    method: 'POST',
    chatId,
  })
}

export function postEveningAction(chatId: string) {
  return request<{ text: string; category: string; generatedAt: string }>('/ai/actions/evening', {
    method: 'POST',
    chatId,
  })
}

export function postAIChat(chatId: string, message: string) {
  return request<{
    session: { id: string }
    mentorMessage: { content: string }
  }>('/ai/chat', {
    method: 'POST',
    chatId,
    body: {
      message,
      context: {
        source: 'telegram',
        product: 'stankey',
      },
    },
  })
}
