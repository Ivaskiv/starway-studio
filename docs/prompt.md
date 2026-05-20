# Prompt Inventory

# Product Ownership Map

- FOCUS = landing
- STANKEY = telegram product
- backend = shared api/runtime
- workers = schedulers/notifications
- shared-bot-core = telegram core
- shared-ui = landing shared ui

Нижче зведення файлів, де зараз живуть system prompts, product prompts, CTA/copy registries, notification templates і frontend instruction-copy.  
`TYPE` = `system | product | copy | notification | frontend`  
`OWNER` = поточний домен / модуль  
`CENTRALIZE TO` = куди я б переніс джерело правди під час рефактору

| FILE | TYPE | OWNER | CENTRALIZE TO |
| --- | --- | --- | --- |
| `backend/src/config/prompts.ts` | system | Core mentor / AI config | `backend/src/prompts/system/ai-mentor.ts` |
| `backend/src/core/mentor/templates.ts` | system | Core mentor engine | `backend/src/prompts/system/mentor-templates.ts` |
| `backend/src/core/mentor/messageGenerator.ts` | system | Core mentor engine | `backend/src/prompts/system/mentor-renderer.ts` |
| `backend/src/core/mentor/intentResolver.ts` | system | Core mentor engine | `backend/src/prompts/system/mentor-intents.ts` |
| `backend/src/core/mentor/interventionSelector.ts` | system | Core mentor engine | `backend/src/prompts/system/mentor-interventions.ts` |
| `backend/src/modules/ai-mentor/prompt.ts` | system | AI mentor | `backend/src/prompts/system/ai-mentor-runtime.ts` |
| `backend/src/modules/ai-mentor/weekly-analysis/service.ts` | system | AI mentor weekly analysis | `backend/src/prompts/system/weekly-analysis.ts` |
| `backend/src/modules/wheel/ai.ts` | system | Wheel / balance analysis | `backend/src/prompts/system/wheel.ts` |
| `backend/src/modules/daily-cycle/ai.ts` | system | Daily cycle analysis | `backend/src/prompts/system/daily-cycle.ts` |
| `backend/src/modules/vision/service.ts` | system | Vision / roadmap AI | `backend/src/prompts/system/vision.ts` |
| `backend/src/modules/vision/system.ts` | system | Vision system schema/prompt | `backend/src/prompts/system/vision-system.ts` |
| `backend/src/modules/voice/emotion.engine.ts` | system | Emotion classifier | `backend/src/prompts/system/emotion.ts` |
| `backend/src/modules/funnel/ai.ts` | system | Funnel AI | `backend/src/prompts/system/funnel.ts` |
| `backend/src/modules/admin/content-studio.service.ts` | copy | Content Studio / launchpad | `backend/src/prompts/content-studio/index.ts` |
| `backend/src/modules/admin/content-research.service.ts` | system | Market research prompt bank | `backend/src/prompts/system/content-research.ts` |
| `backend/src/modules/events/contentAttribution.service.ts` | system | Content attribution / analysis | `backend/src/prompts/system/content-attribution.ts` |
| `backend/src/modules/telegram-mentor/roles/base.role.ts` | system | Telegram mentor router | `backend/src/prompts/system/telegram-base.ts` |
| `backend/src/modules/telegram-mentor/roles/funnel.role.ts` | system | Telegram funnel role | `backend/src/prompts/system/telegram-funnel.ts` |
| `backend/src/modules/telegram-mentor/roles/mentor.role.ts` | system | Telegram mentor role | `backend/src/prompts/system/telegram-mentor.ts` |
| `backend/src/modules/telegram-mentor/handlers/aiMentor.ts` | system | Telegram AI mentor flow | `backend/src/prompts/system/telegram-ai-mentor.ts` |
| `backend/src/modules/telegram-mentor/services/productSummary.service.ts` | copy | Product routing / summaries | `backend/src/prompts/content/product-summary.ts` |
| `backend/src/modules/subscriptions/payments/business.ts` | notification | Ecosystem payment plans / bridge copy | `backend/src/prompts/notifications/payment-plans.ts` |
| `backend/src/modules/subscriptions/payments/callback.ts` | notification | Payment webhook messages | `backend/src/prompts/notifications/payment-webhook.ts` |
| `backend/src/lib/notifications/templates.ts` | notification | Notification templates | `backend/src/prompts/notifications/templates.ts` |
| `backend/src/services/notifications/NotificationService.ts` | notification | Notification delivery payloads | `backend/src/prompts/notifications/delivery.ts` |
| `backend/src/products/ab-system/content/abTest.content.ts` | product | ABSystem AB-test copy | `backend/src/prompts/products/absystem/ab-test-content.ts` |
| `backend/src/products/ab-system/content/abTest.questions.ts` | product | ABSystem test questions | `backend/src/prompts/products/absystem/ab-test-questions.ts` |
| `backend/src/products/ab-system/content/abTest.results.ts` | product | ABSystem test results | `backend/src/prompts/products/absystem/ab-test-results.ts` |
| `backend/src/products/ab-system/content/abTest.followups.ts` | product | ABSystem result followups | `backend/src/prompts/products/absystem/ab-test-followups.ts` |
| `backend/src/products/ab-system/content/abTest.focus.ts` | product | ABSystem Focus bridge | `backend/src/prompts/products/absystem/ab-test-focus.ts` |
| `backend/src/products/ab-system/content/abTest.zoom.ts` | product | ABSystem Zoom bridge | `backend/src/prompts/products/absystem/ab-test-zoom.ts` |
| `backend/src/products/ab-system/content/abTest.platform.ts` | product | ABSystem platform bridge | `backend/src/prompts/products/absystem/ab-test-platform.ts` |
| `backend/src/products/ab-system/content/abTest.payments.ts` | product | ABSystem payment copy | `backend/src/prompts/products/absystem/ab-test-payments.ts` |
| `backend/src/products/ab-system/content/abTest.menu.ts` | product | ABSystem menu copy | `backend/src/prompts/products/absystem/ab-test-menu.ts` |
| `backend/src/products/ab-system/telegram/abTest.service.ts` | product | ABSystem AB-test Telegram flow | `backend/src/prompts/products/absystem/telegram-ab-test.ts` |
| `backend/src/products/absystem/config/absystem.content.ts` | product | ABSystem content registry | `backend/src/prompts/products/absystem/content.ts` |
| `backend/src/products/absystem/config/absystem.cta.ts` | copy | ABSystem CTA registry | `backend/src/prompts/products/absystem/cta.ts` |
| `backend/src/products/absystem/config/absystem.blocks.ts` | copy | ABSystem block registry | `backend/src/prompts/products/absystem/blocks.ts` |
| `backend/src/products/absystem/config/absystem.flows.ts` | copy | ABSystem flow registry | `backend/src/prompts/products/absystem/flows.ts` |
| `backend/src/products/focus/config/focus.content.ts` | product | Focus content registry | `backend/src/prompts/products/focus/content.ts` |
| `backend/src/products/focus/config/focus.prompts.ts` | product | Focus prompt registry | `backend/src/prompts/products/focus/prompts.ts` |
| `backend/src/products/focus/config/focus.settings.ts` | product | Focus feature flags / runtime | `backend/src/prompts/products/focus/settings.ts` |
| `backend/src/products/focus/config/focus.constants.ts` | copy | Focus constants / labels | `backend/src/prompts/products/focus/constants.ts` |
| `backend/src/products/focus/prompts/onboarding.prompt.ts` | product | Focus onboarding prompt | `backend/src/prompts/products/focus/onboarding.prompt.ts` |
| `backend/src/products/focus/prompts/sales.prompt.ts` | product | Focus sales prompt | `backend/src/prompts/products/focus/sales.prompt.ts` |
| `backend/src/products/focus/prompts/mentor.prompt.ts` | product | Focus mentor prompt | `backend/src/prompts/products/focus/mentor.prompt.ts` |
| `backend/src/products/focus/telegram/focus.commands.ts` | copy | Focus Telegram commands | `backend/src/prompts/products/focus/telegram-commands.ts` |
| `backend/src/products/focus/telegram/focus.keyboards.ts` | copy | Focus Telegram keyboards | `backend/src/prompts/products/focus/telegram-keyboards.ts` |
| `backend/src/products/focus/telegram/focus.flow.ts` | copy | Focus Telegram flow | `backend/src/prompts/products/focus/telegram-flow.ts` |
| `backend/src/products/focus/telegram/focus.handlers.ts` | copy | Focus Telegram handlers | `backend/src/prompts/products/focus/telegram-handlers.ts` |
| `backend/src/products/focus/telegram/focus.bot.ts` | copy | Focus Telegram bot copy | `backend/src/prompts/products/focus/telegram-bot.ts` |
| `backend/src/products/stankey/config/stankey.content.ts` | product | STANKEY isolated content | `backend/src/prompts/products/stankey/content.ts` |
| `backend/src/products/stankey/config/stankey.prompts.ts` | product | STANKEY isolated prompts | `backend/src/prompts/products/stankey/prompts.ts` |
| `backend/src/products/stankey/product.manifest.ts` | copy | STANKEY manifest / copy | `backend/src/prompts/products/stankey/manifest.ts` |
| `apps/web/src/features/ai-engine/prompts/system.prompt.ts` | frontend | Web AI engine system prompt | `apps/web/src/prompts/ai-engine/system.prompt.ts` |
| `apps/web/src/features/ai-engine/prompts/vision.prompt.ts` | frontend | Web AI engine vision prompt | `apps/web/src/prompts/ai-engine/vision.prompt.ts` |
| `apps/web/src/features/ai-engine/prompts/decisions.prompt.ts` | frontend | Web AI engine decisions prompt | `apps/web/src/prompts/ai-engine/decisions.prompt.ts` |
| `apps/web/src/features/ai-engine/prompts/module.prompts.ts` | frontend | Web AI engine module prompts | `apps/web/src/prompts/ai-engine/module.prompts.ts` |
| `apps/web/src/features/ai-engine/prompts/wheel.prompt.ts` | frontend | Web AI engine wheel prompt | `apps/web/src/prompts/ai-engine/wheel.prompt.ts` |
| `apps/web/src/features/ai-engine/prompts/daily.prompt.ts` | frontend | Web AI engine daily prompt | `apps/web/src/prompts/ai-engine/daily.prompt.ts` |
| `apps/web/src/features/ai-engine/prompts/mirror.prompt.ts` | frontend | Web AI engine mirror prompt | `apps/web/src/prompts/ai-engine/mirror.prompt.ts` |
| `apps/web/src/features/products/utils/promptTemplate.ts` | frontend | Prompt template helper | `apps/web/src/prompts/frontend/prompt-template.ts` |
| `apps/web/src/features/ai-funnel-landing/services/landing.content.ts` | copy | Funnel landing copy | `apps/web/src/prompts/frontend/landing-content.ts` |
| `apps/web/src/features/landings/focus/content/focus.content.ts` | copy | Focus landing copy | `apps/web/src/prompts/frontend/focus-content.ts` |
| `apps/web/src/features/content-studio/config/contentStudio.steps.ts` | frontend | Content Studio step instructions | `apps/web/src/prompts/frontend/content-studio-steps.ts` |
| `apps/web/src/features/content-studio/config/contentStudio.config.ts` | frontend | Content Studio config / labels | `apps/web/src/prompts/frontend/content-studio-config.ts` |
| `apps/web/src/features/analytics/pages/AdminAnalytics.tsx` | frontend | Analytics instructions | `apps/web/src/prompts/frontend/admin-analytics.ts` |
| `apps/web/src/features/dashboard/components/FunnelAutomationPanel.tsx` | frontend | Funnel automation guidance | `apps/web/src/prompts/frontend/funnel-automation.ts` |
| `apps/web/src/features/dashboard/components/ExpertDashboardView.tsx` | frontend | Expert dashboard guidance | `apps/web/src/prompts/frontend/expert-dashboard.ts` |
| `apps/web/src/components/layout/ProgressPanel.tsx` | frontend | Progress/instruction labels | `apps/web/src/prompts/frontend/progress-panel.ts` |
| `apps/web/src/features/daily-cycle/components/CycleProgressPanel.tsx` | frontend | Daily cycle instruction labels | `apps/web/src/prompts/frontend/cycle-progress-panel.ts` |

