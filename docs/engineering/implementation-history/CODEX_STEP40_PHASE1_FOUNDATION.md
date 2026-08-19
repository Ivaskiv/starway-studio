# STEP 40 Phase 1 Foundation

Status: ready

## Goal

- Build the Phase 1 foundation for STEP 40 in parallel with STEP 39.
- Keep both tracks on `@test_starway_bot` for the first validation window.
- Prepare the `@starway_manager_bot` path for Nadya after Phase 1 completion.
- Make the implementation auditable, incremental, and easy to deploy.

## What This Phase Includes

- 7 days of work with audit checkpoints before deploy.
- Sequential phases `1A-1H` organized like a Codex execution plan.
- Exact files and copy-paste-ready code blocks.
- Database schema for `FunnelEvent`, `FunnelMetrics`, `ManagerTask`, and `ABTestVariant`.
- `EventLogger` to log every user action.
- Analytics engine to compute metrics hourly.
- Claude integration test with a simple Story generator.
- Manager Bot webhook for `@starway_manager_bot` for Nadya.
- Validation checklist to verify the rollout.

## Timeline

- `June 9, 2026 09:00-12:00`: STEP 39 execution window for lifecycle cases.
- `June 9, 2026 12:00-17:00`: STEP 40 foundation window.
- `June 9, 2026 17:00-18:00`: STEP 39 testing window.
- `June 9, 2026 18:00+`: STEP 40 testing and follow-up validation.

## Expected Result

- Both STEP 39 and STEP 40 are live on `@test_starway_bot` by evening.
- Nadya can start using stories and DMs on Instagram after launch.
- The manager workflow is ready to expand once Phase 1 is stable.

## Phase 1 Deliverables

- `@starway_manager_bot` is alive and reachable.
- Nadya has morning metrics visibility.
- Every user action is logged.
- Claude is already testable through the story generator.
- Dashboard shows real-time conversion metrics.

## Phase 2 Preview

- Claude generates daily Stories and DMs.
- Nadya reviews content and clicks publish.
- Instagram publishing becomes automated.

## Files To Build

### Database

- `packages/db/prisma/schema.prisma`
- Add `FunnelEvent`
- Add `FunnelMetrics`
- Add `ManagerTask`
- Add `ABTestVariant`
- Extend `User` with manager access fields

### Services

- `backend/src/services/analytics/eventLogger.ts`
- `backend/src/services/analytics/metricsCalculator.ts`
- `backend/src/services/manager-agent/dashboardService.ts`
- `backend/src/services/manager-agent/contentGenerator.ts`
- `backend/src/services/manager-agent/taskQueue.ts`

### API

- `backend/src/api/manager/index.ts`
- `backend/src/api/analytics/dashboard.ts`
- `backend/src/api/manager/tasks.ts`
- `backend/src/api/manager/generate-content.ts`

### Config

- `backend/src/config/manager.config.ts`
- `backend/src/config/claude.prompts.ts`

## Validation Checklist

- Database schema is migrated successfully.
- Event logging is wired into every key user action.
- Analytics job runs hourly without errors.
- Claude test generation returns valid content.
- Manager Bot webhook responds correctly.
- Dashboard shows stable numbers in real time.

## Deployment Note

- This is not a project freeze.
- It is a parallel expansion of the existing STEP 39 track.
- When STEP 39 deploys successfully, Phase 2 can start immediately.

## Next Step

- Copy this file into Codex as the Phase 1 foundation reference.
- Run the implementation in the same workspace.
- After completion, move to Phase 2 content generation.
