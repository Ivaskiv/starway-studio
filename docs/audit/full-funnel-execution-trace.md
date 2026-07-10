# Full Funnel Execution Trace

Date: 2026-07-09
Project: `starway-studio`
Mode: static forensic audit, no code changes

## Scope

This trace follows the real user funnel from Telegram deeplink entry through:

`Instagram -> Telegram Bot -> /start -> test -> answer processing -> result -> content -> dozhims -> payment -> activation -> menu -> scheduler -> retention`

Important repo reality:

- The visible runtime entry for the bot app at [apps/bot/src/index.ts](/Users/viravira/Documents/starway-studio/apps/bot/src/index.ts:1) is disabled.
- The active Telegram runtime in this repository is the backend runtime rooted in [backend/src/modules/telegram-mentor/index.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/index.ts:1).
- The trace below is built from active backend code, not from legacy architecture docs alone.

## Top-Level Call Graph

```text
Instagram CTA / deep link
  -> https://t.me/<bot>?start=...
  -> Telegraf runtime
  -> backend/src/modules/telegram-mentor/index.ts
  -> bot.command('start', handleStart)
  -> handlers/start.ts
  -> resolveOrCreateUser + upsertTelegramBinding + user snapshot
  -> welcome/test state message
  -> callback_query
  -> services/telegram-event-bus.service.ts
  -> products/ab-system/telegram/abTest.service.ts
  -> abTest.handlers.core.ts / abTest.handlers.ui.ts / abTest.views.ts
  -> abTest.progress.ts
  -> prisma.user.settings.ui[AB_TEST_UI_SETTINGS_KEY]
  -> result delivery
  -> open_focus_payment
  -> abTest.flows.ts
  -> buildEcosystemPaymentCheckoutSession(...)
  -> WayForPay checkout
  -> payments callback.processing.ts + callback.handler.ts
  -> paymentLog / productSubscription / user.focusPaid / AB-test markers
  -> callback.notifications.ts Block 12 welcome
  -> sendStateMenu / product-room / lifecycle / room launch
  -> scheduler/index.ts + NotificationService + NotificationJob
  -> retention / reminder / winback / zoom reminder jobs
```

## Webhook Route Verification

Verify-first result from the current repository:

- Mounted generic billing webhook:
  - `POST /api/billing/webhook`
  - [backend/src/modules/billing/billing.module.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/billing/billing.module.ts:10)
  - handler: [backend/src/modules/billing/webhook.handler.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/billing/webhook.handler.ts:11)
- Mounted WayForPay subscription/focus callback:
  - `POST /api/subscriptions/payments/wayforpay/callback`
  - [backend/src/modules/subscriptions/routes.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/routes.ts:22)
  - handler: [backend/src/modules/subscriptions/payments/callback.handler.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.handler.ts:139)
- Dead product wrapper:
  - [backend/src/products/focus/payments/webhook.ts](/Users/viravira/Documents/starway-studio/backend/src/products/focus/payments/webhook.ts:1)
  - no runtime imports found during this audit
  - not mounted directly in `app.ts`

Trace correction:

- The previously referenced `backend/src/products/focus/payments/webhook.ts` is not part of the live route.
- For the Focus AB-test payment funnel traced in this document, the live webhook path is `POST /api/subscriptions/payments/wayforpay/callback`.
- `POST /api/billing/webhook` is mounted and live, but it belongs to the separate billing-plan flow implemented in `modules/billing/*`, not to the AB-test Focus payment funnel.

## Step-By-Step Table