## Prompt Library (extracted)

### 1) Core system prompts

#### `backend/src/config/prompts.ts`

```ts
AI_MENTOR_PROMPTS.SYSTEM = `
Ти — AI-ментор "Starway". Твоя місія: допомагати людям досягати цілей через мікродії.
...
ТОН: Рішучий + підтримуючий. Як старший друг, який вірить у тебе.
`
```

```ts
AI_MENTOR_PROMPTS.MORNING.SYSTEM = `
Ти AI-ментор для ранкової рефлексії. Допомагаєш налаштуватися на продуктивний день.
...
ФОРМАТ ВІДПОВІДІ (JSON):
{
  "reply_text": "...",
  "actions": [...],
  "reminder": {...},
  "mood_tag": "ресурсний|нересурсний|нейтральний"
}
`
```

```ts
AI_MENTOR_PROMPTS.EVENING.SYSTEM = `
Ти AI-ментор для вечірньої рефлексії. Допомагаєш підсумувати день та планувати завтра.
...
ФОРМАТ ВІДПОВІДІ (JSON):
{
  "summary_text": "...",
  "main_win": "...",
  "classification": "...",
  "recommendations": [...],
  "energy_insights": {...}
}
`
```

```ts
AI_MENTOR_PROMPTS.WHEEL.SYSTEM = `
Ти експертний коуч з Life Wheel analysis. Аналізуєш баланс 8 сфер життя.
...
ФОРМАТ ВІДПОВІДІ:
✅ Середній бал: X.X/10
...
`
```

