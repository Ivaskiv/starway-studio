# Document

Workflow Orchestration Architecture

> 🇺🇦 Канонічний документ у межах нормалізованого STEP-набору.

# Purpose

Defines a canonical technical architecture layer for the Starway / ABSystem platform.

> 🇺🇦 Коротко фіксує, навіщо існує цей документ.

# Scope

Covers logical technical realization, ownership boundaries, and cross-system coordination for the owned technical domain.

> 🇺🇦 Окреслює межі документа без зміни його змісту.

# Audience

Software architects, platform engineers, backend engineers, and operations leads.

> 🇺🇦 Показує, кому цей документ насамперед потрібен.

# Dependencies

- `docs/architecture/03-state-machines.md`
- `docs/architecture/04-business-processes.md`
- `docs/architecture/08-ai-decision-model.md`
- `docs/technical/01-ai-service-architecture.md`
- `docs/technical/02-system-component-architecture.md`
- `docs/technical/05-event-architecture.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/architecture/04-business-processes.md`
- `docs/technical/05-event-architecture.md`
- `docs/technical/07-observability-operational-architecture.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The Workflow Orchestration Architecture exists to define how canonical Business Processes, AI Agents, and logical Services are coordinated across the Starway / ABSystem ecosystem.

It answers one question:

How are long-running and multi-participant business workflows coordinated without mixing orchestration responsibilities with execution responsibilities?

This document is the orchestration layer of the technical architecture.

It does not redefine:

- Products;
- Funnel stages;
- User Lifecycle states;
- Business Events;
- Business Rules;
- Business Processes;
- AI Agent responsibilities;
- Service boundaries.

Instead, it connects those canonical layers into one coordination model that is deterministic, observable, and recoverable.

This document must be read together with:

- `docs/architecture/04-business-processes.md`
- `docs/architecture/03-state-machines.md`
- `docs/architecture/08-ai-decision-model.md`
- `docs/technical/01-ai-service-architecture.md`
- `docs/technical/02-system-component-architecture.md`
- `docs/technical/05-event-architecture.md`

## Orchestration Principles

1. Business-first orchestration.
   Every workflow exists to realize a canonical business outcome, not to coordinate technical steps for their own sake.

2. Deterministic execution.
   A workflow may begin, wait, resume, or complete only through canonical Business Events, Business Rules, and State Machines.

3. Explicit ownership.
   Every workflow has one business owner and one orchestration owner.

4. Separation of orchestration and execution.
   Orchestrators coordinate Services and AI Agents, but do not replace the execution responsibilities owned by those Services and Agents.

5. Idempotent orchestration.
   Repeated workflow triggers must not create conflicting business outcomes or parallel truth for the same business objective.

6. Observable workflows.
   Every orchestration path must make its entry point, waiting points, completion criteria, and escalation boundaries explicit.

7. Recoverable workflows.
   Long-running workflows must define how they resume after interruption, expiry, payment delay, or manual intervention.

8. No hidden orchestration.
   No Service, Agent, or integration may invent an orchestration path outside the canonical Business Process inventory.

## Workflow Inventory

The canonical workflow inventory is derived directly from the canonical Business Process inventory.

### Audience Entry Workflow

- Purpose:
  - Coordinate first-contact movement from direct audience entry into the canonical business relationship.
- Owner:
  - Funnel Service
- Participating Services:
  - Funnel Service
  - Notification Service
- Participating AI Agents:
  - Funnel Agent
  - Onboarding Agent
  - Notification Agent
- Business Processes involved:
  - Audience Entry Process

### Diagnostic Entry Workflow

- Purpose:
  - Coordinate entry-test participation through completion and valid recommendation readiness.
- Owner:
  - Funnel Service
- Participating Services:
  - Funnel Service
  - Recommendation Service
  - Notification Service
- Participating AI Agents:
  - Funnel Agent
  - Onboarding Agent
  - Recommendation Agent
  - Notification Agent
- Business Processes involved:
  - Diagnostic Entry Process

### Recommendation Delivery Workflow

- Purpose:
  - Coordinate recommendation generation, delivery, and explicit next-step direction.
- Owner:
  - Recommendation Service
- Participating Services:
  - Recommendation Service
  - Funnel Service
  - Notification Service
- Participating AI Agents:
  - Recommendation Agent
  - Funnel Agent
  - Notification Agent
- Business Processes involved:
  - Recommendation Delivery Process

### FOCUS Activation Workflow

- Purpose:
  - Coordinate valid payment recognition, subscription activation, and entry into FOCUS continuity.
- Owner:
  - Continuity Service
- Participating Services:
  - Continuity Service
  - Notification Service
  - Retention Service
- Participating AI Agents:
  - Payment Agent
  - Subscription Agent
  - Notification Agent
  - Retention Agent
- Business Processes involved:
  - FOCUS Activation Process

### Platform Upgrade Workflow

- Purpose:
  - Coordinate valid movement from FOCUS continuity into Platform continuity.
- Owner:
  - Continuity Service
- Participating Services:
  - Continuity Service
  - Retention Service
  - Notification Service
- Participating AI Agents:
  - Subscription Agent
  - Payment Agent
  - Retention Agent
  - Notification Agent
- Business Processes involved:
  - Platform Upgrade Process

### Premium Conversion Workflow

- Purpose:
  - Coordinate movement from platform continuity into premium engagement through a valid premium path.
- Owner:
  - Coach Support Service
- Participating Services:
  - Coach Support Service
  - Recommendation Service
  - Notification Service
- Participating AI Agents:
  - Coach Agent
  - Recommendation Agent
  - Notification Agent
- Business Processes involved:
  - Premium Conversion Process

### Subscription Renewal Workflow

- Purpose:
  - Coordinate continuity extension without treating an existing customer as a first-time entrant.
- Owner:
  - Continuity Service
- Participating Services:
  - Continuity Service
  - Retention Service
  - Notification Service
- Participating AI Agents:
  - Subscription Agent
  - Payment Agent
  - Retention Agent
  - Notification Agent
- Business Processes involved:
  - Subscription Renewal Process

### Subscription Recovery Workflow

- Purpose:
  - Coordinate recovery after continuity loss and route the user back into the correct active path.
- Owner:
  - Retention Service
- Participating Services:
  - Retention Service
  - Continuity Service
  - Funnel Service
  - Notification Service
- Participating AI Agents:
  - Retention Agent
  - Subscription Agent
  - Funnel Agent
  - Notification Agent
- Business Processes involved:
  - Subscription Recovery Process

### Referral Conversion Workflow

- Purpose:
  - Coordinate referral creation, referral recognition, and valid entry of the referred person into the funnel.
- Owner:
  - Referral Service
- Participating Services:
  - Referral Service
  - Funnel Service
  - Notification Service
- Participating AI Agents:
  - Referral Agent
  - Funnel Agent
  - Notification Agent
- Business Processes involved:
  - Referral Conversion Process

### Recommendation Refresh Workflow

- Purpose:
  - Coordinate renewed recommendation generation when prior context is no longer sufficient for valid next-step guidance.
- Owner:
  - Recommendation Service
- Participating Services:
  - Recommendation Service
  - Engagement Service
  - Retention Service
  - Funnel Service
  - Notification Service
- Participating AI Agents:
  - Recommendation Agent
  - Reflection Agent
  - Engagement Agent
  - Progress Agent
  - Retention Agent
  - Funnel Agent
  - Notification Agent
- Business Processes involved:
  - Recommendation Refresh Process

## Orchestrators

### Audience Entry Workflow Orchestrator

- Orchestration responsibility:
  - Coordinate recognition of first valid contact and route the user into the correct entry path.
- Execution boundaries:
  - Does not execute messaging, recommendation creation, or lifecycle ownership directly.
- Coordination responsibilities:
  - Start on `Telegram Joined`.
  - Coordinate entry guidance and handoff to the next valid step.
  - Ensure the workflow completes only when the user is recognized as `Telegram Contact`.
- Forbidden responsibilities:
  - Creating recommendations.
  - Activating subscriptions.
  - Performing premium conversion.

### Diagnostic Entry Workflow Orchestrator

- Orchestration responsibility:
  - Coordinate test initiation, test completion, and valid handoff into recommendation readiness.
- Execution boundaries:
  - Does not execute the diagnostic itself or redefine recommendation authority.
- Coordination responsibilities:
  - Start on `Entry Test Started`.
  - Track progress through `Entry Test Completed`.
  - Handover to Recommendation Delivery Workflow once diagnostic conditions are valid.
- Forbidden responsibilities:
  - Delivering premium offers directly.
  - Modifying subscription continuity.

### Recommendation Delivery Workflow Orchestrator

- Orchestration responsibility:
  - Coordinate recommendation publication, communication, and next-step visibility.
- Execution boundaries:
  - Does not own funnel state, payment continuity, or lifecycle transitions outside canonical rules.
- Coordination responsibilities:
  - Start on `Recommendation Generated`.
  - Coordinate recommendation delivery and valid next-step communication.
  - Complete when recommendation guidance is actively delivered.
- Forbidden responsibilities:
  - Converting payment directly.
  - Replacing lifecycle-state ownership.

### FOCUS Activation Workflow Orchestrator

- Orchestration responsibility:
  - Coordinate the transition from valid payment outcome to active FOCUS continuity.
- Execution boundaries:
  - Does not own messaging delivery execution or recovery strategy ownership.
- Coordination responsibilities:
  - Start on `Payment Received`.
  - Validate activation through `Subscription Activated`.
  - Coordinate access opening and continuity communication.
- Forbidden responsibilities:
  - Rewriting payment facts.
  - Skipping subscription validation.

### Platform Upgrade Workflow Orchestrator

- Orchestration responsibility:
  - Coordinate valid continuity upgrade from FOCUS to Platform access.
- Execution boundaries:
  - Does not redefine product hierarchy or premium eligibility.
- Coordination responsibilities:
  - Start on upgrade-valid payment context.
  - Coordinate `Subscription Upgraded`.
  - Ensure resulting continuity returns to valid active platform scope.
- Forbidden responsibilities:
  - Treating upgrade as first-time activation.
  - Performing premium-service conversion.

### Premium Conversion Workflow Orchestrator

- Orchestration responsibility:
  - Coordinate premium movement up to the human-owned premium decision boundary.
- Execution boundaries:
  - Does not replace human approval or premium delivery ownership.
- Coordination responsibilities:
  - Start on `Strategy Session Booked`.
  - Coordinate coach-facing and recommendation context.
  - Complete when the user enters the valid premium path.
- Forbidden responsibilities:
  - Autonomous premium authorization where business approval is required.
  - Subscription continuity ownership.

### Subscription Renewal Workflow Orchestrator

- Orchestration responsibility:
  - Coordinate renewal as continuity extension rather than first purchase.
- Execution boundaries:
  - Does not redefine activation rules or retention policy ownership.
- Coordination responsibilities:
  - Start on renewal-valid payment context.
  - Coordinate `Subscription Renewed`.
  - Restore the correct active continuity path.
- Forbidden responsibilities:
  - Resetting the user to entry states.
  - Treating renewal as a new funnel start.

### Subscription Recovery Workflow Orchestrator

- Orchestration responsibility:
  - Coordinate the recovery path after continuity loss or interruption.
- Execution boundaries:
  - Does not own payment processing or recommendation generation directly.
- Coordination responsibilities:
  - Start on `Subscription Expired`.
  - Coordinate recovery messaging, re-entry routing, and continuity restoration.
  - Resume through `Subscription Activated`, `Subscription Renewed`, or valid re-entry facts.
- Forbidden responsibilities:
  - Inventing recovery states.
  - Bypassing continuity validation.

### Referral Conversion Workflow Orchestrator

- Orchestration responsibility:
  - Coordinate referral progression from creation through valid conversion.
- Execution boundaries:
  - Does not replace funnel routing ownership or direct-contact ownership.
- Coordination responsibilities:
  - Start on `Referral Created`.
  - Track progression until `Referral Converted`.
  - Handover referred contact into the correct funnel entry path.
- Forbidden responsibilities:
  - Treating referral as subscription activation.
  - Modifying lifecycle state without canonical entry facts.

### Recommendation Refresh Workflow Orchestrator

- Orchestration responsibility:
  - Coordinate refreshed interpretation when prior recommendation context is outdated or insufficient.
- Execution boundaries:
  - Does not replace recommendation authority or retention ownership.
- Coordination responsibilities:
  - Start on refreshed recommendation need supported by canonical events and state context.
  - Coordinate reflection, engagement, recovery, and communication participation.
  - Complete when a new valid recommendation is delivered.
- Forbidden responsibilities:
  - Reusing stale recommendation truth without validation.
  - Altering lifecycle state outside canonical transitions.

## Workflow Lifecycle

Every canonical workflow follows the same logical lifecycle:

1. Initiation.
   The workflow begins only when a valid canonical Business Event occurs and the related Business Rules allow orchestration to start.

2. Execution.
   Participating Services and AI Agents perform their own bounded execution responsibilities under orchestrated coordination.

3. Waiting states.
   A workflow may pause while waiting for a required business fact, customer action, payment outcome, renewal outcome, referral outcome, or human decision.

4. Resumptions.
   A paused workflow resumes only when a new canonical Business Event satisfies the waiting condition.

5. Completion.
   A workflow completes only when its business completion criteria are satisfied in the canonical Business Process definition.

6. Cancellation.
   A workflow may end without success only when cancellation is explicitly justified by canonical failure conditions, expiry, or business ineligibility.

Long-running workflows must make waiting and resumption explicit:

- FOCUS Activation Workflow waits between payment recognition and subscription activation.
- Platform Upgrade Workflow waits between upgrade-valid payment context and confirmed upgraded continuity.
- Premium Conversion Workflow may wait for human review or premium decision boundaries.
- Subscription Renewal Workflow waits between renewal initiation and confirmed renewed continuity.
- Subscription Recovery Workflow may remain open across expiration, recovery messaging, and valid return events.
- Referral Conversion Workflow waits between referral creation and actual referral conversion.
- Recommendation Refresh Workflow may wait for sufficient reflection, engagement, or recovery context before renewed delivery.

## Compensation Rules

1. Failed workflow.
   A failed workflow does not erase canonical Business Events. It must transition into a valid recovery, escalation, or terminal business path.

2. Partial completion.
   If some execution steps have completed but the overall business outcome is not yet valid, the orchestrator must preserve the completed business facts and coordinate the remaining required path.

3. Rollback eligibility.
   Business facts are immutable, so compensation is performed through new valid business actions, not by deleting or rewriting prior facts.

4. Manual intervention.
   Manual intervention is required whenever:
   - human approval is part of the business path;
   - a financial outcome cannot be resolved through existing continuity rules;
   - premium movement requires business judgment;
   - recovery exceeds the canonical automated path.

5. Escalation.
   If a workflow cannot continue safely through canonical rules, it must escalate to the correct business owner rather than invent an alternative path.

Canonical compensation behaviour for long-running workflows:

- FOCUS Activation Workflow:
  - If payment is recognized but activation is not yet valid, hold continuity closed and escalate to the continuity owner.
- Platform Upgrade Workflow:
  - If the upgrade path cannot complete, preserve existing continuity and prevent invalid partial upgrade access.
- Premium Conversion Workflow:
  - If premium movement is incomplete, retain the prior valid lifecycle state until a valid premium fact exists.
- Subscription Renewal Workflow:
  - If renewal does not complete, preserve the current valid continuity outcome and route into recovery if expiry later occurs.
- Subscription Recovery Workflow:
  - If recovery attempts fail, retain the expired state and keep recovery eligibility explicit rather than forcing reactivation.
- Referral Conversion Workflow:
  - If referral conversion does not occur, preserve the referral fact without inventing a funnel progression.
- Recommendation Refresh Workflow:
  - If new recommendation readiness is not valid, preserve the prior recommendation history and do not present refreshed guidance as canonical truth.

## Synchronization Rules

1. Synchronization points.
   Every workflow must define the exact business fact that allows the next coordinated phase to begin.

2. Asynchronous boundaries.
   Workflow phases may be separated by customer action, payment outcome, referral outcome, human approval, or time-dependent continuity events.

3. Workflow dependencies.
   A workflow may depend on the completion or valid state output of another workflow, but only through canonical Business Events and State Machines.

4. Ordering guarantees.
   Required business facts must occur in business-valid order before downstream workflow phases may complete.

Canonical ordering guarantees:

- `Telegram Joined` must exist before Audience Entry Workflow completion.
- `Entry Test Started` must precede `Entry Test Completed`.
- `Entry Test Completed` must precede `Recommendation Generated`.
- `Recommendation Generated` must precede Recommendation Delivery Workflow completion.
- `Payment Received` must precede `Subscription Activated`, `Subscription Renewed`, or `Subscription Upgraded`.
- `Subscription Expired` must precede Subscription Recovery Workflow initiation.
- `Referral Created` must precede `Referral Converted`.
- `Strategy Session Booked` must precede any premium movement completion.

Canonical asynchronous boundaries:

- customer completion of the Entry Test;
- payment recognition before continuity events;
- expiration before recovery actions;
- referral conversion after referral creation;
- human premium decision after premium-booking facts;
- refreshed recommendation readiness after new engagement or reflection context.

## Workflow Responsibility Matrix

| Workflow | Owner | Orchestrator | Participating Services | Participating AI Agents | Business Processes | Completion Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| Audience Entry Workflow | Funnel Service | Funnel Service | Funnel Service, Notification Service | Funnel Agent, Onboarding Agent, Notification Agent | Audience Entry Process | User is recognized as `Telegram Contact` through valid entry facts |
| Diagnostic Entry Workflow | Funnel Service | Funnel Service | Funnel Service, Recommendation Service, Notification Service | Funnel Agent, Onboarding Agent, Recommendation Agent, Notification Agent | Diagnostic Entry Process | User reaches `Recommended` with completed diagnostic context |
| Recommendation Delivery Workflow | Recommendation Service | Recommendation Service | Recommendation Service, Funnel Service, Notification Service | Recommendation Agent, Funnel Agent, Notification Agent | Recommendation Delivery Process | Valid recommendation is delivered with explicit next-step guidance |
| FOCUS Activation Workflow | Continuity Service | Continuity Service | Continuity Service, Notification Service, Retention Service | Payment Agent, Subscription Agent, Notification Agent, Retention Agent | FOCUS Activation Process | User receives active FOCUS continuity and enters `FOCUS Member` |
| Platform Upgrade Workflow | Continuity Service | Continuity Service | Continuity Service, Retention Service, Notification Service | Subscription Agent, Payment Agent, Retention Agent, Notification Agent | Platform Upgrade Process | User receives active Platform continuity and enters `Platform Subscriber` |
| Premium Conversion Workflow | Coach Support Service | Coach Support Service | Coach Support Service, Recommendation Service, Notification Service | Coach Agent, Recommendation Agent, Notification Agent | Premium Conversion Process | User enters the valid premium path and becomes `Premium Client` |
| Subscription Renewal Workflow | Continuity Service | Continuity Service | Continuity Service, Retention Service, Notification Service | Subscription Agent, Payment Agent, Retention Agent, Notification Agent | Subscription Renewal Process | Continuity is renewed without resetting the user as a first-time entrant |
| Subscription Recovery Workflow | Retention Service | Retention Service | Retention Service, Continuity Service, Funnel Service, Notification Service | Retention Agent, Subscription Agent, Funnel Agent, Notification Agent | Subscription Recovery Process | User either returns through a valid continuity path or remains explicitly in recovery/expired status |
| Referral Conversion Workflow | Referral Service | Referral Service | Referral Service, Funnel Service, Notification Service | Referral Agent, Funnel Agent, Notification Agent | Referral Conversion Process | Referred contact validly enters the funnel through referral conversion |
| Recommendation Refresh Workflow | Recommendation Service | Recommendation Service | Recommendation Service, Engagement Service, Retention Service, Funnel Service, Notification Service | Recommendation Agent, Reflection Agent, Engagement Agent, Progress Agent, Retention Agent, Funnel Agent, Notification Agent | Recommendation Refresh Process | A refreshed valid recommendation is generated and delivered |

## Cross References

This document depends on and must remain consistent with:

- `docs/architecture/04-business-processes.md`
  - canonical business workflow definitions and completion criteria;
- `docs/architecture/03-state-machines.md`
  - valid state transitions and forbidden transitions;
- `docs/technical/05-event-architecture.md`
  - event ownership, producers, consumers, and event lifecycle;
- `docs/technical/01-ai-service-architecture.md`
  - service ownership, dependencies, and boundaries;
- `docs/technical/02-system-component-architecture.md`
  - internal execution boundaries inside services;
- `docs/architecture/08-ai-decision-model.md`
  - agent decision authority, escalation rules, and explainability requirements.

No workflow orchestration rule may contradict those canonical sources.

## Governance

1. Adding workflows.
   A new workflow may be added only if a new canonical Business Process has already been approved and documented.

2. Modifying orchestration.
   Orchestration may change only when the underlying Business Process, Business Rule, State Machine, or Service boundary changes canonically.

3. Splitting workflows.
   A workflow may be split only when one workflow currently represents more than one business objective or more than one ownership boundary.

4. Deprecating workflows.
   A workflow may be deprecated only after the underlying Business Process is deprecated or archived canonically.

5. Ownership review.
   Every workflow must keep one explicit owner and one explicit orchestrator. Shared ownership is forbidden.

6. Boundary review.
   Orchestration must continue to coordinate execution without absorbing execution responsibilities from Services, Components, or AI Agents.

7. Consistency review.
   Any change to this document must be reviewed against:
   - Business Processes;
   - State Machines;
   - Event Architecture;
   - Service Architecture;
   - AI Decision authority.
