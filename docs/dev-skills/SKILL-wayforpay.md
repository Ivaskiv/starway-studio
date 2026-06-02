# SKILL: WayForPay Integration

> Статус: ACTIVE — централізована, без дублів (аудит 2026-05-29)

## Архітектура (як є)

```
backend/src/modules/subscriptions/payments/
  wayforpay.ts           ← buildPaymentRequest() + buildSignature()
  wayforpay.checkout.ts  ← checkout URL builder
  crypto.ts              ← verifySignature() для callback
  callback.handler.ts    ← єдиний callback handler для ВСІХ модулів
  callback.processing.ts ← дедуп через advisory lock
  routes.ts              ← POST /api/subscriptions/payments/wayforpay/callback

backend/src/products/focus/payments/wayforpay.ts  ← provider-обгортка (не дубль)
```

**Єдиний тип payload:** `PaymentCallbackData` в callback.handler.ts:35

## Правила (незмінні)

1. **Один builder** — всі модулі (zoom, focus, billing) імпортують з
   `subscriptions/payments/wayforpay.ts`. Ніколи не писати свій buildSignature.

2. **Один callback route** — `/api/subscriptions/payments/wayforpay/callback`
   для всіх продуктів. Розрізнення по `orderReference` префіксу:
   - `zoom_swap_*` → confirmZoomSwapPaymentByOrderRef()
   - `focus_*`     → focus payment handler
   - `billing_*`   → billing handler

3. **Підпис** — порядок полів для HMAC-MD5:
   ```
   merchantAccount;merchantDomainName;orderReference;
   orderDate;amount;currency;productName;productCount;productPrice
   ```

4. **Ідемпотентність** — перед будь-яким update після callback:
   ```ts
   if (entity.paymentStatus === 'CONFIRMED') return { ok: true }
   ```
   Дедуп також через advisory lock у callback.processing.ts.

5. **swapsUsedThisMonth** — інкрементується ТІЛЬКИ після
   `transactionStatus === 'Approved'` у webhook, ніколи до оплати.

6. **Логування** — після verifySignature завжди:
   ```ts
   console.log('[WayForPay]', { orderRef, status, amount, ts })
   ```

## Додавання нового продукту

```
STEP NN — add [product] payment

Task:
1. orderReference prefix: [product]_[id]_[timestamp]
2. buildPaymentRequest() — імпорт з subscriptions/payments/wayforpay.ts
3. callback.handler.ts — додати case для нового префіксу
4. Ідемпотентна перевірка перед update
5. pnpm -C backend exec tsc --noEmit
```

## .env змінні

```env
WAYFORPAY_MERCHANT_ACCOUNT=    # merchant login
WAYFORPAY_MERCHANT_SECRET=     # HMAC ключ
WAYFORPAY_CALLBACK_URL=        # https://backend/api/subscriptions/payments/wayforpay/callback
WAYFORPAY_DOMAIN=              # merchantDomainName
```

## Типові помилки

| Помилка | Причина | Фікс |
|---|---|---|
| Forbidden від WayForPay | serviceUrl не whitelisted | Додати callback URL в WayForPay кабінет |
| Подвійний інкремент | Немає idempotency check | Перевірити paymentStatus перед update |
| Невірний підпис | Порядок полів або зайві пробіли | Перевірити порядок в buildSignature() |
STEP 07c — docs: update SKILL-wayforpay.md

Додати в docs/dev-skills/SKILL-wayforpay.md новий розділ:

## РУЧНЕ ПІДТВЕРДЖЕННЯ ОПЛАТИ

Коли використовувати:
- WayForPay callback прийшов з Declined
- Webhook payload не розпарсився (JSON-рядок-ключ)
- Коуч знає що людина оплатила але доступу немає

Файли:
- backend/src/modules/admin/manualPayment.service.ts
  → grantFocusAccessManually(userId, 'coach')
- backend/src/modules/admin/coachNotification.service.ts
  → notifyCoachAboutFailedPayment(...)

Тригер автоматичного сповіщення:
  callback.handler.ts → після "Invalid callback - skipping"
  → notifyCoachAboutFailedPayment()

Coach bot action:
  admin:grant_focus:{userId} → grant + Block12
  admin:deny_focus:{userId}  → відхилити

Тест через Postman:
  backend/scripts/generate-test-webhook.ts
  ORDER_REF="..." tsx scripts/generate-test-webhook.ts
  → копіюєш JSON → Postman POST → serviceUrl endpoint

git add docs/dev-skills/SKILL-wayforpay.md
git commit -m "docs: add manual payment approval pattern to wayforpay skill"