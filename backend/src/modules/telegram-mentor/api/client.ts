const API_BASE_URL = process.env.INTERNAL_API_URL || `http://127.0.0.1:${process.env.PORT || '3001'}/api`
const BOT_SECRET = process.env.INTERNAL_BOT_API_SECRET || process.env.TELEGRAM_BOT_TOKEN || ''

type RequestOptions = {
  method?: 'GET' | 'POST'
  chatId: string
  body?: Record<string, unknown>
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-bot-secret': BOT_SECRET,
      'x-telegram-chat-id': options.chatId,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : typeof data?.error === 'string' ? data.error : 'api_request_failed'
    throw new Error(message)
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
    body: { message },
  })
}
