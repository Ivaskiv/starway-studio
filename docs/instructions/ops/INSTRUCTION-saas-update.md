---
name: saas-update-instruction
description: Інструкція як оновлювати SaaS ABSystem — додавати нові модулі, синхронізувати з Instagram+Telegram, підтримувати єдину систему бізнесу Наді.
version: 1.0
---

# ІНСТРУКЦІЯ: Як оновлювати SaaS ABSystem
**Єдина система: SaaS + Instagram + Telegram + Воронки**

---

## ГОЛОВНИЙ ПРИНЦИП

```
НЕ ІСНУЄ ОКРЕМИХ СИСТЕМ.
Є одна система бізнесу Наді з кількома точками входу:

Instagram    → трафік → тест → воронка
Telegram     → обслуговування + керування
SaaS (Web)   → платформа + аналітика
MiniApp      → клієнтський інтерфейс

Всі чотири = одна база даних = один eventRouter
```

---

## ЧАСТИНА 1: ПРАВИЛО "СПОЧАТКУ ПОДІЯ"

Будь-яке оновлення системи починається з питання:
> "Яка ПОДІЯ (event) відбувається — і що повинно статись у всіх чотирьох точках?"

### Приклад: додаємо Instagram Lead

```
ПОДІЯ: instagram.lead_clicked_test
    ↓
SaaS:       створити запис у LeadSource з instagram
Telegram:   (нічого, людина ще не в боті)
MiniApp:    (нічого)
Analytics:  +1 до instagram_traffic_count

ПОДІЯ: test.completed
    ↓
SaaS:       зберегти результат в User + CRMContact
Telegram:   надіслати персоналізований результат
MiniApp:    показати результат якщо відкрили
Analytics:  +1 до funnel.test_completed

ПОДІЯ: payment.focus.success
    ↓
SaaS:       активувати підписку
Telegram:   привітання + доступ до каналу
MiniApp:    відкрити ФОКУС-секцію
Instagram:  (ніяк, але Analytics оновились — можна ретаргет виключити)
Analytics:  +1 до funnel.focus_purchased, +N до revenue
```

---

## ЧАСТИНА 2: СТРУКТУРА КОЖНОГО ОНОВЛЕННЯ

### Чеклист нового модуля (завжди в такому порядку):

```
КРОК 1: Prisma Schema
☐ Додати нову модель або поля
☐ Запустити: pnpm -C backend exec prisma migrate dev
☐ Перевірити: pnpm -C backend exec tsc --noEmit

КРОК 2: Events (eventRouter.ts)
☐ Додати нові event types в EventType enum
☐ Додати handlers в eventRouter
☐ Документувати: що тригерить → що відбувається

КРОК 3: Backend Service
☐ Створити service.ts в відповідному модулі
☐ Додати routes.ts
☐ Підключити до app.ts

КРОК 4: Telegram (якщо є взаємодія з клієнтом)
☐ Додати команду або callback в telegram-mentor/index.ts
☐ Копі — ТІЛЬКИ з відповідного content.ts файлу
☐ Перевірити: warm tone, no telemetry

КРОК 5: Web UI (якщо є dashboard)
☐ Додати RTK Query endpoint в відповідний api.ts
☐ Створити компонент в apps/web/src/features/
☐ Додати в sidebar якщо потрібно

КРОК 6: MiniApp (якщо потрібен клієнтський UI)
☐ Синхронізувати з тим самим API endpoint

КРОК 7: Analytics
☐ Додати нові метрики в analytics.service.ts
☐ Додати в тижневий/місячний звіт якщо важливо

КРОК 8: Тест
☐ pnpm -C backend exec tsc --noEmit (обов'язково)
☐ Тест в @test_starway_bot
☐ Перевірити синхронізацію всіх 4 точок
```

---

## ЧАСТИНА 3: INSTAGRAM → СИСТЕМА

### Як Instagram підключається до воронки:

```
INSTAGRAM POSTS/REELS
    ↓ (людина клікає на посилання в біо або stories)
    ↓
LANDING PAGE (Vercel)
  /ab-test  → вхідний тест (ПРІОРИТЕТ для нових)
  /focus    → сторінка ФОКУСУ
  /platform → сторінка платформи
    ↓
СИСТЕМА ФІКСУЄ utm_source=instagram (або utm_source=reels)
    ↓
CRMContact.entryPoint = 'instagram'
    ↓
Analytics показує: скільки з Instagram → тест → покупка
```

### Як відстежувати ефективність контенту:

```typescript
// Додати в LeadSource модель:
model LeadSource {
  id          String  @id @default(cuid())
  userId      String
  source      String  // instagram / telegram / direct / reels
  utmCampaign String? // назва рілсу або поста
  utmContent  String? // конкретний формат
  createdAt   DateTime @default(now())
}

// Тоді можна буде: /crm stats instagram
// → скільки прийшло з Instagram цього тижня
// → яка конверсія тест→покупка з Instagram vs Telegram
```

---

## ЧАСТИНА 4: СИНХРОНІЗАЦІЯ WEB + MINIAPP + BOT

### Правило: Single Source of Truth

```
ЗАБОРОНЯЄТЬСЯ:
❌ Зберігати стан в localStorage MiniApp
❌ Кешувати в боті без інвалідації
❌ Різні версії даних в Web і MiniApp

ПРАВИЛЬНО:
✅ Все в PostgreSQL (Neon)
✅ Web і MiniApp читають з одного API
✅ Після будь-якої зміни → RTK Query invalidation
✅ Telegram бот читає з тієї ж БД через той самий API
```