```ts
AI_MENTOR_PROMPTS.CHAT.SYSTEM = `
Ти AI-ментор Starway для чату. Допомагаєш з цілями та мотивацією.
...
НЕ ОБГОВОРЮЙ:
• Медичні питання
• Психотерапію
• Фінансові поради
• Юридичні питання
`
```

```ts
AI_MENTOR_PROMPTS.SMART_CONVERTER.SYSTEM = `
Ти конвертуєш розмиті дії у SMART формат.
...
ФОРМАТ ВИХОДУ (JSON):
[
  {
    "original": "...",
    "smart": {...}
  }
]
`
```

#### `backend/src/modules/ai-mentor/prompt.ts`

```ts
buildSystemPrompt() => [
  'Ти — ABsystem Starway. Керуючий модуль.',
  'Тон: жорстка ясність. Без підтримки. Без мотивації.',
  'Методологія: СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ.',
  'При зливі: фіксуй зраду рішенню явно.',
  'Тільки українська.',
].join('\n')
```

```ts
buildTaskPrompt('morning') => 'Створи ранкову сесію. Поверни JSON: { greeting, task, affirmation }. ...'
buildTaskPrompt('evening') => 'Роздрукуй вечірню рефлексію. JSON: { reflection, support, tomorrowFocus }. ...'
buildTaskPrompt('wheel') => 'Аналізуй колесо балансу. Очікується JSON: { analysis, priorities[], weakArea }. ...'
buildTaskPrompt('weekly') => 'Склади тижневий огляд. JSON: { summary, focusTasks[], affirmations[] }. ...'
buildTaskPrompt('chat') => 'Відповідай на повідомлення: ... JSON: { reply, actionables[] }.'
buildTaskPrompt('pdf') => 'Згенеруй короткий PDF-звіт. JSON: { headline, insights[], nextSteps[] }.'
```

