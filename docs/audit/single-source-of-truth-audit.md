# Single Source of Truth Audit — Starway Studio

Date: 2026-06-09

## Scope

Audit targets requested:

- routes
- services
- repositories
- schedulers
- telegram handlers
- callback handlers
- payment handlers
- zoom handlers
- lifecycle handlers
- analytics writers
- prisma models
- event writers

This audit avoids changing:

- `schema.prisma`
- telegram runtime architecture
- payment contracts
- public API contracts

---

## Executive Summary

The repo does **not** have a single, system-wide abstraction layer for every domain. Several domains already have a canonical source, but legacy compatibility shims, ad-hoc endpoints, route aliases, and direct `prisma` access from handlers create duplicate sources of truth.

The highest-risk duplicates found during this pass are:

1. **Zoom HTTP surface duplication**
   - Canonical router: `backend/src/modules/zoom/routes.ts`
   - Legacy compatibility endpoint: `backend/src/app.ts` → `GET /api/zoom/calendar`

2. **Miniapp Zoom route duplication**
   - Canonical miniapp route after consolidation: `/miniapp/zoom-calendar`
   - Legacy aliases: `/miniapp`, `/zoom`, `/zoom-calendar`

3. **AB test email-gate rendering duplication**
   - First render path: `backend/src/products/ab-system/telegram/abTest.service.ts`
   - Second render path: `backend/src/products/ab-system/telegram/abTest.views.ts`

4. **User API surface duplication**
   - `/api/user/*`
   - `/api/users/*`

5. **Prisma access-layer duplication**
   - Some domains use repositories (`services/notifications/repositories/*`)
   - Many domains bypass repositories and call `prisma` directly from handlers/services

6. **Telegram action ownership duplication**
   - Some actions are parsed centrally in product callbacks
   - Some are also admitted/whitelisted in guard middleware
   - Some related button paths exist in multiple handler families

---

## Domain Map

## 1) Routes

### Backend route registration

Canonical app composition entry:

- `backend/src/app.ts`

Observed route registration groups:

- auth: `backend/src/app.ts`
- telegram: `backend/src/app.ts`
- access: `backend/src/app.ts`
- analytics: `backend/src/app.ts`
- events: `backend/src/app.ts`
- onboarding: `backend/src/app.ts`
- journal: `backend/src/app.ts`
- wheel: `backend/src/app.ts`
- goals / vision / trial / quota / affiliate / settings / gamification: `backend/src/app.ts`
- zoom: `backend/src/app.ts` → `app.use('/api/zoom', zoomRoutes)`
- coach zoom: `backend/src/app.ts` → `app.use('/api/coach', zoomCoachRoutes)`
- subscriptions / billing / social / platform / web-map: `backend/src/app.ts`

### Frontend route composition

Canonical frontend router:

- `apps/web/src/App.tsx`

Observed route families:

- public web
- guest web
- protected app
- standalone miniapp / telegram product entry routes

---

## 2) Services

High-signal service hubs:

- zoom: `backend/src/modules/zoom/*`
- notifications: `backend/src/services/notifications/*`
- subscriptions/payments: `backend/src/modules/subscriptions/payments/*`
- analytics: `backend/src/modules/analytics/service.ts`
- telegram mentor orchestration: `backend/src/modules/telegram-mentor/*`
- AB test telegram flow: `backend/src/products/ab-system/telegram/*`

---

## 3) Repositories

Explicit repository layer found mainly in notifications:

- `backend/src/services/notifications/repositories/NotificationRepository.ts`
- `backend/src/services/notifications/repositories/NotificationJobRepository.ts`
- `backend/src/services/notifications/repositories/NotificationPreferenceRepository.ts`

Most other domains use direct `prisma` access inside handlers/services.

---

## 4) Schedulers / Cron

Canonical scheduler entry:

- `backend/src/services/scheduler/index.ts`

Related scheduling sources:

- `backend/src/services/scheduler/*.ts`
- `backend/src/modules/zoom/index.ts`
- `backend/src/modules/zoom/zoom.notifications.ts`
- `backend/src/modules/zoom/battle.cron.ts`
- AB test followup scheduling in `backend/src/products/ab-system/telegram/abTest.scheduler.ts`

---

## 5) Telegram handlers

Main families:

- coach bot: `backend/src/bot/handlers/coach/*`
- coach content: `backend/src/bot/handlers/coachContent.handler.ts`
- telegram mentor runtime: `backend/src/modules/telegram-mentor/handlers/*`
- product telegram handlers: `backend/src/products/ab-system/telegram/*`

---

## 6) Callback handlers

Main callback parsing/execution points:

- AB test callback parser: `backend/src/products/ab-system/telegram/abTest.callback.ts`
- AB test callback executor: `backend/src/products/ab-system/telegram/abTest.service.ts`
- guard callback whitelist: `backend/src/modules/telegram-mentor/core/guard.middleware.ts`
- coach callback handlers: `backend/src/bot/handlers/coach/coachStart.handler.ts`

---

## 7) Payment handlers

Primary payment area:

- `backend/src/modules/subscriptions/payments/*`

Related payment-adjacent sources:

- `backend/src/modules/subscriptions/controller.ts`
- `backend/src/modules/billing/*`
- product-specific payment helpers under products/focus and AB test CTA handlers

---

## 8) Zoom handlers

Canonical zoom route module:

- `backend/src/modules/zoom/routes.ts`

Canonical legacy/public overview controllers referenced there:

- `backend/src/modules/zoom/controller.ts`
- `backend/src/modules/zoom/zoom.admin.handler.ts`

Non-canonical Zoom compatibility surface:

- `backend/src/app.ts` → `/api/zoom/calendar`

---

## 9) Lifecycle handlers

Lifecycle-related logic is spread across:

- `backend/src/modules/users/runtime/*`
- `backend/src/modules/telegram-mentor/handlers/start.ts`
- `backend/src/services/notifications/NotificationService.ts`
- subscription/payment callbacks
- AB test completion handlers

No single lifecycle engine file was found for all domains.

---

## 10) Analytics writers

Observed analytics writers:

- `backend/src/products/ab-system/telegram/abTest.analytics.ts`
- `backend/src/modules/events/service.ts`
- frontend event writers in `apps/web/src/features/analytics/services/events.api.ts`
- coach analytics reader: `backend/src/modules/analytics/service.ts`

---

## 11) Prisma models / access

Canonical schema is in the DB package, but runtime access is mixed:

- repository-backed access in notifications
- direct `prisma.*` access in zoom, telegram, AB test, billing, journal, debug, etc.

This is a structural duplication of access patterns rather than duplicated schema.

---

## 12) Event writers

Observed event-writer families:

- `trackAbTestEvent(...)`
- `trackEvent(...)`
- notification records / jobs as operational events
- frontend tracking mutations

No single unified event writer abstraction covers all domains.

---

## Duplicate Inventory

## A. Routes / Endpoints

### A1. Zoom calendar API surface

- **Canonical source**: `backend/src/modules/zoom/routes.ts`
- **Legacy source**: `backend/src/app.ts` → `GET /api/zoom/calendar`
- **Classification**: `PARTIAL SOURCE`

Why duplicate:

- Canonical zoom API serves:
  - `/api/zoom/week`
  - `/api/zoom/public/week`
  - `/api/zoom/sessions/calendar`
- Legacy shim serves:
  - `/api/zoom/calendar`

The shim returns a flattened shape:

- `{ sessions: [{ id, title, startTime }] }`

while canonical zoom endpoints use `ZoomWeekOverview` or authenticated calendar DTOs.

### A2. User route namespaces

- **Canonical source**: `/api/user/*`
- **Legacy source**: `/api/users/*`
- **Classification**: `LEGACY SOURCE`

Found in:

- `backend/src/app.ts`

### A3. Miniapp Zoom route aliases

- **Canonical source**: `/miniapp/zoom-calendar`
- **Legacy sources**:
  - `/miniapp`
  - `/zoom`
  - `/zoom-calendar`