| Step | What happened | Handler / function | Prisma | Telegram API | Next hop |
|---|---|---|---|---|---|
| 1 | User opens Telegram deeplink from Instagram | `getStartPayload()` / `parseFirstTouchPayload()` in [backend/src/modules/telegram-mentor/handlers/start.shared.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.shared.ts:52) | None | None | `handleStart(ctx)` |
| 2 | `/start` enters Telegram runtime | `bot.command('start', handleStart)` in [backend/src/modules/telegram-mentor/index.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/index.ts:498) | None directly at binding point | None | `handlers/start.ts` |
| 3 | User is resolved or created | `handleStart()` in [backend/src/modules/telegram-mentor/handlers/start.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.ts:283) | `resolveOrCreateUser`, `upsertTelegramBinding`, `loadUserSnapshot`, `prisma.user.update(lifecycleState)` | `ctx.reply`, fallback `ctx.telegram.sendMessage` | Lifecycle branch |
| 4 | New user gets welcome / test start state | `handleStart()` lifecycle switch | `prisma.user.update({ lifecycleState: 'TEST_NOT_STARTED' })` for new user branch | `ctx.reply` / `sendMessage` | User presses `ab_test:start` |
| 5 | Existing user gets resume/result/payment-aware start screen | `handleStart()` lifecycle switch | `prisma.user.findUniqueOrThrow` snapshot already loaded | `ctx.reply` / `sendMessage` with callback buttons | `ab_test:resume`, `ab_test:show_result`, `open_focus_payment`, etc. |
| 6 | Any callback enters shared callback router | `bot.on('callback_query', ...)` in [backend/src/modules/telegram-mentor/index.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/index.ts:851) | Optional CTA tracking later | `answerCbQuery` / `planAck` | `dispatchTelegramCallbackEvent(ctx, action)` |
| 7 | Event bus classifies callback | `dispatchTelegramCallbackEvent()` in [backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts:488) | No primary Prisma mutation on AB-test fast path | Ack already handled, later may `planMessage` | `handleAbTestCallback(ctx, action)` |
| 8 | Test start callback is accepted | `handleAbTestCallback()` in [backend/src/products/ab-system/telegram/abTest.service.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.service.ts:234) | `loadAbTestProgress()` | `answerCbQuery` in subpaths | `handleAbTestStart()` / `startAbTestFlow()` |
| 9 | AB-test progress is initialized | `startAbTestFlow()` in [backend/src/products/ab-system/telegram/abTest.service.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.service.ts:87) | `prisma.user.findUnique(settings)`, `prisma.user.update(settings.ui)` | `sendQuestionDirect()` -> message send | `ab_test_answer:q1:*` |
| 10 | Question answer callback is processed | `handleAbTestAnswer()` in [backend/src/products/ab-system/telegram/abTest.handlers.core.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.core.ts:53) | `loadAbTestProgress`, `saveAbTestProgress` | `editMessageReplyMarkup`, `sendQuestionDirect` | Next `ab_test_answer:qN:*` |
| 11 | In-progress reminder jobs are created | `scheduleFollowups()` in [backend/src/products/ab-system/telegram/abTest.scheduler.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.scheduler.ts:15) | `notificationService.schedule()` -> `NotificationJob` enqueue | None immediate | Later scheduler / queue processing |
| 12 | Final answer q8 completes the test | `handleAbTestAnswer()` complete branch | `saveAbTestProgress()` with `status=completed`, `stage=S3_TEST_RESULT`, `result_key`, `email_stage=pending` | No result yet; next render call sends gate | `renderAbTestEmailGate()` |
| 13 | Email gate is shown before result | `renderAbTestEmailGate()` in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1236) | `prisma.user.findUnique({ email })` | `ctx.telegram.sendMessage` via view helpers | `confirm_profile_email_for_result` / `change_email_for_result` / `skip_email_before_result` |
| 14 | User confirms, skips, or types email | `handleConfirmEmail()`, `handleSkipEmail()`, `handleAbTestEmailCaptureText()` | `prisma.user.findUnique(email)`, optional `prisma.user.update(email)`, `saveAbTestProgress` | Text prompt replies / callback ack | `renderAbTestPostEmailSubmitSequence()` |
| 15 | Result delivery is unlocked | `renderAbTestPostEmailSubmitSequence()` in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1146) | `prisma.user.findUnique(firstName)`, `loadAbTestProgress`, `saveAbTestProgress(result_opened_at)` | Typing indicators via `sendChatAction` | `dispatchAbTestResultSequence()` |
| 16 | Result intro is sent | `dispatchAbTestResultSequence()` in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:759) | No new Prisma write inside sender | `sendTelegramContentChunk`, `sendMessage`, possible `sendVoice` | `show_inside_<RESULT>` |
| 17 | “Show inside” content is sent | `dispatchAbTestPracticeSequence()` in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:856) | None directly | Multiple `sendTelegramContentChunk`, final `sendMessage` with CTA | `open_focus_payment` |
| 18 | User opens Focus payment | `handleFocusPaymentAction()` in [backend/src/products/ab-system/telegram/abTest.flows.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.flows.ts:465) | Active subscription check, `saveAbTestProgress(focus_opened_at)`, payment-open analytics | `sendTelegramContentChunk` with checkout buttons | WayForPay hosted checkout |
| 19 | Mounted Focus/WayForPay webhook receives callback | `wayForPayCallback(req, res)` in [backend/src/modules/subscriptions/payments/callback.handler.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.handler.ts:139) on route `POST /api/subscriptions/payments/wayforpay/callback` | None at route entry; payload normalization first | HTTP `200 OK` response to WayForPay | `processPaymentWebhook()` + payment transaction |
| 20 | WayForPay webhook resolves payment target | `processPaymentWebhook()` in [backend/src/modules/subscriptions/payments/callback.processing.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.processing.ts:246) | `db.user.findUnique`, `db.paymentLog.findUnique` | None | transaction branch inside `wayForPayCallback` |
| 21 | Successful payment updates DB state | payment success transaction in [backend/src/modules/subscriptions/payments/callback.handler.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.handler.ts:527) | `markCheckoutSessionCompleted`, `tx.productSubscription.updateMany`, `tx.user.update(focusPaid)`, `markAbTestPaymentSuccess`, `NotificationJob` cleanup | None inside transaction | Post-payment activation side effects |
| 22 | Focus product is activated | `FocusWayForPayProvider.onPaymentSuccess()` in [backend/src/products/focus/payments/wayforpay.ts](/Users/viravira/Documents/starway-studio/backend/src/products/focus/payments/wayforpay.ts:31) | `prisma.user.update({ currentState: 'ACTIVE', funnelStage: 'PAID' })` | None | Lifecycle sync / room readiness |
| 23 | Paid welcome Block 12 is sent | `sendAbTestBlock12Welcome()` in [backend/src/modules/subscriptions/payments/callback.notifications.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.notifications.ts:80) | `prisma.user.findUnique(telegramChatId)`, `prisma.productSubscription.findFirst` | `bot.telegram.sendMessage` with invite + web app button | Paid user enters channel / Zoom / menu |
| 24 | Paid menu is rendered on re-entry | `sendStateMenu()` in [backend/src/modules/telegram-mentor/handlers/start.menu.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.menu.ts:148) | Reads through decision/lifecycle/product summary stack | `planMessage` / decision renderer | `open_platform`, `open_focus_portal`, `open_course`, `open_practices` |
| 25 | Room/navigation actions continue product usage | `handleRoomAction()` in [backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts:220) | Optional analytics/event writes | `planMessage`, status message replies | Ongoing active product flow |
| 26 | Scheduled followups and retention engine stay active | `safeSchedule(...)` registry in [backend/src/services/scheduler/index.ts](/Users/viravira/Documents/starway-studio/backend/src/services/scheduler/index.ts:331) and `NotificationService.schedule()` in [backend/src/services/notifications/NotificationService.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/NotificationService.ts:735) | `NotificationJob` create/find/update, broader retention queries | Deferred Telegram delivery via notification workers | Result followups, Zoom reminders, expiry, winback, reactivation |

## Runtime Entry

### Step 1. User lands from Instagram into Telegram

- Trigger: `https://t.me/<bot>?start=...`
- Entry parser: [backend/src/modules/telegram-mentor/handlers/start.shared.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.shared.ts:52)
- Functions:
  - `getStartPayload(ctx)`
  - `parseFirstTouchPayload(payload)`
