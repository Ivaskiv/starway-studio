# Prisma Disconnect Forensic Audit

Scope: static audit for Prisma/Supabase disconnect symptoms plus opt-in forensic logging guarded by `DB_FORENSIC_LOGGING`.

## Question 1 — Where PrismaClient is created and how many exist in backend runtime

`new PrismaClient` occurrences:

1. [packages/db/src/client.ts](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:182)
   This is the live backend singleton. `backend/src/db/client.ts` re-exports it from `@starway/db` at [backend/src/db/client.ts:1-4](/Users/viravira/Documents/starway-studio/backend/src/db/client.ts:1), and `backend/src/index.ts` imports that wrapper at [backend/src/index.ts:10](/Users/viravira/Documents/starway-studio/backend/src/index.ts:10). The singleton is also cached on `globalThis` in non-production at [packages/db/src/client.ts:18-24](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:18) and [243-245](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:243).

2. [packages/db/prisma/seed.ts:71](/Users/viravira/Documents/starway-studio/packages/db/prisma/seed.ts:71)
   Isolated seed script. Not imported by backend runtime.

3. [backend/src/etap7-step7.test.ts:10](/Users/viravira/Documents/starway-studio/backend/src/etap7-step7.test.ts:10)
   Vitest-only test client. Not imported by backend runtime.

Final runtime count for the process started by `pnpm dev` / `pnpm start`:

- `1` live `PrismaClient` instance in the backend process.
- Seed and test clients are separate processes, not additional backend-runtime instances.

## Question 2 — All `$disconnect()` calls

1. [backend/src/index.ts:377-391](/Users/viravira/Documents/starway-studio/backend/src/index.ts:377)
   `safePrismaDisconnect()` during graceful shutdown. Normal.

2. [packages/db/prisma/seed.ts:560](/Users/viravira/Documents/starway-studio/packages/db/prisma/seed.ts:560)
   `finally` in seed script. Normal isolated script cleanup.

3. [backend/src/scripts/user-consolidation-backfill.ts:84-90](/Users/viravira/Documents/starway-studio/backend/src/scripts/user-consolidation-backfill.ts:84)
   `finally` in one-off script. Normal isolated script cleanup.

4. [backend/scripts/merge-users.ts:71-78](/Users/viravira/Documents/starway-studio/backend/scripts/merge-users.ts:71)
   `finally` in one-off script. Normal isolated script cleanup.

5. [backend/src/etap7-step7.test.ts:35-38](/Users/viravira/Documents/starway-studio/backend/src/etap7-step7.test.ts:35)
   `afterAll` in test. Normal isolated test cleanup.

Result:

- No `$disconnect()` call was found inside request-path `finally` blocks.
- No live backend request handler disconnects Prisma mid-process.

## Question 3 — `$transaction` blocks and external awaits inside them

Inspected transaction blocks:

1. [backend/src/products/ab-system/telegram/abTest.markers.ts:40-42](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.markers.ts:40)
   Only `tx.user.update` + `tx.notificationJob.deleteMany`.
   External network await inside block: `no`.

2. [backend/src/modules/user/identity.service.ts:1052-1057](/Users/viravira/Documents/starway-studio/backend/src/modules/user/identity.service.ts:1052)
   Wraps `mergeUsersTx(tx, ...)`.
   External network await inside block: `no direct network call in wrapper`; wrapper body is DB merge logic.

3. [backend/src/modules/user/identity.service.ts:1069-1088](/Users/viravira/Documents/starway-studio/backend/src/modules/user/identity.service.ts:1069)
   `getMergeCandidate`, `findUserByEmailTx`, `tx.user.update`, optional `mergeUsersTx`.
   External network await inside block: `no`.

4. [backend/src/modules/user/identity.service.ts:1137-1159](/Users/viravira/Documents/starway-studio/backend/src/modules/user/identity.service.ts:1137)
   Reconcile linked and identity users via `getMergeCandidate`, `mergeUsersTx`.
   External network await inside block: `no`.

5. [backend/src/modules/auth/auth.service.ts:741-786](/Users/viravira/Documents/starway-studio/backend/src/modules/auth/auth.service.ts:741)
   `tx.user.update` + `tx.notificationPreference.upsert`.
   External network await inside block: `no`.

