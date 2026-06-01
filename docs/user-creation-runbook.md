# User Creation Runbook

## Purpose

Give operations and engineering a single place to trace who created a user, from which flow, and with what payload summary.

## Single creation entry

- Service: `backend/src/modules/user/userCreation.service.ts`
- Method: `UserCreationService.createUser()`
- Logs:
  - `USER_CREATION_ATTEMPT`
  - `USER_CREATED`
- Audit table:
  - `UserCreationAudit`

## Sources

- `TELEGRAM_START`
- `TELEGRAM_MINIAPP`
- `GOOGLE_LOGIN`
- `LEAD_MAGNET`
- `TRACKING_EVENT`
- `FIRST_LOGIN`
- `ADMIN`
- `SYSTEM`

## When user is created

Creation is attempted only when the upstream flow cannot resolve an existing user and requires onboarding/autologin continuity.

## How to find creation source in under 30s

1. Find user id by email/telegram id in `User`.
2. Query `UserCreationAudit` by `userId` ordered by `createdAt desc`.
3. Match `source` with route map in `docs/architecture/user-creation-map.md`.
4. Correlate with logs:
   - `USER_CREATION_ATTEMPT`
   - `USER_CREATED`
   - `requestId` for request trace.

## Feature flag

- `DISABLE_AUTO_USER_CREATION=false` (default)
- If set to `true`, `UserCreationService` blocks new user creation attempts.

## Notes

- This runbook does not change API contracts.
- Existing UX and onboarding flows remain unchanged while auto-creation is enabled.
