import type { Request, Response } from "express"
import { prisma } from "../../../db/client.js"
import { getCheckoutSession, refreshCheckoutSessionPayload } from "../payments/wayforpay/checkout.js"
import { generatePaymentSignature } from "../payments/wayforpay/service.js"

function decodeStoredCheckoutPayload(payload: string): Record<string, unknown> | null {
  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function refreshCheckoutPayloadForRetry(rawPayload: Record<string, unknown>): Record<string, unknown> {
  const amount = Number(rawPayload.amount ?? 0)
  const currency = String(rawPayload.currency ?? 'UAH')
  const clientAccountId = String(rawPayload.clientAccountId ?? '').trim()
  const existingRef = String(rawPayload.orderReference ?? '').trim()
  const productName = Array.isArray(rawPayload.productName)
    ? rawPayload.productName.map((item) => String(item))
    : []
  const productPrice = Array.isArray(rawPayload.productPrice)
    ? rawPayload.productPrice.map((item) => Number(item))
    : []
  const productCount = Array.isArray(rawPayload.productCount)
    ? rawPayload.productCount.map((item) => Number(item))
    : []

  if (!existingRef || !clientAccountId || !Number.isFinite(amount) || amount <= 0 || productName.length === 0) {
    return rawPayload
  }

  const orderDate = Math.floor(Date.now() / 1000)
  const sanitizedBaseRef = existingRef.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'focus'
  // FIX 2026-05-25 PAY_RETRY1: every checkout open gets a fresh orderReference to avoid WFP 1112 duplicate id.
  const nextOrderReference = `${sanitizedBaseRef}_r${Date.now()}`
  const merchantSignature = generatePaymentSignature(
    {
      userId: clientAccountId,
      productId: productName[0] ?? 'focus',
      amount,
      payRef: nextOrderReference,
      currency,
      product_name: productName,
      product_count: productCount.length ? productCount : [1],
      product_price: productPrice.length ? productPrice : [amount],
    },
    orderDate,
  )

  return {
    ...rawPayload,
    orderReference: nextOrderReference,
    orderDate,
    merchantSignature,
  }
}

export async function renderWayForPayCheckoutPageHandler(req: Request, res: Response) {
  const token = typeof req.params.token === 'string' ? req.params.token.trim() : ''
  const storedPayload = token ? await getCheckoutSession(token) : null
  const payloadFromSession = storedPayload ? decodeStoredCheckoutPayload(storedPayload) : null
  const expiredSession = !payloadFromSession && token
    ? await prisma.checkoutSession.findUnique({
        where: { token },
        select: {
          payload: true,
          status: true,
          expiresAt: true,
        },
      })
    : null
  const payloadFromExpiredSession =
    expiredSession?.status === 'EXPIRED' &&
    expiredSession.payload &&
    typeof expiredSession.payload === 'object' &&
    !Array.isArray(expiredSession.payload)
      ? expiredSession.payload as Record<string, unknown>
      : null
  const fallbackPayloadRaw = typeof req.query.payload === 'string' ? req.query.payload.trim() : ''
  // FIX 2026-05-25 TP3: recover from token miss using signed payload fallback in query.
  const payloadFromFallback = !payloadFromSession && fallbackPayloadRaw
    ? decodeStoredCheckoutPayload(fallbackPayloadRaw)
    : null
  const payload = payloadFromSession ?? payloadFromExpiredSession ?? payloadFromFallback

  if (!payload) {
    console.error('[WAYFORPAY_CHECKOUT] ❌ Invalid or expired checkout token', {
      product: req.query.product,
      plan: req.query.plan,
      hasToken: Boolean(token),
      hasFallbackPayload: Boolean(fallbackPayloadRaw),
    })
    return res.status(400).send('Invalid checkout token')
  }

  if (!payloadFromSession && payloadFromFallback) {
    console.warn('[CHECKOUT_TRACE] token_miss_payload_fallback', {
      product: req.query.product,
      plan: req.query.plan,
      hasToken: Boolean(token),
      hasFallbackPayload: true,
    })
  }

  if (!payloadFromSession && payloadFromExpiredSession) {
    console.warn('[CHECKOUT_TRACE] expired_token_payload_recovered', {
      token,
      product: req.query.product,
      plan: req.query.plan,
      expiresAt: expiredSession?.expiresAt?.toISOString() ?? null,
    })
  }

  // FIX 2026-05-25 PAY_RETRY2: regenerate order reference/signature so repeated pay attempts stay valid.
  const replaySafePayload = refreshCheckoutPayloadForRetry(payload)
  if (String(replaySafePayload.orderReference ?? '') !== String(payload.orderReference ?? '')) {
    if (token) {
      await refreshCheckoutSessionPayload(token, replaySafePayload).catch((error) => {
        console.error('[CHECKOUT_TRACE] retry_payload_persist_failed', {
          token,
          orderReference: replaySafePayload.orderReference,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
    console.warn('[PAYMENT_RETRY]', {
      oldRef: String(payload.orderReference ?? ''),
      newRef: String(replaySafePayload.orderReference ?? ''),
    })
    console.info('[PAYMENT_TRACE]', {
      step: 'invoice_create',
      note: 'checkout_retry_regenerated',
      previousOrderReference: payload.orderReference,
      nextOrderReference: replaySafePayload.orderReference,
    })
  }

  console.log('[WAYFORPAY_CHECKOUT] rendering form', {
    product: req.query.product,
    plan: req.query.plan,
    merchantAccount: String(payload.merchantAccount ?? '').slice(0, 8) + '...',
    orderReference: replaySafePayload.orderReference,
    amount: replaySafePayload.amount,
    currency: replaySafePayload.currency,
    hasSignature: Boolean(replaySafePayload.merchantSignature),
    hasReturnUrl: Boolean(replaySafePayload.returnUrl),
    hasServiceUrl: Boolean(replaySafePayload.serviceUrl),
  })

  const formInputs = Object.entries(replaySafePayload)
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) =>
          `<input type="hidden" name="${key}" value="${String(item ?? '').replace(/"/g, '&quot;')}" />`,
        )
      }

      const normalizedValue = typeof value === 'object'
        ? JSON.stringify(value)
        : String(value ?? '')
      return `<input type="hidden" name="${key}" value="${normalizedValue.replace(/"/g, '&quot;')}" />`
    })
    .join('\n')

  const html = [
    '<!doctype html>',
    '<html lang="uk">',
    '<head><meta charset="utf-8" /><title>WayForPay Checkout</title></head>',
    '<body>',
    '<form id="wayforpay-checkout" method="post" action="https://secure.wayforpay.com/pay">',
    formInputs,
    '<noscript><button type="submit">Continue to payment</button></noscript>',
    '</form>',
    '<script>document.getElementById("wayforpay-checkout").submit();</script>',
    '</body>',
    '</html>',
  ].join('')

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(html)
}

export async function wayForPayReturnHandler(req: Request, res: Response) {
  const targetRaw = typeof req.query.target === 'string' ? req.query.target.trim() : ''
  const source = typeof req.query.source === 'string' ? req.query.source.trim() : ''
  const frontendBase = (
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim() ||
    process.env.PUBLIC_FRONTEND_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    ''
  ).replace(/\/$/, '')
  const fallbackTarget = frontendBase ? `${frontendBase}/miniapp?startapp=billing-success` : ''

  if (source === 'telegram') {
    const html = [
      '<!doctype html>',
      '<html lang="uk"><head><meta charset="utf-8" /><title>Оплата успішна</title></head><body>',
      '<h3>Оплата успішна ✅</h3>',
      '<p>Повернись у Telegram.</p>',
      '<p>Підтвердження оплати та доступи вже надіслані тобі в бот.</p>',
      '</body></html>',
    ].join('')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(html)
  }

  const target = targetRaw || fallbackTarget
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return res.redirect(302, target)
  }

  const html = [
    '<!doctype html>',
    '<html lang="uk"><head><meta charset="utf-8" /><title>Оплата успішна</title></head><body>',
    '<h3>Оплата успішна</h3>',
    '<p>Поверніться у застосунок.</p>',
    '</body></html>',
  ].join('')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(html)
}
