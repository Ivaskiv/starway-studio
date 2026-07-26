# Document

AI Workflows

> 🇺🇦 Канонічний документ у межах нормалізованого STEP-набору.

# Purpose

Defines a canonical foundation layer for the Starway / ABSystem architecture.

> 🇺🇦 Коротко фіксує, навіщо існує цей документ.

# Scope

Covers business truth, canonical definitions, and cross-document ownership at the foundation layer.

> 🇺🇦 Окреслює межі документа без зміни його змісту.

# Audience

Business architects, product owners, AI systems architects, and senior engineers.

> 🇺🇦 Показує, кому цей документ насамперед потрібен.

# Dependencies

- `docs/foundation/05-business-events.md`
- `docs/foundation/06-ai-agents.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/foundation/06-ai-agents.md`
- `docs/architecture/04-business-processes.md`
- `docs/technical/06-workflow-orchestration.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

AI Workflows exist to define how multiple canonical AI Agents collaborate to achieve one business objective.

They are the orchestration layer between:

- business facts;
- user state;
- product context;
- bounded AI responsibilities.

This document does not replace `docs/foundation/06-ai-agents.md`.

AI Agents define stable business capabilities and responsibilities.

AI Workflows define when and how those capabilities are composed for a specific business objective.

This document does not replace `docs/foundation/05-business-events.md`.

Business Events define what happened.

Workflows may begin because of an event, but they are not themselves events.

This document does not replace `docs/foundation/04-user-lifecycle.md`.

The lifecycle defines the user’s current business state.

Workflows may require a lifecycle state, but they do not redefine state meaning.

This document does not replace `docs/foundation/03-funnel.md`.

The funnel defines business progression.

Workflows may support movement through that funnel, but they do not redefine funnel stages.

AI Workflows are orchestration only.

They do not redefine products, business rules, business events, lifecycle states, or agent responsibilities.

## Workflow Principles

1. Orchestration only.
   A workflow coordinates agents toward a business objective; it does not replace them.

2. Reusable.
   A workflow should support repeatable business situations rather than one-off logic.

3. Event-driven.
   Workflows begin because a valid business fact or business condition exists.

4. Lifecycle-aware.
   A workflow must respect the canonical current user state before acting.

5. Deterministic entry conditions.
   A workflow must have explicit business conditions for when it is valid to start.

6. One business objective per workflow.
   A workflow may have multiple steps, but it must serve one primary business outcome.

7. Clear ownership.
   Every workflow must have a business owner.

8. Canonical dependencies only.
   Workflows must depend on foundation documents and canonical agents instead of inventing local truth.

9. Boundary preservation.
   A workflow may compose agents, but it must not merge their responsibilities into a new undocumented role.

10. Cancellation is valid.
   A workflow must be able to stop when the business conditions are no longer true.

## Canonical AI Workflows

### User Onboarding

- Purpose: Move a direct contact from first engagement into a meaningful start.
- Business objective: Reduce friction at the beginning of the relationship and improve entry conversion.
- Entry conditions:
  - The user is in `Telegram Contact`
  - The user has not yet entered active diagnostic completion
- Triggering business event(s):
  - `Telegram Joined`
- Required lifecycle state(s):
  - `Telegram Contact`
- Participating AI agents:
  - Onboarding Agent
  - Funnel Agent
  - Notification Agent
- Completion conditions:
  - The user starts the Entry Test
  - Or the user clearly declines continuation
- Failure conditions:
  - No meaningful engagement after direct contact
  - Ambiguous next-step signaling
- Expected business outcome:
  - Higher entry-test start rate

### Entry Recommendation

- Purpose: Convert completed diagnosis into a valid next-step recommendation.
- Business objective: Route the user into the correct first commercial or follow-up path.
- Entry conditions:
  - The Entry Test has been completed
  - A recommendation is needed
- Triggering business event(s):
  - `Entry Test Completed`
  - `Recommendation Generated`
- Required lifecycle state(s):
  - `Recommended`
- Participating AI agents:
  - Recommendation Agent
  - Funnel Agent
  - Notification Agent
- Completion conditions:
  - A valid recommendation is delivered
  - The recommended next step is clear
- Failure conditions:
  - The recommendation cannot be made confidently from valid business context
  - The user exits without a clear next path
- Expected business outcome:
  - Better routing from diagnosis into the right next stage

### FOCUS Onboarding

- Purpose: Help a new FOCUS customer become active quickly and meaningfully.
- Business objective: Increase activation and early participation after FOCUS purchase.
- Entry conditions:
  - The user has valid FOCUS access
  - The person is in the early active phase of FOCUS
- Triggering business event(s):
  - `FOCUS Purchased`
  - `Subscription Activated`
- Required lifecycle state(s):
  - `FOCUS Member`
- Participating AI agents:
  - Onboarding Agent
  - Engagement Agent
  - Notification Agent
- Completion conditions:
  - The customer has clearly entered the active FOCUS rhythm
  - Or the customer moves into normal FOCUS participation without extra onboarding treatment
- Failure conditions:
  - The customer remains inactive immediately after activation
  - No clear first-value step is achieved
- Expected business outcome:
  - Higher early retention and stronger activation quality

### Weekly Reflection

- Purpose: Help active users turn recent participation into insight and continuity.
- Business objective: Increase value realization from recurring engagement.
- Entry conditions:
  - A meaningful participation cycle has just occurred
  - Reflection is contextually valid
- Triggering business event(s):
  - `Zoom Attended`
  - `Strategy Session Completed`
- Required lifecycle state(s):
  - `FOCUS Member`
  - `Platform Subscriber`
  - `Premium Client`
- Participating AI agents:
  - Reflection Agent
  - Progress Agent
  - Notification Agent
- Completion conditions:
  - The user receives a meaningful reflection or insight
  - A valid next continuation prompt exists
- Failure conditions:
  - Participation context is too weak
  - Reflection would create noise rather than value
- Expected business outcome:
  - Better continuity and stronger perceived product value

### Progress Review

- Purpose: Convert repeated participation into clearer progress visibility.
- Business objective: Reinforce retention through visible movement and accumulated value.
- Entry conditions:
  - Enough meaningful activity exists to review progress
- Triggering business event(s):
  - `Zoom Attended`
  - `Subscription Renewed`
  - `Strategy Session Completed`
- Required lifecycle state(s):
  - `FOCUS Member`
  - `Platform Subscriber`
  - `Premium Client`
- Participating AI agents:
  - Progress Agent
  - Analytics Agent
  - Notification Agent
- Completion conditions:
  - A valid progress interpretation is surfaced
  - The customer can understand what has changed
- Failure conditions:
  - Insufficient activity for a meaningful review
  - Progress output would be misleading or premature
- Expected business outcome:
  - Higher retention through visible progress

### Subscription Renewal

- Purpose: Support clean continuation for active customers approaching a decision point.
- Business objective: Preserve recurring revenue and continuity.
- Entry conditions:
  - A valid paid relationship is approaching continuation
- Triggering business event(s):
  - `Subscription Renewed`
  - `Payment Received`
  - `Subscription Activated`
- Required lifecycle state(s):
  - `Subscription Expiring`
- Participating AI agents:
  - Subscription Agent
  - Notification Agent
  - Funnel Agent
- Completion conditions:
  - The customer renews or transitions into the correct active paid layer
- Failure conditions:
  - No valid continuation outcome is reached
  - The customer leaves the decision unresolved
- Expected business outcome:
  - Higher renewal rate and better continuity handling

### Subscription Recovery

- Purpose: Recover a customer after failed or incomplete continuation.
- Business objective: Reduce avoidable revenue loss and restore the right relationship when still valid.
- Entry conditions:
  - A renewal or continuation path has broken down
- Triggering business event(s):
  - `Payment Failed`
  - `Subscription Expired`
- Required lifecycle state(s):
  - `Subscription Expiring`
  - `Subscription Expired`
- Participating AI agents:
  - Subscription Agent
  - Payment Agent
  - Retention Agent
  - Notification Agent
- Completion conditions:
  - The customer reactivates
  - Or the customer exits clearly into the correct non-active state
- Failure conditions:
  - No recoverable path exists
  - The user remains disengaged with no valid continuation opportunity
- Expected business outcome:
  - Better recovery of lost continuity and lower avoidable churn

### Retention

- Purpose: Keep at-risk users from disappearing into unstructured inactivity.
- Business objective: Reduce drop-off and preserve future recoverability.
- Entry conditions:
  - The user is materially at risk of leaving active movement
- Triggering business event(s):
  - `Subscription Expired`
  - `Payment Failed`
  - `Subscription Downgraded`
- Required lifecycle state(s):
  - `Subscription Expired`
  - `Inactive`
- Participating AI agents:
  - Retention Agent
  - Funnel Agent
  - Notification Agent
- Completion conditions:
  - The user receives a valid return path
  - Or the user is clearly placed into dormant treatment without ambiguity
- Failure conditions:
  - Recovery is attempted where no business-valid return exists
  - Retention logic creates pressure without fit
- Expected business outcome:
  - Better recoverability and cleaner churn management

### Referral

- Purpose: Turn realized customer value into referral-driven growth.
- Business objective: Create more acquisition from trust rather than cold attention alone.
- Entry conditions:
  - The user has received enough value for referral logic to be appropriate
- Triggering business event(s):
  - `Referral Created`
  - `Referral Converted`
  - `Subscription Renewed`
- Required lifecycle state(s):
  - `FOCUS Member`
  - `Platform Subscriber`
  - `Premium Client`
  - `Inactive`
- Participating AI agents:
  - Referral Agent
  - Notification Agent
  - Analytics Agent
- Completion conditions:
  - A referral is successfully created
  - Or referral value is recognized and tracked meaningfully
- Failure conditions:
  - Referral prompting appears before value has matured
  - No valid referral context exists
- Expected business outcome:
  - More trust-based acquisition and stronger advocacy behavior

### Premium Upgrade

- Purpose: Support movement from scalable products into the correct premium layer.
- Business objective: Convert qualified customers into higher-context premium services.
- Entry conditions:
  - Premium fit, trust, and need are present
- Triggering business event(s):
  - `Strategy Session Booked`
  - `Strategy Session Completed`
  - `Subscription Upgraded`
- Required lifecycle state(s):
  - `FOCUS Member`
  - `Platform Subscriber`
- Participating AI agents:
  - Recommendation Agent
  - Coach Agent
  - Subscription Agent
  - Notification Agent
- Completion conditions:
  - The customer enters the correct premium service
  - Or the customer remains correctly in a lower layer without forced escalation
- Failure conditions:
  - Premium escalation happens without real fit
  - The user is pushed beyond readiness
- Expected business outcome:
  - Higher-quality premium conversion with better fit

### Re-engagement

- Purpose: Bring a known but inactive user back into a valid active path.
- Business objective: Recover dormant value from existing known users.
- Entry conditions:
  - The user is inactive but still recoverable
- Triggering business event(s):
  - `Telegram Joined`
  - `Referral Created`
  - `Subscription Expired`
- Required lifecycle state(s):
  - `Inactive`
  - `Subscription Expired`
- Participating AI agents:
  - Funnel Agent
  - Retention Agent
  - Recommendation Agent
  - Notification Agent
- Completion conditions:
  - The user re-enters a valid funnel or product path
  - Or the business confirms no current re-entry path is appropriate
- Failure conditions:
  - Re-engagement is attempted without current fit
  - The user remains dormant without a clear business conclusion
- Expected business outcome:
  - More recoverable dormant users returning into active movement

## Workflow Composition

### Execution Order

- A workflow begins from a valid business trigger.
- It checks required lifecycle state and product context.
- It then invokes the minimum set of canonical agents needed for the business objective.
- It completes when the business objective is either achieved or clearly not achievable.

### Participating Agents

- Each workflow uses only the agents relevant to its objective.
- No workflow should include an agent that does not materially contribute to the business outcome.

### Decision Points

- Decision points happen when the workflow must choose between valid business paths.
- Decision points must reference:
  - canonical funnel progression;
  - canonical lifecycle state;
  - canonical product relationships;
  - canonical business events.

### Retry Principles

- A workflow may be retried only if the business conditions remain valid.
- Retry must not reframe the business objective into a different workflow.
- Retry should stop when the business context no longer supports repetition.

### Cancellation Rules

- A workflow must cancel if its required lifecycle state is no longer true.
- A workflow must cancel if a stronger valid business path replaces it.
- A workflow must cancel if the user has already moved into a later or incompatible business relationship.

## Workflow Relationships

### Workflow → Business Events

- Workflows begin because one or more canonical business events occur.
- Workflows may also conclude by producing outcomes that later become new business events through implementation, but they do not define those events themselves.

### Workflow → Lifecycle

- Workflows require canonical lifecycle state for validity.
- Workflows do not create alternate lifecycle models.
- Workflows may support lifecycle transition requests, but they do not own the lifecycle definitions.

### Workflow → Funnel

- Workflows support progression, recovery, retention, or continuation inside the canonical funnel.
- Workflows must never redefine funnel stages or create parallel funnel logic.

### Workflow → Products

- Workflows operate in the context of canonical products defined in `docs/foundation/02-products.md`.
- A workflow may support entry into, participation within, renewal of, or movement between products.
- A workflow must not redefine products or their included services.

## Workflow Ownership

### User Onboarding

- Owner: Product Owner
- Expected customer outcome: A clear and low-friction start
- Expected business outcome: Higher entry activation

### Entry Recommendation

- Owner: Product Owner
- Expected customer outcome: A clear next-step recommendation
- Expected business outcome: Better product routing and first conversion quality

### FOCUS Onboarding

- Owner: Product Owner
- Expected customer outcome: Faster realization of value inside FOCUS
- Expected business outcome: Better early activation and retention

### Weekly Reflection

- Owner: AI Product Lead
- Expected customer outcome: Better meaning-making from recent participation
- Expected business outcome: Stronger continuity and perceived value

### Progress Review

- Owner: AI Product Lead
- Expected customer outcome: Better visibility into progress
- Expected business outcome: Stronger retention and value recognition

### Subscription Renewal

- Owner: Product Owner
- Expected customer outcome: Clear continuation path
- Expected business outcome: Higher renewal and continuity

### Subscription Recovery

- Owner: Product Owner
- Expected customer outcome: A valid path back after failed or incomplete continuation
- Expected business outcome: Lower avoidable revenue loss

### Retention

- Owner: Product Owner with Marketing Lead
- Expected customer outcome: A valid return path instead of silent drop-off
- Expected business outcome: Lower churn and stronger recoverability

### Referral

- Owner: Marketing Lead
- Expected customer outcome: Easy trust-based recommendation path
- Expected business outcome: More referral-driven acquisition

### Premium Upgrade

- Owner: Coach Lead with Product Owner
- Expected customer outcome: Entry into the right deeper support layer
- Expected business outcome: Better premium conversion quality

### Re-engagement

- Owner: Product Owner with Marketing Lead
- Expected customer outcome: A relevant opportunity to return
- Expected business outcome: More dormant users re-entering active movement

## Governance

### Ownership

The canonical AI Workflow map is owned by the AI systems architecture layer together with the business architecture layer of Starway.

Business owners remain responsible for the business outcomes each workflow serves.

### Naming Conventions

- Workflow names must reflect the business objective.
- Workflow names must not duplicate agent names unless the workflow truly serves that same objective at orchestration level.
- Workflow names must remain stable across implementation changes.

### Versioning

This document must remain one canonical workflow map.

Historical workflow maps must be archived rather than kept active in parallel.

### Adding Workflows

A new workflow may be added only when:

- it serves a distinct business objective;
- it requires orchestration of more than one canonical agent or more than one business context dimension;
- it does not duplicate an existing workflow’s objective.

### Deprecation Policy

- A workflow may be deprecated when its business objective disappears or is fully absorbed by a clearer canonical workflow.
- Deprecation must not leave the business objective undocumented.

### Backward Compatibility

- Future documents must reference these workflows instead of inventing parallel orchestrations.
- Implementation may change how a workflow is executed, but not what business objective it serves.
- No downstream document may create a second active workflow map that conflicts with this one.
