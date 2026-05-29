# SKILL: client-dna
> Статус: ACTIVE — зібрано з коду + наявних інструкцій у repo

## Методологічний ланцюжок
- Базовий порядок: `СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ`
- Підтверджено у:
  - `backend/src/core/state-machine/testFoundation.ts` (CHAIN + tie-break comments)
  - `backend/src/products/absystem/config/absystem.content.ts` (labels STATE/GOAL/CHOICE/DECISION/ACTION)

## ЦА (портрет)
- TODO: `жінки 25-45, коучинг, трансформація` як формалізоване правило не знайдено у TS-коді.
- Є суміжний контекст у внутрішніх markdown-інструкціях (`docs/instructions/*`), але не як технічна константа backend/frontend.

## Тон Наді
- TODO: явного централізованого технічного policy-файлу з назвою "тон Наді" у `backend/src` не знайдено, перевір вручну.
- Є контентні згадки в `docs/instructions/SKILL-ai-tools-stack.md`.

## Заборонені слова в UI
- В коді активно присутні технічні/внутрішні терміни: `trial`, `lead`, `lead_magnet`, `funnel`, `subscribe/subscription`.
- Якщо бізнес-вимога: не показувати ці слова в user-facing UI, це треба зафіксувати окремим lint/content policy (зараз такого hard-enforced правила у коді не знайдено).

## Бізнес-мета
- З коду видно пріоритет конверсій та автоматизації:
  - конверсійні/фоллоуап механіки: `abTest.followups.ts`, `scheduler/index.ts`, `NotificationService`
  - автоматизація для зниження ручної роботи: cron, notification jobs, callback orchestration
- Формулювання:
  - максимізувати конверсію з тесту/фоллоуапів у оплату/фокус
  - мінімізувати ручні дії коуча через оркестрацію та автоповідомлення
