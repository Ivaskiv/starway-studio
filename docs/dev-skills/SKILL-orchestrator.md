# SKILL: orchestrator
> Статус: ACTIVE — за поточним `/start` handler

## Джерело
- `backend/src/modules/telegram-mentor/handlers/start.ts`
- `packages/db/prisma/schema.prisma` (`enum UserLifecycleState`)

## lifecycleState enum (актуально в схемі)
- `NEW_USER`
- `TEST_NOT_STARTED`
- `TEST_IN_PROGRESS`
- `TEST_DONE`
- `OFFER_SHOWN`
- `FOCUS_PAID`
- `ZOOM_MEMBER`
- `POST_ZOOM_1`
- `UPSELL`
- `EXPIRED`

## Decision matrix (/start)
| lifecycleState | що показати |
|---|---|
| `NEW_USER` | `welcomeMessage()` + перевести в `TEST_NOT_STARTED` |
| `TEST_NOT_STARTED` | `testNotStartedMessage({ escalated: >24h })` |
| `TEST_IN_PROGRESS` | `testInProgressMessage({ r3: >4h })` |
| `TEST_DONE` | `testDoneMessage()` |
| `OFFER_SHOWN` | `offerShownMessage()` |
| `FOCUS_PAID` | `focusPaidMessage()` |
| `ZOOM_MEMBER` | `zoomMemberMessage()` |
| `POST_ZOOM_1` | `aiMentorMenuMessage()` |
| `UPSELL` | `aiMentorMenuMessage()` |
| `EXPIRED` | `aiMentorMenuMessage()` |
| default | `fallbackByLifecycle(...)` |

## Правило архітектури
- Handlers = orchestration only (routing/state checks/calls)
- Zero copy в handler; весь текст у content-файлах (`abTest.start.ts`, `abTest.*.ts`)
