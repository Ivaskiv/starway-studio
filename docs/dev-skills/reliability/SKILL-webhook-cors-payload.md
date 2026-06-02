---
name: SKILL-webhook-cors-payload
description: >
  Використовуй цей скіл ЗАВЖДИ коли:
  - додаєш новий webhook endpoint (WayForPay, Stripe, Telegram, будь-який)
  - є CORS помилка від зовнішнього сервісу
  - webhook payload парситься неправильно (порожній body, один рядок-ключ)
  - є різниця поведінки між local/ngrok та prod/Render
  Містить готові патерни для app.ts, middleware та payload parsers.
---

# SKILL: Webhook CORS + Payload Parsing
## (Працює однаково: local ngrok + prod Render)

---

## 1. КОРІНЬ ПРОБЛЕМИ

```
LOCAL (ngrok):
  WayForPay → POST https://xxx.ngrok-free.dev/api/payments/wayforpay/return
  Origin: https://secure.wayforpay.com
  → CORS blocked (не в allowedOrigins)
  → Express повертає 500 ще до обробки body
  → Webhook втрачається

PROD (Render):
  WayForPay → POST https://myapp.onrender.com/api/payments/wayforpay/return
  Origin: https://secure.wayforpay.com
  → Може пройти якщо CORS налаштований широко
  → АЛЕ payload може прийти як один JSON-рядок-ключ
  → Парсер дає { order_reference: null }
  → Webhook "обробляється" але нічого не відбувається
```

**Обидві проблеми існують незалежно одна від одної.**
Виправляти треба обидві — навіть якщо одна "не видна" на певному середовищі.

---

## 2. ПРАВИЛО: Webhook Endpoints = Публічні

```
❌ НЕПРАВИЛЬНО: застосовувати загальний cors() до webhook endpoints
✅ ПРАВИЛЬНО: webhook endpoints ЗАВЖДИ відкриті (cors origin: '*')

Логіка: зовнішній сервіс (WayForPay, Stripe, GitHub) не знає
твого домену і ніколи не надішле "правильний" Origin.
CORS для webhook = завжди блокує легітимні запити.
```

---

## 3. ПАТЕРН app.ts — Webhook CORS (copy-paste ready)

```typescript
// backend/src/app.ts
// КРИТИЧНО: розмістити ДО загального corsOptions middleware

import cors from 'cors'

// Публічні webhook receivers — CORS не потрібен
// Список поповнювати при додаванні нових webhook провайдерів
const PUBLIC_WEBHOOK_PREFIXES = [
  '/api/payments/wayforpay',
  '/api/subscriptions/payments/wayforpay',
  '/api/webhooks',          // загальний префікс якщо є
  '/api/billing/webhook',   // Stripe або інші
] as const

const webhookCors = cors({ origin: '*' })

for (const prefix of PUBLIC_WEBHOOK_PREFIXES) {
  app.use(prefix, webhookCors)
}

// Далі — загальний cors для решти routes
app.use(corsOptions)
```

**Чому це безпечно:**
- Webhook endpoints не повертають sensitive дані
- Вони тільки приймають і підтверджують
- Автентифікація — через підпис (HMAC/signature), не через CORS
- CORS захищає браузери, не сервери

---

## 4. ПАТЕРН: Universal Webhook Body Parser

WayForPay (і деякі інші провайдери) надсилають body в нестандартному форматі.
Завжди використовувати цей universal parser:

```typescript
// backend/src/lib/payments/parseWebhookBody.ts

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string; raw: unknown }

/**
 * Universal webhook payload parser.
 * Обробляє 4 варіанти які зустрічаються в реальних провайдерах:
 *
 * Варіант 1: нормальний JSON об'єкт (ідеальний випадок)
 *   body = { orderReference: '...', amount: 100 }
 *
 * Варіант 2: WayForPay quirk — весь JSON як один рядок-ключ
 *   body = { '{"orderReference":"...","amount":100}': '' }
 *   Причина: WayForPay надсилає application/json але деякі
 *   версії express.urlencoded() інтерпретують тіло неправильно
 *
 * Варіант 3: urlencoded рядок як значення
 *   body = { data: '{"orderReference":"..."}' }
 *
 * Варіант 4: подвійно серіалізований JSON
 *   body = '"{\\"orderReference\\":\\"...\\"}"'
 */
export function parseWebhookBody<T extends Record<string, unknown>>(
  body: unknown,
  requiredField: keyof T,
): ParseResult<T> {
  // Варіант 1: прямий об'єкт з потрібним полем
  if (
    body !== null &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    requiredField in (body as object)
  ) {
    return { ok: true, data: body as T }
  }

  // Варіант 2: WayForPay quirk — JSON як рядок-ключ
  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    const keys = Object.keys(body as object)
    if (keys.length === 1 && keys[0].startsWith('{')) {
      try {
        const parsed = JSON.parse(keys[0]) as unknown
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          requiredField in (parsed as object)
        ) {
          return { ok: true, data: parsed as T }
        }
      } catch {
        // не JSON ключ
      }
    }
  }

  // Варіант 3: JSON рядок як value одного з полів
  if (body !== null && typeof body === 'object') {
    for (const val of Object.values(body as object)) {
      if (typeof val === 'string' && val.startsWith('{')) {
        try {
          const parsed = JSON.parse(val) as unknown
          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            requiredField in (parsed as object)
          ) {
            return { ok: true, data: parsed as T }
          }
        } catch {
          continue
        }
      }
    }
  }

  // Варіант 4: подвійно серіалізований рядок
  if (typeof body === 'string') {
    try {
      const once = JSON.parse(body) as unknown
      if (typeof once === 'string') {
        const twice = JSON.parse(once) as unknown
        if (
          twice !== null &&
          typeof twice === 'object' &&
          requiredField in (twice as object)
        ) {
          return { ok: true, data: twice as T }
        }
      }
      if (
        once !== null &&
        typeof once === 'object' &&
        requiredField in (once as object)
      ) {
        return { ok: true, data: once as T }
      }
    } catch {
      // не рядок JSON
    }
  }

  return {
    ok: false,
    reason: 'no_matching_parse_variant',
    raw: body,
  }
}
```

**Використання в handler:**
```typescript
import { parseWebhookBody } from '@/lib/payments/parseWebhookBody.js'
import type { WayForPayCallbackPayload } from './business.types.js'

export async function wayForPayCallbackHandler(req: Request, res: Response) {
  const result = parseWebhookBody<WayForPayCallbackPayload>(
    req.body,
    'orderReference',  // обов'язкове поле для перевірки
  )

  if (!result.ok) {
    console.error('[WayForPay] payload parse failed', {
      reason: result.reason,
      rawType: typeof result.raw,
      rawKeys: typeof result.raw === 'object' && result.raw !== null
        ? Object.keys(result.raw).slice(0, 3)
        : [],
    })
    // WayForPay очікує OK навіть при невдачі — інакше буде retry
    return res.status(200).json({ status: 'ok' })
  }

  const payload = result.data
  // payload.orderReference, payload.transactionStatus тепер типізовані
  console.log('[WayForPay] payload parsed ok', {
    orderReference: payload.orderReference,
    transactionStatus: payload.transactionStatus,
    amount: payload.amount,
  })
  // ... далі бізнес-логіка
}
```

---

## 5. ПАТЕРН: Express Body Parser для Webhook Routes

Webhook routes потребують спеціального налаштування body-parser:

```typescript
// app.ts — до реєстрації webhook routes

// Для WayForPay: приймає і JSON і urlencoded
app.use('/api/payments/wayforpay', express.json({ limit: '1mb' }))
app.use('/api/payments/wayforpay', express.urlencoded({ extended: true, limit: '1mb' }))

app.use('/api/subscriptions/payments/wayforpay', express.json({ limit: '1mb' }))
app.use('/api/subscriptions/payments/wayforpay', express.urlencoded({ extended: true, limit: '1mb' }))

// ПІСЛЯ цих специфічних — загальний parser для решти
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
```

**Чому важливо:** якщо загальний `express.json()` стоїть першим,
він може "з'їсти" body до того як webhook-специфічний parser його обробить.

---

## 6. ДІАГНОСТИКА — Чеклист при новому webhook