- Payload shape:
  - raw `/start foo.bar.baz`
  - parsed into `product`, `source`, `campaign`
- State impact:
  - first-touch attribution is written during user creation in `handleStart`
- No Prisma query yet in the parser itself
- Next hop: `handleStart(ctx)`

### Step 2. Telegram `/start` handler fires

- Telegraf binding: [backend/src/modules/telegram-mentor/index.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/index.ts:498)
- Handler: [backend/src/modules/telegram-mentor/handlers/start.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.ts:283)
- Guards:
  - `processedStartUpdateIds`
  - `activeStartProcessing`
- Core helpers/imports:
  - `resolveLinkedUserIdFromContext`
  - `resolveOrCreateUser`
  - `upsertTelegramBinding`
  - `generateMagicLink`
  - `deliver`
- Prisma writes/reads in this step:
  - `resolveOrCreateUser(...)` creates or resolves `User`
  - `upsertTelegramBinding(...)` creates/updates `TelegramLink`
  - `loadUserSnapshot(...)` -> `prisma.user.findUniqueOrThrow`
  - `setLifecycleState(...)` -> `prisma.user.update`
- User fields touched:
  - `telegramUserId`
  - `telegramChatId`
  - `telegramUserName`
  - `firstName`
  - `firstTouchProduct`
  - `firstTouchSource`
  - `firstTouchCampaign`
  - `lifecycleState`
- Telegram API:
  - `ctx.reply(...)`
  - fallback `ctx.telegram.sendMessage(...)`
- Next hop:
  - branch by `user.lifecycleState`

### Step 3. `/start` branches by lifecycle

- Branch logic: [backend/src/modules/telegram-mentor/handlers/start.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.ts:359)
- Active branches:
  - `NEW_USER` -> `welcomeMessage()`, set `TEST_NOT_STARTED`
  - `TEST_NOT_STARTED` -> `testNotStartedMessage()`
  - `TEST_IN_PROGRESS` -> `testInProgressMessage()` or resume/restart choice
  - `TEST_DONE` -> `ab_test:show_result` or `ab_test:restart`
  - `OFFER_SHOWN` -> `offerShownMessage()`
  - `FOCUS_PAID` -> `focusPaidMessage()`
  - `ZOOM_MEMBER` -> `zoomMemberMessage()`
  - `POST_ZOOM_1 | UPSELL | EXPIRED` -> `aiMentorMenuMessage()`
- Telegram messages sent:
  - welcome card
  - resume/restart card
  - result/open card
- Next hop:
  - user presses callback such as `ab_test:start`, `ab_test:resume`, `ab_test:show_result`, `open_focus_payment`

## Callback Runtime

### Step 4. Any callback enters the central callback handler

- Telegraf binding: [backend/src/modules/telegram-mentor/index.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/index.ts:851)
- Immediate callback ack behavior:
  - `open_focus_payment*` gets direct `answerCbQuery`
  - everything else goes through `planAck(...)`
- Dispatch function: [backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts:488)
- Helpers/imports:
  - `resolveTelegramCallbackEvent`
  - `buildRuntimeTelemetry`
  - `withRuntimeAdvisoryLock`
  - `handleAbTestCallback`
  - `handleZoomCallback`
  - `sendStateMenu`
- State/analytics:
  - CTA interactions may be recorded by `recordTelegramCtaInteraction(...)`
- Next hop:
  - AB-test callbacks are attempted first via `handleAbTestCallback(ctx, action)`

## Test Funnel

### Step 5. User presses `ab_test:start`

- Main dispatcher: [backend/src/products/ab-system/telegram/abTest.service.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.service.ts:234)
- UI handler: [backend/src/products/ab-system/telegram/abTest.handlers.ui.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.ui.ts:59)
- Flow bootstrapper: `startAbTestFlow(...)` in [backend/src/products/ab-system/telegram/abTest.service.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.service.ts:87)
- Persistence layer: [backend/src/products/ab-system/telegram/abTest.progress.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.progress.ts:147)
- Prisma queries:
  - `loadAbTestProgress()` -> `prisma.user.findUnique({ select: { settings: true } })`
  - `saveAbTestProgress()` -> `prisma.user.update({ data: { settings.ui[...] } })`
- State updated in `settings.ui[AB_TEST_UI_SETTINGS_KEY]`:
  - `status`
  - `stage`
  - `current_question_id`
  - `started_at`
  - `revision`
  - `questions_shown`
  - `last_callback_key`
  - `last_message_key`
- Telegram message:
  - first question via `sendQuestionDirect(...)` in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1362)
- Next hop:
  - callback `ab_test_answer:q1:...:revision`

### Step 6. User answers questions q1..q7

- Handler: `handleAbTestAnswer(...)` in [backend/src/products/ab-system/telegram/abTest.handlers.core.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.core.ts:53)
- Callback parser: `parseAbTestCallback(...)`
- Validation:
  - stale question rejection
  - revision replay rejection
  - invalid answer rejection
- State updated:
  - append answer
  - increment `revision`
  - set `current_question_id`
  - keep `stage = S2_TEST_QUESTIONS`
- Prisma:
  - `loadAbTestProgress()`
  - `saveAbTestProgress()`
- Telegram API:
  - `editMessageReplyMarkup(...)` marks selected answer
  - `sendQuestionDirect(...)` sends next question
- Scheduler side effect:
  - `scheduleFollowups(userId, next, next.stage)`
  - this schedules `AB_TEST_FOLLOWUP` jobs through `notificationService.schedule(...)`
- Next hop:
  - next answer callback

### Step 7. User answers q8 and test completes

- Same handler: `handleAbTestAnswer(...)`
- Completion rule:
  - when `nextQuestionId` becomes `null`
- State changes:
  - `status = completed`
  - `stage = S3_TEST_RESULT`
  - `result_key = resolveAbTestResultKey(nextAnswers)`
  - `email_stage = pending`
- Prisma:
  - `saveAbTestProgress()` twice
- AI/business hooks:
  - `testOrchestrator.onTestCompleted(...)`