#### `backend/src/core/mentor/templates.ts`

```ts
reduce_resistance -> observation: 'Схоже, ти відкладаєш старт...'; nextStep: 'Замість розгону візьми одну дію на 5 хвилин...'
increase_clarity -> observation: 'Схоже, ти обходиш тему, де зараз найбільше невизначеності.'; nextStep: 'Назви одну частину задачі...'
reengage -> observation: 'Ти трохи випала з процесу, і це вже видно по ритму.'; nextStep: 'Повернись без тиску: один маленький крок...'
stabilize_habit -> observation: 'Ритм зараз нестабільний...'; nextStep: 'Прив’яжи одну коротку дію до конкретного часу...'
motivate -> observation: 'У тебе є рух, і він уже створює опору.'; nextStep: 'Добре спрацює короткий усвідомлений крок...'
```

#### `backend/src/modules/telegram-mentor/roles/mentor.role.ts`

```ts
systemPrompt = [
  buildSystemPrompt(),
  stankeyPrompts.mentor.system,
  PROMPT_INITIAL,
  PROMPT_UPDATE,
].join('\n\n')
```

#### `backend/src/modules/telegram-mentor/roles/funnel.role.ts`

```ts
systemPrompt: 'Ти визначаєш наступний крок у funnel flow. Тільки конкретний CTA.'
```

#### `backend/src/modules/telegram-mentor/roles/base.role.ts`

```ts
export interface RoleConfig {
  systemPrompt: string
  temperature: number
  maxTokens: number
}
```

### 2) Product prompt registries

#### `backend/src/products/ab-system/content/abTest.content.ts`

