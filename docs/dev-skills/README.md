# docs/dev-skills

Папка скілів розробника для Claude (Project Knowledge).

## Як використовувати

Додай вміст цієї папки в Claude Project Knowledge свого dev-проекту.
Claude автоматично підтягує контекст при кожному запиті.

## Структура

| Файл | Призначення |
|---|---|
| MASTER-SKILLS.md | Індекс всіх скілів — читати першим |
| SKILL-developer.md | Головний dev скіл: стек, архітектура, угоди |
| SKILL-ab-test.md | Вхідний тест, result types, chain priority |
| SKILL-funnel.md | Воронка: lead → paid, dojim, lifecycle |
| SKILL-focus-funnel-fix.md | ФОКУС: open_focus_payment → Dojim → WayForPay |
| SKILL-wayforpay.md | WayForPay: webhook, checkout session, idempotency |
| SKILL-telegram.md | Telegram бот патерни, handlers, guards |
| SKILL-bot-channel-setup.md | Новий бот: scaffold, .env, реєстрація |
| SKILL-auth-webapp.md | Auth: JWT, Telegram initData, deeplink tokens |
| SKILL-orchestrator.md | Scheduler, NotificationJob, cron патерни |
| SKILL-event-orchestration.md | Events, analytics, trackEvent патерни |
| SKILL-business-automation.md | Клієнтські проекти: шаблон, retainer, upsell |
| SKILL-instagram-ai-content-automation.md | AI контент-план для Instagram коучів |
| SKILL-pdf-reports.md | PDF генерація, weasyprint, звіти |
| SKILL-ai-tools-stack.md | AI стек: OpenAI, Claude API, Whisper |
| env-architecture.md | .env змінні: структура, Render, Vercel |
| archive/ | Застарілі скіли (reference only) |

## Правило оновлення

Після кожного нового архітектурного рішення або нового скілу:
1. Додати файл SKILL-*.md в цю папку
2. Оновити MASTER-SKILLS.md (таблиця)
3. git commit -m "docs: add/update skill — [назва]"