- Telegram message:
  - not the result yet
  - email gate is shown via `renderAbTestEmailGate(...)`
- Next hop:
  - `confirm_profile_email_for_result`
  - `change_email_for_result`
  - `skip_email_before_result`

### Step 8. Email gate

- Renderer: [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1236)
- Data source:
  - `getAbTestProfileEmail(userId)` -> `prisma.user.findUnique({ select: { email: true } })`
- Telegram callbacks produced:
  - `confirm_profile_email_for_result`
  - `change_email_for_result`
  - `skip_email_before_result`
- Alternative text-input path:
  - typed email from `bot.on('text', ...)` in [backend/src/modules/telegram-mentor/index.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/index.ts:820)
  - handled by `handleAbTestEmailCaptureText(...)` in [backend/src/products/ab-system/telegram/abTest.flows.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.flows.ts:82)
- Next hop:
  - all three branches converge into `renderAbTestPostEmailSubmitSequence(...)`

### Step 9. Result delivery

- Entry: `renderAbTestPostEmailSubmitSequence(...)` in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1146)
- Core result sender: `dispatchAbTestResultSequence(...)` in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:759)
- Content source:
  - `getAbTestResultDefinition(...)`
  - `backend/src/products/ab-system/content/abTest.results.ts`
- State changes:
  - sets `result_opened_at`
  - tracks `RESULT_OPENED`
- Prisma:
  - `prisma.user.findUnique({ select: { firstName, telegramUserName } })`
  - `loadAbTestProgress()`
  - `saveAbTestProgress()`
- Telegram API:
  - `sendChatAction('typing')`
  - `sendTelegramContentChunk(...)`
  - `ctx.telegram.sendMessage(...)`
  - may send audio via `sendVoice(...)` inside block delivery
- Actual sequence:
  - intro block(s)
  - bridge text(s)
  - audio
  - CTA button `show_inside_<RESULT>`
- Next hop:
  - `show_inside_STATE|GOAL|CHOICE|DECISION|ACTION`

### Step 10. “Show inside” content and the final Focus CTA

- Practice sender: `dispatchAbTestPracticeSequence(...)` in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:856)
- Final callback emitted:
  - `open_focus_payment`
- Telegram content:
  - practice
  - review
  - pricing
  - final CTA prompt
- Telegram API:
  - multiple `sendTelegramContentChunk(...)`
  - final `ctx.telegram.sendMessage(...)` with `open_focus_payment`
- Next hop:
  - Focus paywall callback

## Payment Funnel

### Step 11. User presses `open_focus_payment`

- Callback routing:
  - `handleAbTestCallback(...)` detects `/^open_focus_payment(?::(1month|3month))?$/`
  - delegates to `handleFocusPaymentAction(...)`
- Handler file: [backend/src/products/ab-system/telegram/abTest.flows.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.flows.ts:465)
- Guards:
  - `hasActiveFocusSubscription(userId)`
- Checkout builder:
  - `buildEcosystemPaymentCheckoutSession('focus', '1month'|'3month', userId)`
  - fallback to static hosted buttons if dynamic checkout fails
- Prisma/DB:
  - active-subscription check
  - later async `saveAbTestProgress(...)` writes `focus_opened_at`
- Analytics:
  - `trackEvent({ type: 'PAYMENT_OPENED', state: 'S5_PAYMENT' ... })`
- Telegram message:
  - payment content blocks
  - 1m and 3m checkout URLs
  - optional test payment
  - `focus:payment_issue`
- Next hop:
  - browser leaves Telegram into WayForPay

### Step 12. WayForPay callback returns to backend

- Mounted route entry:
  - `POST /api/subscriptions/payments/wayforpay/callback`
  - handler: [backend/src/modules/subscriptions/payments/callback.handler.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.handler.ts:139)
- Core resolver: [backend/src/modules/subscriptions/payments/callback.processing.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.processing.ts:246)
- Resolver responsibilities:
  - resolve payment target
  - recover `userId`
  - dedupe by `paymentLog.orderReference`
  - reject missing webhook fields
- Prisma reads:
  - `db.user.findUnique(...)`
  - `db.paymentLog.findUnique(...)`
- State outcome:
  - returns normalized webhook result to the handler
- Next hop:
  - transaction orchestration in `callback.handler.ts`

### Step 13. Payment success transaction

- Transaction file: [backend/src/modules/subscriptions/payments/callback.handler.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.handler.ts:527)
- Inside transaction:
  - `markCheckoutSessionCompleted(...)`
  - `tx.productSubscription.updateMany(...)`
  - `tx.user.update({ data: { focusPaid: true } })`
  - `markAbTestPaymentSuccess(userId, tx)`
- State changes:
  - subscription becomes active / paid
  - `user.focusPaid = true`
  - AB-test payment markers updated
- Important scheduler side effect:
  - `markAbTestPaymentSuccess(...)` clears pending AB-test followup jobs
- Additional post-transaction effects:
  - `trackEvent(subscription_activated)`
  - `notificationService.schedule(...)` for pre-zoom reminders when activation has upcoming Zoom
- Prisma models involved:
  - `PaymentLog`
  - `CheckoutSession`
  - `ProductSubscription`
  - `User`
  - `NotificationJob`
- Next hop:
  - welcome delivery / room activation

### Step 14. Focus-specific activation

- Provider: [backend/src/products/focus/payments/wayforpay.ts](/Users/viravira/Documents/starway-studio/backend/src/products/focus/payments/wayforpay.ts:9)
- Provider side effects:
  - `prisma.user.update({ currentState: 'ACTIVE', funnelStage: 'PAID' })`
  - `syncLifecycleForUser(userId)`
  - `invalidateFunnelStage(userId)`
  - `simulateFocusActivation(userId, { nextZoomAt })`
- Important note:
  - this is runtime-level activation after payment, not merely copy delivery
- Next hop:
  - welcome / invite / room availability

### Step 15. Block 12 welcome after payment