### Real-time оновлення (WebSocket або SSE):

```typescript
// Для критичних оновлень (нова оплата, нова Zoom-сесія):
// apps/web/src/shared/hooks/useRealtimeUpdates.ts

const useRealtimeUpdates = () => {
  useEffect(() => {
    const sse = new EventSource('/api/events/stream');
    
    sse.onmessage = (e) => {
      const event = JSON.parse(e.data);
      
      switch(event.type) {
        case 'zoom.created':
          dispatch(zoomApi.util.invalidateTags(['ZoomSessions']));
          break;
        case 'payment.success':
          dispatch(subscriptionApi.util.invalidateTags(['Subscription']));
          break;
      }
    };
    
    return () => sse.close();
  }, []);
};
```

---

## ЧАСТИНА 5: ПРІОРИТЕТИ ОНОВЛЕНЬ

### Матриця: що впливає на revenue vs складність

```
                    ВИСОКА СКЛАДНІСТЬ
                           │
          [CRM повний]     │    [Real-time sync]
          [AI Analyst]     │    [Instagram tracking]
                           │
НИЗЬКИЙ ──────────────────┼────────────────── ВИСОКИЙ
REVENUE                   │                   REVENUE
                           │
          [PDF звіти]      │    [AI Seller]
          [Команди /crm]   │    [Автоворонки]
                           │
                    НИЗЬКА СКЛАДНІСТЬ
```

### Порядок впровадження (по матриці):

```
ФАЗА 1 — Швидкі перемоги (1-2 тижні):
  → Команди /crm stats, /revenue, /churn в бот
  → LeadSource модель (відстеження джерел)
  → Тижневий бізнес-звіт в Telegram (текстовий)

ФАЗА 2 — Основа автоматизації (3-4 тижні):
  → AI Seller — автоматичні серії після тесту
  → CRMContact повна модель
  → Автоворонки з таймінгами

ФАЗА 3 — Аналітика і PDF (5-6 тижнів):
  → analytics.service.ts повний
  → PDF звіти (клієнтські + бізнесові)
  → forecast.service.ts

ФАЗА 4 — Синхронізація і масштаб (7-8 тижнів):
  → Instagram tracking повний
  → Real-time WebSocket/SSE
  → Performance оптимізація
```

---

## ЧАСТИНА 6: CODEX ПРОМПТИ ДЛЯ КОЖНОЇ ФАЗИ

### ФАЗА 1 — Промпт для Codex:

```
Задача: Додати команди бізнес-аналітики в Telegram-бот ABSystem.

Файл: backend/src/bots/telegram-mentor/index.ts

Додати обробники:
1. /revenue → analytics.service.getMonthRevenue() → форматований текст
   Формат: "💰 Revenue [місяць]: N грн\n+N% до минулого місяця"

2. /crm stats → crm.service.getFunnelStats() → текст
   Формат: воронка в 5 рядків зі стрілками і конверсіями

3. /churn → crm.service.getChurnRisks() → список
   Формат: "⚠️ Churn ризик:\n• [ім'я] — N днів без активності ([продукт])"

Правила:
- Команди доступні ТІЛЬКИ для NADYA_TELEGRAM_ID (env var)
- Якщо інший user — тихо ігнорувати (не відповідати)
- Максимум 10 рядків на відповідь
- pnpm -C backend exec tsc --noEmit після змін
```

### ФАЗА 2 — Промпт для Codex:

```
Задача: Створити AI Seller — автоматичні серії повідомлень після тесту.

Нові файли:
- backend/src/modules/ai-seller/seller.service.ts
- backend/src/modules/ai-seller/seller.scripts.ts
- backend/src/modules/ai-seller/seller.scheduler.ts

seller.scripts.ts: об'єкт з ключами:
STATE | GOAL | CHOICE | DECISION | ACTION
Кожен ключ: масив { message: string, delayHours: number }
Скрипти з файлу SKILL-ab-test-results.md (серії по 3 повідомлення)

seller.service.ts:
- subscribeToEvents() → підписатись на eventRouter 'test.completed'
- sendSequence(userId, result) → надіслати серію з затримками
- Записати в CRMContact.lastContactedAt після кожного

seller.scheduler.ts:
- Cron кожні 6 годин: перевірити хто не отримав серію і відправити
- Limit: не більше 1 повідомлення на добу на клієнта

pnpm -C backend exec tsc --noEmit після змін
```

---

## ЧАСТИНА 7: ЩО НЕ ЗМІНЮВАТИ НІКОЛИ

```
АРХІТЕКТУРНІ ПРАВИЛА (незмінні):

1. Вся user-facing copy — ТІЛЬКИ в *.content.ts файлах
   Handlers не пишуть повідомлення — тільки викликають content.

2. eventRouter.ts — єдина точка оркестрації
   Жодних прямих залежностей між модулями.
   Тільки через events.

3. pnpm -C backend exec tsc --noEmit перед кожним комітом
   Це хард-гейт. Без цього не мержити.

4. Жодних inline styles в React компонентах
   Тільки Tailwind classes + CSS custom properties.

5. Жодного backdrop-filter
   Замість blur: gradient layers + shadow stacking.

6. Платформа не продається напряму
   В коді: жодних прямих посилань на оплату платформи
   без перевірки isFocusParticipant().
```

---

## CHANGELOG
| Версія | Дата | Зміни |
|--------|------|-------|
| 1.0 | 28.05.2026 | Перша версія повної інструкції оновлення |