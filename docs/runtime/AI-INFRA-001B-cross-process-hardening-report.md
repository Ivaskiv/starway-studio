# AI-INFRA-001B Cross-Process Hardening Report

Date: 2026-07-24

## Verdict

- Runtime separation remains valid for the intended two-process topology:
  - one interactive runtime
  - one background runtime
- Telegram ownership is unique to the interactive runtime.
- Scheduler and worker ownership remain exclusive to the background runtime.
- Correctness-critical cross-process coordination is backed by shared persistence where it matters most:
  - Postgres advisory locks
  - database idempotency fences
  - runtime outbox dedupe keys
- Process-local singleton assumptions still exist, but they are now explicitly documented below.

## Startup Hardening Fixes Applied In This Step

The audit found that explicit shell environment variables could be overwritten during module import by early dotenv loaders in:

- `backend/src/runtime/runtimeBootstrap.ts`
- `backend/src/app.ts`
- `packages/db/src/client.ts`

That behavior could invalidate independent runtime startup configuration.

The loaders were hardened so that:

- explicit process env wins
- `.env` and `.env.local` only backfill missing values
- runtime startup flags can be controlled externally as expected

## Singleton Audit

### Correctness-Critical Orchestration / Locking

1. `backend/src/core/runtime/runtimeIdempotency.ts`
- Purpose: advisory lock + replay fence for callbacks, jobs, and runtime events
- State type: shared
- Mechanism: Postgres advisory locks + persisted event/job inspection
- Cross-process safety: safe across interactive/background split
- Correctness impact: high

2. `backend/src/core/runtime/runtimeOutbox.ts`
- Purpose: persisted dedupe and replay-safe deferred side effects
- State type: shared
- Mechanism: `runtimeOutbox` rows + `dedupeKey` + advisory lock on processor
- Cross-process safety: safe across interactive/background split
- Correctness impact: high

3. `backend/src/services/scheduler/index.ts`
- Purpose: cron registration and local concurrency gating
- State:
  - `scheduledTasks`
  - `registeredCronKeys`
  - `schedulerStarted`
  - `schedulerStopping`
  - `activeScheduledTasks`
  - `scheduledTaskWaiters`
- State type: process-local
- Cross-process safety:
  - registration uniqueness is local to one background process
  - actual task execution is additionally guarded by `withRuntimeAdvisoryLock(...)`
- Correctness impact:
  - safe for the intended single-background-process topology
  - unsafe for multi-background-replica scheduling without additional coordination

4. `backend/src/services/notifications/worker.ts`
- Purpose: local notification worker lifecycle
- State:
  - `workerTimer`
  - `workerRunning`
  - `workerStopping`
- State type: process-local
- Cross-process safety:
  - safe for one background process
  - duplicate pollers possible with multiple background replicas
- Correctness impact: medium

5. `backend/src/services/runtimeOutbox/worker.ts`
- Purpose: local outbox worker lifecycle
- State:
  - `workerTimer`
  - `workerRunning`
  - `workerStopping`
- State type: process-local
- Cross-process safety:
  - processor itself is protected by advisory lock inside `processRuntimeOutbox(...)`
  - duplicate timers across replicas are wasteful but not a correctness break
- Correctness impact: low-to-medium

6. `backend/src/core/dna/queues/dna.workers.ts`
- Purpose: local worker bootstrap guard
- State:
  - `started`
- State type: process-local
- Cross-process safety:
  - each background replica can still start BullMQ workers
  - queue semantics, not this flag, determine correctness
- Correctness impact: low for current topology

### Telegram / Interactive Delivery State

7. `backend/src/lib/telegram.ts`
- Purpose: bot client singletons + duplicate message suppression
- State:
  - `telegramBotInstance`
  - `contentBotInstance`
  - `coachBotInstance`
  - `testBotInstance`
  - `lastMessageHashes`
- State type: process-local
- Cross-process safety:
  - fine for one interactive runtime
  - duplicate-send suppression is not shared across interactive replicas
- Correctness impact: low for current topology, medium if interactive is horizontally scaled

8. `backend/src/modules/telegram-mentor/conversation/delivery/planDelivery.ts`
- Purpose: per-chat in-process delivery ordering and duplicate suppression
- State:
  - `sendOrderByChat`
  - `activeOperationByChat`
  - `deliveredKeys`