- Sender: [backend/src/modules/subscriptions/payments/callback.notifications.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.notifications.ts:80)
- Function:
  - `sendAbTestBlock12Welcome(userId)`
- Prisma reads:
  - `prisma.user.findUnique({ telegramChatId, telegramLinks })`
  - `prisma.productSubscription.findFirst({ focusChannelInviteLink })`
- Telegram API:
  - `bot.telegram.sendMessage(...)`
- Message contents:
  - Focus welcome text
  - invite URL
  - web app button for Zoom booking
- Related state:
  - channel invite may be created once
  - `focusWelcomedAt` and `focusChannelInviteLink` are updated elsewhere in success flow
- Next hop:
  - user enters paid menu / room / channel

## Menu, Room, Activation

### Step 16. User re-enters bot after payment or chooses menu

- Menu entry: [backend/src/modules/telegram-mentor/handlers/start.menu.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.menu.ts:148)
- Main function:
  - `sendStateMenu(ctx, userId)`
- Upstream decision layer:
  - `resolveDecision(userId, 'menu_open')`
  - `renderTelegramDecision(...)`
- Room/lifecycle helpers:
  - `resolveTelegramAccessOrchestration(...)`
  - `resolveTelegramRoomLaunch(...)`
  - `resolveCentralLifecycleSnapshot(...)`
- Telegram message outcome:
  - open trial
  - open platform
  - open room
  - contextual next action
- Next hop:
  - `open_platform`
  - `open_focus_portal`
  - `open_course`
  - `open_practices`

### Step 17. Room/navigation callbacks

- Handler cluster: [backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts:220)
- Active actions:
  - `open_focus_portal`
  - `open_course`
  - `open_practices`
  - `open_platform`
  - `return_main_menu`
- Telegram effects:
  - open app keyboard
  - redirect messaging
  - `handleStatus(ctx)` for platform status
- Analytics:
  - `trackEvent({ type: 'PLATFORM_OPENED' ... })`
- Next hop:
  - paid user experience
  - scheduler-driven reminders

## Scheduler And Retention

### Step 18. Immediate followup jobs created during the funnel

- Source: [backend/src/products/ab-system/telegram/abTest.scheduler.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.scheduler.ts:15)
- Scheduling API:
  - `notificationService.schedule(NotificationEvent.AB_TEST_FOLLOWUP, userId, runAt, payload)`
- Payload includes:
  - `flow_timer_id`
  - `lifecycle_stage`
  - `delay_ms`
  - `message_key`
  - `ab_test_stage`
  - `result_key`
  - optional `payment_url`
- Persisted queue:
  - `NotificationJob`
- Dedupe/idempotency:
  - handled in `NotificationService.enqueueJob(...)`
- Next hop:
  - queue processing by notification workers and/or cron scheduling

### Step 19. Scheduler registry that keeps the funnel alive

- Registry: [backend/src/services/scheduler/index.ts](/Users/viravira/Documents/starway-studio/backend/src/services/scheduler/index.ts:320)
- Funnel-specific active jobs:
  - `abTestR1R2Cron`
  - `abTestR3R4Cron`
  - `abTestZoomZ1Cron`
  - `abTestZoomZ2Cron`
- Important forensic finding:
  - `abTestR5R6Cron` and `abTestR7R8Cron` are explicitly deactivated
  - result/dozhim timers are now handled by the canonical `AB_TEST_FOLLOWUP` engine, not by the old cron pair
- Also active broader retention jobs:
  - `subscriptionExpiringCron`
  - `subscriptionExpiredCron`
  - `winback3dCron`
  - `winback7dCron`
  - `winback14dCron`
  - `nudgeCron`
  - `aiSellerRetention1d/3d/7dCron`
  - `aiSellerReactivation7d/30dCron`
- Next hop:
  - due jobs become outbound Telegram notifications

### Step 20. Notification queue persistence and replay protection

- Queue API: [backend/src/services/notifications/NotificationService.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/NotificationService.ts:735)
- Persist layer:
  - `notificationJobService.enqueue(...)`
  - repository ultimately writes `prisma.notificationJob.create(...)`
- Dedupe:
  - `claimRuntimeJobReplay(...)`
  - lookup on `notificationJob.payload.runtime.idempotency_key`
- If duplicate:
  - returns existing queued job or immediate synthetic job
- Models involved:
  - `NotificationJob`
  - `Notification`
- Next hop:
  - delivery templates / Telegram delivery layer

### Step 21. Retention messages after activation

- Content source:
  - [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:43)
  - [backend/src/lib/notifications/templates.ts](/Users/viravira/Documents/starway-studio/backend/src/lib/notifications/templates.ts:161)
- Timer IDs in active result/payment funnel:
  - `RESULT_FOLLOWUP_24H`
  - `RESULT_FOLLOWUP_48H`
  - `RESULT_FOLLOWUP_72H`
  - `RESULT_DOJIM_24H`
  - `RESULT_DOJIM_48H`
  - `RESULT_DOJIM_72H`
  - `RESULT_DOJIM_5D`
  - `RESULT_DOJIM_7D`
  - `ZOOM_REMINDER_*`
- Zoom lifecycle:
  - after successful payment, pre-zoom reminders may be scheduled from payment callback flow
- Winback lifecycle:
  - handled by generic scheduler jobs, not by AB-test callback handlers directly

## Callback Inventory

Confirmed user-facing callbacks on the traced funnel path:

- `/start`
- `ab_test:start`
- `ab_test:resume`
- `ab_test:restart`
- `ab_test:show_result`
- `ab_test_answer:q1:*`
- `ab_test_answer:q2:*`
- `ab_test_answer:q3:*`
- `ab_test_answer:q4:*`
- `ab_test_answer:q5:*`
- `ab_test_answer:q6:*`
- `ab_test_answer:q7:*`
- `ab_test_answer:q8:*`
- `confirm_profile_email_for_result`
- `change_email_for_result`
- `skip_email_before_result`
- `show_inside_STATE`
- `show_inside_GOAL`
- `show_inside_CHOICE`
- `show_inside_DECISION`
- `show_inside_ACTION`
- `open_focus_payment`
- `open_focus_payment:1month`
- `open_focus_payment:3month`
- `focus:payment_issue`
- `resend_focus_block12`
- `ab_test:subscription`
- `ab_test:menu`
- `open_focus_portal`
- `open_platform`
- `open_course`
- `open_practices`

