# Product Ownership & Boundaries Map

## Scope

This document defines ownership boundaries for core Starway entities.
It does not duplicate product definitions, lifecycle rules, platform architecture, or skill playbooks.

Reference docs:
- Product definitions: `docs/agents/ai-strategist/competitor-analysis.md`
- Platform control center: `docs/architecture/platform-control-center.md`
- Lifecycle propagation: `docs/architecture/lifecycle-map.md`
- Telegram runtime architecture: `docs/architecture/telegram-architecture.md`
- Prompt and content registries: `docs/prompt.md`
- Route exposure and consumers: `docs/routes.md`

## Ownership Matrix

| Entity | Purpose | Owner | Source Of Truth | Allowed Changes | Dependencies | Consumers |
|---|---|---|---|---|---|---|
| `FOCUS` | Core product for structured weekly practice and paid progression from entry diagnostics into execution rhythm. | Product Owner (offer/UX decisions) + Backend Lead (runtime and data contracts). | Product identity: `docs/agents/ai-strategist/competitor-analysis.md`; Product copy/prompt inventory: `docs/prompt.md` (FOCUS entries); Runtime modules: `backend/src/products/focus/*`. | Local FOCUS content, prompts, CTA copy, and product-level runtime config in `backend/src/products/focus/*`. Do not change global lifecycle semantics or shared bot transport rules here. | Lifecycle resolver, Telegram room engine, billing/payments, prompt registries, subscription access. | Telegram product rooms, web product surfaces, billing and activation flows, analytics funnels. |
| `STANKEY` | Isolated Telegram-first product context for onboarding/trial/restore with strict product boundary from other product narratives. | Product Owner (STANKEY positioning) + Backend Lead (isolation and runtime contracts). | Product identity: `docs/agents/ai-strategist/competitor-analysis.md`; STANKEY prompt/content inventory: `docs/prompt.md`; Runtime modules: `backend/src/products/stankey/*`; Telegram architecture boundary: `docs/architecture/telegram-architecture.md`. | STANKEY-only prompts, content, manifests, and flow copy in STANKEY modules. Keep isolation intact: no implicit FOCUS coupling in STANKEY-specific text and handlers. | Shared Telegram runtime, lifecycle snapshot, access/subscription state, callback bus, prompt registries. | Telegram mentor runtime, product summary decisions, subscription activation and restore messaging. |
| `backend` | Shared API/runtime control plane for auth, lifecycle, orchestration, billing callbacks, analytics, and route composition. | Backend Lead (technical decisions) with Product/Ops sign-off for behavior-impacting changes. | Platform governance: `docs/architecture/platform-control-center.md`; Active request surface: `docs/routes.md`; Runtime implementation: `backend/src/*`. | Service/controller logic, orchestration policies, API behavior, and shared registries within existing module boundaries. No product copy ownership takeover from product content files. | Prisma/DB layer, lifecycle services, event bus, AI orchestration, payment integrations, notification services. | Web app, Telegram runtime, workers/schedulers, admin tooling, external webhooks/integrations. |
| `workers` | Background execution layer for scheduled lifecycle/reminder/followup/notification jobs and maintenance routines. | Backend Lead (execution safety) + Ops Owner (cadence and launch operations). | Scheduling and operations policy: `docs/architecture/platform-control-center.md`; lifecycle dependency: `docs/architecture/lifecycle-map.md`; callback/runtime coupling: `docs/architecture/telegram-architecture.md`. | Cron cadence, dedupe/idempotency logic, notification dispatch orchestration, and maintenance jobs under scheduler boundaries. Must respect lifecycle eligibility and callback safety contracts. | Scheduler engine, lifecycle snapshot, notification templates/services, callback/event dedupe mechanisms. | Reminder funnels, Zoom/session reminders, retention/winback loops, operational automations. |
| `shared-bot-core` | Shared Telegram orchestration foundation that receives updates and dispatches callbacks/rooms/deeplinks across products. | Backend Lead (runtime architecture) + Product Ops (flow correctness). | Telegram architecture: `docs/architecture/telegram-architecture.md`; callback policy: `docs/architecture/callback-map.md`; exposed transport routes: `docs/routes.md`. | Update routing, callback categorization, room dispatch integration, and transport behavior. Product-specific copy remains in product content registries, not in shared core handlers. | Telegram webhook runtime, lifecycle resolver, event bus, room engine, product registries, auth/linking. | FOCUS/STANKEY/ABSystem Telegram flows, payment followups, reminder and recovery flows. |
| `shared-ui` | Reusable web UI primitives and layout system for consistent cross-product presentation and dashboard shell behavior. | Frontend Lead (component architecture) + Product Designer/Owner (UX consistency). | Platform route consumers: `docs/routes.md`; content/prompt registry map: `docs/prompt.md`; frontend implementation roots: `apps/web/src/*`. | Shared components, tokens, layout primitives, and common UI patterns. Product-specific business behavior stays in feature modules and backend contracts. | Route shell/navigation, auth/access state, product content registries, analytics events. | Landing pages, dashboard shells, product pages, onboarding and conversion touchpoints. |

## Boundary Rules

- Product naming/identity stays canonical in `docs/agents/ai-strategist/competitor-analysis.md`.
- Lifecycle state semantics stay canonical in `docs/architecture/lifecycle-map.md`.
- Platform operational policy stays canonical in `docs/architecture/platform-control-center.md`.
- Telegram routing/runtime hierarchy stays canonical in `docs/architecture/telegram-architecture.md`.
- Prompt and copy file mapping stays canonical in `docs/prompt.md`.
- API surface and downstream consumers stay canonical in `docs/routes.md`.

This document only defines ownership, change boundaries, and where truth lives.
