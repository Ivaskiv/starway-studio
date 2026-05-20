# Platform Control Center

Single entry point for the ABSystem operational blueprint.

This document replaces the separate platform docs and keeps the launch system in one place:

- delivery checklist
- canonical user-state mapping
- Google Sheets operating structure
- AI navigator rules
- behavioral intelligence
- performance and cost audit

## Source Of Truth

The codebase remains the runtime source of truth. These docs are the human operating layer for launch and ongoing control.

Primary source areas:

- Telegram runtime: `backend/src/index.ts`, `backend/src/modules/telegram-mentor/*`, `backend/src/core/orchestrator/*`
- Lifecycle and state: `backend/src/modules/lifecycle/service.ts`, `backend/src/modules/flow-control/service.ts`, `backend/src/core/state-machine/*`
- Billing and callbacks: `backend/src/modules/subscriptions/*`, `backend/src/products/*/payments/*`
- AI orchestration: `backend/src/modules/ai-mentor/*`, `backend/src/platform/ai.registry.ts`
- Rooms and product policies: `backend/src/modules/telegram-mentor/services/product-room.service.ts`, `backend/src/platform/*`, `backend/src/products/*`
- Dashboard and analytics: `apps/web/src/features/analytics/*`, `backend/src/modules/analytics/*`
- Cross-channel state: `backend/src/modules/user-state/crossChannelState.service.ts`

## Reading Order

1. Delivery checklist
2. User state machine
3. AI navigator
4. Google Sheets blueprint
5. Behavioral intelligence
6. Performance + cost audit

---

## 1. Master Delivery Checklist

### Completed Systems

| Task | Status | Priority | Owner | Risk | Dependencies | Affected modules/files | Explanation |
|---|---|---:|---|---|---|---|---|
| Shared Telegram runtime with webhook/polling fallback | done | high | backend | medium | bot token, webhook URL, bot registry | `backend/src/index.ts`, `backend/src/lib/telegram.ts` | Runtime can start in webhook or polling mode and owns Telegram startup, commands, and webhook registration. |
| Central lifecycle resolver | done | high | backend | medium | user subscription, onboarding, lead magnet, access source | `backend/src/modules/lifecycle/service.ts`, `backend/src/modules/flow-control/service.ts` | Resolves guest/onboarding/trial/active/paused/expired/winback states from real user data. |
| Deeplink generation and consumption | done | high | backend | medium | bot username, deep link table, Telegram binding flow | `backend/src/modules/deeplinks/service.ts` | Creates one-time links for Telegram binding, onboarding continuation, and other routed entry points. |
| WayForPay payment callback flow | done | high | backend | high | signature verification, payment mapping, subscription processor | `backend/src/modules/subscriptions/payments/callback.ts`, `backend/src/modules/subscriptions/payments/business.ts` | Validates callbacks, writes payment logs, emits analytics, and triggers Telegram success messaging. |
| Cross-channel state cache | done | medium | backend | medium | cache layer | `backend/src/modules/user-state/crossChannelState.service.ts` | Stores last channel, daily notification dedupe, and cycle progress across site/web/miniapp/telegram. |

### Partially Completed Systems

| Task | Status | Priority | Owner | Risk | Dependencies | Affected modules/files | Explanation |
|---|---|---:|---|---|---|---|---|
| Product room mapping across FOCUS/STANKEY/ABsystem | partial | high | backend | high | product manifest, room service, lifecycle snapshot | `backend/src/modules/telegram-mentor/services/product-room.service.ts`, `backend/src/content/telegram.product-context.ts` | Room state, CTA, mentor intensity, and upsell state are mapped, but the operational policy still mixes product behavior with shared logic. |
| AI mentor orchestration | partial | high | backend | high | AI task registry, mentor sessions, daily/weekly analysis | `backend/src/modules/ai-mentor/*`, `backend/src/modules/telegram-mentor/handlers/aiMentor.ts` | Mentor responses, insights, and weekly reports exist, but readiness thresholds and mode-gates still need one canonical navigator. |
| Dashboard/control-center layer | partial | medium | frontend/backend | medium | analytics, lifecycle, product summaries, access APIs | `apps/web/src/features/analytics/*`, `backend/src/modules/analytics/*`, `apps/web/src/components/orchestrator/*` | Control surfaces exist, but they are not yet aligned into one single operational command center. |
| Product registry and product-specific manifests | partial | medium | backend | medium | shared platform registry, product manifests, routes | `backend/src/platform/index.ts`, `backend/src/products/*/product.manifest.ts` | Product definitions exist, but some product content is still placeholder-shaped and needs normalization. |
| Callback event taxonomy | partial | medium | backend | medium | Telegram callback map, decision router, room dispatcher | `backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts`, `backend/src/core/orchestrator/eventRouter.ts` | Callback classes and transitions exist, but some flows still route through legacy names or generic fallbacks. |

