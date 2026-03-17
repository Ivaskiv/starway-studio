# Starway Studio — Логіка додатку

> **Сканування архітектури:** `find frontend/src/backend` + `find backend/src` для кожної папки, `grep router.*` для бекенд маршрутів, `grep builder.*` для RTK-ендпоінтів, `find ...createSlice` для слайсів, `grep \"model\" schema.prisma` для Prisma, `grep bot.` для Telegram-обробників, `grep <Route` для React-роутів відобразили повну картину перед документуванням.

## 1. Архітектура системи

### Ролі та доступ

Таблиця нижче використовує роль з `backend/prisma/schema.prisma:1371-1381` та список можливостей з `backend/src/modules/auth/abilities.ts:1-34`. Frontend гарантує, що `App.tsx:69-102` рендерить тільки ті маршрути, які відповідають здатності (`ProtectedRoute.tsx:66-107`).

| Role | Що бачить | Що може робити | Джерело доступів |
| --- | --- | --- | --- |
| `SUPERADMIN` | Весь дашборд, адмінські роуті, продукти та AI площі | CRUD по продуктах, повний AI-виробник, `admin.clients.view` | `schema.prisma:1371-1381`, `auth/abilities.ts:1-34`, `App.tsx:69-102` |
| `ADMIN/EXPERT` | Дашборд інструментів експерта (AI Mentor, Wheel, Dashboard) | `mentor.core`, `ai.use`, `products.manage` (для ADMIN) | `auth/abilities.ts:1-34`, `App.tsx:69-102`, `ProtectedRoute.tsx:66-105` |
| `USER` | Основні сторінки: Wheel, Daily Cycle, Goals, Progress, Subscription | `dashboard.view`, `wheel.view`, `progress.view`, `settings.manage` | `auth/abilities.ts:1-34`, `App.tsx:69-102` |

### Потік даних

1. UI (наприклад, `useLoginMutation` у `frontend/src/features/auth/services/auth.api.ts:20-80`) диспатчить RTK Query `builder.mutation` → `api.baseQueryWithReauth` (`frontend/src/shared/services/api.ts:1-120`).

2. `baseQuery` додає `Authorization` та `x-expert-id` заголовки і пересилає запит на `/api/...` (`api.ts:1-120`).

3. Express маршурут `backend/src/modules/auth/auth.routes.ts:11-33` обробляє `/auth/login` та інші ендпоінти, делегуючи контролеру `auth.controller.ts:20-130` та сервісу `auth.service.ts:1-232`, що виконує `Prisma` операції.

4. Бекенд повертає JWT, зберігає refresh token у таблиці `RefreshToken` (fallback: in-memory) та відповідає користувачу.

5. `baseQueryWithReauth` автоматично рефрешить токен при `401` і диспатчить `setCredentials` (`auth.slice.ts:1-70`), прокачуючи `access`/`abilities` до `ProtectedRoute` (`frontend/src/features/auth/components/ProtectedRoute.tsx:66-107`).

6. `App.tsx:125-305` у `AuthRestore` відновлює сесію, викликаючи `/api/auth/me` → `auth.controller.ts:59-105`, а `useAuth` (`frontend/src/features/auth/hooks/useAuth.ts:38-210`) синхронізує тему (через `ThemeProvider.tsx:28-69`).

## 2. Автентифікація

- **Реєстрація:** `POST /api/auth/register` (`auth.routes.ts:11-13`) викликає `register` у `auth.controller.ts:12-51`, який хешує пароль, створює `User`, генерує JWT (через `generateAccessToken`/`generateRefreshToken` у `auth.service.ts:1-125`), зберігає refresh-token у таблиці `RefreshToken`, читає відношення (`subscriptions`, `progress`, `mentorConfig`) і повертає `SafeUser` з здібностями (`auth.service.ts:200-320`).

- **Логін / Refresh:** `login` (`auth.controller.ts:54-102`) перевіряє `passwordHash`, оновлює `lastLoginAt`, а `refresh` (`auth.controller.ts:105-139`) перевіряє токен, видаляє старий, створює новий. Усі токени живуть 15 хв/30 днів відповідно (`auth.service.ts:14-58`).

