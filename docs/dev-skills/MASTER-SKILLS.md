# Master Skills — Starway Studio

> Індекс всіх активних скілів. Оновлювати при кожній зміні структури.
> Архів застарілих: docs/dev-skills/archive/

## Dev скіли (читати перед роботою з кодом)

| Файл | Коли читати |
|---|---|
| developers/SKILL-developer.md | Завжди — стек, угоди, патерни, автоматизація |
| developers/SKILL-ai-tools-stack.md | AI стек: OpenAI, Claude API, Whisper |
| developers/SKILL-auth-webapp.md | Telegram WebApp auth, initData, deeplink tokens |
| developers/env-architecture.md | Env ownership, Render/Vercel, secrets |
| orchestration/SKILL-orchestrator.md | /start handler, lifecycleState, decision matrix |
| orchestration/SKILL-funnel.md | Воронка, ремайндери R1–R8, кронові задачі |
| orchestration/SKILL-zoom-booking-orchestration.md | Zoom booking, reschedule, reminders |
| testing/SKILL-ab-test.md | Вхідний тест, tiebreaker, chain priority |
| testing/SKILL-product-specification-auditor.md | PRD audit, gaps, contradictions |
| testing/SKILL-flow-completeness-auditor.md | Flow completeness, UX gaps, recovery gaps |
| telegram/SKILL-telegram.md | Telegram бот патерни, guards, handlers |
| telegram/SKILL-bot-channel-setup.md | Scaffold нового бота через new-bot.ts |
| SKILL-bot-copy.md | Copy бота: тон, БАН-слова, шаблони, де живе текст |
| docs/agents/ai-content/SKILL-output-engine.md | CSS rules, zero inline styles, zero backdrop-filter |
| reports/SKILL-pdf-reports.md | PDF звіти, weekly report |
| docs/agents/ai-mentor/methodology-absystem.md | AI позиції, інструменти, routing |
| business/SKILL-business-automation.md | Автоматизація, скрипти, workflows |
| payments/SKILL-wayforpay.md | WayForPay webhook, checkout, idempotency |
| payments/SKILL-focus-funnel-fix.md | Focus funnel, dojim, paidAt |
| reliability/SKILL-webhook-cors-payload.md | Webhook CORS, payload parser, WayForPay quirks |
| reliability/SKILL-notification-routing.md | Notification routing, dedupe, channel selection |
| reliability/SKILL-scheduler-reliability.md | Cron safety, retries, idempotency, locks |
| architecture/SKILL-ai-agent-governance.md | AI agent ownership, routing, escalation |
| developers/env-architecture.md | .env структура, змінні, секрети |

## Бізнес / контент скіли

| Файл | Коли читати |
|---|---|
| docs/agents/shared/STARWAY-DNA-LEXICON.md | MUST/BAN лексикон (єдине джерело) |
| docs/agents/ai-mentor/comeback-flows.md | Контент, UX-copy, формати |
| docs/agents/ai-content/SKILL-creative-ads.md | Рілси, банери, creative briefs |
| content/ | Контент автоматизація, prompts, creative output |
| business/ | Оффери, $100M методологія |

## Операційні інструкції

| Файл | Коли читати |
|---|---|
| ops/INSTRUCTION-saas-update.md | Деплой, оновлення платформи |
| ops/INSTRUCTION-pulse-setup.md | Pulse налаштування |

## Технічна документація платформи

| Файл | Коли читати |
|---|---|
| ../architecture/lifecycle-map.md | Lifecycle states, переходи |
| ../architecture/callback-map.md | Telegram callbacks реєстр |
| ../architecture/telegram-architecture.md | Архітектура ботів |
| ../architecture/ai-orchestration.md | AI оркестрація |
| ../architecture/subscription-architecture.md | Subscription lifecycle and access rules |
| ../architecture/booking-architecture.md | Zoom booking lifecycle |
| ../architecture/notification-routing.md | Notification routing contract |
| ../architecture/reliability-architecture.md | Retry, dedupe, webhook safety |
| ../architecture/ai-agent-governance.md | AI agent governance |
| ../architecture/event-stream-contract.md | Event stream contract |
| ../architecture/user-timeline.md | Single user timeline model |

---

## Нові скіли (червень 2026)

| Файл | Тригер |
|---|---|
| payments/SKILL-focus-funnel-fix.md | open_focus_payment, Dojim pipeline, WayForPay webhook, ProductSubscription.paidAt |
| content/SKILL-instagram-ai-content-automation.md | Instagram контент-план, AI агент коуча, тижневий план, архетипи |
