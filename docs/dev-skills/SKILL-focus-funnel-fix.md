---
name: focus-funnel-fix
description: >
  Використовуй цей скіл коли потрібно дебажити, фіксити або розширювати
  ФОКУС-воронку в starway-studio: open_focus_payment callback, Dojim pipeline
  (NotificationJob scheduler), WayForPay webhook → paidAt → автоінвайт у канал.
  Також містить патерн conversion-stats endpoint і smoke test команди.
---

# SKILL: ФОКУС Funnel Fix — Starway Studio

## 1. АРХІТЕКТУРА ВОРОНКИ (як є)

```
Instagram Stories/Reel
  → @test_starway_bot (/start або "TEST" в директ)
  → тест 8 питань → результат
  → кнопка «Хочу у ФОКУС» (callback: open_focus_payment)
  → [HANDLER] handleAbTestCallback()
      → Dojim 0 (миттєво) ← WayForPay кнопки
      → NotificationJob × 5 (24h/48h/72h/5d/7d)
  → User натискає «Оплатити»
  → WayForPay → webhook POST /api/payments/wayforpay/... або /api/subscriptions/...
      → ProductSubscription.paidAt = NOW()
      → User.focusPaid = true
      → DELETE всіх PENDING NotificationJob для userId
      → bot.sendMessage → Block 12 (FOCUS_WELCOME) + кнопка каналу
```

## 2. КЛЮЧОВІ ФАЙЛИ (визначаються через STEP 01 grep)

```
# Grep для локалізації:
grep -Rn "open_focus_payment" apps backend --include="*.ts" | grep -v node_modules
grep -Rn "RESULT_DOJIM\|dojim" apps backend --include="*.ts" | grep -v node_modules
grep -Rn "focusPaid\|paidAt\|focusWelcomedAt" apps backend --include="*.ts" | grep -v node_modules
grep -Rn "NotificationJob\|runAt\|scheduledAt" apps backend --include="*.ts" | grep -v node_modules
grep -Rn "wayforpay\|orderReference" apps backend --include="*.ts" | grep -v node_modules
```

## 3. DOJIM PIPELINE ПАТЕРН

```typescript
// В handler після callback open_focus_payment:

// 1. Відправити Dojim 0 миттєво
await bot.telegram.sendMessage(user.telegramChatId, CONTENT.dojim0, {
  reply_markup: { inline_keyboard: [[
    { text: 'Оплатити 1 місяць — 780 грн', url: process.env.WAYFORPAY_FOCUS_1M_URL! },
    { text: 'Оплатити 3 місяці — 1990 грн', url: process.env.WAYFORPAY_FOCUS_3M_URL! },
  ]]}
})

// 2. Зберегти timestamp кліку (idempotent)
await prisma.user.update({
  where: { id: userId },
  data: { offerShownAt: user.offerShownAt ?? new Date() }
  // offerShownAt = перший клік, не перезаписуємо
})

// 3. Запланувати dojim серію (тільки якщо ще не заплановано)
const existingJobs = await prisma.notificationJob.count({
  where: {
    payload: { path: ['userId'], equals: userId },
    status: 'PENDING',
    templateKey: { in: DOJIM_TEMPLATE_KEYS }
  }
})

if (existingJobs === 0 && !user.focusPaid) {
  const now = new Date()
  await prisma.notificationJob.createMany({
    data: DOJIM_SCHEDULE.map(({ key, offsetMs }) => ({
      type: 'SUBSCRIPTION', // існуючий enum
      templateKey: key,
      payload: { userId, telegramChatId: user.telegramChatId },
      runAt: new Date(now.getTime() + offsetMs),
      status: 'PENDING',
    }))
  })
}
```

```typescript
// content файл — DOJIM constants:
export const DOJIM_TEMPLATE_KEYS = [
  'RESULT_DOJIM_24H',
  'RESULT_DOJIM_48H',
  'RESULT_DOJIM_72H',
  'RESULT_DOJIM_5D',
  'RESULT_DOJIM_7D',
] as const

export const DOJIM_SCHEDULE = [
  { key: 'RESULT_DOJIM_24H', offsetMs: 24 * 60 * 60 * 1000 },
  { key: 'RESULT_DOJIM_48H', offsetMs: 48 * 60 * 60 * 1000 },
  { key: 'RESULT_DOJIM_72H', offsetMs: 72 * 60 * 60 * 1000 },
  { key: 'RESULT_DOJIM_5D',  offsetMs: 5 * 24 * 60 * 60 * 1000 },
  { key: 'RESULT_DOJIM_7D',  offsetMs: 7 * 24 * 60 * 60 * 1000 },
] as const
```