### Missing Critical Systems

| Task | Status | Priority | Owner | Risk | Dependencies | Affected modules/files | Explanation |
|---|---|---:|---|---|---|---|---|
| Canonical platform navigator with readiness gates | missing | critical | product + backend | high | user state, lifecycle, room state, AI tiers | `backend/src/core/orchestrator/*`, `backend/src/modules/ai-mentor/*` | The platform needs one authoritative AI Navigator that blocks next-tier selling until engagement readiness is proven. |
| Operational Google Sheets control center | missing | high | ops + product | medium | roadmap, lifecycle, analytics, funnels | `docs/platform/*` | The system lacks a shared spreadsheet blueprint for non-developer operations and launch coordination. |
| Unified state-machine mapping to business states | missing | high | backend + product | high | lifecycle resolver, cross-channel state, mentor modes | `backend/src/core/state-machine/*`, `backend/src/modules/lifecycle/service.ts` | Code has low-level lifecycle states, but the business state model is not yet published as a canonical map. |
| Anonymous feedback intelligence pipeline | missing | high | product + backend | medium | sentiment, lifecycle relation, analytics tagging | `backend/src/modules/analytics/*`, `backend/src/modules/user-state/*` | Feedback can be collected, but the privacy-safe sentiment/risk pipeline is not centralized. |
| Distributed lock strategy for cron and callback overlap | missing | high | backend | high | scheduler, callback dedupe, reminder delivery | `backend/src/services/scheduler/index.ts`, `backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts` | Current in-memory locks are not enough for multi-instance safety. |

### Risk Sections

- UX: CTA inconsistency across Telegram and web, room-copy drift, promise/runtime mismatch.
- Security: webhook hardening, deeplink table availability, payment trust boundary.
- Billing: subscription state sync, success-path delivery, plan/product integrity.
- Telegram: callback duplication, session continuity, room branching.
- Performance: repeated lifecycle resolution, AI overuse, cron overlap.
- AI: next-tier selling too early, expensive prompt churn, sentiment hallucination.
- Infrastructure: single-node cron locks, deep link dependency, cache invalidation discipline.
- Analytics: canonical funnel events, state transition observability, AI quality tagging.
- Scalability: product expansion pattern, multi-instance reminder safety, mentor session throughput.
- Technical debt: mixed lifecycle naming, legacy Telegram fallbacks, placeholder product content.
- Product questions: first paid product after FOCUS, upsell visibility rules, ambassador trigger.
- Content questions: landing/runtime copy alignment, onboarding ownership, universal AI tone.

### Final Pre-launch Tasks

