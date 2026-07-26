# AI-INFRA-002B Scheduler Hotspots Report

Date: 2026-07-24 16:50:31 EEST

## Scope

This step optimized only the scheduler hotspots explicitly listed in `docs/runtime/AI-INFRA-002-database-optimization-report.md`:

- `backend/src/services/scheduler/operations.jobs.ts`
  - `subscriptionExpiringCron`
  - `subscriptionExpiredCron`
- `backend/src/services/scheduler/billing.jobs.ts`
  - `scheduleInactivityComeback`
- `backend/src/services/scheduler/daily.jobs.ts`
  - `dailyMorningCron`
  - `dailyEveningCron`
  - `weeklySummaryCron`
  - `aiInactiveCron`

No scheduler timing, runtime architecture, schema, contracts, caching, or business rules were changed.

## Local Redundancy Audit

Confirmed local redundancies removed from modified hotspots only:

- `scheduleInactivityComeback`
  - removed duplicated candidate filtering by building the eligible candidate list once and reusing it for dedupe and scheduling
- `subscriptionExpiredCron`
  - removed duplicated paused-context lookup for trial expiration by reusing `trialEndsAt` already selected in the user query
  - removed unnecessary weekly analysis execution for post-expiration days where the generated report was not used
- `dailyMorningCron`
  - removed scheduler-side mentor access check duplicated by `NotificationService.shouldSuppressMentorNotification(...)`
- `dailyEveningCron`
  - removed scheduler-side mentor access check duplicated by `NotificationService.shouldSuppressMentorNotification(...)`
- `aiInactiveCron`
  - removed scheduler-side mentor access check duplicated by `NotificationService.shouldSuppressMentorNotification(...)`
- `weeklySummaryCron`
  - moved preference and access gating ahead of weekly analysis to avoid running analysis for users who cannot receive the notification

## Verified Query Reductions

These metrics are query-count reductions on the canonical scheduler path, derived from the audited code path before and after the change.

### `subscriptionExpiringCron`

Location:
- `backend/src/services/scheduler/operations.jobs.ts`

Change:
- replaced per-user `subscription.findFirst(...)` lookups with one batched `subscription.findMany(...)` over the already time-filtered user set

Before:
- `1` `notificationPreference.findMany(...)`
- `N` `subscription.findFirst(...)` for `N` scheduled users
- `N` mentor access resolutions unchanged

After:
- `1` `notificationPreference.findMany(...)`
- `1` batched `subscription.findMany(...)`
- `N` mentor access resolutions unchanged

Effect:
- subscription lookup round-trips: `N -> 1`
- net reduction per scheduler run: `N - 1` subscription queries

### `subscriptionExpiredCron`

Location:
- `backend/src/services/scheduler/operations.jobs.ts`

Change:
- removed per-user `resolvePausedMentorContext(...)` dependency for trial expiry by reusing `user.trialEndsAt`
- deferred `runWeeklyAnalysis(...)` until day-0 post-trial report emission only

Before:
- per candidate: `syncLifecycleForUser(...)`
- per candidate: `resolvePausedMentorContext(...)`
- per candidate: `runWeeklyAnalysis(...)`

After:
- per candidate: `syncLifecycleForUser(...)`
- no paused-context lookup in this cron
- `runWeeklyAnalysis(...)` only for day-0 expired users that also pass preference gating

Effect:
- paused-context resolution: `N -> 0`
- weekly analysis executions: `N -> D0`, where `D0` is the number of day-0 expirations that actually send `POST_TRIAL_REPORTS`

### `scheduleInactivityComeback`

Location:
- `backend/src/services/scheduler/billing.jobs.ts`

Change:
- replaced per-user `notificationJob.findFirst(...)` dedupe lookups with one batched `notificationJob.findMany(...)`
- removed duplicated eligibility filtering by reusing one computed candidate list

Before:
- `E` `notificationJob.findFirst(...)` dedupe checks for `E` eligible users

After:
- `1` `notificationJob.findMany(...)` dedupe fetch for eligible template keys

Effect:
- dedupe lookup round-trips: `E -> 1`
- net reduction per scheduler run: `E - 1` notification job queries