- **Сесія після перезавантаження:** `AuthRestore` (`App.tsx:125-230`) читає `accessToken` із `auth.slice`, викликає `/api/auth/me` (`auth.controller.ts:59-81`), і при `401` самостійно пробує `/api/auth/refresh` (`api.ts:70-120`).

- **Middleware:** `authRequired` (`backend/src/modules/auth/middleware/auth.ts:1-27`) читає `Bearer` JWT, декодує через `verifyAccessToken`, підшиває `req.user`.

- **Telegram привʼязка:** `GET /api/auth/telegram-link` (`auth.routes.ts:18-33`) повертає `getTelegramLinkUrl` з `telegram-mentor/handlers/start.js`, `social/service.ts:5-99` веріфікує код `link_...` (генерується через `/social/telegram/link`), а сам бот (`backend/src/modules/telegram/index.ts:1-200` + `wheel/telegram.ts:153-193`) оновлює `telegramUserId`/`telegramUserName` і зберігає або створює `TelegramLink` (`schema.prisma:920-930`).

## 3. Expert / Product система

- **Продукти:** експерт або адміністратор викликає `POST /api/products` (`products.routes.ts:33-39`) → `createProductHandler` (`products/controller.ts:52-118`) перевіряє owner (`ownerId`/`ownerEmail`), створює продукт (`products/service.ts`), а `promoteUserToAdminIfNeeded` гарантує, що власник має роль `ADMIN` (`auth.service.ts:240-270`). Модель `Product` (`schema.prisma:300-340`) містить `features`, `limits`, `subscriptions`, `ownerId`, `expertId`.

- **ExpertBot & AIMentor:** `ExpertBotConfig` (`schema.prisma:355-379`) зберігає `botToken`, `botUsername`. Telegram-бот (загальний `backend/src/modules/telegram/index.ts`) реєструє команди `/start`, `/aimentor`, `/morning` і делегує бізнес-логіку до `telegram-mentor/handlers/*`. AIMentor створюється через `backend/src/modules/ai-mentor/services.ts:1-230`: `ensureMentor` привʼязує `User` ↔ `AI mentor config`, `ONBOARDING_ORDER` (`services.ts:6-26`) керує мапою стадій (`types.ts:1-60`). `WeeklyReport` (`schema.prisma:1150-1185`) і `ContentVariant` (`schema.prisma:1240-1260`) зберігають згенеровані тексти для A/B тестів.

- **Funnel:** `/api/funnel` маршрути (`backend/src/modules/funnel/routes.ts:32-76`) дозволяють створювати/оновлювати/видаляти workflow; вони покладаються на `service.ts` (AI + користувацька логіка) й працюють з `Funnel`, `FunnelProduct`, `FunnelStage` з `schema.prisma:420-510`.

## 4. Підписки і платежі

- **Моделі:** `Subscription`, `ProductSubscription`, `Enrollment` (`schema.prisma:360-430`) зберігають статус (`SubscriptionStatus`), дату trial, `planCode`, `productId`, `userId`. `Enrollment` гарантує унікальність `userId+productId`.

- **Flow:** `GET /api/subscriptions/status` (`subscriptions.routes.ts:13-18`, `subscriptions/controller.ts:8-28`) повертає результат `service.getUserSubscriptionInfo`. `WayForPay` callback (`subscriptions/payments/callback.ts:1-76`) верифікує сигнатуру (`crypto.ts`), підвантажує `userId` із `clientAccountId`, логірує платіж та викликає `processPayment` (`payments/business.ts`). Після оплати `Subscription` стає `ACTIVE`, `Enrollment` `purchased: true`.

- **Тарифи:** `auth.service.ts:210-240` та `accessApi` (`frontend/src/shared/access/accessApi.ts:1-60`) нормалізують `plan` у `free | trial | paid` і передають до `ProtectedRoute` через `useAccess.ts:1-60`. `ProtectedRoute` (`ProtectedRoute.tsx`) показує екран блокування, коли `can(ability)` хибне.

- **Контроль доступу:** `useAccess` викликає `GET /api/access/me` і `GET /api/access/state` (`shared/access/accessApi.ts:1-60`, `[routes] backend/src/modules/access/routes.ts:8-11`), повертаючи `abilities`, `plan`, `system state`.

## 5. AI Mentor — діалог і сесія