## Callback Inventory Table

Verify-first note:

- Dead code file [backend/src/products/focus/payments/webhook.ts](/Users/viravira/Documents/starway-studio/backend/src/products/focus/payments/webhook.ts:1) is excluded.
- The mounted billing webhook [backend/src/modules/billing/webhook.handler.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/billing/webhook.handler.ts:11) is live, but it belongs to the separate billing-plan flow and does not mutate the AB-test Focus funnel state traced here.
- The live payment callback on this funnel is `POST /api/subscriptions/payments/wayforpay/callback` via [backend/src/modules/subscriptions/payments/callback.handler.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.handler.ts:139).

| Callback / route | Handler | State change | Message sent |
|---|---|---|---|
| `/start` | `handleStart()` in [backend/src/modules/telegram-mentor/handlers/start.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.ts:283) | resolve/create user, bind Telegram, branch by `lifecycleState` | welcome / resume / result / paid-state card |
| `ab_test:start` | `handleAbTestStart()` -> `startAbTestFlow()` in [backend/src/products/ab-system/telegram/abTest.handlers.ui.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.ui.ts:59) and [abTest.service.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.service.ts:87) | initialize AB-test progress in `User.settings.ui` | first question |
| `ab_test:resume` | `resumeAbTestFlow()` in [backend/src/products/ab-system/telegram/abTest.service.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.service.ts:174) | no major new state unless rerouted; reuses saved progress | current question / current view |
| `ab_test:restart` | `handleAbTestRestart()` in [backend/src/products/ab-system/telegram/abTest.handlers.core.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.core.ts:279) | resets/rebuilds progress state for a new run | first question / restarted flow |
| `ab_test_answer:q1:*` ... `ab_test_answer:q7:*` | `handleAbTestAnswer()` in [backend/src/products/ab-system/telegram/abTest.handlers.core.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.core.ts:53) | append answer, increment revision, advance question, enqueue in-progress followups | next question, updated reply markup |
| `ab_test_answer:q8:*` | `handleAbTestAnswer()` complete branch | mark test `completed`, set `stage=S3_TEST_RESULT`, compute `result_key`, set `email_stage=pending` | email gate |
| `confirm_profile_email_for_result` | `handleConfirmEmail()` in [backend/src/products/ab-system/telegram/abTest.handlers.core.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.core.ts:449) | persist `email_stage=captured` path, unlock result | result sequence |
| `change_email_for_result` | `handleChangeEmail()` in [backend/src/products/ab-system/telegram/abTest.handlers.core.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.core.ts:479) | switches user back into email capture mode | prompt to send email |
| `skip_email_before_result` | `handleSkipEmail()` in [backend/src/products/ab-system/telegram/abTest.handlers.core.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.core.ts:403) | sets skipped email path and forces result redelivery | result sequence |
| typed email after gate | `handleAbTestEmailCaptureText()` in [backend/src/products/ab-system/telegram/abTest.flows.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.flows.ts:82) | persists email and post-email progress path, schedules followups | result sequence |
| `ab_test:show_result` | `handleShowResult()` in [backend/src/products/ab-system/telegram/abTest.handlers.core.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.core.ts:344) | may mark/open result depending on saved progress | result sequence |
| `show_inside_STATE|GOAL|CHOICE|DECISION|ACTION` | `handleShowInside()` -> `dispatchAbTestPracticeSequence()` in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:856) | no major persistence on the hot path | practice/review/pricing content + final Focus CTA |
| `open_focus_payment` / `open_focus_payment:1month` / `open_focus_payment:3month` | `handleFocusPaymentAction()` in [backend/src/products/ab-system/telegram/abTest.flows.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.flows.ts:465) | checks active subscription, tracks payment open, saves `focus_opened_at` | payment blocks with checkout URLs |
| `focus:payment_issue` | `handleFocusPaymentIssue()` in [backend/src/products/ab-system/telegram/abTest.flows.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.flows.ts:733) | marks payment issue support path | support/help message |
| `resend_focus_block12` | `handleResendFocusBlock12()` in [backend/src/products/ab-system/telegram/abTest.flows.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.flows.ts:653) | re-applies paid marker path, may update `focusWelcomedAt` | Block 12 resend confirmation + welcome |
| `ab_test:subscription` | subscription card renderer inside AB-test flow in [backend/src/products/ab-system/telegram/abTest.flows.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.flows.ts:430) | no primary state mutation; reads payment/subscription state | subscription status card |
| `ab_test:menu` | `handleMenu()` in [backend/src/products/ab-system/telegram/abTest.handlers.ui.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.ui.ts:216) | routes back to current menu/view | menu card |
| `open_focus_portal` | `handleRoomAction()` in [backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts:220) | no primary DB mutation | portal/open-app message |
| `open_platform` | `handleRoomAction()` -> `handleStatus(ctx)` in [backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts:268) | analytics event `PLATFORM_OPENED` | platform/status message |
| `open_course` | `handleRoomAction()` | no primary state mutation | course-open message |
| `open_practices` | `handleRoomAction()` | no primary state mutation | practices-open message |
| `POST /api/subscriptions/payments/wayforpay/callback` | `wayForPayCallback(req, res)` in [backend/src/modules/subscriptions/payments/callback.handler.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.handler.ts:139) | normalizes payload, resolves payment target, updates `ProductSubscription`, `User.focusPaid`, AB-test payment markers, clears pending followups | no Telegram message inline; success side effects later send Block 12 welcome |

## Dead Code Found During Audit

