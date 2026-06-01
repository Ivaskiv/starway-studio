# Temporary Overrides Registry

## TEST_COACH_MODE

Status: ACTIVE
Created: 2026-05-30
Owner: Vira

Purpose:
Локальне тестування Zoom Booking, Coach Dashboard, Mentor Dashboard та Calendar інтеграцій до появи першого реального коуча.

Search Token:
REMOVE_TEST_COACH_MODE

Environment Variables:

TEST_COACH_BOT_NAME
TEST_COACH_BOT_TOKEN
TEST_COACH_EMAIL
TEST_COACH_TELEGRAM_ID

Code Objects:

getCoachBotConfig()
isTestCoach()

Temporary Access:

SUPER_ADMIN
COACH
MENTOR
SCHEDULE
BOOKINGS
COACH_DASHBOARD

Cleanup Trigger:

Перший реальний коуч успішно:

* створений
* має власний Telegram Bot
* має власний календар
* має власний Zoom доступ

Local Cleanup:

grep -R "REMOVE_TEST_COACH_MODE" .

Видалити:

* TEST_COACH_BOT_NAME
* TEST_COACH_BOT_TOKEN
* TEST_COACH_EMAIL
* TEST_COACH_TELEGRAM_ID

Видалити test branch з:

* getCoachBotConfig()
* isTestCoach()

Перезапустити:

pnpm install
pnpm dev

Global Cleanup Checklist:

[ ] прибрані env
[ ] прибрані resolver-и
[ ] прибрані bypass permissions
[ ] smoke test успішний
[ ] onboarding реального coach завершений

Expected Final State:

Система працює лише через production coach configuration.
Жодного TEST_COACH_MODE не існує.