### `dailyMorningCron`

Location:
- `backend/src/services/scheduler/daily.jobs.ts`

Change:
- removed scheduler-side `hasMentorNotificationAccess(...)` call for matched users

Before:
- `M` mentor access resolutions for `M` matched morning users
- notification pipeline still performed its own suppression check

After:
- `0` scheduler-side mentor access resolutions
- notification pipeline suppression remains canonical

Effect:
- duplicated scheduler-side access lookups removed: `M -> 0`

### `dailyEveningCron`

Location:
- `backend/src/services/scheduler/daily.jobs.ts`

Change:
- removed scheduler-side `hasMentorNotificationAccess(...)` call for matched users

Before:
- `E` mentor access resolutions for `E` matched evening users
- notification pipeline still performed its own suppression check

After:
- `0` scheduler-side mentor access resolutions
- notification pipeline suppression remains canonical

Effect:
- duplicated scheduler-side access lookups removed: `E -> 0`

### `weeklySummaryCron`

Location:
- `backend/src/services/scheduler/daily.jobs.ts`

Change:
- moved preference and mentor-access gating ahead of `runWeeklyAnalysis(...)`

Before:
- weekly analysis could run for users later rejected by preferences or access

After:
- weekly analysis runs only for users that passed time, preference, and access gates

Effect:
- eliminated unnecessary weekly analysis executions for ineligible users
- exact reduction depends on how many Sunday 19:00 candidates fail preference or access checks

### `aiInactiveCron`

Location:
- `backend/src/services/scheduler/daily.jobs.ts`

Change:
- removed scheduler-side `hasMentorNotificationAccess(...)` call for matched users

Before:
- `A` mentor access resolutions for `A` inactive-AI candidates
- notification pipeline still performed its own suppression check

After:
- `0` scheduler-side mentor access resolutions
- notification pipeline suppression remains canonical

Effect:
- duplicated scheduler-side access lookups removed: `A -> 0`

## Regression Validation

Executed unchanged:

- `pnpm test:assistant:e2e`
- `pnpm exec vitest run backend/src/modules/assistant/assistant.scheduler.test.ts`
- `pnpm test:mentor:quality` via `test:assistant:e2e`
- `pnpm --dir backend exec tsc --noEmit` via `test:assistant:e2e`
- `pnpm --dir apps/web exec tsc --noEmit` via `test:assistant:e2e`

Observed results:

- assistant E2E suite passed
- scheduler regression passed
- mentor quality suite passed
- backend typecheck passed
- web typecheck passed

Environment note:

- repository engines require Node `22.x`
- executed environment was Node `v23.9.0`
- the repo script emitted an unsupported-engine warning, but the commanded regressions completed successfully

## Files Changed

- `backend/src/services/scheduler/operations.jobs.ts`
- `backend/src/services/scheduler/billing.jobs.ts`
- `backend/src/services/scheduler/daily.jobs.ts`
- `docs/runtime/AI-INFRA-002B-scheduler-hotspots-report.md`

## Remaining Confirmed Scheduler Hotspots

These remain confirmed from the source audit and were not removed completely in this step:

- `backend/src/services/scheduler/operations.jobs.ts`
  - `subscriptionExpiringCron`
  - still performs per-user mentor access resolution
- `backend/src/services/scheduler/operations.jobs.ts`
  - `subscriptionExpiredCron`
  - still performs per-user lifecycle sync and still needs weekly analysis on day-0 expirations
- `backend/src/services/scheduler/daily.jobs.ts`
  - `streakRiskCron`
  - still performs per-user mentor access resolution
- `backend/src/services/scheduler/daily.jobs.ts`
  - `weeklySummaryCron`
  - still performs per-user mentor access resolution and per-user weekly analysis for eligible recipients
- `backend/src/services/scheduler/daily.jobs.ts`
  - `streakBrokenCron`
  - still performs per-user mentor access resolution

## Conclusion

The verified scheduler hotspots modified in this step now perform fewer round-trips on the canonical path without changing scheduler timing, runtime ownership, or business behaviour.