```ts
entry.intro = [
  'Це короткий behavioral тест.',
  'Він покаже, де ти зараз: у стані, цілі, виборі, рішенні чи дії.',
  'Відповідай швидко і чесно — система сама збере картину без хаосу.',
]
```

```ts
progress.completionHint = 'Тест завершено. Зараз покажу результат і наступний крок.'
menu.body = [
  'Один потік веде до результату, фокусу, платежу, Zoom і платформи.',
  'Якщо перервався, прогрес можна відновити без втрати відповідей.',
]
```

#### `backend/src/products/ab-system/content/abTest.results.ts`

```ts
state:    title/body/reflection/focus_cta/payment_cta/zoom_cta/platform_cta
goal:     title/body/reflection/focus_cta/payment_cta/zoom_cta/platform_cta
choice:   title/body/reflection/focus_cta/payment_cta/zoom_cta/platform_cta
decision: title/body/reflection/focus_cta/payment_cta/zoom_cta/platform_cta
action:   title/body/reflection/focus_cta/payment_cta/zoom_cta/platform_cta
```

#### `backend/src/products/ab-system/content/abTest.followups.ts`

```ts
RESULT_FOLLOWUP_24H / 48H / 72H
RESULT_DOJIM_24H / 48H / 72H / 5D / 7D
PAYMENT_REMINDER_24H / 48H / 72H / 5D / 7D
ZOOM_REMINDER_24H / 2H
PLATFORM_INVITE_AFTER_ZOOM_1 / 2 / PLATFORM_INVITE_AFTER_ZOOM
```

#### `backend/src/products/ab-system/content/abTest.focus.ts`

```ts
title: 'FOCUS_WELCOME'
welcome.body: 'Оплата пройшла. Вітаю, ти у ФОКУСІ! ...'
welcome.cta: 'Перейти в канал'
```

#### `backend/src/products/ab-system/content/abTest.zoom.ts`

```ts
reminders.preZoom24h = 'Завтра буде Zoom-практика у ФОКУСІ...'
reminders.preZoom2h  = 'Сьогодні Zoom-практика у ФОКУСІ... Посилання: [zoom_link]'
```

#### `backend/src/products/ab-system/content/abTest.platform.ts`

```ts
bridge.title: '🚀 ABSystem AI після Zoom'
bridge.body: [
  'Сьогодні на практиці ти побачила свою ситуацію трохи ясніше.',
  'Але тепер важливо не втратити це до наступного Zoom.',
  'Саме для цього є ABSystem AI — платформа, що веде тебе щодня між практиками.',
  'ФОКУС уже входить у платформу. Доплата — 1120 грн.',
].join('\n')
bridge.cta: 'Перейти в ABSystem AI'
```

#### `backend/src/products/ab-system/content/abTest.payments.ts`

```ts
body: 'Оплата відкриває стабільний Focus-ритм, щоб рух не розсипався після рішення.'
```

#### `backend/src/products/ab-system/content/abTest.menu.ts`

```ts
body: 'Один deterministic потік, який веде від тесту до результату, Focus, платежу, Zoom і Platform.'
```

#### `backend/src/products/absystem/config/absystem.content.ts`

```ts
start.firstEntry = [
  'Тут ми зберемо твій рух без зайвого шуму.',
  'Почнемо з одного зрозумілого кроку.',
]
start.afterTest = [
  'Ти вже почала збирати свій рух в ABSystem.',
  'Повертаємось до точки, де є сенс продовжити.',
]
start.afterFocus = [
  'Ти вже працювала у Focus.',
  'Тепер важливо не втратити цей рух.',
]
focus.bridge = [
  'Коли дія тримається, можна переходити далі.',
  'Спершу — стабільність, потім — наступний крок.',
]
zoom.attended = [
  'Після Zoom ми зафіксуємо головне і не розпорошимось.',
]
subscription.active = 'Ти вже всередині системи.'
upgrade.focusToAi = 'Після Focus відкривається наступний крок розмови.'
```

#### `backend/src/products/absystem/config/absystem.cta.ts`

```ts
continue / focus / mentor / platform / restore
```

#### `backend/src/products/absystem/config/absystem.blocks.ts`

```ts
context_reconnection
movement_interpretation
unfinished_action
wheel_interpretation
repeated_pattern
emotional_recovery
focus_memory
comeback_after_gap
unresolved_decision
next_meaningful_action
strategic_nudge
```

