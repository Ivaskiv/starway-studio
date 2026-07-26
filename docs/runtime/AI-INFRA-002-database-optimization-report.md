# AI-INFRA-002 Database Optimization Report

Date: 2026-07-24

## Scope

This step optimized only database access patterns that were already inside the audited scheduler-pressure area described by:

- `docs/audit/prisma-disconnect-forensic.md`
- `docs/runtime/AI-INFRA-001A-runtime-separation-report.md`
- `docs/runtime/AI-INFRA-001B-cross-process-hardening-report.md`

No runtime architecture, scheduler timing, cron frequency, deployment, schema, or business rules were changed.

## Source Audit Basis

The root audit did not authorize broad Prisma cleanup. It identified scheduler-side pool pressure and overlapping cron load as the confirmed area of concern.

The optimized locations below were chosen only because they were part of the audited background scheduler path and contained confirmed patterns of:

- `findMany() -> for (...) -> count()/findFirst()/findUnique()`
- sequential per-row writes that could be reduced to one bulk write

## Optimized Locations

### 1. `backend/src/services/scheduler/ai-seller.jobs.ts`

#### `aiSellerFocusCheck24hCron`

Confirmed pattern before:

- `user.findMany(...)`
- per candidate user:
  - `zoomSessionAttendee.findFirst(...)`
  - `zoomSessionAttendee.count(...)`

Optimization:

- replaced per-user attendee reads with one bulk attendee fetch
- derived first attended timestamp in memory
- removed redundant count query because `findFirst(...)`/first-attended existence already implied at least one attended session

Before:

- base round-trips: `1`
- per eligible candidate user: `2`
- total: `1 + 2N`

After:

- base round-trips: `2`
  - `user.findMany(...)`
  - `zoomSessionAttendee.findMany(...)`
- per eligible sent user: `1 update`
- total read path before first send/update: `2`

Measured reduction:

- read round-trips reduced from `1 + 2N` to `2`
- removed `N` attendee `count(...)` queries entirely

Reason:

- verified N+1 in an audited background AI job

#### `aiSellerFocusDojimBeforeZoom2Cron`

Confirmed pattern before:

- `user.findMany(...)`
- per candidate user:
  - `zoomSessionAttendee.count(...)`
  - `user.findUnique(...)`
  - `zoomSession.findFirst(...)`

Optimization:

- replaced per-user attendee counts with one bulk attendee fetch
- resolved the next upcoming Zoom session once for the whole job
- removed per-user lifecycle re-read that duplicated already loaded lifecycle fields from the initial user snapshot

Before:

- base round-trips: `1`
- per candidate user: `3`
- total: `1 + 3N`

After:

- base round-trips: `3`
  - `user.findMany(...)`
  - `zoomSessionAttendee.findMany(...)`
  - `zoomSession.findFirst(...)`
- per eligible sent user: `1 update`

Measured reduction:

- read round-trips reduced from `1 + 3N` to `3`
- removed `N` repeated `nextZoom` lookups
- removed `N` repeated user lifecycle re-reads

Reason:

- verified N+1 in an audited background AI job

### 2. `backend/src/services/scheduler/lifecycle.jobs.ts`

#### `mentorReadinessCheckCron`

Confirmed pattern before:

- `productSubscription.findMany(...)`
- per candidate subscription:
  - `zoomSessionAttendee.count(...)`
  - `weeklyReport.findMany(... take: 4 ...)`

Optimization:

- replaced per-user attended-session counts with one bulk attendee fetch
- replaced per-user weekly report reads with one bulk report fetch
- kept evaluation semantics identical by slicing/counting in memory per user

Before:

- base round-trips: `1`
- per candidate user: `2`
- total: `1 + 2N`

After:

- base round-trips: `3`
  - `productSubscription.findMany(...)`
  - `zoomSessionAttendee.findMany(...)`
  - `weeklyReport.findMany(...)`

Measured reduction:

- read round-trips reduced from `1 + 2N` to `3`

Reason:

- verified N+1 in audited scheduler lifecycle jobs

#### `personalProgramCheckCron`

Confirmed pattern before:

- `productSubscription.findMany(...)`
- per candidate subscription:
  - `zoomSessionAttendee.count(...)`
  - `weeklyReport.findMany(... take: 8 ...)`

Optimization:

- same batching approach as `mentorReadinessCheckCron`

Before:

- total read round-trips: `1 + 2N`

After:

- total read round-trips: `3`

Measured reduction:

- read round-trips reduced from `1 + 2N` to `3`

Reason:

- verified N+1 in audited scheduler lifecycle jobs

#### `scheduleWinbackNotification`

Confirmed pattern before:

- `productSubscription.findMany(...)`
- per candidate subscription:
  - `dailyCycleLog.count(...)`
  - `dailyCycleLog.count(... choice = CHOSE_NEW ...)`

