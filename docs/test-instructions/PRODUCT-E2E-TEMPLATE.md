# PRODUCT-E2E Template

Use this template for all future `PRODUCT-E2E` steps.

## Mandatory

Before starting any work read

- `docs/engineering/ENGINEERING-CONSTITUTION.md`

Follow `RULES 1–27` without exception.

## Automated Validation

Run:

```bash
pnpm test:assistant:e2e
pnpm exec vitest run backend/src/modules/assistant/assistant.scheduler.test.ts
pnpm test:mentor:quality
pnpm --dir backend exec tsc --noEmit
pnpm --dir apps/web exec tsc --noEmit
```

Regression must remain green.

## Manual QA

Environment:

- Backend
- Worker
- Scheduler
- Website
- Telegram Bot
- Mini App

Node version:

- `22.x` only

Test user:

- Use an unresolved brand-new Telegram user unless the scenario explicitly requires otherwise.

## Scenario

- Continue from the first unfinished user action.
- Do not restart the entire journey if previous `PRODUCT-E2E` steps already verified earlier actions.
- Execute only until the first blocker.

## When A Bug Is Found

You must provide:

1. Exact failing user action.
2. Exact root cause.
3. Files changed.
4. Why this is the minimal fix.
5. Regression executed.
6. Evidence that the failed action now passes.

Do not continue to the next user action.

## Manual QA Output

Always include:

- Prerequisites
- Test user
- Exact steps
- Expected Telegram behaviour
- Expected Mini App behaviour
- Expected Backend behaviour
- Expected Database state
- Expected Logs
- Pass criteria

## Pass Format

Return only one of:

- `PASS`
- `REQUIRES_FIXES`

Always include:

1. Files changed.
2. Failed user action.
3. Root cause.
4. Root cause fixed.
5. Regression summary.
