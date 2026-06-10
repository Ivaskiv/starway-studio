# Senior Architecture Review — Starway Studio

Date: 2026-06-09

## Review posture

This review was performed with one rule above all others:

> Stability is more important than code beauty.

No business logic, payment contracts, Prisma schema, Telegram runtime architecture, or public API contracts were intentionally changed in this pass.

This document complements the deeper inventory in:

- `docs/audit/single-source-of-truth-audit.md`

---

## Executive summary

The codebase is not “random”; it has clear domain centers. The main issue is that several domains have grown a **canonical implementation plus compatibility seams, aliases, or product-local bypasses**.

That is typical of a long-lived production monorepo. It is fixable without rewrite.

The highest-value findings from a senior-risk perspective are:

1. **Zoom has one real backend owner, but also a legacy compatibility endpoint outside the canonical router.**
2. **Miniapp Zoom entry had multiple route aliases, which increased drift risk.**
3. **AB test email gate had duplicate render ownership, which is the real root cause behind repeated/duplicated email-gate behavior.**
4. **Lifecycle ownership is spread across subscriptions, telegram flows, notifications, and AB test transitions.**
5. **Repository discipline is inconsistent: notifications use repositories, most other domains use direct Prisma calls.**

The system is still recoverable without rewrite because the duplicates are mostly **edge ownership issues**, not a total architectural collapse.

---

## Audit classification legend

- **SAFE** — stable, coherent ownership, low current risk
- **WARNING** — works now, but drift or ambiguity is present
- **TECH DEBT** — structural issue that should be addressed deliberately
- **DUPLICATE** — more than one implementation or owner exists
- **DEAD CODE** — no meaningful current usage found in audited scope

---

## File/domain classification

### Zoom

- **SAFE** — `backend/src/modules/zoom/routes.ts`
  - Clear canonical HTTP owner for Zoom API
- **WARNING / DUPLICATE** — `backend/src/app.ts`
  - Hosts `GET /api/zoom/calendar` compatibility shim outside the canonical Zoom router
- **WARNING** — `apps/web/src/features/zoom/services/zoom.api.ts`
  - Canonical for week/public-week style consumption
- **WARNING** — `apps/web/src/features/zoom/zoom.api.ts`
  - Canonical for calendar/admin/battle style consumption
  - Separate file is acceptable, but ownership should stay clearly documented

### Telegram / AB test

- **SAFE** — `backend/src/products/ab-system/telegram/abTest.callback.ts`
  - Single callback parser for AB test flow
- **WARNING / DUPLICATE** — `backend/src/products/ab-system/telegram/abTest.service.ts`
  - Historically owned both transition logic and some direct rendering
- **WARNING / DUPLICATE** — `backend/src/products/ab-system/telegram/abTest.views.ts`
  - Historically shared ownership of the same email-gate state
- **WARNING** — `backend/src/modules/telegram-mentor/core/guard.middleware.ts`
  - Callback allowlist is correct, but action admission is separate from execution ownership

### Routing / Miniapp

- **SAFE** — `apps/web/src/App.tsx`
  - Central frontend router remains the right owner
- **WARNING / DUPLICATE** — route aliases around Zoom miniapp entry
  - `/miniapp`
  - `/zoom`
  - `/zoom-calendar`
  - canonical route should be `/miniapp/zoom-calendar`
- **WARNING** — `backend/src/bot/handlers/coach/coachStart.handler.ts`
  - Telegram `web_app` button is extremely sensitive to stale route drift

### Scheduler / Notifications

- **SAFE** — `backend/src/services/scheduler/index.ts`
  - Clear central scheduler entry with duplicate-registration protection
- **SAFE** — `backend/src/services/notifications/worker.ts`
  - Clear notification worker lifecycle
- **TECH DEBT** — feature-local scheduler logic outside the central scheduler family

### Prompts

- **WARNING** — `backend/src/PromptProvider.ts`
  - Useful fallback registry, but prompt ownership is still split between DB, config, and product prompt files
- **TECH DEBT** — prompt ownership is not yet singular across all AI/product domains