| Task | Status | Priority | Owner | Risk | Dependencies | Affected modules/files | Explanation |
|---|---|---:|---|---|---|---|---|
| Publish the control-center docs set | pending | critical | product ops | medium | checklist, state machine, sheets, navigator | `docs/platform/*` | These documents must become the shared operating manual for launch. |
| Add distributed locks for cron and callback dedupe | pending | high | backend | high | infra, queue/storage choice | `backend/src/services/scheduler/index.ts`, `backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts` | Multi-instance launch needs a shared lock implementation. |
| Verify billing callback end-to-end | pending | high | backend + finance | high | WayForPay, product mapping, Telegram success path | `backend/src/modules/subscriptions/payments/callback.ts` | Test the full approved-payment journey with live callbacks. |
| Lock AI navigator gate rules | pending | critical | product + backend | high | readiness states, allowed CTAs | `backend/src/modules/ai-mentor/*`, `backend/src/content/telegram.product-context.ts` | The AI must not sell a next tier before readiness is true. |
| Finalize analytics event dictionary | pending | medium | analytics | medium | funnel stages, state transitions | `backend/src/modules/events/*`, `apps/web/src/features/analytics/*` | One canonical event vocabulary is needed before launch. |

---

## 2. User State Machine

Canonical product-facing states normalized from runtime lifecycle and room logic.

### Global Rules

- AI must never sell the next tier before readiness is established.
- Telegram is the primary orchestration channel.
- Dashboard shows truth, progress, and risk, not aspirational sales copy.

### State Map

| Canonical state | Access level | Telegram behavior | Dashboard behavior | AI mode | Reminders | Mentor intensity | Allowed CTA | Forbidden CTA | Upsells | Analytics events |
|---|---|---|---|---|---|---|---|---|---|---|
| `cold_lead` | public / no product access | Waitlist or lead magnet entry, no room access | Landing only, no member area | Lead Mode | off or very light | silent | `start`, `waitlist`, `bind_telegram` | `buy`, `upgrade`, `restore` | none | `landing_view`, `lead_optin`, `telegram_start` |
| `test_started` | guided onboarding access | Onboarding room, lead magnet continuation, first diagnostic step | Onboarding progress and checklist | Lead Mode | gentle | soft | `continue`, `continue_onboarding`, `open_onboarding` | `buy_next_tier`, `hard_sell` | focus invite, trial invite | `onboarding_started`, `quiz_started`, `lead_step_progress` |
| `test_completed` | completion / trial-ready | Completion acknowledgement, trial invitation, room preview | Completion badge, next-step prompt | Lead Mode / early Focus Mode | gentle | soft | `activateTrial`, `openRoom`, `continue` | `mentor_upgrade`, `high_ticket_offer` | focus activation | `onboarding_completed`, `trial_offer_opened`, `quiz_completed` |
| `focus_invited` | preview + invitation access | Focus room preview, invitation CTA, explanation of value | Offer block, feature preview, next-action panel | Lead Mode | off or gentle | soft | `buy`, `activateTrial`, `openRoom` | `high_ticket_offer`, `mentor_sell` | focus join | `focus_invite_viewed`, `focus_cta_click` |
| `focus_joined` | paid/trial active access | Active room, continued lesson, activation success path | Product room visible, progression widgets enabled | Focus Mode | daily / focused | medium | `continue`, `continueLesson`, `openRoom`, `open_practices` | `restore`, `hard_sell_next_tier` | platform readiness cues | `subscription_activated`, `room_opened`, `lesson_started` |
| `focus_engaged` | active with visible usage | Active room with streak, practices, nudges, low-friction resume | Progress dashboard with streak, lesson status, and recent activity | Focus Mode | daily | medium | `continue`, `continueLesson`, `open_practices` | `next_tier_push_before_ready` | context-aware upsell only | `streak_kept`, `practice_completed`, `session_resumed` |
| `platform_candidate` | active + high intent, not yet escalated | Stable room, subtle value prompts, no aggressive sale | Readiness indicators only | Platform Mode | gentle | medium | `continue`, `open`, `resume` | `upgrade`, `high_ticket_sell` | platform tools only when explicit fit exists | `engagement_threshold_reached`, `candidate_flagged` |
| `platform_active` | active platform access | Room + mentor orchestration, multi-step flows, contextual help | Full product dashboard with AI and lifecycle controls | Platform Mode | daily or every2days | medium | `openRoom`, `resume`, `continue_ai_mentor` | `cross_sell_before_threshold` | limited, behavior-based | `platform_active`, `mentor_session_started`, `feature_used` |
| `state_course_candidate` | course-ready but not sold | Suggest educational path only after engagement proof | Show course path, not pressure sale | Platform Mode | gentle | medium | `open`, `continue`, `explore_course` | `mentor_close`, `high_ticket_pressure` | course path | `course_candidate_detected`, `education_path_viewed` |
| `high_ticket_candidate` | high-intent / human-led | Human-mentor escalation, consult CTA, careful messaging | Show human review / consult readiness | Retention Mode / escalated Platform Mode | focused | aggressive only when requested | `book_call`, `continue_ai_mentor`, `request_review` | `sell_without_readiness`, `stacked_offer` | mentorship / high-ticket only | `high_ticket_ready`, `consult_requested`, `mentor_candidate` |
| `retention_risk` | limited / pause / at-risk | Winback copy, restore path, low-friction return CTA | Risk dashboard, churn reason, last-activity view | Retention Mode | gentle / retention | soft | `restore`, `resume`, `reactivate` | `premium_upgrade`, `high_ticket_sell` | restore first | `retention_risk`, `streak_broken`, `subscription_expiring` |
| `renewal_candidate` | expiring / renewal path | Renewal reminder, saved progress, one-click restore | Renewal panel, saved-state summary | Retention Mode | gentle | soft | `restore`, `renew`, `continue` | `new_tier_sell` | renewal / restore | `renewal_window_open`, `payment_expiring`, `restore_click` |
| `ambassador` | completed + advocacy access | Share/referral prompts, thank-you flow, no pressure selling | Referral / testimonial / feedback tools | Platform Mode / Retention Mode | off or occasional | silent to soft | `share`, `refer`, `feedback`, `review` | `hard_sell`, `downgrade_pressure` | referral only | `advocate_activated`, `referral_shared`, `testimonial_submitted` |