- **Classification**: `LEGACY SOURCE`

Safe consolidation performed in this pass:

- All aliases now redirect to `/miniapp/zoom-calendar`

---

## B. Schedulers / Cron

### B1. Zoom scheduling surface

- **Canonical source**: `backend/src/services/scheduler/index.ts`
- **Partial sources**:
  - `backend/src/modules/zoom/index.ts`
  - `backend/src/modules/zoom/zoom.notifications.ts`
  - `backend/src/modules/zoom/battle.cron.ts`
- **Classification**: `PARTIAL SOURCE`

Risk:

- Feature-local cron starters exist alongside the central scheduler entry.

### B2. AB test followups

- **Canonical source**: `backend/src/products/ab-system/telegram/abTest.scheduler.ts`
- **Partial source**: notification/timer orchestration in `NotificationService`
- **Classification**: `PARTIAL SOURCE`

---

## C. Callback / Telegram action handling

### C1. AB test callback ownership

- **Canonical source**: `backend/src/products/ab-system/telegram/abTest.callback.ts` + `abTest.service.ts`
- **Partial source**: whitelist logic in `backend/src/modules/telegram-mentor/core/guard.middleware.ts`
- **Classification**: `PARTIAL SOURCE`

Risk:

- Action admission and action execution are split.

### C2. Coach menu action ownership

- **Canonical source**: `backend/src/bot/handlers/coach/coachStart.handler.ts`
- **Partial/adjacent source**: `backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts`
- **Classification**: `PARTIAL SOURCE`

---

## D. Analytics / Events

### D1. AB test event writing

- **Canonical source**: `backend/src/products/ab-system/telegram/abTest.analytics.ts`
- **Adjacent source**: generic event writing in `backend/src/modules/events/service.ts`
- **Classification**: `PARTIAL SOURCE`

### D2. Coach analytics reading

- **Canonical source**: `backend/src/modules/analytics/service.ts`
- **Legacy/derived sources**: direct derived metrics in product flows or notifications
- **Classification**: `PARTIAL SOURCE`

---

## E. Prisma access layer

### E1. Repository vs direct Prisma

- **Canonical source**: none globally enforced
- **Legacy / alternate source**: direct `prisma` calls from handlers/services
- **Classification**: `PARTIAL SOURCE`

This is widespread and should be treated as a structural debt item, not a single-file bug.

---

## F. Lifecycle

### F1. User lifecycle transitions

- **Canonical source**: none globally enforced
- **Observed transition writers**:
  - AB test completion
  - subscription/payment callbacks
  - notifications eligibility logic
  - telegram start/runtime guard flows
- **Classification**: `PARTIAL SOURCE`

This domain currently lacks a single lifecycle engine.

---

## Root Cause — `404 /api/zoom/calendar`

## Findings

1. The endpoint **does exist** in current source:
   - `backend/src/app.ts`
2. It is **not** part of the canonical zoom router:
   - canonical zoom API is in `backend/src/modules/zoom/routes.ts`
3. There are **no first-party frontend callsites** to `/api/zoom/calendar` in current repo code.
4. First-party frontend code uses:
   - `/zoom/week`
   - `/zoom/public/week`
   - `/zoom/sessions/calendar`

## Root cause

`/api/zoom/calendar` is a **legacy compatibility shim** registered ad hoc in `backend/src/app.ts`, outside the canonical Zoom router.

The earlier 404 was not caused by the current frontend source depending on that endpoint. The true causes are:

1. request was hitting a runtime/deployment/process that did not have the shim active, or
2. request origin was stale / mismatched (e.g. old frontend or old web_app target), while canonical clients were already using other Zoom endpoints.

## Canonical conclusion

- **Canonical Zoom source**: `backend/src/modules/zoom/routes.ts`
- **Legacy compatibility source**: `backend/src/app.ts` → `/api/zoom/calendar`

This endpoint should not be expanded further. If kept, it should be explicitly documented as compatibility-only.

