# AI-INFRA-003 Prisma / Database / Connection Pool Production Audit

Date: 2026-07-24

## Scope

This step audited production-readiness of the existing database layer with focus on:

- Prisma client lifecycle
- PostgreSQL connectivity
- connection pool behaviour
- scheduler and worker concurrency
- transaction safety
- query lifecycle and high-frequency paths
- Node 22 validation

Only one confirmed production defect was fixed in this step. No schema, runtime architecture, business logic, scheduler cadence, or API contracts were changed.

## Implemented Fixes

### 1. Process-safe `NotificationJob` claiming

Files:

- `backend/src/services/notifications/repositories/NotificationJobRepository.ts`
- `backend/src/services/notifications/services/NotificationJobService.ts`
- `backend/src/services/notifications/worker.ts`

Confirmed issue:

- the notification job worker previously used `findMany(PENDING)` followed by per-job `update(status=PROCESSING)`
- under overlapping background processes, the same `PENDING` job could be read by more than one process before either process updated it
- if a process crashed after setting `PROCESSING`, the job had no recovery path and could remain stuck indefinitely

Implemented fix:

- replaced read-then-update with one canonical SQL claim step using `FOR UPDATE SKIP LOCKED`
- reclaim stale `PROCESSING` jobs older than `15 minutes` back into the same canonical processing path
- removed the obsolete non-atomic claim path from the modified files

Behaviour preserved:

- same queue
- same statuses
- same worker interval
- same notification execution path

## Prisma Lifecycle Analysis

### Client creation

Observed in `packages/db/src/client.ts`:

- one canonical runtime Prisma client is created through `prismaClientSingleton()`
- backend imports Prisma through `backend/src/db/client.ts`, which re-exports the shared client from `@starway/db`
- development mode stores the client on `globalThis.prisma` to prevent duplicate clients on hot reload
- production mode keeps one client per process, which is expected and correct

Additional Prisma client creation:

- `packages/db/src/client.ts` creates a temporary `directClient` only inside forensic snapshot capture and disconnects it in `finally`
- `packages/db/prisma/seed.ts` creates its own Prisma client for the standalone seed script only

Conclusion:

- no duplicate production runtime Prisma clients were found
- no correctness-critical shared state depends on multiple Prisma client instances

### Connection lifecycle and shutdown

Observed:

- interactive and background runtimes both use `connectDatabaseWithRetry()`
- shutdown paths call `safePrismaDisconnect(...)`
- background runtime stops scheduler and workers before disconnecting Prisma
- process handlers are registered for `SIGINT` and `SIGTERM`

Conclusion:

- Prisma lifecycle and shutdown are production-safe in the audited runtime paths
- no confirmed connection leak path was found in runtime startup/shutdown code

## Connection Pool Analysis

### Runtime pool configuration

Observed in `packages/db/src/client.ts`:

- `DATABASE_URL` and `DIRECT_URL` are normalized at startup
- `application_name` is always added
- if `connection_limit` is absent, runtime injects a conservative default
- current local target is not Supabase pooler, so both URLs normalize to `connection_limit=3`

Live runtime evidence from the current environment:

- `DATABASE_URL` normalized to:
  - host: `localhost`
  - port: `5432`
  - `application_name=starway-backend-development-<pid>`
  - `connection_limit=3`
- `DIRECT_URL` normalized identically

### Database capacity

Live database settings:

- `max_connections = 100`
- `superuser_reserved_connections = 3`
- `statement_timeout = 0`
- `lock_timeout = 0`
- `idle_in_transaction_session_timeout = 0`

Observed live connections during audit:

- total current connections: `13`
- active Starway application pools observed:
  - `starway-backend-development-93629`: `2`
  - `starway-backend-development-96236`: `2`
  - `starway-backend-development-97831`: `2`
  - transient audit processes: `1` each

Assessment:

- repository-side pool pressure is conservative in the audited environment because each runtime caps itself at `3`
- observed live usage stayed far below database capacity
- no pool exhaustion was observed during the audit

Production risk:

- database-level timeouts are currently unlimited in the audited environment
- this is not a repository code bug, but it increases blast radius during lock or network incidents

Classification:

- `OPTIMIZE`
- recommended as an infrastructure/database configuration follow-up, not a code-level blocker for this step

## Transaction Audit

Inspected representative transaction hotspots:

- `backend/src/modules/subscriptions/payments/paymentActivation.service.ts`
- `backend/src/modules/user/identity.service.ts`
- `backend/src/modules/zoom/service.ts`

Findings:

- transactions in the inspected hotspots are used for multi-write consistency and stay scoped to database work
- no nested Prisma transaction pattern was confirmed in the audited samples
- no network I/O was found inside the inspected transaction bodies
- follow-up work such as `autoBookAllUpcomingGroupSessions(...)` happens after transaction commit in the inspected payment activation path

Live transaction snapshot:

- active transactions: `1`
- idle in transaction: `0`
- lock waiters: `0`
- longest active transaction at sample time: `2 ms`

Conclusion:

- no confirmed long-running or deadlock-prone transaction defect was found in the audited code paths

## Query Lifecycle Audit

### High-frequency queue paths

Live plan and stats:

- `RuntimeOutbox` due-query uses `RuntimeOutbox_status_runAt_idx`
- `NotificationJob` due-query currently plans as `Seq Scan` in the audited local dataset
- `NotificationJob_status_runAt_idx` exists but had `idx_scan = 0` in current stats

Interpretation:

- `RuntimeOutbox` is using the expected index
- `NotificationJob` is currently tiny in the audited dataset (`~155 KB`, `n_live_tup = 0` at sample time), so PostgreSQL prefers sequential scan
- this is not evidence of a missing index by itself

Live table/index evidence:

- `NotificationJob` table size: `155648` bytes
- `RuntimeOutbox` table size: `507904` bytes
- `Subscription` table size: `98304` bytes

### Remaining confirmed scheduler hotspots

Confirmed from previous scheduler audit and still relevant:

- `backend/src/services/scheduler/operations.jobs.ts`
  - `subscriptionExpiringCron`
  - still performs per-user mentor access resolution
- `backend/src/services/scheduler/operations.jobs.ts`
  - `subscriptionExpiredCron`
  - still performs per-user lifecycle sync and day-0 weekly analysis
- `backend/src/services/scheduler/daily.jobs.ts`
  - `streakRiskCron`
  - still performs per-user mentor access resolution
- `backend/src/services/scheduler/daily.jobs.ts`
  - `weeklySummaryCron`
  - still performs per-user mentor access resolution and weekly analysis for eligible users
- `backend/src/services/scheduler/daily.jobs.ts`
  - `streakBrokenCron`
  - still performs per-user mentor access resolution

Classification:

- these are either `OPTIMIZE` opportunities or `REQUIRED BUSINESS LOGIC`, not confirmed correctness defects in this step

## Index Audit

Verified existing indexes for high-frequency audited paths:

- `NotificationJob`
  - `NotificationJob_status_runAt_idx`
  - `NotificationJob_type_status_idx`
- `RuntimeOutbox`
  - `RuntimeOutbox_status_runAt_idx`
  - `RuntimeOutbox_scope_type_status_idx`
  - `RuntimeOutbox_dedupeKey_key`
- `Subscription`
  - `Subscription_userId_createdAt_idx`
  - `Subscription_userId_status_idx`
  - `Subscription_status_currentPeriodEnd_idx`

Conclusion:

- no missing index was proven by measured usage in this step
- no index was added, because the audit did not prove one was required

## Memory Audit

Observed repository/runtime characteristics:

- Prisma client is a singleton per process
- keepalive interval is one unref’d interval on `globalThis`
- notification and outbox workers process bounded batches
- current batch caps:
  - notification worker: `25`
  - runtime outbox worker: `25`
  - several reminder flows use `take: 500`

Conclusion:

- no confirmed memory retention or large-object leak was found in the audited database layer

## Concurrency Audit

### Scheduler

Observed in `backend/src/services/scheduler/index.ts`:

- scheduler uses one canonical registry
- cron execution is guarded by `withRuntimeAdvisoryLock(...)`
- in-process slot limiter is `SCHEDULER_CONCURRENCY_LIMIT = 5`

Conclusion:

- canonical cron execution already has cross-process protection at the scheduler layer

### Workers

Observed:

- runtime outbox processing already uses `withRuntimeAdvisoryLock(...)`
- notification job worker did not have equivalent process-safe claim semantics before this step

Fix status:

- notification job worker race and stale-processing recovery were fixed in this step

## Failure Audit

