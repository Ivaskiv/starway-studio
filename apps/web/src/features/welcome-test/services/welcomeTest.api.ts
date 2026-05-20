import { createAppRequestHeaders } from '@/lib/miniapp/apiClient'
import { resolveApiUrl } from '@/services/api'

import type {
  SubmitWelcomeTestAnswerInput,
  WelcomeTestServerState,
} from '@/features/welcome-test/types/welcomeTest.types'
import { createWelcomeTestApiError } from '@/features/welcome-test/utils/errorMapper'

async function welcomeTestRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const hasBody = Boolean(init.body)
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    credentials: 'include',
    headers: createAppRequestHeaders(init.headers, hasBody),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw createWelcomeTestApiError(response.status, payload)
  }

  return response.json() as Promise<T>
}

export async function fetchWelcomeTestState(
  linkToken: string,
  signal?: AbortSignal
): Promise<WelcomeTestServerState> {
  return welcomeTestRequest<WelcomeTestServerState>(
    `/test/${encodeURIComponent(linkToken)}/state`,
    { method: 'GET', signal }
  )
}

export type WelcomeTestPaymentStatusResponse = {
  payment: {
    status: 'PAYMENT_PENDING' | 'PAID'
    paymentProvider: 'wayforpay'
    paymentId: string | null
    paidAt: string | null
    linkToken: string | null
  } | null
  focusPaid: boolean
  paid: boolean
}

export async function fetchWelcomeTestPaymentStatus(
  linkToken: string,
  signal?: AbortSignal
): Promise<WelcomeTestPaymentStatusResponse> {
  return welcomeTestRequest<WelcomeTestPaymentStatusResponse>(
    `/test/${encodeURIComponent(linkToken)}/payment-status`,
    { method: 'GET', signal }
  )
}

export async function submitWelcomeTestAnswer(
  input: SubmitWelcomeTestAnswerInput,
  signal?: AbortSignal
): Promise<WelcomeTestServerState> {
  const { linkToken, questionId, answerId } = input

  return welcomeTestRequest<WelcomeTestServerState>(
    `/test/${encodeURIComponent(linkToken)}/submit-answer`,
    {
      method: 'POST',
      signal,
      body: JSON.stringify({
        questionId,
        answerId,
        ...(input.latencyMs != null ? { latencyMs: input.latencyMs } : {}),
      }),
    }
  )
}