6. [backend/src/modules/zoom/service.ts:922-942](/Users/viravira/Documents/starway-studio/backend/src/modules/zoom/service.ts:922)
   Swap acceptance DB updates only. `notifyCoach(...)` happens after commit.
   External network await inside block: `no`.

7. [backend/src/modules/zoom/service.ts:1231-1282](/Users/viravira/Documents/starway-studio/backend/src/modules/zoom/service.ts:1231)
   Payment log create, slot reservation, swap update, user increment. Notification send happens after commit.
   External network await inside block: `no`.

8. [backend/src/modules/subscriptions/controller.ts:159-189](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/controller.ts:159)
   Grant activation updates only. `syncLifecycleForUser` / `invalidateFunnelStage` happen after commit.
   External network await inside block: `no`.

9. [backend/src/modules/subscriptions/controller.ts:339-357](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/controller.ts:339)
   Array transaction with `user.update` + `subscription.create`.
   External network await inside block: `no`.

10. [backend/src/modules/admin/routes.ts:858-901](/Users/viravira/Documents/starway-studio/backend/src/modules/admin/routes.ts:858)
    Role/expert transfer updates only.
    External network await inside block: `no`.

11. [backend/src/modules/admin/routes.ts:1029-1032](/Users/viravira/Documents/starway-studio/backend/src/modules/admin/routes.ts:1029)
    Array transaction toggling active question set.
    External network await inside block: `no`.

12. [backend/src/modules/admin/routes.ts:1224-1232](/Users/viravira/Documents/starway-studio/backend/src/modules/admin/routes.ts:1224)
    Array transaction toggling active prompt version.
    External network await inside block: `no`.

13. [backend/src/modules/subscriptions/payments/callback.handler.ts:527-587](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.handler.ts:527)
    Contains `markCheckoutSessionCompleted(..., tx)`, `tx.productSubscription.updateMany`, `tx.user.update`, `markAbTestPaymentSuccess(userId, tx)`.
    Direct external network await inside block: `no`.
    Note: helper calls inside the transaction are DB-oriented, not `fetch` / `telegram` / `openai` / `cloudinary`.

14. [backend/src/modules/subscriptions/payments/callback.processing.ts:164-208](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/callback.processing.ts:164)
    Payment log create/update plus `initiateBattle(..., dbClient: tx)`.
    External network await inside block: `no`; `initiateBattle` writes `zoomSession` only at [backend/src/modules/zoom/battle.service.ts:44-81](/Users/viravira/Documents/starway-studio/backend/src/modules/zoom/battle.service.ts:44).

15. [backend/src/modules/admin/manualPayment.service.ts:36-63](/Users/viravira/Documents/starway-studio/backend/src/modules/admin/manualPayment.service.ts:36)
    User/subscription/notification job DB updates only.
    External network await inside block: `no`.

16. [backend/src/modules/funnel/service.ts:264-305](/Users/viravira/Documents/starway-studio/backend/src/modules/funnel/service.ts:264)
    Creates funnel, loops stages, calls `generateProductFromCourse(courseId, ownerId, tx)`, creates `funnelProduct`.
    External network await inside block: `no`; `generateProductFromCourse` uses only Prisma reads/writes at [backend/src/modules/mini-courses/servise.ts:155-189](/Users/viravira/Documents/starway-studio/backend/src/modules/mini-courses/servise.ts:155).

17. [backend/src/modules/subscriptions/payments/paymentActivation.service.ts:80-133](/Users/viravira/Documents/starway-studio/backend/src/modules/subscriptions/payments/paymentActivation.service.ts:80)
    Subscription activation DB writes only.
    External network await inside block: `no`.

18. [backend/src/modules/experts/ownership.service.ts:182-201](/Users/viravira/Documents/starway-studio/backend/src/modules/experts/ownership.service.ts:182)
    Array transaction of four `updateMany` calls.
    External network await inside block: `no`.

19. [backend/src/modules/experts/routes.ts:96-123](/Users/viravira/Documents/starway-studio/backend/src/modules/experts/routes.ts:96)
    Transaction stores encrypted Telegram bot config.
    External network await inside block: `no`.
    Important nuance: `new Telegraf(...)` and `testBot.telegram.getMe()` happen before the transaction at [backend/src/modules/experts/routes.ts:84-90](/Users/viravira/Documents/starway-studio/backend/src/modules/experts/routes.ts:84), so the network call is outside the transaction.