### Behavior Gates

- `cold_lead` can only move to `test_started` through explicit entry or waitlist opt-in.
- `test_started` can only move to `test_completed` after onboarding or lead magnet completion.
- `focus_joined` can only move to `focus_engaged` after visible usage or lesson/session completion.
- `platform_candidate` can only move to `high_ticket_candidate` after strong engagement and explicit readiness.
- `retention_risk` must always prefer restore/renewal CTA over upsell.

---

## 3. Google Sheets Blueprint

Operational spreadsheet structure for planning, ownership, approval, and launch control.

### Sheet List

| Sheet | Columns | Ownership | Update rules | Automation possibilities | Dependencies |
|---|---|---|---|---|---|
| MASTER ROADMAP | `phase`, `initiative`, `status`, `priority`, `owner`, `risk_level`, `dependencies`, `affected_modules_files`, `eta`, `notes` | Founder + product ops | Update when scope changes, blockers appear, or phase closes. | Import milestone dates, sync status to admin dashboard. | All other sheets; product ladder; launch checklist. |
| USER STATES | `user_id`, `canonical_state`, `technical_state`, `access_level`, `telegram_mode`, `dashboard_mode`, `ai_mode`, `next_cta`, `forbidden_cta`, `upsell_state`, `retention_state`, `last_event_at` | Product ops + backend | Update from lifecycle transitions and manual escalations only. | Pull from lifecycle snapshots and state-machine reports. | User state machine, lifecycle service, Telegram summary. |
| PRODUCT LADDER | `product_id`, `tier`, `role`, `entry_condition`, `exit_condition`, `primary_cta`, `secondary_ctas`, `success_metric`, `next_product`, `owner` | Founder + product | Change only when ladder or offer strategy changes. | Generate from product registry and room policies. | Product manifests, billing, navigator, room engine. |
| TELEGRAM FLOWS | `flow_id`, `trigger`, `entry_point`, `state`, `callback_actions`, `cta_text`, `room_owner`, `fallback`, `dedupe_rule` | Backend + Telegram ops | Update on callback changes or new room transitions. | Pull from callback map and event bus registry. | Event bus, room service, handlers, bot runtime. |
| AI TASK REGISTRY | `task_type`, `mode`, `tier`, `model`, `max_tokens`, `timeout_ms`, `ttl_seconds`, `throttle_ms`, `retry_policy`, `owner` | Backend + AI | Change when prompt budgets, models, or caching change. | Sync with `backend/src/platform/ai.registry.ts`. | AI registry, task runner, prompts, cache. |
| FUNNEL MAP | `funnel_name`, `stage`, `entry_event`, `exit_event`, `cta`, `owner`, `target_metric`, `risk` | Analytics + product | Update when events or conversion logic changes. | Import from analytics events and lifecycle transitions. | Analytics service, lifecycle resolver, dashboard. |
| ANALYTICS EVENTS | `event_name`, `channel`, `state`, `trigger`, `payload_shape`, `owner`, `sensitivity`, `retention_policy` | Analytics + backend | Add new events before code release. | Validate payloads against a generated dictionary. | Event service, callback bus, billing, AI events. |
| REMINDERS + CRONS | `job_id`, `cadence`, `channel`, `scope`, `trigger`, `dedupe_key`, `owner`, `fallback`, `enabled` | Backend + ops | Update when cadence or notification logic changes. | Sync from `backend/src/platform/cron.registry.ts`. | Scheduler, notification service, reminder service. |
| CALLBACK EVENTS | `callback_data`, `kind`, `transition`, `product_id`, `handler`, `expected_response`, `dedupe_rule`, `owner` | Backend | Update with every Telegram button/action change. | Generate from callback map and handlers. | Event bus, start/billing/mentor handlers. |
| OPEN QUESTIONS | `question`, `context`, `impact`, `owner`, `due_date`, `status`, `decision` | Founder + product | Close only when reflected in docs and code. | Link to roadmap blockers and unresolved questions. | All planning sheets. |
| PRE-LAUNCH CHECKLIST | `task`, `owner`, `priority`, `risk`, `dependency`, `validation_method`, `status`, `done_at` | Ops + backend + product | Every launch task must be closed or deferred. | Generate from the delivery checklist. | Billing, telegram, AI, analytics, infra. |
| POST-LAUNCH MONITORING | `metric`, `baseline`, `alert_threshold`, `owner`, `interval`, `source`, `action_if_broken`, `status` | Analytics + backend + ops | Update thresholds after the first live data window. | Connect to dashboards and alerts. | Analytics events, cron jobs, subscription webhooks, Telegram delivery. |