---

## Root Cause — `skip_email_before_result`

## Registration audit

### Callback registration

- parser registration:
  - `backend/src/products/ab-system/telegram/abTest.callback.ts`
- execution branch:
  - `backend/src/products/ab-system/telegram/abTest.service.ts`
- guard allowlist:
  - `backend/src/modules/telegram-mentor/core/guard.middleware.ts`

## Result

- **No evidence of double parser registration**
- **No evidence of double callback dispatch branch**
- **No evidence of duplicated action name with different handlers**

## Render / transition audit

### First email-gate render path

In `backend/src/products/ab-system/telegram/abTest.service.ts`, when Q8 completes:

- progress saved with `email_stage: 'pending'`
- email-gate message sent immediately
- pending telegram identity set

### Second email-gate render path

In `backend/src/products/ab-system/telegram/abTest.views.ts -> renderCurrentView(...)`, when:

- `progress.status === 'completed'`
- `progress.result_key` exists
- `progress.email_stage === 'pending'`

the same email-gate message is sent again and pending identity is set again.

## Root cause

The root cause is **duplicate email-gate rendering paths**, not duplicate callback registration.

Concretely:

1. completion flow renders the email gate in `abTest.service.ts`
2. current-view recovery/resume flow renders the same gate again in `abTest.views.ts`

If any resume, restore, stale callback, or state recovery path calls `renderCurrentView(...)` while the progress is already `completed + email_stage=pending`, the user can receive or observe the gate again.

## Classification

- **Canonical source should be**: one render owner for `completed + pending email gate`
- **Current state**: `PARTIAL SOURCE`

---

## Safe Consolidations Applied In This Pass

No destructive deletion was performed.

Safe routing consolidation applied:

- canonical miniapp zoom route set to `/miniapp/zoom-calendar`
- legacy aliases redirected there
- coach bot web_app URL updated to point there

Files changed by this consolidation are listed below.

---

## Deleted Duplicates

None physically deleted in this pass.

Legacy paths were redirected, not removed.

---

## Canonical Source Recommendation By Domain

- lifecycle engine: **not yet singular** — recommend dedicated lifecycle module
- payment source: `backend/src/modules/subscriptions/payments/*`
- zoom source: `backend/src/modules/zoom/routes.ts` + zoom module family
- analytics source: `backend/src/modules/analytics/service.ts` for coach metrics; generic events remain separate
- telegram source: `backend/src/modules/telegram-mentor/*` for runtime, product folders for product-specific flows
- prompt registry: `backend/src/PromptProvider.js` plus product prompt files
- product registry: `backend/src/platform/index.js` / runtime bot registry
- notification scheduler: `backend/src/services/scheduler/index.ts`
- user state machine: **not yet singular** — currently spread across telegram handlers, notifications, subscriptions, and AB test flow

---

## Files Changed In This Pass

- `apps/web/src/App.tsx`
- `apps/web/src/components/miniapp/MiniAppLayout.tsx`
- `apps/web/src/features/social/pages/MiniAppPage.tsx`
- `apps/web/src/features/wheel/pages/WheelStartPage.tsx`
- `apps/web/src/features/ab-test/pages/AbTestPage.tsx`
- `apps/web/src/features/auth/components/DeepLinkAuthBridge.tsx`
- `apps/web/src/layout/MainLayout.tsx`
- `apps/web/src/config/runtime.ts`
- `backend/src/bot/handlers/coach/coachStart.handler.ts`
- `backend/src/content/subscriptions.content.ts`
- `backend/src/modules/telegram-mentor/appAccess.ts`

---

## Recommended Next Consolidation Steps

1. Move `/api/zoom/calendar` compatibility logic into a documented compatibility adapter module or remove consumers after migration.
2. Choose a single owner for AB test email-gate rendering.
3. Decide whether all Prisma access should move toward repositories or remain service-local, then standardize.
4. Introduce a single lifecycle transition engine before broader cleanup of notifications/subscriptions/AB test state changes.
