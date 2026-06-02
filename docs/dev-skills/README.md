# docs/dev-skills

Папка скілів розробника для Claude (Project Knowledge).

## Як використовувати

Додай вміст цієї папки в Claude Project Knowledge свого dev-проекту.
Claude автоматично підтягує контекст при кожному запиті.

## Структура

| Файл | Призначення |
|---|---|
| MASTER-SKILLS.md | Індекс всіх скілів — читати першим |
| developers/ | Стек, архітектура, auth, env |
| developers/SKILL-ai-tools-stack.md | AI стек: OpenAI, Claude API, Whisper |
| orchestration/ | Lifecycle, scheduler, funnels |
| payments/ | WayForPay, checkout, focus payment flow |
| reliability/ | Webhooks, dedupe, retries, notification safety |
| architecture/ | AI agent governance |
| telegram/ | Telegram bot patterns and setup |
| testing/ | AB test, spec and flow auditors |
| business/ | Client business automation |
| content/ | AI content automation |
| reports/ | PDF reporting |
| archive/ | Застарілі скіли (reference only) |

## Правило оновлення

Після кожного нового архітектурного рішення або нового скілу:
1. Додати файл SKILL-*.md у відповідну підпапку
2. Оновити MASTER-SKILLS.md (таблиця)
3. git commit -m "docs: add/update skill — [назва]"