## 4. NOTIFICATIONJOB SCHEDULER ПАТЕРН

```typescript
// Scheduler (cron або setInterval):
// Перевіряє кожні 5 хв NotificationJob WHERE status=PENDING AND runAt <= NOW()

async function processPendingDojimJobs(): Promise<void> {
  const jobs = await prisma.notificationJob.findMany({
    where: {
      status: 'PENDING',
      runAt: { lte: new Date() },
      templateKey: { in: [...DOJIM_TEMPLATE_KEYS] }
    },
    take: 50,  // не більше 50 за раз
  })

  for (const job of jobs) {
    const payload = job.payload as { userId: string; telegramChatId: string }
    
    // Guard: перевірити що ще не оплатив
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { focusPaid: true, telegramEnabled: true }
    })
    
    if (!user || user.focusPaid || !user.telegramEnabled) {
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: { status: 'DONE', updatedAt: new Date() }
      })
      continue
    }

    try {
      await bot.telegram.sendMessage(
        payload.telegramChatId,
        DOJIM_TEXTS[job.templateKey as keyof typeof DOJIM_TEXTS],
        { /* inline_keyboard з WayForPay кнопками для 72h/5d/7d */ }
      )
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: { status: 'DONE', updatedAt: new Date() }
      })
    } catch (err) {
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          lastError: err instanceof Error ? err.message : String(err),
          attempts: { increment: 1 },
        }
      })
    }
  }
}
```

## 5. WAYFORPAY WEBHOOK ПАТЕРН (idempotent)

```typescript
// POST /api/payments/wayforpay/callback або аналог
async function handleWayForPayWebhook(orderReference: string, status: string) {
  if (status !== 'Approved') return  // ігноруємо невдалі

  // Idempotent: знайти CheckoutSession або ProductSubscription
  const session = await prisma.checkoutSession.findUnique({
    where: { orderReference },
    include: { user: true }
  })
  if (!session || session.status === 'COMPLETED') return  // вже оброблено

  await prisma.$transaction(async (tx) => {
    // 1. Позначити checkout як COMPLETED
    await tx.checkoutSession.update({
      where: { id: session.id },
      data: { status: 'COMPLETED', completedAt: new Date() }
    })

    // 2. Оновити User та ProductSubscription
    await tx.user.update({
      where: { id: session.userId },
      data: { focusPaid: true, funnelStage: 'CUSTOMER' }
    })

    await tx.productSubscription.upsert({
      where: { userId_productId: { userId: session.userId, productId: FOCUS_PRODUCT_ID } },
      create: {
        userId: session.userId,
        productId: FOCUS_PRODUCT_ID,
        status: 'active',
        paidAt: new Date(),
        amount: session.amount,
      },
      update: {
        status: 'active',
        paidAt: new Date(),
        amount: session.amount,
      }
    })

    // 3. Скасувати всі PENDING dojim jobs
    await tx.notificationJob.updateMany({
      where: {
        payload: { path: ['userId'], equals: session.userId },
        status: 'PENDING',
        templateKey: { in: [...DOJIM_TEMPLATE_KEYS] }
      },
      data: { status: 'DONE' }
    })
  })

  // 4. Відправити Block 12 (FOCUS_WELCOME) — поза транзакцією
  const sub = await prisma.productSubscription.findUnique({
    where: { userId_productId: { userId: session.userId, productId: FOCUS_PRODUCT_ID } }
  })
  if (!sub?.focusWelcomedAt) {
    await bot.telegram.sendMessage(
      session.user.telegramChatId!,
      CONTENT.focusWelcome,
      { reply_markup: { inline_keyboard: [[
        { text: '🔗 Приєднатись до ФОКУС', url: process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK! }
      ]]}}
    )
    await prisma.productSubscription.update({
      where: { id: sub!.id },
      data: { focusWelcomedAt: new Date() }
    })
  }
}
```