---

## 4. AI Navigator

Centralized operating model for AI behavior across the ecosystem.

### Global Guardrails

- Never sell the next tier before readiness is established.
- Never push high-ticket offers while the user is a cold lead, onboarding, or in retention risk.
- Prefer the smallest helpful action that matches the current state.
- Read lifecycle, product-room state, and cross-channel state together before choosing a CTA.
- Use cheap or cached tasks when the answer is structural; use balanced tasks when the answer is behavioral or relational.

### Mode Table

| Mode | Emotional state | CTA rules | Forbidden upsells | Allowed products | Reminder behavior | Mentor intensity | Telegram behavior | Dashboard behavior | AI tone | Escalation rules |
|---|---|---|---|---|---|---|---|---|---|---|
| Lead Mode | cautious, confused, curious | One safe next step, usually lead magnet or waitlist | Any next-tier product, premium consult, aggressive upsell | lead magnet, waitlist, entry offer | off or gentle | silent to soft | lightweight, explanatory, no pressure | show entry progress only | calm, clear, low-friction | escalate only if the user explicitly asks for help or binding |
| Focus Mode | active, practicing, learning | Continue current product, resume lesson, open practices | cross-sell before proof, premium consult, hard pressure | FOCUS, restore path only if paused | daily or focused | medium | active room prompts, lesson continuation, practice reminders | show progress, streak, next lesson, room state | practical, direct, supportive | escalate only when repeated frustration or stagnation is detected |
| Platform Mode | engaged, expanding, solution-aware | Offer the next logical platform step only after readiness signal | any tier jump before `upsell_ready` or `mentor_candidate` | FOCUS, STANKEY, ABsystem depending on ladder stage | gentle to daily | medium to aggressive only when qualified | room resume, system help, contextual CTA | full lifecycle + product summary + readiness indicators | strategic, structured, evidence-based | escalate when readiness signals, repeated engagement, or explicit request are present |
| Retention Mode | cautious, at-risk, repair-oriented | Restore, renew, or resume with saved progress first | next-tier sell, premium consult, stacked offers | restore path, renewal, saved-access product | gentle, retention, winback | soft | winback language, saved progress, low-pressure reactivation | show saved context, risk, expiration, last activity | empathetic, stable, non-urgent | escalate to human review only on high-value churn or negative sentiment |