- **Сесії:** `getOrCreateSession` (`services.ts:38-78`) гарантує, що є остання сесія, або створює нову; `logMessage/sendMessage` пишуть `AIMentorMessage` та `AIMentorSession`. `MentorSession` таблиця (`schema.prisma:260-320`) історизує чат.

- **State Machine:** `ONBOARDING_ORDER` + `scheduleStage` (`services.ts:6-45`) вимірюють проміжки часу для стадій `ENTRY` → `CHOICE` → `ACTIONS` → `GOAL` → `VISION` → `COMPLETED`. `AIMentorSession` оновлює `UserAIMentor.currentStep` (`services.ts:126-160`).

- **Щоденна взаємодія:** `submitDailyCycle` (`controllers.ts:43-70`) направляє `DailyCycleInput` → `daily-cycle/service.ts:1-130`, де `DailyEntry` створюється/апдейчиться, водночас `logDailyCycle` → `trial/service.ts`/`microTask`/`aiService` тригерять мікрозавдання та `calculateStreak`. `daily-cycle/scheduler.ts:1-200` запускає cron задачі (ранок 08:00, вечір 20:00, щогодини нагадування, trial mirror о 09:00, weekly analytics щонеділі, щомісяця wheel reminders). `microTask/service.ts` поки що in-memory (TODO).`

- **Контекст:** `getMentorContext` (`services.ts:69-120`) збирає останній `DailyEntry`, `Wheel`, `Streak`, `PrimaryGoal`, щоб надати `focusSphere`, `wheelScore`, `primaryGoal` на фронт.

- **Quota:** `requireGenerationQuota` (`backend/src/modules/quota/generation.middleware.ts:1-29`) використовується для `/api/mentor/morning`, `/evening`, `/chat`, `/weekly`, `/pdf-report`, `/wheel-analysis` (`ai-mentor/routes.ts:18-204`). `checkQuota` (`quota/service.ts:1-150`) тримає `GenerationQuota` (`schema.prisma:1300-1330`) з `baseLimit`, `used`, `purchased`, `generationLog`.

## 6. Telegram Bot

- **Боти:** `backend/src/modules/telegram/index.ts:1-200` реєструє основний Starway-бот; `backend/src/modules/telegram-mentor/index.ts` (команди `/start`, `/morning`, `/evening`, `/status`, `/task`) слухає додатковий набір для експертів.

- **Команди:** `/start` робить multi-step привʼязку (`telegram/index.ts:60-150`), `/aimentor` відкриває клавіатуру `mentorKeyboard`, `/menu` повертає `mainKeyboard`, `/morning`, `/evening`, `/task`, `/status` делегуються до `telegram-mentor/handlers/*` (рамки `morning/handlers.ts`, `status.ts`). `/goal`, `/streak`, `/report`, `/wheel`, `/settings` з `wheel/telegram.ts:223-320` дають доступ до веб-версії та wheel PDF (`wheel/telegram.ts:151-193`), `/callback_query` відправляє PDF за допомогою `createWheelPDF`.

- **TelegramLink:** генерація/верифікація `link_{code}` через `backend/src/modules/social/service.ts:58-99`. `bot.start` використовує `verifyTelegramLinkCode` і зберігає `TelegramLink` (`schema.prisma:900-930`).

- **Scheduler:** `daily-cycle/scheduler.ts:1-200` викликає `sendMorningQuestion`/`sendEveningQuestion` для активних чатів, `sendMorningReminders`/`Evening` з `TelegramLink` таблиці, `runWeeklyAnalysis` → бот редагує повідомлення через `bot.telegram.sendMessage`. Cron-обробники використовують `setImmediate`, `runWithConcurrency` для неблокуючих операцій.

- **Notifications:** `sendWheelNotification` (`wheel/telegram.ts:31-93`) перевіряє `telegramUserId`/`telegramUserName` і надсилає inline-повідомлення з кнопкою PDF.

## 7. Daily Cycle (щоденний цикл)

- **Модель:** `DailyEntry` (`schema.prisma:560-620`), `DailyCycleLog`, `CycleStreakMetric`, `MicroTask`, `DailyChoice`, `DailyState`, `DailyDrain` (типи у `daily-cycle/types.ts:1-70`).

- **Flow:** `GET /api/daily/today`, `POST /api/daily/entry`, `GET /api/daily/history`, `GET /api/daily/tasks`, `POST /api/daily/tasks/:id/complete` (`daily-cycle/routes.ts:1-25`). `daily-cycle/service.ts:1-150` створює/апдейть entry, зберігає `microSupport`, повертає `DailyStats`, викликає `prisma.microTask` (потрібен переклад) та `notifications/reminder.service.ts` для нагадувань.

- **Мікрозавдання:** `wheel/service.ts:200-251` створює мікрозавдання для найслабшої сфери, зберігає їх у `prisma.microTask`. Поки що `microTask/service.ts:1-80` тримає in-memory масив, тому `microTask/controller.ts:8-38` працює з ним без довготривалої персистенції — це TODO (`Section 12`).

## 8. Колесо балансу

- **Конфіг:** `WheelConfig` (`wheel/types.ts:1-80`) описує 8 сфер. `resolveWheelContext` (`wheel/controller.ts:25-66`) шукає `balanceWheelConfig` за `expertId`, fallback на будь-який дефолт.

- **Оцінка:** `createWheelEntry` (`wheel/service.ts:60-118`) перевіряє 8 сфер, викликає `canFillWheel` (`wheel/service.ts:78-140`), шукає користувача, викликає `generateWheelAnalysis` (OpenAI) → зберігає `UserBalanceEntry` з `scores` як JSON та `note` (аналітика). `addWheelMicroTasks` підтягує шаблони мікрозавдань і створює записи у `microTask`.

- **Analytics/PDF:** `getWheelAnalytics` (`wheel/service.ts:141-194`) пояснює тренд, `generateWheelPDFHandler` (`wheel/controller.ts:153-190`) збирає `scores`, `findWeakest`, `findFocus`, викликає `createWheelPDF` та повертає PDF.

- **Cooldown:** `canFillWheel` повертає `canFill`/`daysLeft` на основі останнього запису (місяць). `GET /api/wheel/cooldown` повертає його.

- **Telegram:** `/api/wheel/:id/remind-telegram` (`wheel/routes.ts:32-36`) → `sendWheelTelegramReminderHandler` надсилає PDF callback; `wheel/telegram.ts` обробляє PDF-колбеки.

## 9. AI Producer (для Expert)

- **ProducerConfig:** таблиця `ProducerConfig` (`schema.prisma:1150-1185`) зберігає бренд (niche, targetAudience, utp, tone), активні `modules`, timestamps. `WeeklyReport` (`schema.prisma:1186-1230`) тримає тижневі метрики, `ContentVariant` (`schema.prisma:1240-1260`) — A/B контент з `impressions`, `clicks`, `conversions`.

- **Endpoіnt:** `/api/producer/seo`, `/targeting`, `/funnel`, `/assistant-progress` (`producer/routes.ts:32-89`) та `/generate-mentor`, `/chat`, `/affirmation`, `/micro-task` (`producer/routes.ts:32-89`) делегуються до `producer/controller.ts:1-60`.

- **Генерація:** `producer/service.ts:1-200` будує системний промпт `PRODUCER_SYSTEM`, викликає OpenAI для `generateMentorPlan`, `producerChat`, `generateAffirmation`. `generateMentorPlan` повертає JSON з концепцією, trial schedule, daily questions, micro task system та звітами — ці результати зберігаються у `ProducerConfig`, `WeeklyReport`, `ContentVariant` і/або передаються на фронт (`frontend/src/features/assistant/pages/ProducerAssistant` якщо увімкнено `AI` доступ).

## 10. Frontend — сторінки і навігація

Таблиця показує ключові маршрути з `frontend/src/App.tsx:69-102`. `ProtectedRoute` (`ProtectedRoute.tsx:66-107`) забезпечує RBAC через `useAccess` (`useAccess.ts:1-70`). Layout (`MainLayout.tsx:1-70`) переключає `Sidebar`/`Header` лише для залогінених (або dashboard-режиму). Тема застосовується через `ThemeProvider.tsx:28-69` + `tokens.ts:82-120`.

| Path | Компонент | Роль / Ability | Що показує |
| --- | --- | --- | --- |
| `/dashboard` | `DashboardPage` | `dashboard.view` | Головна аналітика, швидкий доступ до wheel/cycle/stat |
| `/dashboard/wheel` | `WheelPage` | `wheel.view` | Колесо, аналітика, Телеграм-кнопки |
| `/dashboard/cycle` | `DailyCyclePage` | `dashboard.view` | Щоденні записи, мікрозавдання |
| `/dashboard/ai-mentor` | `AIMentorPage` | `mentor.core` | Чат із AI, trial/paid сесії |
| `/dashboard/ai-generator` | `AIGeneratorPage` | `ai.basic` | Формування рекламного контенту |
| `/dashboard/settings` | `SettingsPage` | `settings.manage` | AccentPicker, Tokens/Components, Telegram connect |
| `/dashboard/subscription` | `SubscriptionPage` | `dashboard.view` | Поточний план, WayForPay CTA |
| `/dashboard/products` | `ProductsPage` | `dashboard.view` | Список продуктів (доступні та закриті картки) |

## 11. Критичні залежності між модулями

1. **AI Mentor ↔ GenerationQuota:** `ai-mentor/routes.ts:36-204` захищені `requireGenerationQuota` (`quota/generation.middleware.ts:1-29`), тому без `GenerationQuota` (`quota/service.ts:1-150`) або WayForPay (який інкрементує `purchased`) жодна з AI-сесій не буде виконана.

2. **TelegramLink ↔ User:** `/start` (`telegram/index.ts:60-150`) та `/auth/telegram-link` (`auth.routes.ts:18-33`) вимагають, щоб `User` мав `telegramUserId`/`telegramUserName` (таблиця `TelegramLink`, `schema.prisma:900-930`); інакше бот không знає, кому надсилати нагадування.

3. **Daily Cycle ↔ MicroTask System:** `daily-cycle/service.ts:1-150` викликає `prisma.microTask` і `logDailyCycle` (з `microTask` та `notifications`); якщо `microTask/service.ts:1-80` залишиться in-memory stubом, історія виконання та TTL можуть загубитися (тому `Section 12` підкреслює це).

4. **Wheel ↔ MicroTask + Telegram:** `wheel/service.ts:60-140` викликає `addWheelMicroTasks` (`service.ts:200-251`) та `sendWheelNotification` (`wheel/telegram.ts:31-93`); якщо `TelegramLink` відсутній або мікрозавдання не зберігаються, користувач не отримає автоматичні таски.

5. **Products ↔ Expert Bots:** `products/controller.ts:23-118` викликає `promoteUserToAdminIfNeeded` (`auth.service.ts:240-270`) і може створити `ExpertBotConfig` (`schema.prisma:355-379`), без якого Telegram-бот (через `telegram-mentor`) не може опублікувати `/aimentor`.

6. **Theme synchrony:** `useAuth.ts:38-160` викликає `theme.setAccent`/`setMode` (`ThemeProvider.tsx:28-69`) та `tokens.ts:82-120`, тому зміна `settings.accentColor` у `auth.controller.ts:updateSettings` (`auth.controller.ts:130-145`) повинна бути синхронізована зі frontend.

## 12. Що НЕ реалізовано / TODO

Команда `grep TODO|FIXME|HACK|XXX|не реалізован|заглушка ...` повернула:

- `frontend/src/features/user/components/ProfileHistory.tsx` і `ProfileBadges.tsx` (`TODO: підключити API`) — tokenization/прогрес ще нерозгорнуто.

- `frontend/src/features/daily-cycle/questions/hooks/useQuestionsScheduler.ts:63-66` — заглушки для створення питань, PDF.

- `frontend/src/features/zoom/components/RequestsCollector.tsx:32` — TODO підключити API.

- `backend/src/modules/trial/service.ts:118` — TODO замінити на реальний AI-запит.

- `backend/src/modules/mini-courses/servise.ts:217` — рекомендації користувацької поведінки.

- `backend/src/modules/funnel/service.ts:230` — AI-генерація флоу ще не імплементована.

- `backend/src/modules/microTask/service.ts:1-80` — in-memory заглушка (TODO перехід на Prisma).

- `backend/src/db/generated/prisma/runtime/client.d.ts` містить TODO-посилання в документації (`lines 1797`, `2233`, `2235`).

⚠️ Якщо щось незрозуміло — вказуйте конкретне місце та я уточню. 🧭