Repository/runtime safeguards observed:

- connection check retries via `withRetry(...)`
- runtime bootstrap retries database connect
- Prisma recoverable connection errors are recognized and retried
- shutdown disconnect is protected by `safePrismaDisconnect(...)`

Limitations:

- current database settings have no statement, lock, or idle-in-transaction timeout
- live Neon/Supabase pooler behaviour was not exercised because the audited environment is local PostgreSQL

## Production Risks Found

1. `NotificationJob` worker had a cross-process double-claim window.
2. `NotificationJob` worker had no stale `PROCESSING` recovery path after process failure.
3. Database timeouts are unlimited in the audited environment.
4. Neon/Supabase connectivity code exists, but current live environment did not exercise a real Neon/Supabase target.

## Production Risks Fixed

1. Process-safe notification job claim added through atomic `FOR UPDATE SKIP LOCKED`.
2. Stale `PROCESSING` notification jobs can now be reclaimed after `15 minutes`.

## Remaining Risks

1. Database-level `statement_timeout`, `lock_timeout`, and `idle_in_transaction_session_timeout` remain `0` in the audited environment.
   Classification:
   `OPTIMIZE`
2. Remaining scheduler hotspots still contain per-user access or analysis work.
   Classification:
   mixed `OPTIMIZE` and `REQUIRED BUSINESS LOGIC`
3. Neon/Supabase path was audited by code, not by live production connectivity, because the active environment uses local PostgreSQL.
   Classification:
   `DEFERRED VALIDATION`

## Recommended Fixes

1. Keep the new atomic `NotificationJob` claim path as the single canonical worker claim flow.
2. Validate production database timeout settings outside the repository:
   - `statement_timeout`
   - `lock_timeout`
   - `idle_in_transaction_session_timeout`
3. Continue verified scheduler hotspot reductions only where audit evidence proves repeated DB work.
4. Run one production-environment smoke audit against the real Neon/Supabase target before release if production does not use the local PostgreSQL shape.

## Deferred Fixes

- database timeout policy
- any Neon/Supabase infrastructure tuning
- remaining scheduler optimizations not proven as correctness defects
- schema/index changes not proven by measured usage

## Benchmark Summary

Measured or code-derived values from this audit:

- repository runtime connection limit:
  - `DATABASE_URL`: `3`
  - `DIRECT_URL`: `3`
- database `max_connections`: `100`
- observed current total DB connections: `13`
- observed Starway connections per active process: typically `2`
- scheduler concurrency limit: `5`
- notification worker batch size: `25`
- runtime outbox worker batch size: `25`
- longest active transaction at sample time: `2 ms`
- active transactions at sample time: `1`
- lock waiters at sample time: `0`
- `RuntimeOutbox` due-query uses index scan
- `NotificationJob` due-query currently chooses seq scan on the tiny local dataset

Unavailable benchmark data:

- slowest production query across time
- maximum concurrent Prisma clients across a real production load profile
- live Neon/Supabase pooler behaviour

## Node 22 Validation

Validated under real `Node 22.23.1` using:

- `npx -y node@22 /opt/homebrew/lib/node_modules/pnpm/bin/pnpm.cjs ...`

Commands executed successfully under Node 22:

- `pnpm test:assistant:e2e`
- `pnpm exec vitest run backend/src/modules/assistant/assistant.scheduler.test.ts`
- `pnpm test:mentor:quality`
- `pnpm --dir backend exec tsc --noEmit`
- `pnpm --dir apps/web exec tsc --noEmit`

Observed differences versus Node 23 environment:

- Node 23 emitted repository engine warnings because the repo targets `22.x`
- Node 22 completed validation cleanly through the intended supported runtime
- no behaviour regression difference was observed in the executed test/typecheck commands

## Files Changed In This Step

- `backend/src/services/notifications/repositories/NotificationJobRepository.ts`
- `backend/src/services/notifications/services/NotificationJobService.ts`
- `backend/src/services/notifications/worker.ts`
- `docs/runtime/AI-INFRA-003-prisma-production-audit.md`

## Conclusion

The Prisma lifecycle is production-safe, no duplicate runtime Prisma clients were found, no connection leak was confirmed, scheduler concurrency is verified, Node 22 validation completed, and the one confirmed cross-process queue correctness defect was fixed without changing architecture or business behaviour.
