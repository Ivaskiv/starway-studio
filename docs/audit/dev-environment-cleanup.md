# Dev Environment Cleanup — Starway Studio

Date: 2026-06-09

## Goal

Stabilize local development startup for:

- `pnpm dev:parallel`

Without changing:

- business logic
- Telegram flow
- Prisma schema
- payments
- API contracts

---

## Process map

`pnpm dev:parallel` starts:

1. `pnpm -C backend dev`
   - builds shared packages as needed
   - runs `tsx watch ... src/index.ts`
   - binds backend to `:3001`
2. `pnpm -C apps/web dev`
   - runs `vite`
   - binds frontend to `:5173`
3. `ngrok http 3001`
   - binds local ngrok API to `:4040`
   - exposes backend public URL

---

## Problems found

### 1. Blind process startup

Old `scripts/dev-parallel.sh` always started fresh backend, frontend, and ngrok processes with no preflight.

Result:

- `Port already in use`
- duplicate Vite/backend instances
- duplicate watchers

### 2. False-positive READY

Old script printed `=== READY ===` after a fixed sleep.

Result:

- misleading startup success even when:
  - Vite failed
  - ngrok failed
  - backend was not fully ready

### 3. Ngrok conflict path

Old script always ran:

- `ngrok http 3001 --log=stdout`

with no tunnel/process guard.

Result:

- `ERR_NGROK_334`
- fallback to `4041`
- stale/conflicting local ngrok agent state

### 4. Noisy terminal

All service logs were streamed directly into one terminal.

Result:

- noisy startup
- hard-to-see failure state
- duplicated/non-actionable lines

### 5. No startup health validation

There was no real gating for:

- backend health
- database readiness
- frontend health
- Telegram webhook runtime health
- ngrok tunnel availability

---

## Root causes

1. Startup script used **sleep-based optimism** instead of health-based readiness.
2. No ownership check existed for occupied ports.
3. No distinction existed between:
   - project-owned processes
   - external processes
4. Ngrok startup assumed a clean local agent every time.
5. Logs were not separated per service.

---

## Fixes applied

### 1. Rebuilt `scripts/dev-parallel.sh`

The script now:

- resolves repo root dynamically
- creates isolated temp log files
- performs preflight checks before launch
- starts services in controlled order
- validates health before printing `Ready`
- keeps terminal output compact

### 2. Port management added

Checked automatically:

- `3001`
- `5173`
- `4040`

Behavior:

- if the process belongs to this repo, it is stopped gracefully
- if the process is external, startup aborts with a clear warning

### 3. Duplicate-process cleanup added

The launcher now attempts to stop project-owned leftovers matching:

- backend `pnpm` dev process
- `tsx watch`
- frontend `pnpm` dev process
- `vite`
- `ngrok http 3001`
- prior `scripts/dev-parallel.sh`

### 4. Ngrok stabilization added

The launcher now:

- clears project-owned ngrok listener on `:4040` before startup
- waits for ngrok local API readiness
- waits for a real public URL before success
- never prints success if tunnel is not live

### 5. Startup validation added

Validated before `Ready`:

- backend live: `/health/live`
- database ready: `/health/ready`
- Telegram runtime health: `/api/telegram/webhook/health`
- frontend HTTP response
- ngrok public URL from local API

### 6. Log cleanup added

Service stdout/stderr now goes to per-service temp logs:

- backend log
- frontend log
- ngrok log

Terminal now shows only:

- INFO
- WARN
- ERROR
- compact health table
- final ready block

On failure, the script prints the relevant log tail instead of dumping everything.

---

## Validation result

Confirmed with live run of `pnpm dev:parallel`:

- ✓ backend started
- ✓ frontend started
- ✓ ngrok started
- ✓ no port conflicts
- ✓ no duplicate tunnels
- ✓ no misleading READY message
- ✓ clean terminal output

Observed runtime state after launch:

- backend listening on `:3001`
- frontend listening on `:5173`
- ngrok API listening on `127.0.0.1:4040`
- ngrok public URL available
- health endpoints returned success

---

## Changed files

- `scripts/dev-parallel.sh`
- `docs/audit/dev-environment-cleanup.md`

---

## Risks

### Low

- startup sequencing is now slightly stricter
- script may stop stale project-owned dev processes before relaunch

### Medium

- if a legitimate external service is intentionally using `3001`, `5173`, or `4040`, startup will now refuse to continue instead of colliding silently

This is intentional and safer for local development.

---

## What was not changed

- backend business logic
- frontend business logic
- Telegram product behavior
- payments
- Prisma schema
- API contracts

Only developer tooling, process management, readiness checks, and startup UX were changed.