- State type: process-local
- Cross-process safety:
  - fine for one interactive runtime
  - not sufficient for multiple interactive replicas
- Correctness impact: low for current topology

9. `backend/src/modules/telegram-mentor/conversation/dedupe/updateDedupe.ts`
- Purpose: short-TTL update dedupe
- State:
  - `processedUpdates`
- State type: process-local
- Cross-process safety: single interactive process assumption
- Correctness impact: low for current topology

10. `backend/src/modules/telegram-mentor/index.ts`
- Purpose: legacy update dedupe
- State:
  - `processedUpdates`
- State type: process-local
- Cross-process safety: single interactive process assumption
- Correctness impact: low for current topology

11. `backend/src/modules/telegram-mentor/handlers/start.ts`
- Purpose: `/start` duplicate suppression
- State:
  - `processedStartUpdateIds`
- State type: process-local
- Cross-process safety: single interactive process assumption
- Correctness impact: low for current topology

12. `backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts`
- Purpose: short-TTL `start_trial` duplicate suppression
- State:
  - `startTrialSentAt`
- State type: process-local
- Cross-process safety:
  - local fast-path only
  - backed by persisted `runtimeOutbox` dedupe key before the welcome side effect
- Correctness impact: low

13. `backend/src/modules/telegram-mentor/core/state.service.ts`
- Purpose: request-local linked user resolution cache
- State:
  - `linkedUserResolutionCache`
- State type: process-local, request-scoped WeakMap
- Correctness impact: none across processes

14. `backend/src/modules/telegram-mentor/services/requestContext.service.ts`
- Purpose: request-local AI context cache
- State:
  - `requestContextCache`
- State type: process-local, request-scoped WeakMap
- Correctness impact: none across processes

### Provider / Cache State

15. `packages/ai/src/providers/index.ts`
- Purpose: SDK client reuse
- State:
  - `cachedOpenAi`
  - `cachedAnthropic`
  - `cachedGemini`
- State type: process-local
- Cross-process safety: safe, performance-only
- Correctness impact: none

16. `backend/src/modules/sales-assistant/pipeline/provider-health.service.ts`
- Purpose: provider failure/cooldown memory for Sales Assistant pipeline
- State:
  - internal `health` map
- State type: process-local
- Cross-process safety:
  - provider cooldown state is not shared between runtimes or replicas
  - this is outside the canonical assistant interactive path, but it is a documented singleton assumption
- Correctness impact: medium for that subsystem, not a blocker for assistant runtime separation

17. `backend/src/core/dna/telemetry/dna.queue-telemetry.ts`
- Purpose: in-memory queue metrics aggregation
- State:
  - `metrics`
  - `subscribed`
- State type: process-local
- Cross-process safety: observability-only
- Correctness impact: none

18. `backend/src/core/dna/queues/dna.queue.redis.ts`
- Purpose: reusable Redis health client
- State:
  - `healthClientPromise`
  - `state`
- State type: process-local
- Cross-process safety: safe
- Correctness impact: none

19. `backend/src/core/runtime/runtimeRedis.ts`
- Purpose: reusable Redis client
- State:
  - `clientPromise`
- State type: process-local
- Cross-process safety: safe
- Correctness impact: none

20. `backend/src/middleware/rateLimiter.ts`
- Purpose: API rate limiting
- State type: process-local memory store from `express-rate-limit`
- Cross-process safety:
  - not shared across replicas
  - applies only to HTTP-serving interactive runtime
- Correctness impact: medium if interactive is scaled horizontally

21. `backend/src/middleware/rateLimiter.redis.ts`
- Purpose: optional Redis-backed shared limiter
- State type: shared when enabled
- Cross-process safety: safe when this variant is used
- Correctness impact: low

## Lock Audit

### Process-Safe Locks

- `withRuntimeAdvisoryLock(...)` in `backend/src/core/runtime/runtimeIdempotency.ts`
  - process-safe via Postgres advisory locks
- callback replay fences via `claimRuntimeEventReplay(...)`
  - process-safe via persisted event inspection
- job replay fences via `claimRuntimeJobReplay(...)`
  - process-safe via persisted notification job inspection
- outbox dedupe via `runtimeOutbox.dedupeKey`
  - process-safe via database uniqueness

### Process-Local Guards That Are Not Cross-Replica Locks

