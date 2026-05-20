import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

test('Focus welcome-test page renders payment UI', async ({
  page,
}: {
  page: Page
}) => {
  await page.goto('/welcome-test/smoke-token')

  const payButton = page.locator('button', { hasText: /оплатити|pay/i })
  await expect(payButton).toBeVisible()
})

test('Payment webhook endpoint is reachable', async ({
  request,
}: {
  request: APIRequestContext
}) => {
  const response = await request.post(
    '/api/subscriptions/payments/wayforpay/callback',
    {
      data: {
        order_reference: 'smoke_ref_000',
        amount: 780,
        transaction_status: 'Approved',
        clientAccountId: 'smoke-user-id',
      },
    }
  )
  // 400 = signature rejected (expected without WayForPay creds) — endpoint alive
  // 200 = processed (requires real creds + DB user)
  // 500 = server crash — never acceptable
  expect(response.status()).not.toBe(500)
})