### Rules

- Lead Mode: only lead magnet, waitlist, and binding CTAs.
- Focus Mode: current room actions and exact next lesson or practice.
- Platform Mode: product-specific continuation and only explicitly validated adjacent offers.
- Retention Mode: restore, resume, renew, and recover context.

### Telegram / Dashboard Behavior

- Every message must match the current state, not the desired future state.
- Buttons must reflect the safest allowed CTA only.
- The room engine is the source of current action.
- Dashboard shows truth, readiness, risk, and next allowed action.

---

## 5. Behavioral Intelligence

Anonymous feedback, sentiment, lifecycle, and retention intelligence.

### Flow

Anonymous feedback → PII stripping / normalization → AI sentiment analysis → lifecycle relation → retention-risk detection → upsell readiness check → escalation → analytics tagging

### Privacy Model

- Anonymous by default unless the user opts into identity linkage.
- Store the minimum data needed for analysis and launch decisions.
- Strip obvious personal identifiers before sentiment analysis.
- Keep raw text retention short and access tightly controlled.
- Link feedback to lifecycle only through safe IDs or hashed references when needed.

### Moderation

- Flag hostile, abusive, or self-harm-adjacent messages for manual review.
- Treat AI sentiment as advisory, not absolute truth.
- Never let sentiment directly trigger a next-tier sale.
- Use moderation status to suppress auto-upsells until review is complete.

### AI Cost Control

- Use the cheapest sufficient model for classification and routing.
- Cache repeated sentiment and classification results by feedback hash.
- Batch analysis where possible.
- Escalate to balanced models only for high-entropy or product-critical cases.

### Lifecycle Relation

- Join feedback with lifecycle state, room state, and channel state only after normalization.
- Map feedback to canonical state: cold lead, onboarding, focus engaged, platform active, retention risk, renewal candidate, ambassador.
- Use the lifecycle relation to decide whether the issue is product, retention, or onboarding related.

### Retention-Risk Detection

Signals:

- low activity in Telegram or dashboard
- recent pause or expiry
- repeated “not now” / “too hard” / “did not use” feedback
- streak broken or lesson stalled
- negative sentiment plus inactivity

When risk is detected:

- surface restore or resume first
- suppress premium upsells
- log a retention-risk analytics event
- notify mentor only if the user is mentor-eligible

### Upsell Readiness

Derived from:

- completed onboarding
- repeated product usage
- visible progress or streak
- explicit ask for the next step
- platform-active behavior

Readiness must be checked before any next-tier CTA is shown.

### Analytics Usage

- Tag every analyzed item with `feedback_type`, `sentiment_bucket`, `lifecycle_state`, `risk_level`, and `readiness_level`.
- Feed tags into funnel health, retention dashboards, and product backlog prioritization.
- Do not expose raw anonymous feedback in public dashboards.

---

## 6. Performance + Cost Audit

Audit of runtime cost, duplication risk, and scale risk.

### Current Mitigations Already In Code

- In-memory callback dedupe: `backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts`
- In-memory cron locks: `backend/src/services/scheduler/index.ts`
- Lifecycle cache: `backend/src/modules/lifecycle/service.ts`
- Cross-channel user-state cache: `backend/src/modules/user-state/crossChannelState.service.ts`
- AI task registry with model tiers and cache TTLs: `backend/src/platform/ai.registry.ts`

### Audit Areas

