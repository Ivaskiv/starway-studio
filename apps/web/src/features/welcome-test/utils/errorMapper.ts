import type { WelcomeTestError, WelcomeTestErrorCode } from '@/features/welcome-test/types/welcomeTest.types'

type ErrorPayload = {
  error?: unknown
  message?: unknown
  code?: unknown
}

function readErrorPayload(error: unknown): ErrorPayload | null {
  if (!error || typeof error !== 'object') return null
  return error as ErrorPayload
}

function readStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' ? status : undefined
}

function readMessage(error: unknown): string | null {
  if (typeof error === 'string' && error.trim()) return error.trim()
  if (error instanceof Error && error.message.trim()) return error.message.trim()

  const payload = readErrorPayload(error)
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message.trim()
  }
  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error.trim()
  }

  return null
}

function mapStatusToCode(status: number | undefined, message: string): WelcomeTestErrorCode {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'unauthorized'
  if (status === 408) return 'timeout'
  if (status === 404 && /session|context|token/i.test(message)) return 'expired_session'
  if (status === 409 && /completed|expired/i.test(message)) return 'expired_session'
  if (status === 400 || status === 422) return 'validation'
  if (status != null && status >= 500) return 'unknown'
  return 'unknown'
}

export function mapWelcomeTestError(error: unknown): WelcomeTestError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      code: 'timeout',
      message: 'Request was cancelled or timed out.',
    }
  }

  const message = readMessage(error) ?? 'Unknown error'
  const status = readStatus(error)
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('networkerror') ||
    normalizedMessage.includes('network error')
  ) {
    return {
      code: 'network',
      message,
      status,
    }
  }

  if (normalizedMessage.includes('timeout') || normalizedMessage.includes('timed out')) {
    return {
      code: 'timeout',
      message,
      status,
    }
  }

  const payload = readErrorPayload(error)
  const backendCode =
    typeof payload?.error === 'string'
      ? payload.error
      : typeof payload?.code === 'string'
        ? payload.code
        : null

  if (backendCode === 'TEST_CONTEXT_NOT_FOUND') {
    return {
      code: 'expired_session',
      message,
      status: status ?? 404,
      details: { backendCode },
    }
  }

  if (backendCode === 'TEST_ALREADY_COMPLETED') {
    return {
      code: 'expired_session',
      message,
      status: status ?? 409,
      details: { backendCode },
    }
  }

  if (backendCode === 'QUESTION_ORDER_VIOLATION' || backendCode === 'MISSING_REQUIRED_FIELDS') {
    return {
      code: 'validation',
      message,
      status: status ?? 422,
      details: { backendCode },
    }
  }

  return {
    code: mapStatusToCode(status, message),
    message,
    status,
    details: backendCode ? { backendCode } : undefined,
  }
}

export function createWelcomeTestApiError(
  status: number,
  payload: ErrorPayload | null
): Error & { status: number } {
  const message =
    (typeof payload?.message === 'string' && payload.message) ||
    (typeof payload?.error === 'string' && payload.error) ||
    `API error ${status}`

  const error = new Error(message) as Error & { status: number }
  error.status = status
  return error
}
