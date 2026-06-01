# User Creation Map

This map describes every runtime source that can create a new `User` and how it flows into the unified `UserCreationService`.

## Unified path

`SOURCE`  
-> `CONTROLLER/HANDLER`  
-> `SERVICE`  
-> `UserCreationService.createUser()`  
-> `prisma.user.create()`  
-> `UserCreationAudit`

## Source routes

1. `TELEGRAM_START`
- Controller/Handler: `backend/src/modules/telegram-mentor/handlers/start.ts` (`handleStart -> ensureUser`)
- Service: `ensureUser`
- Unified creation: `UserCreationService.createUser({ source: TELEGRAM_START })`

2. `TELEGRAM_MINIAPP`
- Controller: `backend/src/modules/auth/auth.controller.ts` (`telegram`)
- Service: `telegramMiniAppLoginUser -> socialLoginUser -> resolveOrCreateTelegramGuestUser`
- Unified creation: `UserCreationService.createUser({ source: TELEGRAM_MINIAPP })`

3. `GOOGLE_LOGIN`
- Controller: `backend/src/modules/auth/auth.controller.ts` (`social`)
- Service: `socialLoginUser`
- Unified creation: `UserCreationService.createUser({ source: GOOGLE_LOGIN })`

4. `LEAD_MAGNET`
- Controller: `backend/src/modules/lead-magnet/controller.ts` (`registerLeadMagnet`)
- Service: inline registration flow in controller
- Unified creation: `UserCreationService.createUser({ source: LEAD_MAGNET })`

5. `TRACKING_EVENT`
- Controller: multiple event producers
- Service: `backend/src/modules/events/service.ts` (`resolveTrackingUserId`)
- Unified creation: `UserCreationService.createUser({ source: TRACKING_EVENT })`

6. `FIRST_LOGIN`
- Controller/Entry: first-login orchestration callers
- Service: `backend/src/modules/auth/firstLogin.service.ts` (`handleFirstLogin -> createUserCompat`)
- Unified creation: `UserCreationService.createUser({ source: FIRST_LOGIN })`

7. `SYSTEM`
- Controller: `backend/src/modules/auth/auth.controller.ts` (`register`)
- Service: `registerUser -> createUserCompat`
- Unified creation: `UserCreationService.createUser({ source: SYSTEM })`

## Feature flag

- Env: `DISABLE_AUTO_USER_CREATION` (default `false`)
- Behavior:
  - `false`: normal behavior, create users.
  - `true`: creation is blocked by `UserCreationService` and attempt is rejected.
