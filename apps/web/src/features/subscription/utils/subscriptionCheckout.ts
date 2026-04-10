import { submitWayForPayForm } from './wayforpayCheckout'

type WayForPayInitResponse = {
  paymentUrl: string
  payment: Record<string, unknown>
}

export type SuperadminTrialResponse = {
  trialEndsAt: string
}

export type SuperadminPaymentResponse = {
  planCode: string
  currentPeriodEnd: string
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(fallbackMessage)
  }

  return response.json() as Promise<T>
}

export async function initiateSubscriptionCheckout(planCode: string) {
  const response = await fetch('/api/subscriptions/payments/wayforpay/initiate', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ planCode }),
  })

  const data = await parseJsonResponse<WayForPayInitResponse>(response, 'subscription_payment_initiate_failed')
  submitWayForPayForm(data.paymentUrl, data.payment)
  return data
}

export async function runSuperadminSubscriptionTest(planCode: 'trial'): Promise<SuperadminTrialResponse>
export async function runSuperadminSubscriptionTest(planCode: string): Promise<SuperadminPaymentResponse>
export async function runSuperadminSubscriptionTest(planCode: 'trial' | string) {
  const isTrial = planCode === 'trial'
  const response = await fetch(
    isTrial
      ? '/api/subscriptions/test/superadmin/trial'
      : '/api/subscriptions/test/superadmin/payment',
    {
      method: 'POST',
      credentials: 'include',
      headers: isTrial ? undefined : { 'Content-Type': 'application/json' },
      body: isTrial ? undefined : JSON.stringify({ planCode }),
    },
  )

  return isTrial
    ? parseJsonResponse<SuperadminTrialResponse>(response, 'trial_test_failed')
    : parseJsonResponse<SuperadminPaymentResponse>(response, 'payment_test_failed')
}
