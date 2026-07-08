# Prisma + Supabase + Render Compliance Audit

Date: 2026-06-12  
Scope: configuration audit only. No code or schema changes were made.

## Executive Summary

The repository is broadly aligned with the official Supabase Prisma integration pattern, but production is failing because the runtime database environment is not consistently pointing at the same Supabase project and connection target as the repo expects.

The strongest fact pattern is:

- `packages/db/prisma/schema.prisma` is correctly wired for `DATABASE_URL` and `DIRECT_URL`.
- Runtime Prisma Client is created in `packages/db/src/client.ts` and is driven by `process.env.DATABASE_URL`.
- Render deploys `backend/dist/index.js`, which imports Prisma through `backend/src/db/client.ts` and `@starway/db`.
- The checked-in local env files contain two different DB secret values and one consistent project ref, while the deploy logs you shared reference a different live target during failure.

Best-supported root cause category: `G. Runtime using different ENV than expected`.

## Phase 1. Database Inventory

### Variable Map

| ENV variable | File(s) | Runtime owner | Purpose |
|---|---|---|---|
| `DATABASE_URL` | [`render.yaml`](/Users/viravira/Documents/starway-studio/render.yaml#L14-L17), [`packages/db/prisma/schema.prisma`](/Users/viravira/Documents/starway-studio/packages/db/prisma/schema.prisma#L6-L9), [`packages/db/src/client.ts`](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts#L68-L95), [`backend/src/index.ts`](/Users/viravira/Documents/starway-studio/backend/src/index.ts#L328-L418), [`backend/.env.example`](/Users/viravira/Documents/starway-studio/backend/.env.example#L5-L8), [`packages/db/.env.example`](/Users/viravira/Documents/starway-studio/packages/db/.env.example#L5-L8), [`README.md`](/Users/viravira/Documents/starway-studio/README.md#L122-L130), [`backend/.env`](/Users/viravira/Documents/starway-studio/backend/.env#L79-L83), [`packages/db/.env`](/Users/viravira/Documents/starway-studio/packages/db/.env#L5-L8) | Render env at deploy time; `packages/db/src/client.ts` at runtime; Prisma CLI for schema/migrations | Main Prisma Client connection target and startup health checks |
| `DIRECT_URL` | [`render.yaml`](/Users/viravira/Documents/starway-studio/render.yaml#L14-L17), [`packages/db/prisma/schema.prisma`](/Users/viravira/Documents/starway-studio/packages/db/prisma/schema.prisma#L6-L9), [`packages/db/src/client.ts`](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts#L68-L95), [`packages/db/prisma/seed.ts`](/Users/viravira/Documents/starway-studio/packages/db/prisma/seed.ts#L47-L71), [`backend/.env.example`](/Users/viravira/Documents/starway-studio/backend/.env.example#L5-L8), [`packages/db/.env.example`](/Users/viravira/Documents/starway-studio/packages/db/.env.example#L5-L8), [`README.md`](/Users/viravira/Documents/starway-studio/README.md#L122-L130), [`backend/.env`](/Users/viravira/Documents/starway-studio/backend/.env#L79-L83), [`packages/db/.env`](/Users/viravira/Documents/starway-studio/packages/db/.env#L5-L8) | Prisma schema and Prisma CLI commands; not the runtime `PrismaClient` target in this repo | Direct database connection for migrations, seed, and direct Prisma operations |
| `PRISMA_DATABASE_URL` | No hits in repo | None | Not used anywhere in current codebase |
| `SUPABASE_DB_PASSWORD` | [`backend/.env.example`](/Users/viravira/Documents/starway-studio/backend/.env.example#L5-L8), [`packages/db/.env.example`](/Users/viravira/Documents/starway-studio/packages/db/.env.example#L5-L8), [`packages/db/src/client.ts`](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts#L48-L76), [`packages/db/prisma/seed.ts`](/Users/viravira/Documents/starway-studio/packages/db/prisma/seed.ts#L47-L71), [`backend/.env`](/Users/viravira/Documents/starway-studio/backend/.env#L79-L83), [`packages/db/.env`](/Users/viravira/Documents/starway-studio/packages/db/.env#L5-L8) | Local env loader in `packages/db/src/client.ts` and seed script | Password substitution helper for URL templates |

### Inventory Notes

- There is no `PRISMA_DATABASE_URL` usage anywhere in the repository.
- `render.yaml` declares `DATABASE_URL` and `DIRECT_URL`, but both are `sync: false`, so the live values come from the Render dashboard, not from the repo file.
- `packages/db/src/client.ts` loads `.env` files locally, then rewrites password placeholders and normalizes pooler URLs.

## Phase 2. Prisma Audit

### Datasource

The datasource is defined here:

- [`packages/db/prisma/schema.prisma`](/Users/viravira/Documents/starway-studio/packages/db/prisma/schema.prisma#L6-L10)

Current state:

- `url = env("DATABASE_URL")`
- `directUrl = env("DIRECT_URL")`

### Runtime Client Path

The actual runtime client is created here:

- [`packages/db/src/client.ts`](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts#L68-L95)

This file:

- Reads `DATABASE_URL` and `DIRECT_URL`
- Replaces `${SUPABASE_DB_PASSWORD}` if present
- Normalizes pooler URLs by forcing `pgbouncer=true` and an env-driven `connection_limit`
- Passes only `databaseUrl` into `new PrismaClient({ datasources: { db: { url }}})`

### CURRENT vs EXPECTED

| Field | CURRENT in repo/runtime path | EXPECTED per Supabase Prisma setup | Match |
|---|---|---|---|
| `url` | `env("DATABASE_URL")` in Prisma schema, runtime client uses `process.env.DATABASE_URL` | `DATABASE_URL` should point to the session pooler for server deploys on IPv4-only networks | Match |
| `directUrl` | `env("DIRECT_URL")` in Prisma schema, used by seed/CLI paths | `DIRECT_URL` should point to the direct host `db.<project-ref>.supabase.co:5432` | Match |
| pooler behavior | Runtime helper rewrites pooler URLs to `pgbouncer=true` and `connection_limit=${PRISMA_POOL_CONNECTION_LIMIT:-10}` for `pooler.supabase.com` hosts | Prisma docs recommend pooler-safe connection behavior for persistent backend usage | Match |

### Current vs File Examples

| Source file | Current pattern | Expected pattern | Match |
|---|---|---|---|
| [`README.md`](/Users/viravira/Documents/starway-studio/README.md#L122-L130) | Direct host example for both URLs | For production runtime, `DATABASE_URL` should be session pooler; `DIRECT_URL` should be direct host | Partial mismatch |
| [`packages/db/.env`](/Users/viravira/Documents/starway-studio/packages/db/.env#L5-L8) | Session pooler URL with `connection_limit=3` and direct host URL | Session pooler URL is correct in shape, but runtime helper now normalizes pooler hosts to `connection_limit=${PRISMA_POOL_CONNECTION_LIMIT:-10}` | Match after 2026-07-07 fix |
| [`backend/.env`](/Users/viravira/Documents/starway-studio/backend/.env#L79-L83) | Session pooler URL with `pgbouncer=true` and direct host URL | Shape matches official guidance | Match |

## Phase 3. Supabase Project Ref Validation

### Project refs found

| Project ref / secret | Files | Used by |
|---|---|---|
| `chshznqddpynpufuxbmt` | [`packages/db/.env`](/Users/viravira/Documents/starway-studio/packages/db/.env#L5-L8), [`backend/.env`](/Users/viravira/Documents/starway-studio/backend/.env#L79-L83), [`README.md`](/Users/viravira/Documents/starway-studio/README.md#L122-L130) | Local DB env files, documentation, and examples |
| `suQnDEXHKbSEa1J6` | [`packages/db/.env`](/Users/viravira/Documents/starway-studio/packages/db/.env#L5-L8) | DB password value, not a project ref |

### Validation result

- I did not find code-level mixing of two Supabase projects inside Prisma runtime code.
- I did not find a second Supabase project ref in the repository sources.
- I did find local env drift between the backend env file and the db package env file.
- The deploy logs you shared referenced a live connection attempt that did not match the repo-local expectation, which is consistent with a stale or mismatched Render environment.

## Phase 4. Render Config Audit

### Actual Render definition

Render service definition:

- [`render.yaml`](/Users/viravira/Documents/starway-studio/render.yaml#L1-L29)

Important facts:

- Render starts `backend/dist/index.js`
- `DATABASE_URL` is declared but not synced from the repo
- `DIRECT_URL` is declared but not synced from the repo
- No `SUPABASE_DB_PASSWORD` is defined in `render.yaml`

### Runtime path

The factual runtime chain is:

`Render ENV` → `backend/dist/index.js` → [`backend/src/index.ts`](/Users/viravira/Documents/starway-studio/backend/src/index.ts#L9-L10) → [`backend/src/db/client.ts`](/Users/viravira/Documents/starway-studio/backend/src/db/client.ts#L1-L16) → [`packages/db/src/client.ts`](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts#L68-L95) → `new PrismaClient(...)`

### Runtime behavior

- `backend/src/index.ts` checks `process.env.DATABASE_URL` for boot diagnostics and database readiness.
- If the database is unavailable, the API starts in degraded mode, but the bot and scheduler are gated by `databaseReady`.
- `DIRECT_URL` is not the runtime Prisma Client target in the app server; it is for schema and direct Prisma operations.

## Phase 5. Supabase Compliance Check

Official docs reviewed:

- [Supabase: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: Prisma troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)

### Compliance matrix

| Check | Current repo behavior | Official expectation | Result |
|---|---|---|---|
| Username format | Session pooler URLs use `postgres.<project-ref>` in checked-in examples | Session pooler uses `postgres.<project-ref>` | Match |
| Pooler mode | Session pooler host on port `5432` is used in repo examples and runtime normalization | Persistent backends on IPv4-only networks should use session pooler on `5432` | Match |
| Direct host | `DIRECT_URL` examples point to `db.<project-ref>.supabase.co:5432` | Direct host should be `db.<project-ref>.supabase.co:5432` | Match |
| Migrations | `directUrl` is present in schema and seed path uses PrismaClient with runtime URL resolution | Prisma migrations need a direct database URL | Match |
| Render guidance | Render env is declared in `render.yaml`, but live values are external and must be set consistently | Production must use one consistent project ref and matching credentials | Conditional |

### Important mismatch

- The checked-in local DB files do not show a single authoritative production secret source.
- `packages/db/.env` and `backend/.env` do not carry the same password value.
- That is not a schema problem, but it is a deployment-risk problem because production can easily be pointed at a different Supabase tenant/user than the one expected by the code.
- Historical gap closed on 2026-07-07: `packages/db/src/client.ts` no longer hardcodes `connection_limit=1` for Supabase pooler URLs. The runtime now forces `pgbouncer=true` and reads `connection_limit` from `PRISMA_POOL_CONNECTION_LIMIT`, defaulting to `10` when the env var is absent.

## Phase 6. Root Cause

Chosen category: `G. Runtime using different ENV than expected`

### Why this is the best-supported conclusion

- Prisma runtime does not construct a project ref by itself; it consumes `process.env.DATABASE_URL`.
- The repo-local Supabase references are internally consistent around `chshznqddpynpufuxbmt`.
- The live failure you reported references a connection target that does not match the repo-local expectation.
- The error `FATAL: tenant/user postgres.chshznqddpynpufuxbmt not found` is a Supavisor-level rejection from the pooler path, not a Prisma schema error.

### What I can assert without guessing

- The connection is failing before Prisma can query data.
- The failure is not caused by missing `datasource db`.
- The failure is not caused by `PRISMA_DATABASE_URL`, because that variable is unused.
- The failure is not caused by `DIRECT_URL` in runtime request flow.

## Exact Files Involved

- [`packages/db/prisma/schema.prisma`](/Users/viravira/Documents/starway-studio/packages/db/prisma/schema.prisma)
- [`packages/db/src/client.ts`](/Users/viravira/Documents/starway-studio/packages/db/src/client.ts)
- [`backend/src/db/client.ts`](/Users/viravira/Documents/starway-studio/backend/src/db/client.ts)
- [`backend/src/index.ts`](/Users/viravira/Documents/starway-studio/backend/src/index.ts)
- [`render.yaml`](/Users/viravira/Documents/starway-studio/render.yaml)
- [`backend/.env.example`](/Users/viravira/Documents/starway-studio/backend/.env.example)
- [`packages/db/.env.example`](/Users/viravira/Documents/starway-studio/packages/db/.env.example)
- [`backend/.env`](/Users/viravira/Documents/starway-studio/backend/.env)
- [`packages/db/.env`](/Users/viravira/Documents/starway-studio/packages/db/.env)
- [`README.md`](/Users/viravira/Documents/starway-studio/README.md)

## Exact Env Variables Involved

- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_DB_PASSWORD`
- `PRISMA_DATABASE_URL` not used

## Safe Fix Plan

1. Set Render `DATABASE_URL` to the session pooler URL for the same Supabase project ref that the app should use.
2. Set Render `DIRECT_URL` to the direct host URL for the same project ref.
3. Ensure the Render values do not mix project refs or stale credentials.
4. Leave Prisma schema unchanged.
5. Redeploy and verify the boot log shows the intended database host and project ref.
6. Confirm the startup query `SELECT 1` succeeds and database-backed Telegram flows leave degraded mode.

## Source References

- Official Supabase connection guide: <https://supabase.com/docs/guides/database/connecting-to-postgres>
- Official Supabase Prisma troubleshooting: <https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting>
