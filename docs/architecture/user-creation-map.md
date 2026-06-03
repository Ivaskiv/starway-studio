# User Creation Map

This map describes every runtime source that can create a new `User` and how it flows into the unified `UserCreationService`.

## Unified path

`SOURCE`  
-> `CONTROLLER/HANDLER`  
-> `SERVICE`  
-> `resolveOrCreateUser()`  
-> `UserCreationService.createUser()` only when no existing identity matches  
-> `prisma.user.create()`  
-> `UserCreationAudit`

## Source routes

1. `TELEGRAM_START`
- Controller/Handler: `backend/src/modules/telegram-mentor/handlers/start.ts` (`handleStart -> ensureUser`)
- Service: `ensureUser -> resolveOrCreateUser`
- Unified creation: `resolveOrCreateUser({ telegramId, chatId, telegramUserName })`

2. `TELEGRAM_MINIAPP`
- Controller: `backend/src/modules/auth/auth.controller.ts` (`telegram`)
- Service: `telegramMiniAppLoginUser -> socialLoginUser -> resolveOrCreateUser`
- Unified creation: `resolveOrCreateUser({ telegramId, chatId, telegramUserName, email? })`

3. `GOOGLE_LOGIN`
- Controller: `backend/src/modules/auth/auth.controller.ts` (`social`)
- Service: `socialLoginUser`
- Unified creation: `resolveOrCreateUser({ email })`

4. `LEAD_MAGNET`
- Controller: `backend/src/modules/lead-magnet/controller.ts` (`registerLeadMagnet`)
- Service: `registerLeadMagnet -> resolveOrCreateUser`
- Unified creation: `resolveOrCreateUser({ email })`

5. `TRACKING_EVENT`
- Controller: multiple event producers
- Service: `backend/src/modules/events/service.ts` (`resolveTrackingUserId`)
- Unified creation: `resolveOrCreateUser({ email })`

6. `FIRST_LOGIN`
- Controller/Entry: first-login orchestration callers
- Service: `backend/src/modules/auth/firstLogin.service.ts` (`handleFirstLogin -> resolveOrCreateUser`)
- Unified creation: `resolveOrCreateUser({ email, telegram? })`

7. `SYSTEM`
- Controller: `backend/src/modules/auth/auth.controller.ts` (`register`)
- Service: `registerUser -> createUserCompat`
- Unified creation: `resolveOrCreateUser({ email })`

## Governance

- Resolve identity first with `resolveOrCreateUser()`.
- If a user already exists by email, Telegram, or link, reuse it.
- If multiple candidates exist, log a conflict and do not auto-merge.
- Only call `UserCreationService.createUser()` after resolution returns no existing user.
- Never call `prisma.user.create()` directly outside `UserCreationService`.

## Feature flag

- Env: `DISABLE_AUTO_USER_CREATION` (default `false`)
- Behavior:
  - `false`: normal behavior, create users.
  - `true`: creation is blocked by `UserCreationService` and attempt is rejected.