#### `backend/src/products/absystem/config/absystem.flows.ts`

```ts
start_returning_user
focus_reentry
rollback_detected
daily_cycle_interrupted
unfinished_decision
wheel_after_gap
after_zoom
after_test
after_focus
platform_reentry
ab_test_question
ab_test_result
```

#### `backend/src/products/focus/config/focus.content.ts`

```ts
landing.hero.title = 'FOCUS'
landing.hero.subtitle = 'Поверни ритм у дію'
welcome.body = ['Спочатку зберемо ритм.', 'Потім закріпимо Zoom, рефлексію і наступний крок.']
onboarding.steps = [
  '1. Обери один головний фокус на цей тиждень.',
  '2. Залиши простий план на 1–2 дії.',
  '3. Закріпи перший Zoom і коротку рефлексію після нього.',
  '4. Повернись до системи через 24 години, щоб не втратити ритм.',
]
zoom.preparation = [
  'Перед Zoom ми не завантажуємо тебе зайвими діями.',
  'Просто збережи ритм і відкрий зустріч у потрібний час.',
]
zoom.afterZoom = [
  'Після Zoom важливо не втратити імпульс.',
  'Зафіксуй висновок і повернись до наступної дії.',
]
cta.primary.openPlatform = 'Відкрити ABsystem'
```

#### `backend/src/products/focus/config/focus.prompts.ts`

```ts
mentor.system = [
  'Ти Focus mentor.',
  'Говори коротко, тепло і практично.',
  'Підтримуй ритм, ясність і один наступний крок.',
  'Не перевантажуй, не тисни і не зміщуй користувача в оплату без контексту.',
]
sales.system = [
  'Ти Focus sales support.',
  'Пояснюй, чому поточний крок важливий саме зараз.',
  'Не використовуй сухий paywall-тон.',
  'Кожен оффер має прив’язуватися до ритму, Zoom і збереження прогресу.',
]
onboarding.system = [
  'Ти Focus onboarding guide.',
  'Починай з одного ясного наміру.',
  'Допомагай зібрати ритм, а не весь план життя.',
  'Переходь до наступного кроку лише після того, як попередній став зрозумілим.',
]
```

#### `backend/src/products/focus/prompts/onboarding.prompt.ts`

```ts
export const focusOnboardingPrompt = ''
```

#### `backend/src/products/focus/prompts/sales.prompt.ts`

```ts
export const focusSalesPrompt = ''
```

#### `backend/src/products/focus/prompts/mentor.prompt.ts`

```ts
export const focusMentorPrompt = ''
```

#### `backend/src/products/stankey/config/stankey.prompts.ts`

```ts
mentor.system = [
  'Продуктовий контекст: STANKEY / ABsystem Telegram runtime.',
  'Не згадуй FOCUS, focus-лендінги, focus-квізи або інші продукти Starway, якщо користувач сам їх не назвав.',
  'Відповідай тільки в межах ABsystem, onboarding, lead magnet, trial, subscription, daily rhythm і MiniApp Starway.',
  'Якщо потрібен наступний крок, веди користувача або в Telegram сценарій, або в MiniApp Starway.',
]
onboarding.system = 'STANKEY onboarding: веди через early access, lead magnet, trial і активацію доступу без посилань на інші продукти.'
sales.system = 'STANKEY sales: говори про trial, підписку, відновлення доступу і цінність ABsystem без сторонніх funnel-оферів.'
```

#### `backend/src/products/stankey/config/stankey.content.ts`

```ts
// STANKEY: isolated content registry
// product tone / onboarding / sales / recovery copy
```

### 3) Notification / lifecycle prompts

#### `backend/src/lib/notifications/templates.ts`

```ts
resolveAbTestFollowupCopy(type, resultKey)
buildNotificationContent(...) => {
  title,
  body,
  ctaText,
  ctaUrl,
}
```

```ts
NotificationEvent.DAILY_MORNING_DUE -> 'Твій фокус...'
NotificationEvent.SUBSCRIPTION_EXPIRED -> 'Доступ завершився...'
RESULT_FOLLOWUP_* / DOJIM_* / PAYMENT_REMINDER_* / ZOOM_REMINDER_* / PLATFORM_INVITE_* -> abTest followup copy
```

#### `backend/src/services/notifications/NotificationService.ts`