Root-cause candidate result for Question 3:

- No inspected `$transaction` block contains a confirmed `await fetch`, `axios`, `telegram.send*`, `openai`, `whisper`, or `cloudinary` call inside the transaction body.
- Based on current code, Question 3 does **not** identify a confirmed “network call inside transaction” root cause.

## Question 4 — Current connection-pool config in `packages/db/src/client.ts`

Relevant code:

- URL normalization and Supabase pool flags: [packages/db/src/client.ts:66-156](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:66)
- Prisma client construction: [packages/db/src/client.ts:182-196](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:182)
- Keep-alive interval: [packages/db/src/client.ts:231-240](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:231)

Facts from code:

1. `DATABASE_URL`
   - Parsed and normalized through `resolveSupabasePassword(...)` then `applyRuntimePoolLimit(...)` at [158-160](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:158).
   - If hostname contains `pooler.supabase.com`, code forces `pgbouncer=true` at [74-83](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:74).
   - If `connection_limit` is missing, runtime injects it at [140-152](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:140).
   - Pool default fallback for pooler URLs is `5`, capped to `10` via `PRISMA_POOL_CONNECTION_LIMIT` at [143-150](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:143) and [105-109](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:105).
   - Port is not hardcoded here; it comes from the env URL string itself.

2. `DIRECT_URL`
   - Parsed and normalized separately at [161-163](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:161).
   - If `connection_limit` is missing, runtime injects it using `PRISMA_DIRECT_CONNECTION_LIMIT`, fallback `3`, capped to `5` at [143-150](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:143) and [111](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:111).
   - `pgbouncer=true` is only injected when the hostname is a Supabase pooler host.
   - Port is not hardcoded here either; it comes from the env URL string.

3. Prisma datasource
   - Runtime Prisma connects to `databaseUrl ?? directUrl` at [191-194](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:191).
   - So `DATABASE_URL` is primary; `DIRECT_URL` is fallback.

4. Keep-alive
   - One global interval at [231-240](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:231).
   - Frequency: every `4 * 60 * 1000` ms = `4 minutes`.
   - Work performed: `await prisma.$queryRaw\`SELECT 1\``.
   - Interval is `unref()`’d at [240](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:240).

## Question 5 — How many cron jobs can fire in the same minute

Scheduler facts:

- `safeSchedule` registry: [backend/src/services/scheduler/index.ts:61-71](/Users/viravira/Documents/starway-studio/backend/src/services/scheduler/index.ts:61)
- Scheduler concurrency limit: [backend/src/services/scheduler/index.ts:31-33](/Users/viravira/Documents/starway-studio/backend/src/services/scheduler/index.ts:31)
- Active `safeSchedule(...)` jobs: [backend/src/services/scheduler/index.ts:331-384](/Users/viravira/Documents/starway-studio/backend/src/services/scheduler/index.ts:331)

Count:

- `51` active `safeSchedule(...)` registrations in `backend/src/services/scheduler/index.ts`.

Theoretical same-minute collision analysis over a calendar year:

- Maximum simultaneous triggers in one minute: `14`.
- Sample collision minutes found by brute-force evaluation of the current cron expressions:
  - `2026-08-01T07:00:00.000Z`
  - `2026-09-01T07:00:00.000Z`
  - `2026-12-01T08:00:00.000Z`

One 14-job collision set:

- `coachDailyBriefingCron`
- `streakRiskCron`
- `weeklyContentReminderCron` or `coachWeeklyPlannerSaturdayCron` depending on calendar day
- `coachWeeklyPlannerTuesdayCron` or `coachMonthlyStrategicPlannerCron` depending on calendar day
- `aiInactiveCron`
- `billingExpiryCheckCron`
- `subscriptionExpiringCron`
- `winback3dCron`
- `microTaskReminderCron`
- `expireMicroTasksCron`
- `webMapMonthStartReminderCron`
- `aiSellerRetention7dCron`
- `abTestR1R2Cron`
- `abTestR3R4Cron`

Important surrounding context:

- `runScheduled(...)` does not run these fully in parallel without limit; it funnels them through a process-local concurrency cap of `2` at [44-58](/Users/viravira/Documents/starway-studio/backend/src/services/scheduler/index.ts:44).
- Separate legacy cron registries are also started outside `safeSchedule`: [backend/src/index.ts:492-496](/Users/viravira/Documents/starway-studio/backend/src/index.ts:492), [backend/src/modules/zoom/zoom.notifications.ts:226-270](/Users/viravira/Documents/starway-studio/backend/src/modules/zoom/zoom.notifications.ts:226), [backend/src/modules/zoom/battle.cron.ts:7-17](/Users/viravira/Documents/starway-studio/backend/src/modules/zoom/battle.cron.ts:7).

## Question 6 — Query forensic logging added

Implemented in [packages/db/src/client.ts:24-64](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:24), [182-229](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:182), and [280-290](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:280).

Behavior:

- Enabled only when `DB_FORENSIC_LOGGING === 'true'`.
- Adds Prisma event logging for `query`, `warn`, `error`.
- Emits `[DB_SLOW_QUERY]` only for queries longer than `500ms`.
- Stores only `query.slice(0, 200)`, `duration`, `target`, `timestamp`.
- Does not log params.

## Question 7 — Event loop delay monitor added

Implemented in [backend/src/index.ts:8](/Users/viravira/Documents/starway-studio/backend/src/index.ts:8) and [95-109](/Users/viravira/Documents/starway-studio/backend/src/index.ts:95).

Behavior:

- Enabled only when `DB_FORENSIC_LOGGING === 'true'`.
- Logs every `30000ms`:
  - `[EVENT_LOOP] { mean, max }`
- Interval is `unref()`’d.

## Question 8 — Ring buffer dump on connection break

Implemented in [packages/db/src/client.ts:42-64](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:42), [221-229](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:221), and [283-290](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts:283).

Behavior:

- Keeps last `5` slow-query snapshots in memory only.
- Dumps them on:
  - Prisma `error` event with recoverable connection text.
  - `withRetry(...)` recoverable connection path.

## Question 9 — Does one scheduler start another

Confirmed scheduler startup chain:

- Main backend bootstrap starts all scheduler subsystems once at [backend/src/index.ts:492-496](/Users/viravira/Documents/starway-studio/backend/src/index.ts:492).
- `startScheduler(...)` has duplicate-start protection at [backend/src/services/scheduler/index.ts:311-319](/Users/viravira/Documents/starway-studio/backend/src/services/scheduler/index.ts:311).
- `startZoomNotificationsCron()` and `startBattleCron()` do not have duplicate guards in their own files at [backend/src/modules/zoom/zoom.notifications.ts:226](/Users/viravira/Documents/starway-studio/backend/src/modules/zoom/zoom.notifications.ts:226) and [backend/src/modules/zoom/battle.cron.ts:7](/Users/viravira/Documents/starway-studio/backend/src/modules/zoom/battle.cron.ts:7).

Direct nested-cron result:

- No confirmed case was found where one cron callback directly invokes another cron callback function.
- What does exist is a single bootstrap path that starts three scheduler registries side-by-side:
  - `startScheduler(...)`
  - `startZoomNotificationsCron()`
  - `startBattleCron()`

Important nuance:

- Several scheduled jobs call shared business functions such as `scheduleTestReminders`, `scheduleProgressReminders`, `scheduleWinbackNotification`, `aiSellerRetentionCron`, `aiSellerReactivationCron`; these are worker functions, not other cron schedulers.
- So Question 9 result is: `no confirmed nested scheduler invoking another scheduler`, but `yes`, multiple scheduler registries are started by the same process.

## How to collect a real timeline

1. Start backend with:
   `DB_FORENSIC_LOGGING=true`
2. Keep it enabled for `30-60 minutes` of active bot usage so hourly and 10-minute scheduler jobs have time to run.
3. Watch for:
   - `[DB_SLOW_QUERY]`
   - `[DB_FORENSIC_LAST_QUERIES]`
   - `[EVENT_LOOP]`
   - existing `prisma:error`
4. If `Server has closed the connection` happens again after the port fix, correlate the final slow-query buffer and the latest event-loop log line immediately before it.

When `DB_FORENSIC_LOGGING=false` or unset:

- the new Prisma event listeners are not attached
- the event-loop monitor is not created
- no new forensic console output is emitted
- runtime behavior remains unchanged apart from the presence of dormant guarded code

## Timeline template

| Time | Event | Source |
| --- | --- | --- |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