```
Новий webhook не працює? Перевіряти в такому порядку:

□ 1. CORS: чи є Origin провайдера в allowedOrigins або wildcard для цього prefix?
     grep -n "allowedOrigins\|cors" backend/src/app.ts

□ 2. Body parser: чи є express.json() і express.urlencoded() для цього prefix?
     grep -n "express.json\|express.urlencoded" backend/src/app.ts

□ 3. Content-Type: що надсилає провайдер?
     Додати тимчасовий лог: console.log('[DEBUG]', req.headers['content-type'], typeof req.body)

□ 4. Raw body: що реально прийшло?
     console.log('[DEBUG] body keys:', Object.keys(req.body ?? {}).slice(0, 3))
     console.log('[DEBUG] body type:', typeof req.body)

□ 5. Parse result: використати parseWebhookBody() і перевірити ok/reason

□ 6. Signature: чи валідний HMAC підпис (якщо є)?
     Перевіряти ПІСЛЯ успішного парсингу, не до

□ 7. Response: що очікує провайдер у відповідь?
     WayForPay: { status: 'accept' } або просто 200 OK
     Stripe: 200 OK
     Telegram: 200 OK
     Неправильна відповідь = провайдер буде retry до 72 год
```

---

## 7. СЕРЕДОВИЩА: Local vs Prod — Матриця поведінки

```
┌─────────────────────┬──────────────────────┬──────────────────────┐
│ Проблема            │ Local (ngrok)        │ Prod (Render)        │
├─────────────────────┼──────────────────────┼──────────────────────┤
│ CORS блок           │ ✅ Виникає           │ ⚠️  Може виникнути   │
│                     │ Origin = wayforpay   │ залежить від config  │
├─────────────────────┼──────────────────────┼──────────────────────┤
│ JSON-рядок-ключ     │ ✅ Виникає           │ ✅ Виникає           │
│ (WayForPay quirk)   │ завжди               │ завжди               │
├─────────────────────┼──────────────────────┼──────────────────────┤
│ Body порожній       │ ✅ Якщо нема         │ ✅ Якщо нема         │
│                     │ urlencoded parser    │ urlencoded parser    │
├─────────────────────┼──────────────────────┼──────────────────────┤
│ Signature invalid   │ ✅ Якщо ngrok URL    │ ❌ Не виникає        │
│                     │ не в WayForPay       │ prod URL registered  │
│                     │ service URL          │                      │
├─────────────────────┼──────────────────────┼──────────────────────┤
│ Retry storm         │ ⚠️  WayForPay retry  │ ⚠️  Те саме          │
│                     │ якщо нема 200        │                      │
└─────────────────────┴──────────────────────┴──────────────────────┘

ВИСНОВОК: Виправляй обидва середовища одночасно.
Патерн з parseWebhookBody + webhookCors вирішує всі рядки таблиці.
```

---

## 8. НОВІ ПРОВАЙДЕРИ — Шаблон

Додаючи новий webhook (Stripe, LiqPay, Mono, Nova Poshta...):

```typescript
// 1. app.ts — додати prefix в PUBLIC_WEBHOOK_PREFIXES
const PUBLIC_WEBHOOK_PREFIXES = [
  '/api/payments/wayforpay',
  '/api/payments/stripe',    // ← новий
  // ...
]

// 2. Створити parser з правильним requiredField:
const result = parseWebhookBody<StripeEvent>(req.body, 'type')
// або для LiqPay:
const result = parseWebhookBody<LiqPayCallback>(req.body, 'payment_id')

// 3. Додати в цей SKILL новий рядок у секцію 6 (Діагностика)
// та в таблицю секції 7 якщо поведінка відрізняється
```

---

## 9. АРХІТЕКТУРНІ ПРАВИЛА

```
✅ Webhook prefix → завжди в PUBLIC_WEBHOOK_PREFIXES (webhookCors)
✅ parseWebhookBody() → єдина точка парсингу для всіх webhook handlers
✅ Body parser специфічний для webhook prefix → до загального express.json()
✅ Логувати parse failures з rawType і rawKeys для діагностики
✅ Відповідати 200 OK навіть при parse failure (уникати retry storm)
✅ Signature validation → ПІСЛЯ parse, не до
✅ Idempotency guard → перевіряти completedAt/processedAt перед обробкою

❌ Не додавати webhook провайдера в allowedOrigins (це не вирішує проблему)
❌ Не робити try/catch навколо всього handler без логування raw body
❌ Не покладатись на Content-Type від провайдера (він може бути неправильним)
❌ Не парсити body вручну в кожному handler — тільки parseWebhookBody()
```