## 6. CONVERSION STATS ENDPOINT

```typescript
// GET /api/admin/conversion-stats
// Guard: role SUPERADMIN | EXPERT
async function getConversionStats(req, res) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [todayPayments, pendingDojim, clickedNotPaid, totalPaid] = await Promise.all([
    prisma.productSubscription.count({
      where: { paidAt: { gte: today } }
    }),
    prisma.notificationJob.count({
      where: {
        status: 'PENDING',
        templateKey: { in: [...DOJIM_TEMPLATE_KEYS] }
      }
    }),
    prisma.user.count({
      where: {
        focusPaid: false,
        offerShownAt: { not: null }
      }
    }),
    prisma.user.count({ where: { focusPaid: true } })
  ])

  return res.json({ todayPayments, pendingDojim, clickedNotPaid, totalPaid })
}
```

## 7. REQUIRED ENV VARIABLES

```bash
# Render Dashboard → Environment → перевірити/додати:
FOCUS_TELEGRAM_CHANNEL_INVITE_LINK=https://t.me/+XXXXXX
WAYFORPAY_FOCUS_1M_URL=https://secure.wayforpay.com/pay?...
WAYFORPAY_FOCUS_3M_URL=https://secure.wayforpay.com/pay?...
SCHEDULER_AUTO_START=true
NOTIFICATION_WORKER_AUTO_START=true
```

## 8. SMOKE TEST SQL

```sql
-- Після кліку кнопки ФОКУС:
SELECT id, "templateKey", status, "runAt"
FROM "NotificationJob"
WHERE payload::text LIKE '%<userId>%'
ORDER BY "runAt";
-- Має бути 5 рядків status=PENDING

-- Поточні конверсії сьогодні:
SELECT COUNT(*) FROM product_subscriptions
WHERE "paidAt" >= CURRENT_DATE;

-- Хто натиснув але не оплатив:
SELECT COUNT(*) FROM "User"
WHERE "focusPaid" = false AND "offerShownAt" IS NOT NULL;
```

## 9. АРХІТЕКТУРНІ ПРАВИЛА ДЛЯ ЦЬОГО ФЛОУ

```
✅ Webhook — завжди idempotent (перевіряти status=COMPLETED перед обробкою)
✅ Dojim pipeline — тільки якщо existingJobs === 0 (не дублювати)
✅ Guard focusPaid — перед КОЖНОЮ відправкою dojim
✅ Весь copy → content файли (abTest.focus.ts, abTest.followups.ts)
✅ Транзакція для: update User + ProductSubscription + cancel jobs
✅ Block 12 (FOCUS_WELCOME) — поза транзакцією, з guard focusWelcomedAt
❌ Не хардкодити тексти в handlers
❌ Не відправляти dojim якщо focusPaid = true
❌ Не дублювати NotificationJob (перевіряти existingJobs)
❌ Не блокувати Event Loop у scheduler (async/await + take: 50)
```
## 10. WAYFORPAY WEBHOOK — ВІДОМІ ПРОБЛЕМИ

### CORS блок
WayForPay надсилає serviceUrl POST з origin https://secure.wayforpay.com.
Рішення: додати wayforpayCors = cors({ origin: '*' }) для
/api/subscriptions/payments/wayforpay/* і /api/payments/wayforpay/* маршрутів
ДО загального cors middleware в app.ts.
Ці endpoints — публічні webhook receivers, CORS не потрібен.

### Payload як рядок-ключ
WayForPay іноді надсилає весь JSON як один рядок-ключ в body.
Тобто Object.keys(body)[0] = '{"orderReference":"...","amount":1,...}'.
Парсер має перевіряти обидва варіанти:
1. body.orderReference існує → прямий об'єкт
2. Object.keys(body).length === 1 → JSON.parse(keys[0])

### Guard після оплати (idempotent)
Перед відправкою Block 12 завжди перевіряти:
if (sub.focusWelcomedAt) return — не дублювати

### Guard проти циклу кнопок
Перед запуском тесту: if (user.focusPaid) → показати FOCUS_ALREADY_PAID
Перед повторним тестом: якщо testCompletedAt → підтвердити restart
