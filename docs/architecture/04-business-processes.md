# Document

Business Process Model

> 🇺🇦 Канонічний документ у межах нормалізованого STEP-набору.

# Purpose

Defines a canonical business or AI architecture layer for the Starway / ABSystem platform.

> 🇺🇦 Коротко фіксує, навіщо існує цей документ.

# Scope

Covers implementation-independent structure, state, process, capability, or governance rules for the owned architecture domain.

> 🇺🇦 Окреслює межі документа без зміни його змісту.

# Audience

Enterprise architects, backend engineers, AI systems architects, and technical leads.

> 🇺🇦 Показує, кому цей документ насамперед потрібен.

# Dependencies

- `docs/architecture/01-domain-model.md`
- `docs/architecture/02-data-model.md`
- `docs/architecture/03-state-machines.md`
- `docs/foundation/05-business-events.md`
- `docs/foundation/09-business-rules.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/technical/05-event-architecture.md`
- `docs/technical/06-workflow-orchestration.md`
- `docs/engineering/07-testing-blueprint.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The Business Process Model exists to define the canonical end-to-end business processes executed across the Starway / ABSystem ecosystem.

It answers one question:

How do canonical business objects, business events, state machines, and AI agents work together to produce business outcomes over time?

This document does not redefine:

- business entities;
- business objects;
- business events;
- business rules;
- state machine transitions;
- AI agent responsibilities.

Instead, it composes them into end-to-end business processes.

Business Processes are the orchestration layer between:

- Business Events;
- Business State Machines;
- AI Agent participation;
- completion outcomes recognized by the business.

## Process Modeling Principles

1. End-to-end only.
   A business process must describe a complete business outcome, not a local technical step.

2. Canonical references only.
   Every process must reference existing canonical Business Events, State Machines, Business Rules, and AI Agents.

3. Event-driven.
   A process begins because a valid business trigger exists.

4. State-aware.
   A process must respect canonical state machines and may not invent undocumented transitions.

5. Deterministic completion.
   A process must define what successful completion means in business terms.

6. Explicit participants.
   Every process must name the business participants involved.

7. No hidden ownership.
   Processes may coordinate business objects and AI agents, but they do not replace object ownership or state-machine ownership.

8. Exceptions are part of the process.
   Invalid paths, drop-off, and recovery must be explicit.

## Business Process Inventory

The canonical end-to-end business processes in the current architecture are:

1. Audience Entry Process
2. Diagnostic Entry Process
3. Recommendation Delivery Process
4. FOCUS Activation Process
5. Platform Upgrade Process
6. Premium Conversion Process
7. Subscription Renewal Process
8. Subscription Recovery Process
9. Referral Conversion Process
10. Recommendation Refresh Process

These are the business processes currently supported by the Foundation and Architecture canon.

No additional process is authorized unless it can be derived from canonical Business Events, State Machines, and Business Rules.

## End-to-End Process Definitions

### 1. Audience Entry Process

- Trigger:
  - `Telegram Joined`
- Participants:
  - User
  - Business relationship entry layer
  - Funnel Agent
  - Onboarding Agent
- Business events:
  - `Telegram Joined`
- State transitions:
  - User Lifecycle Record:
    - `Anonymous` → `Telegram Contact`
- Business rules:
  - `BR-001 — One Active Lifecycle State Per User`
  - `BR-003 — Funnel Stages Never Replace Lifecycle States`
  - `BR-018 — Business State Changes Require Business Facts`
- Completion criteria:
  - The user is recognized as a direct contact in `Telegram Contact`.

### 2. Diagnostic Entry Process

- Trigger:
  - `Entry Test Started`
  - `Entry Test Completed`
- Participants:
  - User
  - Entry Test product layer
  - Funnel Agent
  - Recommendation Agent
  - Onboarding Agent
- Business events:
  - `Entry Test Started`
  - `Entry Test Completed`
- State transitions:
  - User Lifecycle Record:
    - `Telegram Contact` → `Test Participant`
    - `Test Participant` → `Recommended`
- Business rules:
  - `BR-001 — One Active Lifecycle State Per User`
  - `BR-018 — Business State Changes Require Business Facts`
- Completion criteria:
  - The user reaches `Recommended` with completed diagnostic context.

### 3. Recommendation Delivery Process

- Trigger:
  - `Recommendation Generated`
- Participants:
  - User
  - Recommendation layer
  - Recommendation Agent
  - Funnel Agent
  - Notification Agent
- Business events:
  - `Recommendation Generated`
- State transitions:
  - Recommendation Record:
    - `Generated` → `Delivered`
  - User Lifecycle Record:
    - `Recommended` → `Recommended` (state preserved while next-step guidance is made explicit)
- Business rules:
  - `BR-006 — Recommendations Never Modify Business State Directly`
  - `BR-018 — Business State Changes Require Business Facts`
- Completion criteria:
  - A valid recommendation is actively delivered as the next business step.

### 4. FOCUS Activation Process

- Trigger:
  - `Subscription Activated`
  - supported by `Payment Received`
- Participants:
  - User
  - FOCUS Membership product layer
  - Payment Agent
  - Subscription Agent
  - Notification Agent
- Business events:
  - `Payment Received`
  - `Subscription Activated`
- State transitions:
  - Subscription Record:
    - `Intended` → `Active`
  - User Lifecycle Record:
    - `Recommended` → `FOCUS Member`
- Business rules:
  - `BR-007 — Subscriptions Determine Paid Access`
  - `BR-008 — Permissions Derive From Lifecycle And Subscription`
  - `BR-018 — Business State Changes Require Business Facts`
- Completion criteria:
  - The user has active FOCUS continuity and enters `FOCUS Member`.

### 5. Platform Upgrade Process

- Trigger:
  - `Subscription Upgraded`
- Participants:
  - User
  - ABSystem Platform product layer
  - Subscription Agent
  - Payment Agent
  - Retention Agent
- Business events:
  - `Subscription Upgraded`
  - `Payment Received`
- State transitions:
  - Subscription Record:
    - `Active` → `Upgraded`
    - `Upgraded` → `Active`
  - User Lifecycle Record:
    - `FOCUS Member` → `Platform Subscriber`
- Business rules:
  - `BR-007 — Subscriptions Determine Paid Access`
  - `BR-008 — Permissions Derive From Lifecycle And Subscription`
  - `BR-011 — Premium Movement Requires Business Validity`
  - `BR-018 — Business State Changes Require Business Facts`
- Completion criteria:
  - The user receives active Platform continuity and enters `Platform Subscriber`.

### 6. Premium Conversion Process

- Trigger:
  - `Strategy Session Booked`
- Participants:
  - User
  - Premium Services layer
  - Coach Agent
  - Recommendation Agent
- Business events:
  - `Strategy Session Booked`
- State transitions:
  - User Lifecycle Record:
    - `Platform Subscriber` → `Premium Client`
- Business rules:
  - `BR-011 — Premium Movement Requires Business Validity`
  - `BR-018 — Business State Changes Require Business Facts`
- Completion criteria:
  - The user enters `Premium Client` through a valid premium movement path.

### 7. Subscription Renewal Process

- Trigger:
  - `Subscription Renewed`
  - supported by `Payment Received`
- Participants:
  - User
  - Subscription Agent
  - Payment Agent
  - Retention Agent
  - Notification Agent
- Business events:
  - `Subscription Renewed`
  - `Payment Received`
- State transitions:
  - Subscription Record:
    - `Active` → `Renewed`
    - `Renewed` → `Active`
    - `Expired` → `Renewed`
  - User Lifecycle Record:
    - `Subscription Expired` → `FOCUS Member` or `Platform Subscriber`, depending on renewed scope
- Business rules:
  - `BR-007 — Subscriptions Determine Paid Access`
  - `BR-008 — Permissions Derive From Lifecycle And Subscription`
  - `BR-012 — Renewal Is Distinct From First Purchase`
  - `BR-018 — Business State Changes Require Business Facts`
- Completion criteria:
  - Continuity is restored without treating the user as a first-time entrant.

### 8. Subscription Recovery Process

- Trigger:
  - `Subscription Expired`
  - later recovery through `Telegram Joined` or `Subscription Activated` / `Subscription Renewed`
- Participants:
  - User
  - Subscription Agent
  - Retention Agent
  - Funnel Agent
  - Notification Agent
- Business events:
  - `Subscription Expired`
  - `Telegram Joined`
  - `Subscription Activated`
  - `Subscription Renewed`
- State transitions:
  - User Lifecycle Record:
    - `FOCUS Member` → `Subscription Expired`
    - `Platform Subscriber` → `Subscription Expired`
    - `Premium Client` → `Subscription Expired`
    - `Inactive` → `Telegram Contact`
    - `Subscription Expired` → `FOCUS Member` or `Platform Subscriber`, depending on recovery scope
  - Subscription Record:
    - `Active` → `Expired`
    - `Expired` → `Renewed` or `Active`
- Business rules:
  - `BR-007 — Subscriptions Determine Paid Access`
  - `BR-008 — Permissions Derive From Lifecycle And Subscription`
  - `BR-013 — Recovery Must Use Canonical Return Paths`
  - `BR-018 — Business State Changes Require Business Facts`
- Completion criteria:
  - The user either re-enters through a canonical return path or remains correctly classified as expired / inactive.

### 9. Referral Conversion Process

- Trigger:
  - `Referral Created`
  - `Referral Converted`
- Participants:
  - Referring user
  - Referred person
  - Referral Agent
  - Funnel Agent
- Business events:
  - `Referral Created`
  - `Referral Converted`
- State transitions:
  - No direct canonical lifecycle transition is defined solely by `Referral Created`
  - `Referral Converted` may support standard entry through normal funnel entry conditions rather than bypassing them
- Business rules:
  - `BR-005 — Every Business Event Has One Meaning`
  - `BR-018 — Business State Changes Require Business Facts`
- Completion criteria:
  - Referral becomes a recognized conversion fact without bypassing canonical entry logic.

### 10. Recommendation Refresh Process

- Trigger:
  - a new `Recommendation Generated` event after prior recommendation context is no longer current
- Participants:
  - User
  - Recommendation Agent
  - Funnel Agent
  - Reflection Agent
  - Retention Agent
- Business events:
  - `Recommendation Generated`
- State transitions:
  - Recommendation Record:
    - `Delivered` → `Expired`
    - a new Recommendation Record: `Generated` → `Delivered`
- Business rules:
  - `BR-006 — Recommendations Never Modify Business State Directly`
  - `BR-018 — Business State Changes Require Business Facts`
- Completion criteria:
  - The prior recommendation is no longer active and a newly valid recommendation becomes the current next step.

## Process Dependencies

### Audience Entry Process depends on

- `Telegram Joined`
- User Lifecycle state machine
- Funnel and lifecycle canon

### Diagnostic Entry Process depends on

- Audience Entry Process having created direct contact
- `Entry Test Started`
- `Entry Test Completed`
- User Lifecycle state machine

### Recommendation Delivery Process depends on

- Diagnostic Entry Process
- `Recommendation Generated`
- Recommendation state machine

### FOCUS Activation Process depends on

- Recommendation Delivery Process having established a valid next step
- `Payment Received`
- `Subscription Activated`
- Subscription and User Lifecycle state machines

### Platform Upgrade Process depends on

- Active FOCUS continuity
- `Subscription Upgraded`
- `Payment Received`
- Subscription and User Lifecycle state machines

### Premium Conversion Process depends on

- Valid user readiness within a higher-value relationship path
- `Strategy Session Booked`
- User Lifecycle state machine

### Subscription Renewal Process depends on

- Existing or recently expired paid continuity
- `Subscription Renewed`
- `Payment Received`
- Subscription and User Lifecycle state machines

### Subscription Recovery Process depends on

- `Subscription Expired`
- canonical re-entry or reactivation events
- recovery rules and lifecycle canon

### Referral Conversion Process depends on

- `Referral Created`
- `Referral Converted`
- standard funnel entry logic remaining intact

### Recommendation Refresh Process depends on

- Existing recommendation context
- a new `Recommendation Generated`
- Recommendation state machine

## Exception Flows

### No direct contact after awareness

- If `Telegram Joined` does not occur, the Audience Entry Process does not start.
- No later process may assume direct contact without this entry fact.

### Test started but not completed

- The user may remain in `Test Participant` or later become `Inactive`.
- No recommendation process may complete without `Entry Test Completed`.

### Recommendation delivered but not accepted

- Recommendation may remain `Delivered`, later become `Expired`, or be replaced by a fresh recommendation.
- It may not directly force lifecycle or subscription change.

### Payment received without canonical activation event

- `Payment Received` alone is not sufficient to change all state machines automatically.
- Subscription and lifecycle movement must follow the canonical activation or renewal event path.

### Expired continuity without recovery

- The user remains in `Subscription Expired` or may later become `Inactive`.
- No direct premium or platform restoration may occur without canonical recovery events.

### Referral without conversion

- `Referral Created` alone does not create a lifecycle upgrade or subscription state change.
- The referred person must still enter through canonical funnel logic.

### Premium interest without valid premium event

- A recommendation toward Premium Services may exist.
- `Premium Client` state may not occur without a valid premium movement event such as `Strategy Session Booked`.

## AI Agent Participation

### Audience Entry Process

- Observing agents:
  - Funnel Agent
  - Onboarding Agent
- Executing agents:
  - Onboarding Agent
- Decision points:
  - Whether the user should be guided into diagnostic participation as the next step

### Diagnostic Entry Process

- Observing agents:
  - Funnel Agent
  - Onboarding Agent
  - Recommendation Agent
- Executing agents:
  - Recommendation Agent
- Decision points:
  - Whether diagnostic completion produces a valid next-step recommendation

### Recommendation Delivery Process

- Observing agents:
  - Recommendation Agent
  - Funnel Agent
  - Notification Agent
- Executing agents:
  - Recommendation Agent
  - Notification Agent
- Decision points:
  - Which valid next step should become the current recommendation

### FOCUS Activation Process

- Observing agents:
  - Payment Agent
  - Subscription Agent
  - Notification Agent
- Executing agents:
  - Payment Agent
  - Subscription Agent
  - Notification Agent
- Decision points:
  - Whether paid continuity has been validly activated

### Platform Upgrade Process

- Observing agents:
  - Payment Agent
  - Subscription Agent
  - Retention Agent
- Executing agents:
  - Payment Agent
  - Subscription Agent
- Decision points:
  - Whether the user’s new scope is a valid upgrade rather than lateral continuity

### Premium Conversion Process

- Observing agents:
  - Coach Agent
  - Recommendation Agent
- Executing agents:
  - Coach Agent
- Decision points:
  - Whether premium movement is business-valid under premium-conversion rules

### Subscription Renewal Process

- Observing agents:
  - Subscription Agent
  - Payment Agent
  - Retention Agent
  - Notification Agent
- Executing agents:
  - Subscription Agent
  - Payment Agent
  - Notification Agent
- Decision points:
  - Whether continuity should be treated as renewal rather than new entry

### Subscription Recovery Process

- Observing agents:
  - Retention Agent
  - Funnel Agent
  - Subscription Agent
  - Notification Agent
- Executing agents:
  - Retention Agent
  - Subscription Agent
  - Notification Agent
- Decision points:
  - Which canonical return path is valid for the user

### Referral Conversion Process

- Observing agents:
  - Referral Agent
  - Funnel Agent
- Executing agents:
  - Referral Agent
- Decision points:
  - Whether referral facts have become true conversion facts

### Recommendation Refresh Process

- Observing agents:
  - Recommendation Agent
  - Reflection Agent
  - Retention Agent
  - Funnel Agent
- Executing agents:
  - Recommendation Agent
  - Notification Agent where delivery is involved
- Decision points:
  - Whether the prior recommendation remains valid or should expire in favor of a new one

Agents participate in processes but never own business state.

State ownership remains with the canonical state machines and their governing business architecture.

## Cross References

- Domain entities and boundaries:
  - `docs/architecture/01-domain-model.md`
- Business objects and ownership:
  - `docs/architecture/02-data-model.md`
- Canonical state transitions:
  - `docs/architecture/03-state-machines.md`
- Product canon:
  - `docs/foundation/02-products.md`
- Funnel canon:
  - `docs/foundation/03-funnel.md`
- User lifecycle canon:
  - `docs/foundation/04-user-lifecycle.md`
- Business event canon:
  - `docs/foundation/05-business-events.md`
- AI agent canon:
  - `docs/foundation/06-ai-agents.md`
- AI workflow canon:
  - `docs/foundation/07-ai-workflows.md`
- Business rule canon:
  - `docs/foundation/09-business-rules.md`
- System navigation:
  - `docs/foundation/10-system-map.md`

## Governance

### Adding processes

A new business process may be added only when:

- it represents a distinct end-to-end business outcome;
- it can be fully expressed using canonical Business Events, State Machines, Business Rules, and AI Agents;
- it does not duplicate an existing process at a different level of detail.

### Changing processes

A process may change only when:

- the Foundation changes;
- a canonical state machine changes;
- canonical Business Events or Business Rules change;
- AI participation changes without altering ownership boundaries.

### Deprecating processes

A process may be deprecated only when:

- the underlying business outcome no longer exists; or
- the process has been fully absorbed into another canonical process without ambiguity.

Deprecated processes must remain historically understandable until dependent architecture and implementation are aligned.

### Versioning

The Business Process Model must version together with:

- the Foundation;
- the Domain Model;
- the Data Model;
- the State Machines.

No implementation may create undocumented parallel processes that introduce non-canonical events, transitions, or state ownership.