- [backend/src/products/focus/payments/webhook.ts](/Users/viravira/Documents/starway-studio/backend/src/products/focus/payments/webhook.ts:1)
  - zero runtime imports found during this audit
  - not mounted in `app.ts`
  - candidate for removal in a separate STEP
  - not changed in this step

## Prisma Surface In The Funnel

Main Prisma models touched on the traced route:

- `User`
  - Telegram identity
  - lifecycle flags
  - `focusPaid`
  - `settings.ui` AB-test progress
- `TelegramLink`
- `PaymentLog`
- `CheckoutSession`
- `ProductSubscription`
  - `paidAt`
  - `focusWelcomedAt`
  - `focusChannelInviteLink`
- `NotificationJob`
- `Notification`
- `RuntimeOutbox` indirectly through notification infrastructure

Schema anchors:

- [packages/db/prisma/schema.prisma](/Users/viravira/Documents/starway-studio/packages/db/prisma/schema.prisma:58)
- [packages/db/prisma/schema.prisma](/Users/viravira/Documents/starway-studio/packages/db/prisma/schema.prisma:505)
- [packages/db/prisma/schema.prisma](/Users/viravira/Documents/starway-studio/packages/db/prisma/schema.prisma:603)
- [packages/db/prisma/schema.prisma](/Users/viravira/Documents/starway-studio/packages/db/prisma/schema.prisma:1272)

## AI / Non-DB Side Effects On This Funnel

Confirmed from the traced path:

- `testOrchestrator.onTestCompleted(...)`
- `resolveDecision(...)` for menu/opening decisions
- `renderTelegramDecision(...)`

Not on the core IG -> test -> payment path itself:

- notebook/Claude channel assistant in `telegram-mentor/index.ts`
- generic AI mentor chat handlers

Those exist in the runtime, but they are side systems, not the main AB-test payment funnel.

## Forensic Conclusions

1. The real production Telegram funnel does not run from `apps/bot`; it runs from `backend/src/modules/telegram-mentor`.
2. The AB-test state machine is persisted inside `User.settings.ui`, not in a dedicated AB-test table.
3. The result gate is email-first: after q8 the user does not receive the result immediately.
4. `open_focus_payment` is the main monetization callback and builds dynamic checkout URLs when `userId` is known.
5. Payment success updates both commerce state and funnel state:
   - `ProductSubscription`
   - `User.focusPaid`
   - AB-test payment markers
   - queued reminders
6. Old result/dozhim crons are deactivated; the canonical active engine is the `AB_TEST_FOLLOWUP -> NotificationJob` path.

## Phase 1-2 Addendum (Evidence-Forced)

Date: 2026-07-10
Scope limit: technical execution only. No UX/conversion phase in this pass.

### Confirmed Baseline From This Session

| Topic | Status | Evidence |
|---|---|---|
| `RESULT_OPENED` analytics exists as an independent tracking branch | PASS | [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1208) |
| `show_inside_*` root cause was confirmed earlier in this session on the pre-fix code path | SESSION-CONFIRMED HISTORICAL FAIL | Runtime break documented below; current working tree now contains `if (action.startsWith('show_inside_')) return 'OPEN_FOCUS'` at [backend/src/core/state-machine/ctaFoundation.ts](/Users/viravira/Documents/starway-studio/backend/src/core/state-machine/ctaFoundation.ts:312) |
| Dojim content `24H/48H/72H/5D/7D` for all 5 segments exists in active content file | PASS | [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:301), [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:466), [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:640), [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:820) |
| `dev:clean` uses graceful `SIGTERM` before fallback `SIGKILL` | PASS | [package.json](/Users/viravira/Documents/starway-studio/package.json:13) |
| Product-level `focus/payments/webhook.ts` is not the live mounted Focus callback path | PASS | Live route is [backend/src/modules/subscriptions/routes.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/routes.ts:21) -> [backend/src/modules/subscriptions/payments/callback.handler.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.handler.ts:139); generic billing webhook is separate at [backend/src/app.ts](/Users/viravira/Documents/starway-studio/backend/src/app.ts:326) |

### Phase 1. Technical Execution Path