```ts
buildTelegramCard({
  title: content.title,
  intro: isPlainReminder ? content.body : `${userName}, ${content.body}`,
  note: 'Нагадування працює через canonical timing foundation.',
})
```

#### `backend/src/modules/subscriptions/payments/business.ts`

```ts
FOCUS / ABSystem AI plans
1month / 1month_upgrade / 3month / 6month / 1year
```

#### `backend/src/modules/subscriptions/payments/callback.ts`

```ts
processEcosystemPayment('focus' | 'absystem_ai', ...)
```

### 4) Frontend prompt / instruction sources

#### `apps/web/src/features/ai-engine/prompts/system.prompt.ts`

```ts
ТИ — AI-МЕНТОР. НЕ ПСИХОЛОГ. НЕ ЧАТ. НЕ ДРУГ.
ТВОЯ РОЛЬ: Керуючий модуль, що веде людину по системі: СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ
ТОН: Жорстка ясність. Без мотивації. Без підтримки типу "ти молодець"
```

#### `apps/web/src/features/content-studio/config/contentStudio.steps.ts`

```ts
step 0..10 instructions:
- Content Machine / контекст / CTA / Hook / дослідження / формула / API / текст ×3 / банери ×3 / Reels Engine / Lead magnet
```

#### `apps/web/src/features/content-studio/config/contentStudio.config.ts`

```ts
GOAL_OPTIONS, TOPIC_OPTIONS, FORMAT_OPTIONS, CTA_SUGGESTIONS, CTA_TYPE_OPTIONS, CTA_DESTINATION_OPTIONS, CTA_ROUTING_OPTIONS
FORMULA_CARDS, BANNER_VARIANT_PRESETS, RESEARCH_CAMPAIGN_CARDS, RESEARCH_HOOK_OPTIONS
```

#### `apps/web/src/features/ai-funnel-landing/services/landing.content.ts`

```ts
heroContent.title = '5 днів, щоб побачити, які щоденні дії формують твоє життя.'
programSteps[0..4]
builderSteps[0..10]
```

#### `apps/web/src/features/landings/focus/content/focus.content.ts`

```ts
hero.title = 'ФОКУС'
hero.subtitle = 'Поверни ритм у дію'
included.price = '15 € / місяць'
mechanism.title = 'МОЯ СИСТЕМА'
```

#### `apps/web/src/features/products/utils/promptTemplate.ts`

```ts
template helper for product prompt composition / prompt rendering
```

#### `apps/web/src/features/analytics/pages/AdminAnalytics.tsx`

```ts
instruction="Спочатку дивись на просідання між сусідніми кроками..."
instruction="Починай із найбільшого drop-off..."
instruction="Особливо слідкуй за Day 1 і Day 7..."
instruction="Цей блок корисний для контенту, реклами і воронки..."
instruction="Це швидкий шар для пріоритезації..."
instruction="Використовуй цей потік як оперативний екран..."
```

#### `apps/web/src/features/dashboard/components/FunnelAutomationPanel.tsx`

```ts
instruction / CTA guidance for funnel automation
```

#### `apps/web/src/features/dashboard/components/ExpertDashboardView.tsx`

```ts
instruction / mentor-style guidance for expert dashboard actions
```

#### `apps/web/src/components/layout/ProgressPanel.tsx`

```ts
progress instruction labels / mentor insights / action guidance
```

## What I would centralize first

1. `backend/src/config/prompts.ts`
2. `backend/src/modules/ai-mentor/prompt.ts`
3. `backend/src/core/mentor/*`
4. `backend/src/products/ab-system/config/*`
5. `backend/src/products/ab-system/content/*`
6. `backend/src/products/focus/prompts/*`
7. `backend/src/products/stankey/config/*` (separately, isolated)
8. `backend/src/lib/notifications/templates.ts`
9. `backend/src/services/notifications/NotificationService.ts`
10. `apps/web/src/features/ai-engine/prompts/*`
11. `apps/web/src/features/content-studio/config/*`
12. `apps/web/src/features/landings/focus/content/*`

## Notes

- `backend/src/products/focus/prompts/onboarding.prompt.ts`, `sales.prompt.ts`, `mentor.prompt.ts` are currently empty placeholders.
- `STANKEY` is intentionally listed separately and must remain isolated from ecosystem prompts.
- Several frontend files are “instruction copy” rather than LLM prompts, but they still belong in the same central registry because they function as editable prompt-like text.
