# AI-INFRA-001A Runtime Separation Report

Date: 2026-07-24

## Summary

- Interactive runtime entrypoint: `backend/src/interactive/index.ts`
- Background runtime entrypoint: `backend/src/background/index.ts`
- Compatibility entrypoint: `backend/src/index.ts` now aliases the interactive runtime
- Canonical cron registry owner: `backend/src/services/scheduler/index.ts`
- Telegram ownership: interactive runtime only
- Scheduler ownership: background runtime only
- Background worker ownership: background runtime only

## Migrated Cron Registrations

The following direct `node-cron` registrations were migrated into the canonical scheduler registry:

- `zoomWeeklyChannelSyncCron`
- `zoomSwapExpiryCron`
- `zoomWeeklySessionGenerationCron`
- `battleCleanupCron`

They previously lived in:

- `backend/src/modules/zoom/zoom.notifications.ts`
- `backend/src/modules/zoom/battle.cron.ts`

They now execute only through `backend/src/services/scheduler/index.ts`.

## Ownership

### Interactive Runtime

Owns:

- HTTP server
- Telegram polling / webhook bootstrap
- Telegram webhook request handling through Express routes
- Website
- Mini App
- REST
- SSE
- AI Assistant
- AI Mentor
- Decision Engine
- Context Builder

Does not start:

- scheduler
- notification job worker
- runtime outbox worker
- DNA queue workers
- background cron jobs

### Background Runtime

Owns:

- canonical scheduler registry
- reminder execution
- lifecycle execution
- weekly AI jobs
- monthly AI jobs
- analytics / reporting jobs
- notification job worker
- runtime outbox worker
- DNA queue workers
- maintenance jobs

Does not start:

- HTTP server
- Telegram polling
- Telegram webhook bootstrap
- Telegram webhook listeners

## Cross-Process Safety Audit

### Finding 1

- Location: `backend/src/lib/telegram.ts`
- State: `lastMessageHashes`
- Purpose: in-memory duplicate Telegram send suppression
- Risk: duplicate suppression is process-local; multiple interactive replicas can both send the same message
- Shared persistence needed: yes, if interactive runtime is horizontally scaled

### Finding 2

- Location: `backend/src/services/scheduler/index.ts`
- State: `scheduledTasks`, `registeredCronKeys`, `activeScheduledTasks`, `scheduledTaskWaiters`
- Purpose: process-local cron registration and concurrency gating
- Risk: protects only one background process; multiple background replicas can still register and execute the same jobs
- Shared persistence needed: partially already mitigated by `withRuntimeAdvisoryLock`, but registration uniqueness remains process-local

### Finding 3

- Location: `backend/src/services/notifications/worker.ts`
- State: `workerTimer`, `workerRunning`, `workerStopping`
- Purpose: local notification poller lifecycle
- Risk: duplicate workers across multiple background processes unless deployment keeps a single background owner
- Shared persistence needed: only if multiple background replicas are intended

### Finding 4

- Location: `backend/src/services/runtimeOutbox/worker.ts`
- State: `workerTimer`, `workerRunning`, `workerStopping`
- Purpose: local runtime outbox poller lifecycle
- Risk: duplicate polling across multiple background processes
- Shared persistence needed: only if multiple background replicas are intended

### Finding 5

- Location: `backend/src/core/dna/queues/dna.workers.ts`
- State: `started`
- Purpose: process-local distributed worker bootstrap guard
- Risk: harmless for a single background process; multiple background replicas would each start workers
- Shared persistence needed: not necessarily, depends on BullMQ concurrency strategy and deployment model

### Finding 6

- Location: `backend/src/modules/telegram-mentor/core/state.service.ts`
- State: linked-user resolution WeakMap cache
- Purpose: request-local caching for Telegram context resolution
- Risk: low; not correctness-critical across processes
- Shared persistence needed: no

### Finding 7

- Location: `backend/src/modules/telegram-mentor/services/requestContext.service.ts`
- State: requestContext WeakMap cache
- Purpose: request-local context reuse
- Risk: low; request-scoped only
- Shared persistence needed: no

### Finding 8

- Location: `packages/ai/src/providers/index.ts`
- State: cached provider clients
- Purpose: reuse SDK clients per process
- Risk: low; performance-only, not correctness-critical
- Shared persistence needed: no

## Deployment Readiness

Required second process:

- one interactive backend process
- one background backend process

Required environment variables:

- same shared application env as current backend
- no new mandatory env vars were introduced for runtime separation

Recommended startup commands:

- interactive: `pnpm --dir backend start:interactive`
- background: `pnpm --dir backend start:background`

Local development commands:

- interactive: `pnpm --dir backend dev:interactive`
- background: `pnpm --dir backend dev:background`

Deployment implications:

- deploy interactive and background as separate long-running processes
- keep Telegram polling / webhook ownership only on interactive runtime
- keep scheduler / workers ownership only on background runtime
- if multiple background replicas are introduced later, review process-local worker guards and Telegram dedupe assumptions