- scheduler `registeredCronKeys`
- scheduler `schedulerStarted`
- notification worker `workerRunning`
- runtime outbox worker `workerRunning`
- Telegram delivery dedupe maps/sets
- `/start` and update dedupe sets
- in-memory provider cooldown map in Sales Assistant

These are acceptable for the current topology only because runtime ownership is exclusive:

- one interactive runtime
- one background runtime

## Telegram Lifecycle Audit

Verified by code audit:

- Only `backend/src/interactive/index.ts` imports and launches Telegram bots:
  - `launchBot(...)`
  - `setWebhook(...)`
  - `deleteWebhook(...)`
  - polling/webhook mode resolution
- `backend/src/background/index.ts` does not import:
  - `createApp()`
  - `bot`
  - `launchBot(...)`
  - webhook route setup
  - polling startup

Conclusion:

- Telegram listener ownership is unique to the interactive runtime.

## Background Safety Audit

Verified by code audit:

- `backend/src/background/index.ts` starts:
  - `startScheduler()`
  - `startDnaQueueTelemetry()`
  - `startDnaQueueWorkers()`
- It does not create:
  - HTTP server
  - REST routes
  - SSE transport
  - Mini App endpoints
  - Telegram webhook routes
  - Telegram polling/webhook listeners

Conclusion:

- Background runtime cannot expose interactive transports through its canonical entrypoint.

## Interactive Safety Audit

Verified by code audit:

- `backend/src/interactive/index.ts` starts:
  - `createApp()`
  - HTTP listener
  - Telegram startup
- It does not start:
  - `startScheduler()`
  - notification worker
  - runtime outbox worker
  - DNA queue workers

Conclusion:

- Interactive runtime cannot execute background scheduler ownership through its canonical entrypoint.

## Provider State Audit

- Canonical assistant path does not use a shared in-memory provider circuit breaker.
- `packages/ai/src/providers/index.ts` caches SDK clients only.
- `backend/src/core/runtime/runtimeResilience.ts` derives breaker state from persisted events and counts, not from in-memory shared state.
- Sales Assistant has a process-local provider health map in `providerHealthService`, but that is outside the assistant canonical runtime and remains documented as a local assumption.

Conclusion:

- No assistant-runtime provider fallback correctness depends on cross-process shared memory.

## Startup Validation

### Verified

- Background runtime booted independently and reached ready state while owning only scheduler-side responsibilities.
- Interactive runtime ownership remains code-isolated from scheduler/workers.

### Important Note

- Local startup verification was affected by an already-occupied port `3001` and by TypeScript runner env-loading behavior during ad-hoc local checks.
- The code-level startup defect found during this audit was the early env override issue described above, and it was fixed.

## Failure Simulation

### Interactive Runtime Stopped, Background Alive

Expected and code-consistent behavior:

- scheduler continues
- workers continue
- Telegram/web/API unavailable
- no background component attempts to recreate Telegram listeners

### Background Runtime Stopped, Interactive Alive

Expected and code-consistent behavior:

- Telegram/web/API continue
- assistant conversation path continues
- scheduled reminders / lifecycle scans / workers stop
- no interactive component attempts to recreate scheduler ownership

## Regression

Validated in this step:

- `pnpm test:mentor:quality`
- backend typecheck
- web typecheck

During validation one regression blocker was found:

- `backend/src/modules/assistant/assistant.scheduler.test.ts`
  - full cron audit exceeded the default 5s Vitest timeout

Fix applied:

- increased only that test timeout to 15s

The test logic and scheduler behavior were not changed.

## Final Risk Assessment

### Low Risk In Current Topology

- request-scoped WeakMap caches
- SDK client caches
- Redis client singletons
- DNA telemetry counters

### Acceptable But Topology-Sensitive

- scheduler local registration guards
- notification worker lifecycle flags
- outbox worker lifecycle flags
- Telegram delivery dedupe maps
- in-memory HTTP rate limiting
- Sales Assistant provider cooldown map

These are acceptable only while deployment preserves:

- exactly one interactive runtime owner
- exactly one background runtime owner

## Conclusion

- Runtime separation is safe for the intended two-process production model.
- No new cross-process correctness regression was found in the canonical assistant path.
- Process-local assumptions are now documented.
- The only code-level hardening issue found in this audit was env override precedence during startup, and it was fixed.
