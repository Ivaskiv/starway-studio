# User Legacy Drop Runbook

## Preconditions
1. Runtime audit for legacy lifecycle reads is clean.
2. `USER_LIFECYCLE_STRICT_MODE=true` validated in staging.
3. Backfill dry-run/apply reports zero pending updates.

## Commands
1. Typecheck:
`pnpm -C backend exec tsc --noEmit`

2. Optional strict-mode staging check:
Set `USER_LIFECYCLE_STRICT_MODE=true` in staging env and run smoke flows.

3. Apply migration:
`pnpm -C packages/db exec prisma migrate deploy --schema prisma/schema.prisma`

## Guarded Migration
Migration file:
`packages/db/prisma/migrations/20260523_user_legacy_drop_ready/migration.sql`

It will fail fast if any of the legacy columns still contain data.
