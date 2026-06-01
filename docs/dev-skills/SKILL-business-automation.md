# SKILL: ABSystem — Повна AI-Автоматизація Бізнесу
**Version:** 1.0 | **Status:** 🧪 Testing  
**Stack:** Node.js · React · TypeScript · Tailwind · SCSS · Prisma · Neon PostgreSQL · Render · Vercel · Telegram

---

## КОНЦЕПЦІЯ: ЩО РОБИТЬ НАДЯ — ЩО РОБИТЬ СИСТЕМА

```
НАДЯ РОБИТЬ ТІЛЬКИ:               СИСТЕМА РОБИТЬ ВСЕ ІНШЕ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✋ Проводить живі Zoom             🤖 Продає (AI Seller)
✋ Відповідає на особисті дзвінки  🤖 Генерує контент
✋ Керує з Telegram-бота           🤖 Аналізує поведінку
✋ Приймає стратегічні рішення     🤖 Веде CRM
                                   🤖 Робить розсилки
                                   🤖 Збирає аналітику
                                   🤖 Будує прогнози
                                   🤖 Публікує анонси
                                   🤖 Обробляє платежі
                                   🤖 Онбордить клієнтів
```

---

## АРХІТЕКТУРА СИСТЕМИ

```
                    НАДЯ
                      │
            ┌─────────┴─────────┐
            │                   │
      TELEGRAM BOT           WEB UI
      (керування)          (аналітика)
      @coach_bot            /dashboard
            │                   │
            └─────────┬─────────┘
                       │
              CENTRAL ORCHESTRATOR
              (eventRouter.ts)
                       │
    ┌──────────────────┼──────────────────┐
    │         │        │        │         │
  AI-агенти  CRM    Zoom    Content   Analytics
  (продажі)        Calendar  Engine    Engine
    │         │        │        │         │
    └──────────────────┼──────────────────┘
                       │
              КЛІЄНТИ (MiniApp + Bot)
```

---

## БЛОК 1: AI-АГЕНТИ (хто що робить)

### АГЕНТ 1: AI Seller (продажі 24/7)
```
Тригери:
- Новий результат тесту → персоналізований оффер
- Користувач відкрив ФОКУС-сторінку → follow-up
- Закінчується підписка → retention оффер
- 3 дні без активності → comeback sequence

Що робить:
- Аналізує точку зупинки (СТАН/ЦІЛЬ/ВИБІР/РІШЕННЯ/ДІЯ)
- Підбирає правильний продукт з драбини
- Надсилає персоналізовану серію повідомлень
- Обробляє заперечення через FAQ-бот
- Передає лід Наді тільки якщо: запит на персональну програму
  або питання яке бот не може вирішити

Файли: ai-seller/seller.service.ts, ai-seller/scripts/
```

### АГЕНТ 2: AI Content Generator
```
Тригери:
- /generate команда від Наді в Telegram
- Завершена Zoom-сесія → автоматичний контент-пакет
- Розклад публікацій (cron)

Що робить:
- Транскрибує Zoom через Whisper
- Генерує пост для Telegram-каналу
- Генерує 3-7 варіантів рілсів (повне ТЗ)
- Публікує в канал за розкладом
- Формує контент-план на тиждень

Файли: ai-content/content.service.ts, ai-content/scheduler.ts
```