| Step | Expected | Actual (file:line) | Prisma query (model+method) | Telegram API call | callback_data | state/stage field | Next hop | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Instagram deeplink enters Telegram runtime | `/start` payload is parsed by `getStartPayload()` / `parseFirstTouchPayload()` in [backend/src/modules/telegram-mentor/handlers/start.shared.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.shared.ts:52), then `bot.command('start', handleStart)` in [backend/src/modules/telegram-mentor/index.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/index.ts:498) | None in parser; user persistence begins later in `handleStart()` | None at parse stage | UNVERIFIED | none yet | `handleStart(ctx)` | PASS |
| 2 | `/start` resolves/creates user and binds Telegram | `handleStart()` runs in [backend/src/modules/telegram-mentor/handlers/start.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.ts:283) | `user.findUniqueOrThrow` via `loadUserSnapshot`, `user.update` via `setLifecycleState` in [backend/src/modules/telegram-mentor/handlers/start.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.ts:305), [backend/src/modules/telegram-mentor/handlers/start.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.ts:340) | `ctx.reply` / `ctx.telegram.sendMessage` in start branches [backend/src/modules/telegram-mentor/handlers/start.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.ts:404) | `ab_test:start`, `ab_test:resume`, `ab_test:show_result`, `open_focus_payment` from rendered start menus at [backend/src/modules/telegram-mentor/handlers/abTest.start.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/abTest.start.ts:60) | `lifecycleState` | callback router | PASS |
| 3 | Callback enters central runtime bus | `bot.on('callback_query', ...)` in [backend/src/modules/telegram-mentor/index.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/index.ts:851), dispatches to `dispatchTelegramCallbackEvent()` in [backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts:488) | `trackEvent(...)` only on some branches; no mandatory write at ingress | `answerCbQuery` / `planAck` branch in [backend/src/modules/telegram-mentor/index.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/index.ts:865) | action-specific | `ctx.state.userState` | `handleAbTestCallback(ctx, action)` | PASS |
| 10 | Final answer completes test and moves runtime to result stage | `handleAbTestAnswer()` complete branch in [backend/src/products/ab-system/telegram/abTest.handlers.core.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.core.ts:218) | `user.update(settings.ui)` through `saveAbTestProgress()` [backend/src/products/ab-system/telegram/abTest.handlers.core.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.handlers.core.ts:239) | `renderAbTestEmailGate()` later sends messages | `ab_test_answer:*` | `status='completed'`, `stage='S3_TEST_RESULT'`, `email_stage='pending'` | email gate | PASS |
| 11 | `RESULT_OPENED` should track analytics independently | `trackAbTestEvent({ type: 'RESULT_OPENED' })` in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1208) | `saveAbTestProgress(result_opened_at)` immediately before tracking at [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1200) | none in tracking call itself | UNVERIFIED | `result_opened_at`, `last_event_at` | `dispatchAbTestResultSequence()` | PASS |
| 12 | Result sequence should send the practice CTA callback | `dispatchAbTestResultSequence()` emits `show_inside_${RESULT}` in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:792) | None | `sendTelegramContentChunk(...)` and `sendMessage(...)` in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:759) | `show_inside_STATE|GOAL|CHOICE|DECISION|ACTION` | no new stage write here | `handleShowInside()` | PASS |
| 13 | Practice sequence should end in monetization CTA | `dispatchAbTestPracticeSequence()` renders final CTA `open_focus_payment` at [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1104) | None on this sender path | `sendTelegramContentChunk(...)`, final `sendMessage(...)` | `open_focus_payment` | no stage write here | `handleFocusPaymentAction()` | PASS |
| 14 | `show_inside_*` should canonically reach `scheduleFollowups('S3_TEST_RESULT')` before payment | Historical failing path: `dispatchTelegramCallbackEvent()` returned early on handled callback at [backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts:542), so `observeAbTestCanonicalAction()` at [backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts:590) was not reached. Current working tree now maps `show_inside_*` in resolver at [backend/src/core/state-machine/ctaFoundation.ts](/Users/viravira/Documents/starway-studio/backend/src/core/state-machine/ctaFoundation.ts:312), but this row preserves the session-confirmed pre-fix break. | None, because scheduler caller was skipped on the failing path | callback handled normally by bot runtime | `show_inside_*` then `open_focus_payment` | no `timers.result` mutation on failing path | canonical observer skipped | FAIL (historical root cause) |
| 15 | `scheduleFollowups()` should call `notificationService.schedule()` and persist `NotificationJob` | Direct active chain exists: [backend/src/products/ab-system/telegram/abTest.scheduler.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.scheduler.ts:73) -> [backend/src/services/notifications/NotificationService.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/NotificationService.ts:735) -> [backend/src/services/notifications/NotificationService.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/NotificationService.ts:870) -> [backend/src/services/notifications/services/NotificationJobService.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/services/NotificationJobService.ts:10) -> [backend/src/services/notifications/repositories/NotificationJobRepository.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/repositories/NotificationJobRepository.ts:74) -> [backend/src/services/notifications/repositories/NotificationJobRepository.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/repositories/NotificationJobRepository.ts:79) | `notificationJob.findFirst`, `notificationJob.create` | None immediate; deferred delivery later | UNVERIFIED | `timers.result` or other timer bucket depending on stage | queue worker / scheduler | PASS |

### Phase 1B. Static Content / Button / Navigation Checks Not Already Fully Settled

| Step | Expected | Actual (file:line) | Status |
|---|---|---|---|
| Result CTA label | Result sequence should expose a Focus CTA button | `callback_data: 'open_focus_payment'` is rendered in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:947) | PASS |
| Practice CTA label | Practice sequence should expose a Focus CTA button and optional `show_inside_*` preview | CTA row rendered in [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1104) | PASS |
| Result content source | Segment-specific result/dojim copy should resolve from active content file | Resolver uses `AB_TEST_FOLLOWUPS[resultKey][timerId]` at [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:1041) | PASS |

### Phase 2. Technical Breaks (Dead / Duplicate / Race / Risk)

| Step | Status | Evidence (file:line) | Risk |
|---|---|---|---|
| `RESULT_OPENED` analytics branch | PASS | Independent branch exists at [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1208) and does not depend on scheduler caller | LOW |
| `show_inside_*` missing canonical scheduling on pre-fix path | FAIL (historical root cause) | Early handled return in event bus [backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts:542) prevented canonical observer at [backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts:590); scheduler caller for `S3_TEST_RESULT` lives in [backend/src/products/ab-system/telegram/abTest.canonical.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.canonical.ts:65) | HIGH |
| Current working tree resolver state for `show_inside_*` | PASS (current state only) | Resolver now returns `OPEN_FOCUS` for `show_inside_*` at [backend/src/core/state-machine/ctaFoundation.ts](/Users/viravira/Documents/starway-studio/backend/src/core/state-machine/ctaFoundation.ts:312) | LOW |
| Legacy duplicate dojim engine still present as dormant code | UNVERIFIED | Hardcoded `scheduleDojimSeries()` path exists in [backend/src/services/notifications/NotificationService.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/NotificationService.ts:739), but no active runtime invocation is proven in this pass | MED |
| `NotificationJob` persistence has a synthetic fallback when table is unavailable | PASS | Availability guard in [backend/src/services/notifications/repositories/NotificationJobRepository.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/repositories/NotificationJobRepository.ts:19) and synthetic fallback in [backend/src/services/notifications/repositories/NotificationJobRepository.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/repositories/NotificationJobRepository.ts:75) | MED |
| Product-level Focus webhook wrapper is not the live callback path | PASS | Live Focus route is [backend/src/modules/subscriptions/routes.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/routes.ts:21); generic Telegram webhook is separate in [backend/src/app.ts](/Users/viravira/Documents/starway-studio/backend/src/app.ts:326) | LOW |
7. Activation after payment continues into menu, room, invite, Zoom, and retention jobs instead of ending at checkout.