| Area | Current signal in code | Risk | Recommendation |
|---|---|---|---|
| Duplicate fetches | lifecycle and summary resolvers query overlapping data repeatedly | medium | Introduce request-level memoization for lifecycle + room summary composition. |
| Auth restore overhead | binding, session lookup, and identity resolution happen in several paths | medium | Cache auth restore results per request and add a shared restore snapshot. |
| AI overuse | mentor and weekly analysis can be triggered from multiple paths | high | Enforce navigator readiness gates and task-specific throttles before any non-trivial generation. |
| Expensive prompts | mentor replies and weekly insights are the highest cost paths | high | Keep cached answers for repeatable queries and prefer balanced/cheap tiers by default. |
| Repeated lifecycle resolving | product room, AI mentor, start flow, and callback routing all resolve lifecycle | medium | Build one request-scoped lifecycle snapshot object and pass it through the chain. |
| Redundant reminders | scheduler emits multiple reminder families on frequent cron cadence | high | Move reminder state to a shared lock/store and dedupe by `(userId, triggerEvent, day)`. |
| Callback duplication | callback map dedupe is time-based and in-memory | high | Add shared dedupe keys or distributed locks for webhook scale-out. |
| Cron overlap | minute-level tasks can overlap in multi-instance runtime | high | Use distributed locks or a queue-backed scheduler. |
| Cache misses | product summaries and room snapshots depend on many DB reads | medium | Cache room snapshot composition per user for short TTLs. |
| Routing loops | legacy fallbacks and menu-return paths can re-enter the same flow | medium | Add explicit loop counters and state guards around callback transitions. |

### Roadmap

Immediate:

- Add request-scoped lifecycle memoization.
- Move callback dedupe keys into a shared store.
- Mark the heaviest AI paths with hard readiness gates.
- Reduce repeated room summary composition within the same request.

Medium term:

- Introduce queue-based reminder dispatch.
- Split analytics generation from synchronous billing callbacks.
- Add persistent cron locks.
- Add a short-lived cache for Telegram product summaries.

Longer term:

- Put AI jobs behind a centralized queue with priority lanes.
- Add multi-instance safe idempotency for payments, callbacks, and reminder sends.
- Add per-user throttling for mentor replies and weekly reports.

### AI Tier Recommendations

| Task | Current tier | Recommendation | Reason |
|---|---|---|---|
| `mentor_reply` | balanced | keep balanced | Needs quality and consistency, but should stay cached and throttled. |
| `weekly_insight` | balanced | keep balanced | Summary quality matters more than raw cost, but can still be cached. |
| `daily_analysis` | cheap | keep cheap | Classification/summary work should stay inexpensive. |
| `web_map_adaptation` | cheap | keep cheap | Structural adaptation is token-heavy but not high value enough for premium tier by default. |
| `task_priority` | cheap | keep cheap | A routing/classification task, not a creative task. |
| `banner_generation` | balanced | keep balanced | Output quality matters, but frequency should be low. |
| `assistant_weekly_insight` | balanced | keep balanced | Enough quality for actionable insight without premium routing. |
| `lead_magnet_copy` | cheap | keep cheap | Reusable copy generation should remain low-cost. |

### Caching Recommendations

- Cache lifecycle snapshots per request and short TTL.
- Cache product summaries per user for a short window.
- Cache repeated AI classification outputs by content hash.
- Cache deep-link resolutions until consumed.
- Cache cross-channel state with explicit daily invalidation.

### Queue Recommendations

- Billing callback follow-up tasks should be async.
- Weekly analysis generation should be async.
- Reminder sends should be queue-backed in multi-instance deployments.
- Any AI task that can be delayed without breaking UX should run through a queue.

### Distributed Lock Recommendations

- Replace in-memory cron locks with Redis or DB locks.
- Replace in-memory callback dedupe with shared idempotency keys.
- Use per-user locks for payment activation and subscription state mutation.
- Use per-chat locks for Telegram session mutation.

---

## Operating Rule

Manage the platform from the codebase. Use this README as the shared human operating layer for launch, monitoring, planning, and product decisions.
