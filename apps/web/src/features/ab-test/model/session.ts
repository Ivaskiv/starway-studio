import { getToken } from '@/features/auth/services/token'
import { getTelegramMiniAppAuthHeader } from '@/lib/miniapp/apiClient'

import {
  DEFAULT_STATE,
  STORAGE_KEY,
} from './config'
import type {
  AbTestQuestion,
  StoredState,
} from './types'

export function loadStoredState(): StoredState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE

    const parsed = JSON.parse(raw) as Partial<StoredState> | null
    return {
      currentIndex:
        typeof parsed?.currentIndex === 'number' ? parsed.currentIndex : 0,
      answers:
        parsed?.answers && typeof parsed.answers === 'object'
          ? (parsed.answers as Record<string, string>)
          : {},
      result: parsed?.result ?? null,
      source:
        parsed?.source === 'authenticated' ? 'authenticated' : 'anonymous',
    }
  } catch {
    return DEFAULT_STATE
  }
}

export function persistStoredState(state: StoredState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearStoredState() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

export function buildAuthHeaders(accessToken?: string | null): Record<string, string> {
  const token = accessToken ?? getToken()
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }

  const telegramAuth = getTelegramMiniAppAuthHeader()
  return telegramAuth ? { Authorization: telegramAuth } : {}
}

export function canSyncAbTestProgress(accessToken?: string | null): boolean {
  return Boolean(buildAuthHeaders(accessToken).Authorization)
}

export function buildSubmissionAnswers(
  questions: AbTestQuestion[],
  answers: Record<string, string>
) {
  const questionIds = questions.length
    ? questions.map((question) => question.id)
    : Object.keys(answers).sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true })
      )

  return questionIds.flatMap((questionId) => {
    const answerId = answers[questionId]
    return answerId ? [{ questionId, answerId }] : []
  })
}
