# Document

AI Agents

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

- `docs/foundation/01-company.md`
- `docs/foundation/02-products.md`
- `docs/foundation/03-funnel.md`
- `docs/foundation/04-user-lifecycle.md`
- `docs/foundation/05-business-events.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/foundation/07-ai-workflows.md`
- `docs/architecture/05-ai-capability-model.md`
- `docs/engineering/03-ai-agent-blueprint.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

AI Agents exist to give the Starway ecosystem reusable business capabilities that can interpret business context and produce bounded business outcomes.

They exist because the company needs repeatable intelligence across acquisition, recommendation, engagement, continuity, retention, subscription handling, insight generation, and customer support.

AI Agents are not products.

Products are defined in `docs/foundation/02-products.md`.

AI Agents support products, but they do not define or replace them.

AI Agents are not the Funnel.

The funnel is defined in `docs/foundation/03-funnel.md` and describes business progression.

AI Agents may support progression through the funnel, but they do not redefine funnel stages.

AI Agents are not the User Lifecycle.

The lifecycle is defined in `docs/foundation/04-user-lifecycle.md` and describes the user’s current business state.

AI Agents may observe lifecycle state, but they do not redefine state meanings.

AI Agents are not Business Events.

Business Events are defined in `docs/foundation/05-business-events.md` and describe immutable facts.

AI Agents may observe those events, but they are not themselves the facts.

AI Agents are not AI Workflows.

Agents are capabilities with bounded responsibilities.

Workflows are larger multi-step business processes that may later use one or more agents.

This document defines the canonical agent responsibilities only.

## AI Agent Principles

1. One responsibility per agent.
   Each agent must own one clear business responsibility.

2. Event-driven.
   Agents react to business facts and valid business context, not arbitrary system activity.

3. Lifecycle-aware.
   Agents must interpret the user through the canonical lifecycle rather than inventing alternate user-state models.

4. Stateless execution.
   An agent may use business context, but it must not depend on undocumented hidden memory to define its role.

5. Deterministic decisions where possible.
   If a business rule can be resolved clearly from existing context, the agent should behave predictably.

6. Reusable across products where valid.
   Agents should support multiple product layers when the responsibility is genuinely shared.

7. Business-first.
   Agents exist to create customer value or business value, not technical novelty.

8. Implementation-independent.
   Agents must remain valid regardless of tooling, systems, or model choices.

9. Boundaries before intelligence.
   An agent must know what it is not allowed to decide before it decides anything.

10. No business-rule ownership.
   Agents may apply business rules, but the business rules themselves live in the foundation documents, not inside the agents.

## Canonical AI Agents

### Funnel Agent

- Purpose: Support movement through the canonical business funnel.
- Business responsibility: Recognize the user’s current funnel position and surface the right immediate next business action.
- Observed business events:
  - Telegram Joined
  - Entry Test Started
  - Entry Test Completed
  - Recommendation Generated
  - FOCUS Purchased
  - Subscription Renewed
- Observed lifecycle states:
  - Telegram Contact
  - Test Participant
  - Recommended
  - FOCUS Member
  - Platform Subscriber
  - Inactive
- Produced business outcomes:
  - Clear next-step direction
  - Funnel continuation support
  - Re-entry guidance
- Dependencies:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Boundaries:
  - Does not define products
  - Does not change lifecycle states by itself
  - Does not own payment or subscription decisions

### Recommendation Agent

- Purpose: Translate diagnosis or customer context into a valid next-step recommendation.
- Business responsibility: Produce business recommendations that align with the funnel, lifecycle, and product ladder.
- Observed business events:
  - Entry Test Completed
  - Recommendation Generated
  - Zoom Attended
  - Strategy Session Completed
- Observed lifecycle states:
  - Test Participant
  - Recommended
  - FOCUS Member
  - Platform Subscriber
- Produced business outcomes:
  - Product recommendation
  - Continuation recommendation
  - Upgrade or downgrade recommendation
- Dependencies:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Boundaries:
  - Does not define new products
  - Does not approve premium entry without business-valid context
  - Does not replace human premium qualification where required

### Onboarding Agent

- Purpose: Help a new direct contact start correctly inside the ecosystem.
- Business responsibility: Reduce friction at the beginning of the relationship and support entry into the first meaningful step.
- Observed business events:
  - Telegram Joined
  - Entry Test Started
- Observed lifecycle states:
  - Telegram Contact
  - Test Participant
- Produced business outcomes:
  - Better start-rate into the entry layer
  - Lower onboarding confusion
  - Faster first-value realization
- Dependencies:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
- Boundaries:
  - Does not produce paid-product eligibility decisions on its own
  - Does not redefine the entry path

### Engagement Agent

- Purpose: Support active participation inside current products.
- Business responsibility: Increase ongoing customer movement, response, and meaningful use.
- Observed business events:
  - Zoom Registered
  - Zoom Attended
  - Entry Test Started
  - Entry Test Completed
- Observed lifecycle states:
  - Test Participant
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
- Produced business outcomes:
  - Higher participation
  - Lower silent drop-off
  - Better continuity of action
- Dependencies:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Boundaries:
  - Does not own lifecycle transitions
  - Does not own retention or subscription policy

### Progress Agent

- Purpose: Help the business and the customer interpret forward movement over time.
- Business responsibility: Turn ongoing participation into clear progress insight.
- Observed business events:
  - Zoom Attended
  - Strategy Session Completed
  - Subscription Renewed
- Observed lifecycle states:
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
- Produced business outcomes:
  - Progress visibility
  - Continuity reinforcement
  - Better customer understanding of momentum
- Dependencies:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Boundaries:
  - Does not define success criteria for products
  - Does not create new lifecycle states

### Reflection Agent

- Purpose: Help the user convert experience into meaningful interpretation.
- Business responsibility: Support insight extraction after participation, sessions, or key customer moments.
- Observed business events:
  - Zoom Attended
  - Strategy Session Completed
  - Entry Test Completed
- Observed lifecycle states:
  - Recommended
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
- Produced business outcomes:
  - Better self-understanding
  - Stronger meaning from participation
  - Higher continuation readiness
- Dependencies:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Boundaries:
  - Does not replace strategic recommendation
  - Does not own payment, retention, or subscription logic

### Coach Agent

- Purpose: Support the human coach with bounded intelligence related to customer context and delivery support.
- Business responsibility: Help the coach act with clearer context, not replace the coach’s judgment.
- Observed business events:
  - Zoom Registered
  - Zoom Attended
  - Strategy Session Booked
  - Strategy Session Completed
  - Subscription Renewed
- Observed lifecycle states:
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
  - Subscription Expiring
- Produced business outcomes:
  - Better human preparation
  - Better premium-context understanding
  - Higher-quality delivery support
- Dependencies:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Boundaries:
  - Does not make premium decisions instead of the coach
  - Does not define service scope or product structure

### Subscription Agent

- Purpose: Support business decisions around continuation, renewal, upgrade, and downgrade.
- Business responsibility: Interpret subscription-related context and surface the correct business handling.
- Observed business events:
  - Subscription Activated
  - Subscription Renewed
  - Subscription Upgraded
  - Subscription Downgraded
  - Subscription Expired
  - Payment Received
  - Payment Failed
- Observed lifecycle states:
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
  - Subscription Expiring
  - Subscription Expired
- Produced business outcomes:
  - Continuation guidance
  - Correct subscription-path interpretation
  - Renewal and recovery support
- Dependencies:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Boundaries:
  - Does not define pricing
  - Does not decide business policy outside the canonical subscription model
  - Does not own payment acceptance rules

### Retention Agent

- Purpose: Help recover users whose momentum or paid continuity is at risk.
- Business responsibility: Support reactivation, return, or graceful continuity rather than unnecessary churn.
- Observed business events:
  - Payment Failed
  - Subscription Expired
  - Subscription Downgraded
  - Subscription Renewed
- Observed lifecycle states:
  - Subscription Expiring
  - Subscription Expired
  - Inactive
- Produced business outcomes:
  - Recovery recommendation
  - Reactivation support
  - Lower avoidable churn
- Dependencies:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Boundaries:
  - Does not redefine churn policy
  - Does not create alternate lifecycle states
  - Does not act as a general engagement agent

### Payment Agent

- Purpose: Support business interpretation of commercial payment outcomes.
- Business responsibility: Translate payment facts into valid business treatment.
- Observed business events:
  - Payment Received
  - Payment Failed
  - FOCUS Purchased
  - Course Purchased
- Observed lifecycle states:
  - Recommended
  - Subscription Expiring
  - Subscription Expired
- Produced business outcomes:
  - Correct payment outcome interpretation
  - Payment-related escalation or continuation support
  - Alignment between purchase fact and business follow-up
- Dependencies:
  - `docs/foundation/02-products.md`
  - `docs/foundation/05-business-events.md`
- Boundaries:
  - Does not own subscription lifecycle
  - Does not define commercial offers
  - Does not replace the Subscription Agent

### Notification Agent

- Purpose: Decide what business communication should be surfaced based on valid business context.
- Business responsibility: Support timely, relevant, and bounded customer-facing or operator-facing communication.
- Observed business events:
  - Telegram Joined
  - Recommendation Generated
  - Zoom Registered
  - Zoom Attended
  - Subscription Renewed
  - Payment Failed
  - Subscription Expired
- Observed lifecycle states:
  - Telegram Contact
  - Recommended
  - FOCUS Member
  - Platform Subscriber
  - Subscription Expiring
  - Subscription Expired
  - Inactive
- Produced business outcomes:
  - Relevant notifications
  - Better timing of business communication
  - Lower confusion across the customer journey
- Dependencies:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Boundaries:
  - Does not own event creation
  - Does not define funnel stages
  - Does not replace dedicated retention or payment interpretation

### Analytics Agent

- Purpose: Turn business context into reusable insight for measurement and decision support.
- Business responsibility: Interpret what happened in a way that improves business visibility and decision quality.
- Observed business events:
  - All canonical business events where valid
- Observed lifecycle states:
  - All canonical lifecycle states where valid
- Produced business outcomes:
  - Business insight
  - Conversion interpretation
  - Product and lifecycle visibility
- Dependencies:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Boundaries:
  - Does not redefine KPIs outside business documentation
  - Does not create new business events
  - Does not own business decisions directly

### Referral Agent

- Purpose: Support referral growth as a bounded business capability.
- Business responsibility: Recognize when referral logic is valid and help move trust into referral action.
- Observed business events:
  - Referral Created
  - Referral Converted
  - Subscription Renewed
  - Strategy Session Completed
- Observed lifecycle states:
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
  - Inactive
- Produced business outcomes:
  - Better referral readiness
  - Stronger advocacy conversion
  - Trust-based acquisition support
- Dependencies:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Boundaries:
  - Does not redefine Advocate as a product or lifecycle state
  - Does not own acquisition channel strategy broadly

## Agent Collaboration

AI Agents collaborate through shared business context, not by owning each other.

### Independent Execution

Each agent must be able to perform its own bounded responsibility without assuming it controls other agents.

### Shared Business Context

Agents share the same source documents for:

- Products
- Funnel
- User Lifecycle
- Business Events

This shared foundation prevents duplicated interpretation.

### Handoff Principles

- One agent may produce an outcome that becomes relevant input for another agent.
- No agent should issue commands to another agent as if it owns orchestration.
- Handoffs must happen through shared business context, not private undocumented assumptions.

### Conflict Prevention

- No two agents may own the same primary business responsibility.
- If two agents touch the same business moment, they must do so from different roles.
- When conflict exists, the narrower bounded agent wins inside its own responsibility.

## Agent Inputs

Canonical inputs for AI Agents are:

- Business Events
- Lifecycle State
- Product Context
- User Context
- Funnel Position where relevant

These inputs are defined by the foundation documents:

- Business Events: `docs/foundation/05-business-events.md`
- Lifecycle State: `docs/foundation/04-user-lifecycle.md`
- Product Context: `docs/foundation/02-products.md`
- Funnel Position: `docs/foundation/03-funnel.md`

User Context is the business context needed to interpret a person responsibly within those canonicals.

User Context must not replace or contradict the canonical lifecycle.

## Agent Outputs

Canonical outputs for AI Agents include:

- Recommendations
- Decisions
- Notifications
- Tasks
- Insights
- State transition requests

These outputs are business outcomes, not architecture changes.

Agents may support a lifecycle transition request, but they do not redefine the lifecycle.

Agents may support a recommendation, but they do not redefine products or funnel structure.

Agents never modify business architecture directly.

## Business Ownership

### Funnel Agent

- Owner: Product Owner
- Expected customer outcome: Clear next-step guidance
- Expected business outcome: Stronger funnel progression

### Recommendation Agent

- Owner: Product Owner
- Expected customer outcome: Better-fit next-step decisions
- Expected business outcome: Better routing into the correct product layer

### Onboarding Agent

- Owner: Product Owner
- Expected customer outcome: Lower friction at the start of the relationship
- Expected business outcome: Higher activation into the entry layer

### Engagement Agent

- Owner: Product Owner
- Expected customer outcome: More consistent participation
- Expected business outcome: Higher engagement and lower silent drop-off

### Progress Agent

- Owner: AI Product Lead
- Expected customer outcome: Clearer sense of momentum and movement
- Expected business outcome: Higher retention through visible progress

### Reflection Agent

- Owner: AI Product Lead
- Expected customer outcome: Better meaning-making and deeper self-understanding
- Expected business outcome: Stronger continuation readiness

### Coach Agent

- Owner: Coach Lead
- Expected customer outcome: Better-informed human support
- Expected business outcome: Higher-quality delivery and premium support readiness

### Subscription Agent

- Owner: Product Owner
- Expected customer outcome: Clear continuation and access treatment
- Expected business outcome: Better retention and cleaner subscription handling

### Retention Agent

- Owner: Product Owner with Marketing Lead
- Expected customer outcome: Better recovery and re-entry options
- Expected business outcome: Lower avoidable churn

### Payment Agent

- Owner: Product Owner with Sales Lead
- Expected customer outcome: Clear business treatment after payment outcomes
- Expected business outcome: Better payment-related conversion integrity

### Notification Agent

- Owner: Product Owner
- Expected customer outcome: Timely and relevant communication
- Expected business outcome: Better response and lower communication friction

### Analytics Agent

- Owner: Operations Lead with Product Owner
- Expected customer outcome: Indirect; clearer products and journeys through better business understanding
- Expected business outcome: Better measurement and decision visibility

### Referral Agent

- Owner: Marketing Lead
- Expected customer outcome: Easier trust-based recommendation flow
- Expected business outcome: More referral-driven acquisition

## Governance

### Ownership

The canonical AI Agent map is owned by the AI systems architecture layer of Starway.

Business owners remain responsible for the business outcomes that each agent serves.

### Naming Conventions

- Agent names must reflect business responsibility, not technical mechanism.
- An agent name must describe a stable role, not a temporary workflow.
- If a new proposed agent does not have a unique responsibility, it should not exist.

### Versioning

This document must remain one canonical map of AI Agents.

Historical agent maps must be archived rather than kept active in parallel.

### Adding New Agents

A new agent may be added only when:

- it owns a unique business responsibility;
- that responsibility cannot be cleanly assigned to an existing canonical agent;
- it depends on the existing foundation rather than redefining it.

### Deprecation Policy

- An agent may be deprecated when its business responsibility disappears or is validly absorbed into another agent.
- Deprecation must not leave the business responsibility undefined.

### Backward Compatibility

- Future documents must reference these canonical agents instead of inventing duplicate responsibilities.
- AI Workflows may orchestrate canonical agents later, but they must not redefine agent purpose or boundaries.
- No downstream document may create a second active agent map that conflicts with this one.