Optimization:

- replaced both per-user count queries with two bulk `dailyCycleLog.findMany(...)` reads
- aggregated total cycles and decision cycles in memory

Before:

- total read round-trips: `1 + 2N`

After:

- total read round-trips: `3`
  - `productSubscription.findMany(...)`
  - `dailyCycleLog.findMany(...)`
  - `dailyCycleLog.findMany(...)`

Measured reduction:

- read round-trips reduced from `1 + 2N` to `3`

Reason:

- verified duplicated count round-trips in audited lifecycle scheduler path

#### `referralCheckCron`

Confirmed pattern before:

- `productSubscription.findMany(...)`
- per candidate subscription:
  - `weeklyReport.findMany(... take: 3 ...)`

Optimization:

- replaced per-user latest-report reads with one bulk `weeklyReport.findMany(...)`
- preserved semantics by keeping only the latest three summaries per user in memory

Before:

- total read round-trips: `1 + N`

After:

- total read round-trips: `2`

Measured reduction:

- read round-trips reduced from `1 + N` to `2`

Reason:

- verified N+1 in audited lifecycle scheduler path

### 3. `backend/src/services/scheduler/operations.jobs.ts`

#### `expireMicroTasksCron`

Confirmed pattern before:

- `microTask.findMany(...)`
- sequential loop of `microTask.update(...)` for every expired task

Optimization:

- replaced sequential row-by-row status updates with one `updateMany(...)`

Before:

- write round-trips: `1 + N`

After:

- write round-trips: `1`

Measured reduction:

- removed `N` per-task update round-trips

Reason:

- verified safe bulk write on the audited scheduler path

## Benchmark Summary

The benchmark below is based on database round-trips per job execution path, because this step was constrained to verified audit findings and did not introduce any new runtime instrumentation or caching.

| Location | Before | After | Delta |
| --- | --- | --- | --- |
| `aiSellerFocusCheck24hCron` | `1 + 2N` reads | `2` reads | `2N - 1` fewer reads |
| `aiSellerFocusDojimBeforeZoom2Cron` | `1 + 3N` reads | `3` reads | `3N - 2` fewer reads |
| `mentorReadinessCheckCron` | `1 + 2N` reads | `3` reads | `2N - 2` fewer reads |
| `personalProgramCheckCron` | `1 + 2N` reads | `3` reads | `2N - 2` fewer reads |
| `scheduleWinbackNotification` | `1 + 2N` reads | `3` reads | `2N - 2` fewer reads |
| `referralCheckCron` | `1 + N` reads | `2` reads | `N - 1` fewer reads |
| `expireMicroTasksCron` | `1 + N` writes | `1` write | `N` fewer writes |

Where `N` is the number of candidate users/subscriptions/tasks processed by that cron run.

## Pool Pressure Effect

Pool pressure was reduced only through verified query-pattern changes:

- fewer per-user Prisma round-trips during cron bursts
- fewer sequential writes during mass expiry
- no changes to Prisma pool configuration
- no changes to Neon/Supabase configuration
- no changes to cron timing or overlap schedule

This directly targets the previously audited risk area: many scheduler jobs colliding in the same minute and multiplying background query concurrency.

## Remaining Confirmed Hotspots

These remain confirmed scheduler-path hotspots from the same audited area, but were not changed in this step because they require additional behavior review or broader batching work:

1. `backend/src/services/scheduler/operations.jobs.ts`
- `subscriptionExpiringCron`
- still performs per-user `subscription.findFirst(...)`

2. `backend/src/services/scheduler/billing.jobs.ts`
- `scheduleInactivityComeback`
- still performs per-user `notificationJob.findFirst(...)` dedupe lookup on JSON payload

3. `backend/src/services/scheduler/daily.jobs.ts`
- `dailyMorningCron`
- `dailyEveningCron`
- `streakRiskCron`
- `weeklySummaryCron`
- `aiInactiveCron`
- `streakBrokenCron`
- these still contain per-user access or analysis calls inside cron loops

4. `backend/src/services/scheduler/operations.jobs.ts`
- `subscriptionExpiredCron`
- still performs per-user lifecycle sync / paused-context / weekly-analysis work

## Deferred Items

Deferred on purpose:

- Prisma pool configuration
- Neon/Supabase pool configuration
- runtime architecture changes
- scheduler timing/frequency changes
- caching
- speculative optimization outside the audited scheduler path

## Files Changed For This Step

- `backend/src/services/scheduler/ai-seller.jobs.ts`
- `backend/src/services/scheduler/lifecycle.jobs.ts`
- `backend/src/services/scheduler/operations.jobs.ts`
- `docs/runtime/AI-INFRA-002-database-optimization-report.md`