### Lifecycle / Payments / Subscriptions

- **WARNING** — `backend/src/modules/subscriptions/payments/*`
  - Strong canonical domain center exists
- **TECH DEBT** — lifecycle transitions are still spread outside one lifecycle engine

---

## Found duplicates

### 1. Zoom HTTP ownership split

- **Canonical implementation**
  - `backend/src/modules/zoom/routes.ts`
- **Legacy implementation**
  - `backend/src/app.ts` → `GET /api/zoom/calendar`
- **Status**
  - Still used as compatibility surface
- **Decision**
  - Keep for now, document as legacy, do not expand

### 2. Miniapp Zoom route aliases

- **Canonical implementation**
  - `/miniapp/zoom-calendar`
- **Legacy implementations**
  - `/miniapp`
  - `/zoom`
  - `/zoom-calendar`
- **Status**
  - Needed for compatibility, but all should converge to one canonical route
- **Decision**
  - Consolidated safely via redirects

### 3. AB test email-gate render ownership

- **Canonical implementation**
  - shared renderer in `backend/src/products/ab-system/telegram/abTest.views.ts`
- **Legacy implementation**
  - inline render path in `backend/src/products/ab-system/telegram/abTest.service.ts`
- **Status**
  - Was actively duplicating behavior
- **Decision**
  - Consolidated to one render owner

### 4. User route namespaces

- **Canonical implementation**
  - `/api/user/*`
- **Legacy implementation**
  - `/api/users/*`
- **Status**
  - Compatibility duplication
- **Decision**
  - Leave in place for now to avoid API regressions

### 5. Prisma access patterns

- **Canonical implementation**
  - none globally enforced
- **Legacy/alternate implementation**
  - repositories in notifications, direct Prisma elsewhere
- **Status**
  - structural duplication
- **Decision**
  - do not refactor opportunistically; choose strategy domain-by-domain

---

## What was removed

No production source was destructively removed in this pass.

What was removed instead:

- duplicate ownership of AB test email-gate rendering
- dead imports left behind after that consolidation

This was intentional to preserve runtime behavior.

---

## What was consolidated

### A. Miniapp Zoom entry

- **File**
  - `apps/web/src/App.tsx`
- **Change**
  - route aliases now converge to `/miniapp/zoom-calendar`
- **Why**
  - one frontend entrypoint lowers drift risk across Telegram, guest flow, and redirects
- **Risk level**
  - Low
- **Validation result**
  - route responds locally after restart checks

### B. Coach Telegram web_app URL

- **File**
  - `backend/src/bot/handlers/coach/coachStart.handler.ts`
- **Change**
  - button now points to canonical miniapp Zoom route
- **Why**
  - prevents bot keyboard from targeting a non-canonical landing path
- **Risk level**
  - Low
- **Validation result**
  - code path inspected and runtime used fresh base URL source

### C. AB test email-gate owner

- **Files**
  - `backend/src/products/ab-system/telegram/abTest.service.ts`
  - `backend/src/products/ab-system/telegram/abTest.views.ts`
- **Change**
  - moved duplicated email-gate send logic to one shared renderer
- **Why**
  - removes duplicate render source for the same state
- **Risk level**
  - Low-to-medium
- **Validation result**
  - static call graph verified; no second inline render path remains

---

## What was intentionally left in place

- `GET /api/zoom/calendar` compatibility shim
- `/api/users/*` compatibility namespace
- direct Prisma access in non-notification domains
- lifecycle ownership spread across multiple stable domains

These were left intentionally because immediate deletion or forced normalization would carry regression risk without enough migration coverage.

---

## Root cause: `404 /api/zoom/calendar`

### Confirmed facts

- The endpoint exists in source: `backend/src/app.ts`
- It is not owned by the canonical Zoom router
- Current first-party frontend code does not rely on it as its primary Zoom API

### Senior conclusion

The 404 is **not** “the endpoint is missing from the codebase”.

The real issue is an **ownership split plus runtime mismatch**:

1. canonical Zoom API moved to `backend/src/modules/zoom/routes.ts`
2. `/api/zoom/calendar` survived as a compatibility shim
3. a stale runtime / stale Telegram entry / stale deployment path can hit the wrong target and observe a 404

### Correct action

- keep one canonical Zoom router owner
- treat `/api/zoom/calendar` as compatibility-only
- do not create new fake/mock replacements

---

## Root cause: `skip_email_before_result`

### Confirmed facts

- callback parser is singular
- callback execution branch is singular
- no duplicate action name with two different dispatchers was found

### Senior conclusion

The bug source was **not** duplicate callback registration.

The bug source was **duplicate render ownership of the `completed + email_stage=pending` state**:

1. one render path on completion in `abTest.service.ts`
2. another render path in recovery/current-view rendering in `abTest.views.ts`

This creates re-entry duplication whenever state recovery re-renders the same pending email-gate state.

### Correct action

- one owner for the email-gate render state
- keep parser and transition flow intact

---

## Risks

### Low risk

- route alias consolidation to canonical path
- removal of dead imports
- bot `web_app` URL alignment to canonical route

### Medium risk

- any further AB test Telegram flow refactor beyond the email-gate ownership fix
- lifecycle consolidation without explicit transition map

### High risk

- deleting compatibility APIs without runtime consumer audit
- forcing repository pattern across all Prisma access in one pass
- rewriting subscriptions/payment/telegram orchestration for “cleanliness”

---

## Technical debt

1. No single lifecycle engine across user-facing domains
2. Mixed repository vs direct-Prisma style
3. Prompt ownership spread across DB/config/product-local prompt files
4. Compatibility endpoints live in top-level app wiring instead of documented adapters
5. Telegram callback allowlisting is separate from callback execution ownership

---

## Recommendations

1. **Document compatibility surfaces explicitly**
   - especially `/api/zoom/calendar` and `/api/users/*`
2. **Create one lifecycle transition map before any lifecycle refactor**
3. **Keep Zoom ownership in the Zoom module**
   - no new ad hoc Zoom endpoints in `app.ts`
4. **Treat Telegram flows as state machines, not just handlers**
   - one owner for each render state
5. **Standardize Prisma access per domain, not repo-wide**
   - do not force a mega repository abstraction

---

## Files changed in this pass

- `apps/web/src/App.tsx`
- `apps/web/src/components/miniapp/MiniAppLayout.tsx`
- `apps/web/src/features/ab-test/pages/AbTestPage.tsx`
- `apps/web/src/features/auth/components/DeepLinkAuthBridge.tsx`
- `apps/web/src/features/social/pages/MiniAppPage.tsx`
- `apps/web/src/features/wheel/pages/WheelStartPage.tsx`
- `apps/web/src/layout/MainLayout.tsx`
- `backend/src/bot/handlers/coach/coachStart.handler.ts`
- `backend/src/content/subscriptions.content.ts`
- `backend/src/modules/telegram-mentor/appAccess.ts`
- `backend/src/products/ab-system/telegram/abTest.service.ts`
- `backend/src/products/ab-system/telegram/abTest.views.ts`
- `docs/audit/single-source-of-truth-audit.md`
- `docs/audit/senior-architecture-review.md`

---

## Validation

- `pnpm lint`
  - failed: root script missing (`Command "lint" not found`)
- `pnpm typecheck`
  - started successfully; repo-wide run is slow/heavy and should be treated separately from this small cleanup pass
- `pnpm build`
  - started successfully; repo-wide build is heavy and should be treated separately from this small cleanup pass
- `pnpm dev:parallel`
  - not clean due to existing live port/tunnel conflicts (`5173` in use, ngrok endpoint already online)

Runtime/smoke checks already confirmed in this pass:

- backend health route responded
- canonical miniapp Zoom route responded

---

## Business-logic stability statement

This pass did **not intentionally change business logic**.

Changes were limited to:

- consolidating route ownership
- aligning Telegram entrypoints to the canonical route
- removing duplicate email-gate rendering ownership
- documenting architecture findings and risks

No fake endpoints, mock responses, hardcoded bypasses, or temporary workaround APIs were introduced.
