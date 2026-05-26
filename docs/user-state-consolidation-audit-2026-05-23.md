# User State Consolidation Audit (Safe, Non-Breaking)

Date: 2026-05-23
Scope: `backend`, `apps/web`, Prisma schema, runtime flows, Telegram, scheduler, payments

## Goal
Consolidate User state architecture safely, without breaking:
- auth
- telegram flows
- onboarding
- runtime
- prisma client
- subscriptions/payments
- scheduler
- admin panel

No column drops in this phase.

## Current User Schema Status
File: `packages/db/prisma/schema.prisma`

Legacy candidates identified:
- `User.name`
- `User.uiSettings`
- `User.onboardingStage`
- `User.lifecycleState`

Safe action completed:
- Added inline Prisma comments: `// LEGACY — remove after consolidation` above those 4 fields.

## Usage Audit Summary
Command snapshots used:
- `rg -n "...target fields..." backend/src apps/web/src packages/db/prisma/schema.prisma`
- Focused scans exported to `/tmp/audit_name_hits.txt` and `/tmp/audit_state_hits.txt`

High-level counts:
- Name-related hot paths (`name` fallback around user identity/display): 61 strong hits in focused list.
- State/settings related (`uiSettings`, `onboardingStage`, `lifecycleState`, `current*`, `funnelStage`): 525 hits in focused list.

These counts confirm that direct drop/rename is unsafe without staged migration.

## Critical Hotspots (Must Migrate Before Any DROP)

### 1) `name` (User identity/display)
Backend examples:
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/user/identity.service.ts`
- `backend/src/modules/zoom/service.ts`
- `backend/src/modules/zoom/battle.service.ts`
- `backend/src/services/scheduler/operations.jobs.ts`
- `backend/src/modules/analytics/service.ts`

Frontend examples:
- `apps/web/src/features/user/userMenu/UserMenu.tsx`
- `apps/web/src/features/dashboard/pages/DashboardPage.tsx`
- `apps/web/src/ui/Avatar.tsx`
- `apps/web/src/features/goals/pages/GoalsPage.tsx`

### 2) `uiSettings` (to merge into `settings.ui`)
Backend examples:
- `backend/src/lib/db/userCache.ts`
- `backend/src/modules/ab-test/routes.ts`
- `backend/src/products/absystem/config/welcomeTest.payment.ts`
- `backend/src/modules/user/identity.service.ts`
- `backend/src/modules/telegram-mentor/handlers/start.ts`

### 3) `onboardingStage` (to merge into `currentStep`)
Backend examples:
- `backend/src/modules/onboarding/services.ts`
- `backend/src/modules/onboarding/middleware/requireOnboardingStage.ts`
- `backend/src/modules/flow-control/service.ts`
- `backend/src/modules/telegram-mentor/core/state.service.ts`
- `backend/src/modules/telegram-mentor/services/productSummary.service.ts`

### 4) `lifecycleState` (retain behavior via `currentState` + `funnelStage`)
Backend examples:
- `backend/src/services/scheduler/*.jobs.ts`
- `backend/src/modules/subscriptions/payments/business.processing.ts`
- `backend/src/modules/telegram-mentor/handlers/start.ts`
- `backend/src/modules/zoom/controller.ts`
- `backend/src/core/access/behavioralAccess.ts`

## Safe Target Mapping (Approved Direction)
- Keep: `firstName`, `lastName`
- Legacy remove later: `name`
- Introduce/standardize derived full name helper:
  - `fullName = [firstName, lastName].filter(Boolean).join(' ')`

- Keep: `settings`
- Legacy remove later: `uiSettings`
- Target settings shape:
  - `settings.ui`
  - `settings.notifications`
  - `settings.ai`
  - `settings.onboarding`

- Keep: `currentStep`
- Legacy remove later: `onboardingStage`

- Keep: `currentState`, `funnelStage`
- Legacy remove later: `lifecycleState`

- Telegram identity fields remain unchanged:
  - `telegramUserId`, `telegramChatId`, `telegramUserName`, `telegramLinkedAt`

## Recommended Safe Migration Order
1. Data move layer
   - Read legacy + new fields, write both where needed.
   - Backfill:
     - `settings.ui <- uiSettings`
     - `currentStep <- onboardingStage` (mapping policy)
     - `firstName/lastName` derived flows without requiring `name`

2. Runtime logic switch
   - Replace reads to legacy fields with consolidated reads.
   - Keep compatibility fallback during transition.

3. Prisma query switch
   - Update `select/include/update` to consolidated fields.
   - Remove legacy writes except compatibility bridge if needed.

4. Frontend switch
   - Replace `user.name` display fallbacks with `firstName/lastName` helper fallback to email.
   - Replace any `uiSettings` usage with `settings.ui`.

5. Drop legacy columns (final phase only)
   - Only after grep audit is fully clean and runtime checks pass.

## Risk Notes
- Highest-risk area for regressions: scheduler + telegram mentor + auth completion checks.
- `lifecycleState` is deeply integrated into business logic; this must be mapped carefully, not hard-swapped.
- `name` removal impacts UI initials and greeting copy in multiple screens/components.

## Next Safe Implementation Chunk
1. Introduce shared `fullName` helper (backend + web) and migrate display reads from `name` to helper+email fallback.
2. Add compatibility accessor for `settings.ui` with fallback to `uiSettings`.
3. Start replacing onboarding reads with `currentStep` + fallback to `onboardingStage`.