### АГЕНТ 3: AI Mentor (для клієнтів)
```
Тригери:
- /start в боті
- `TODO: daily cycle trigger (див. backend/src/modules/telegram-mentor/content/*.content.ts)`
- Питання в чат

Що робить:
- `TODO: daily cycle question set (див. docs/platform/telegram-architecture.md)`
- Аналізує відповіді через Claude API
- Зберігає поведінковий контекст
- Генерує тижневий AI-звіт
- Виявляє повторювані точки зупинки

Файли: telegram-mentor/index.ts (вже є)
```

### АГЕНТ 4: AI Analyst
```
Тригери:
- Щотижня (cron Sunday 20:00)
- Запит від Наді: /stats, /forecast

Що робить:
- Збирає метрики воронки (тест→ФОКУС→платформа)
- Аналізує конверсію по сегментах
- Виявляє churn-ризики (хто може відписатись)
- Прогнозує revenue на місяць
- Генерує звіт для Наді в Telegram

Файли: analytics/analytics.service.ts, analytics/report.ts
```

### АГЕНТ 5: AI Announcer
```
Тригери:
- Нова Zoom-сесія запланована → анонс
- За 24h до Zoom → нагадування
- Після Zoom → follow-up + запис (якщо є)

Що робить:
- Генерує анонс в стилі бренду
- Публікує в Telegram-канал
- Надсилає нагадування учасникам
- Створює пост-Zoom контент

Файли: zoom/zoom.notifications.ts (вже є, розширити)
```

---

## БЛОК 2: CRM — КЛІЄНТСЬКА БАЗА

### Моделі даних (Prisma):
```prisma
model CRMContact {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  
  // Воронка
  funnelStage   FunnelStage  // TEST → FOCUS → PLATFORM → VIP
  entryPoint    String       // звідки прийшов
  testResult    String?      // СТАН/ЦІЛЬ/ВИБІР/РІШЕННЯ/ДІЯ
  
  // Активність
  lastActive    DateTime
  totalSessions Int      @default(0)
  zoomAttended  Int      @default(0)
  
  // Фінанси
  ltv           Float    @default(0)
  lastPayment   DateTime?
  
  // AI-теги
  churnRisk     ChurnRisk  // LOW/MEDIUM/HIGH
  segment       String?    // з матриці сегментів
  notes         String?    // нотатки Наді (через Telegram)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum FunnelStage {
  LEAD        // пройшов тест
  FOCUS       // учасник ФОКУСУ
  PLATFORM    // ABSystem AI
  VIP         // персональна програма
  CHURNED     // відписався
}

enum ChurnRisk {
  LOW
  MEDIUM
  HIGH
}
```

### CRM команди для Наді (з Telegram):
```
/crm stats          → кількість по стадіях воронки
/crm churn          → хто в зоні ризику сьогодні
/crm contact @user  → картка конкретного клієнта
/crm note @user ... → додати нотатку до клієнта
/crm tag @user VIP  → змінити сегмент
```

---

## БЛОК 3: ZOOM-ЕКОСИСТЕМА (синхронізована)

### Синхронізація трьох платформ:
```
Надя в Telegram:        Надя в Web UI:         Клієнт в MiniApp:
/zoom add ...    ──→   Calendar оновився ←──  Бачить нову сесію
/zoom list             Stats оновились        Може зареєструватись
/zoom cancel ...──→   Клієнти сповіщені ←──  Отримав нагадування
```

### Автоматичний цикл сесії:
```
1. Надя додає сесію (Telegram або Web)
   ↓
2. Система автоматично:
   - Генерує анонс → публікує в канал
   - Надсилає сповіщення підписникам
   - Додає в MiniApp календар
   ↓
3. За 24h → нагадування всім учасникам (з посиланням)
4. За 2h → нагадування (з Zoom-лінком)
   ↓
5. Після сесії Надя пише /zoom report [id] [нотатки голосом]
   ↓
6. Система автоматично:
   - Транскрибує нотатки
   - Генерує пост для каналу "зі щотижневої практики"
   - Оновлює CRM (хто був, хто не прийшов)
   - Запускає follow-up серію для тих хто пропустив
```

---

## БЛОК 4: АНАЛІТИКА І ПРОГНОЗИ

### Дашборд метрик (Web UI):
```
ВОРОНКА:
Тест пройшли:    [N] цього тижня  [+X% до минулого]
→ ФОКУС:         [N] конверсія [X%]
→ Платформа:     [N] конверсія [X%]
→ VIP:           [N] конверсія [X%]

REVENUE:
Цього місяця:    [X грн]
Прогноз:         [X грн]  (на основі renewal + pipeline)
LTV середній:    [X грн]

CHURN RISK:
Висока небезпека: [N] клієнтів → [дивитись список]
Середня:          [N] клієнтів

КОНТЕНТ:
Охоплення каналу: [N] переглядів цього тижня
Переходи по CTA:  [N] → тест [X%]
```

### AI-прогнозування:
```typescript
// analytics/forecast.service.ts

interface MonthForecast {
  expectedRevenue: number;      // на основі renewal rate
  expectedChurn: number;        // кількість клієнтів
  expectedNewFocus: number;     // прогноз нових з воронки
  riskAlerts: RiskAlert[];      // що потребує уваги Наді
}

// Алгоритм:
// 1. Renewal rate останніх 3 місяців
// 2. Pipeline (люди після тесту без покупки)
// 3. Churn signals (неактивність > 7 днів)
// 4. Сезонність (якщо є дані)
```

---

## БЛОК 5: TELEGRAM-БОТ НАДІ (керування бізнесом)

### Що можна робити ТІЛЬКИ з Telegram (без UI):

```
━━━ КОНТЕНТ ━━━
/generate [тема або голосове]  → пост/рілс/серія
/from-zoom [голосове нотатки]  → контент-пакет
/publish [текст]               → публікувати в канал зараз
/schedule [текст] [час]        → запланувати публікацію

━━━ ZOOM ━━━
/zoom add [дата] [час] [тема] [лінк]  → нова сесія
/zoom list                             → найближчі сесії
/zoom cancel [id]                      → скасувати + сповістити
/zoom report [id] [голосове]           → звіт після сесії

━━━ CRM ━━━
/crm stats                    → воронка одним повідомленням
/crm churn                    → список ризиків
/crm note @user [текст]       → нотатка до клієнта

━━━ ФІНАНСИ ━━━
/revenue                      → дохід цього місяця
/forecast                     → прогноз на наступний місяць

━━━ СИСТЕМА ━━━
/status                       → стан всіх агентів
/pause [агент]                → призупинити агента
/resume [агент]               → відновити агента
/broadcast [текст]            → розсилка всім активним клієнтам
```

### Що потребує Web UI (складне):
```
✗ Редагування тарифів і цін
✗ Налаштування воронки і тригерів
✗ Детальна аналітика з графіками
✗ Редагування скриптів AI-агентів
✗ Управління правами доступу
✗ Bulk-операції з клієнтами
✗ Налаштування Zoom-інтеграції
✗ Перегляд і редагування контент-плану
```

---

## БЛОК 6: MINIAPP + WEB + BOT — СИНХРОНІЗАЦІЯ

### Real-time синхронізація (WebSocket або SSE):
```typescript
// Коли будь-що змінюється в системі:

// 1. Надя додає Zoom через бот
//    → eventRouter.emit('zoom.created', session)
//    → Web UI оновлює календар (RTK invalidation)
//    → MiniApp клієнта показує нову сесію
//    → Telegram канал отримує анонс

// 2. Клієнт реєструється на Zoom через MiniApp
//    → eventRouter.emit('zoom.registered', {userId, sessionId})
//    → Web CRM оновлює статус клієнта
//    → Надя отримує сповіщення в бот (якщо VIP клієнт)

// 3. Клієнт оплачує через MiniApp
//    → WayForPay callback → eventRouter.emit('payment.success')
//    → Активується підписка
//    → Клієнт отримує доступ + привітальна серія
//    → CRM оновлюється
//    → Надя отримує сповіщення /revenue
```

### Правило синхронізації:
```
ЄДИНЕ ДЖЕРЕЛО ПРАВДИ: PostgreSQL (Neon)
Telegram бот    → читає/пише через API
Web UI          → читає/пише через API  
MiniApp         → читає/пише через API
Всі три завжди синхронні — немає "свого стану"
```

---

## БЛОК 7: АВТОМАТИЧНІ ВОРОНКИ

### Воронка 1: Після тесту
```
Тест завершено
↓ одразу
Результат + перше повідомлення (AI Seller)
↓ +1 година
Серія День 1 (під результат тесту)
↓ +24 години
Серія День 2
↓ +48 годин
Серія День 3 + CTA ФОКУС
↓ +72 години (якщо не купив)
Дожимне повідомлення
↓ +7 днів (якщо не купив)
"Холодне" нагадування раз на 2 тижні
```

### Воронка 2: Онбординг ФОКУС
```
Оплата підтверджена
↓ одразу
Привітання + доступ до каналу
↓ +1 година
Що чекати від першої практики
↓ +24 години (якщо не зайшов в канал)
Нагадування про доступ
↓ За день до Zoom
Персональне нагадування + тема практики
↓ Після Zoom
Follow-up + завдання тижня
↓ Після 2-ї практики
М'яка презентація ABSystem AI
```

### Воронка 3: Retention (утримання)
```
7 днів без активності
↓
Comeback повідомлення (тип 1)
↓ +3 дні без реакції
Comeback повідомлення (тип 2)
↓ +7 днів без реакції
Особисте повідомлення від Наді (автоматичне але в її стилі)
↓ +14 днів без реакції
Пауза. Підписка закінчується → окрема серія
```

### Воронка 4: Upgrade ФОКУС → Платформа
```
Після 2-ї практики: soft presentation (автоматично)
Після 4-ї практики: конкретний оффер з доплатою
Якщо не відреагував: нагадування через тиждень
```

---

## БЛОК 8: ТЕХНІЧНИЙ ПЛАН ВПРОВАДЖЕННЯ

### Фаза 1 — Фундамент (тиждень 1-2):
```
✓ Вже є: Central Orchestrator (eventRouter.ts)
✓ Вже є: Zoom модуль, Daily Cycle, Wheel
✓ Вже є: Telegram бот базовий

☐ Додати: CRMContact модель в Prisma
☐ Додати: FunnelStage tracking в eventRouter
☐ Додати: /stats, /revenue, /churn команди в бот
```

### Фаза 2 — AI-агенти (тиждень 3-4):
```
☐ AI Seller: seller.service.ts + тригери з eventRouter
☐ AI Content: інтеграція Whisper + Claude API
☐ AI Announcer: розширити zoom.notifications.ts
☐ Автоматичні воронки: funnel.scheduler.ts
```

### Фаза 3 — Аналітика (тиждень 5-6):
```
☐ analytics.service.ts: збір метрик
☐ forecast.service.ts: прогнозування revenue
☐ Дашборд в Web UI: графіки + воронка
☐ Тижневий AI-звіт для Наді
```

### Фаза 4 — Синхронізація (тиждень 7-8):
```
☐ Real-time events (WebSocket або SSE)
☐ MiniApp ↔ Web ↔ Bot синхронізація
☐ Тестування повного циклу
☐ Performance оптимізація
```

---

## БЛОК 9: КОМАНДИ ДЛЯ CODEX

### STEP A — CRM модель:
```
Додай в schema.prisma модель CRMContact з полями:
userId (FK), funnelStage (enum: LEAD/FOCUS/PLATFORM/VIP/CHURNED),
testResult (String nullable), lastActive (DateTime),
totalSessions (Int), zoomAttended (Int), ltv (Float),
churnRisk (enum: LOW/MEDIUM/HIGH), segment (String nullable),
notes (String nullable).

Додай enum FunnelStage і ChurnRisk.
Створи crm.service.ts з методами:
upsertContact(), updateFunnelStage(), updateChurnRisk(),
getChurnRisks(), getFunnelStats(), addNote().
```

### STEP B — AI Seller:
```
Створи backend/src/modules/ai-seller/seller.service.ts.

Тригери (підписатись на eventRouter):
- test.completed → sendPersonalizedOffer(userId, testResult)
- subscription.expiring → sendRetentionOffer(userId)
- user.inactive_3days → sendComebackSequence(userId)

sendPersonalizedOffer():
1. Отримати testResult з CRMContact
2. Вибрати скрипт з seller.scripts.ts по результату
3. Надіслати через Telegram (не email)
4. Записати в CRMContact lastContactedAt

seller.scripts.ts: об'єкт з ключами СТАН/ЦІЛЬ/ВИБІР/РІШЕННЯ/ДІЯ,
кожен містить messages[] з затримками.
```

### STEP C — Команди Наді в боті:
```
Додай в telegram-mentor/index.ts нові команди:

/generate → викликає ai-content/content.service.generateFromText()
/zoom report <id> → приймає голосове або текст, 
  транскрибує через Whisper, 
  генерує пост через ai-content,
  зберігає в ZoomSession.postSessionReport

/crm stats → crm.service.getFunnelStats() → форматований звіт
/revenue → analytics.service.getMonthRevenue()
/churn → crm.service.getChurnRisks() → список з іменами

Всі відповіді: максимум 5 рядків, без технічних деталей.
```

### STEP D — Analytics service:
```
Створи backend/src/modules/analytics/analytics.service.ts.

getMonthRevenue(): 
  SELECT SUM(amount) FROM PaymentLog WHERE month = current

getFunnelConversion():
  Для кожного переходу (LEAD→FOCUS, FOCUS→PLATFORM тощо)
  повернути count і conversion rate

getChurnRisks():
  Users WHERE lastActive < now()-7days AND subscription.status=active
  Повернути userId, name, daysSinceActive, funnelStage

getWeeklyReport():
  Агрегат всіх метрик за тиждень
  Форматований текст для Telegram
  Надсилати Наді щонеділі о 20:00
```

---

## ОБМЕЖЕННЯ І ПРАВИЛА СИСТЕМИ

```
НАДЯ НЕ ОТРИМУЄ:
- Технічні помилки і stack traces
- Сирі дані з БД
- Більше 5 рядків на одне сповіщення
- Сповіщення між 23:00 і 08:00

СИСТЕМА НІКОЛИ:
- Не обіцяє клієнту те чого немає в продукті
- Не використовує FOMO і guilt в автоматичних повідомленнях
- Не пише від імені Наді без її відома (тільки від системи)
- Не надсилає більше 1 повідомлення на добу клієнту (крім активного діалогу)

НАДЯ ЗАВЖДИ ПІДТВЕРДЖУЄ:
- Розсилку більше ніж 100 людям (/broadcast вимагає /confirm)
- Зміну ціни продукту
- Видалення клієнта з бази
- Скасування вже оплаченої сесії
```

---

## CHANGELOG
| Версія | Дата | Зміни |
|--------|------|-------|
| 1.0 | 28.05.2026 | Повна архітектура AI-автоматизації |
