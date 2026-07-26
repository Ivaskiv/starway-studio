# Document

AI Service Architecture

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

- `docs/foundation/01-company.md`
- `docs/foundation/02-products.md`
- `docs/foundation/03-funnel.md`
- `docs/foundation/04-user-lifecycle.md`
- `docs/foundation/05-business-events.md`
- `docs/foundation/06-ai-agents.md`
- `docs/foundation/07-ai-workflows.md`
- `docs/foundation/08-glossary.md`
- `docs/foundation/09-business-rules.md`
- `docs/architecture/01-domain-model.md`
- `docs/architecture/02-data-model.md`
- `docs/architecture/03-state-machines.md`
- `docs/architecture/04-business-processes.md`
- `docs/architecture/05-ai-capability-model.md`
- `docs/architecture/06-ai-interaction-model.md`
- `docs/architecture/07-ai-memory-model.md`
- `docs/architecture/08-ai-decision-model.md`
- `docs/architecture/09-ai-governance-model.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/technical/02-system-component-architecture.md`
- `docs/technical/03-api-architecture.md`
- `docs/technical/06-workflow-orchestration.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The AI Service Architecture exists to define the canonical logical services that compose the Starway / ABSystem AI platform.

It answers one question:

Which logical services are required to realize the already-defined business and AI architecture, and what does each service own?

This document is a logical architecture layer.

It does not define deployment, infrastructure, transport, storage, runtime, cloud topology, or implementation.

It must be read together with:

- `docs/foundation/01-company.md`
- `docs/foundation/02-products.md`
- `docs/foundation/03-funnel.md`
- `docs/foundation/04-user-lifecycle.md`
- `docs/foundation/05-business-events.md`
- `docs/foundation/06-ai-agents.md`
- `docs/foundation/07-ai-workflows.md`
- `docs/foundation/08-glossary.md`
- `docs/foundation/09-business-rules.md`
- `docs/foundation/10-system-map.md`
- `docs/architecture/01-domain-model.md`
- `docs/architecture/02-data-model.md`
- `docs/architecture/03-state-machines.md`
- `docs/architecture/04-business-processes.md`
- `docs/architecture/05-ai-capability-model.md`
- `docs/architecture/06-ai-interaction-model.md`
- `docs/architecture/07-ai-memory-model.md`
- `docs/architecture/08-ai-decision-model.md`
- `docs/architecture/09-ai-governance-model.md`

Its role is to group canonical business capabilities into coherent logical services with explicit ownership boundaries.

## Architecture Principles

1. Service isolation.
   Each logical service must own a bounded capability set that can be reasoned about independently.

2. Single responsibility.
   A service must exist because it owns one coherent business service boundary.

3. Loose coupling.
   Services may collaborate through canonical business context, but no service should depend on another service’s hidden internal logic.

4. High cohesion.
   Capabilities that share the same business responsibility should live in the same service.

5. Event-driven architecture.
   Services collaborate because canonical Business Events and Business Processes require it.

6. Stateless services where possible.
   Services should depend on canonical Business Data and governed memory rather than hidden internal state wherever business architecture allows it.

7. Canonical ownership.
   Every capability and logical service must have one explicit owner and one explicit boundary.

8. No shadow business logic.
   Services may realize business architecture, but they must not invent new products, rules, states, or process paths.

## Service Inventory

### Funnel Service

- Purpose:
  - Realize canonical funnel movement and direct users toward the correct next step.
- Business responsibility:
  - Own funnel routing, entry guidance coordination, and canonical next-step direction.
- Owned capabilities:
  - Funnel Agent
  - Onboarding Agent
- Owned business processes:
  - Audience Entry Process
  - Diagnostic Entry Process
  - Referral Conversion Process where entry routing is involved
- Dependencies:
  - Recommendation Service
  - Notification Service
  - Retention Service
  - Business Data canon

### Recommendation Service

- Purpose:
  - Produce and refresh canonical next-step recommendations.
- Business responsibility:
  - Own recommendation generation, recommendation refresh, and recommendation-context interpretation.
- Owned capabilities:
  - Recommendation Agent
  - Reflection Agent
- Owned business processes:
  - Recommendation Delivery Process
  - Recommendation Refresh Process
- Dependencies:
  - Funnel Service
  - Engagement Service
  - Coach Support Service
  - Notification Service
  - Business Data canon

### Engagement Service

- Purpose:
  - Support meaningful participation and continuity inside active products.
- Business responsibility:
  - Own engagement support and progress-oriented continuity interpretation.
- Owned capabilities:
  - Engagement Agent
  - Progress Agent
- Owned business processes:
  - Product-continuity participation support
  - Recommendation Refresh Process where participation and progress context matter
- Dependencies:
  - Recommendation Service
  - Coach Support Service
  - Analytics Service
  - Notification Service

### Coach Support Service

- Purpose:
  - Support the human coach and premium-context delivery decisions.
- Business responsibility:
  - Own coach-facing context support and premium-context interpretation up to the human decision boundary.
- Owned capabilities:
  - Coach Agent
- Owned business processes:
  - Premium Conversion Process
  - Premium delivery support processes
- Dependencies:
  - Recommendation Service
  - Engagement Service
  - Analytics Service
  - Human decision authority

### Continuity Service

- Purpose:
  - Own subscription continuity, payment interpretation, and valid continuity transitions.
- Business responsibility:
  - Own activation, renewal, upgrade, downgrade, expiration, and payment-outcome handling.
- Owned capabilities:
  - Subscription Agent
  - Payment Agent
- Owned business processes:
  - FOCUS Activation Process
  - Platform Upgrade Process
  - Subscription Renewal Process
- Dependencies:
  - Notification Service
  - Retention Service
  - Business Data canon
  - State Machine canon

### Retention Service

- Purpose:
  - Support recovery, return, and churn-risk handling.
- Business responsibility:
  - Own canonical recovery-path selection and retention-oriented next-step support.
- Owned capabilities:
  - Retention Agent
- Owned business processes:
  - Subscription Recovery Process
  - Recommendation Refresh Process where recovery context matters
- Dependencies:
  - Continuity Service
  - Funnel Service
  - Recommendation Service
  - Notification Service

### Notification Service

- Purpose:
  - Deliver the correct business communication at the correct process step.
- Business responsibility:
  - Own communication selection and delivery orchestration within canonical business boundaries.
- Owned capabilities:
  - Notification Agent
- Owned business processes:
  - Recommendation Delivery Process
  - FOCUS Activation Process
  - Subscription Renewal Process
  - Subscription Recovery Process
  - Recommendation Refresh Process where communication is required
- Dependencies:
  - Funnel Service
  - Recommendation Service
  - Engagement Service
  - Continuity Service
  - Retention Service
  - Referral Service

### Analytics Service

- Purpose:
  - Interpret business patterns across processes without mutating source-of-truth business state.
- Business responsibility:
  - Own cross-process insight generation and strategic interpretation support.
- Owned capabilities:
  - Analytics Agent
- Owned business processes:
  - Cross-process performance interpretation
  - Business review and insight generation
- Dependencies:
  - Engagement Service
  - Coach Support Service
  - Business Data canon
  - Business Event canon

### Referral Service

- Purpose:
  - Interpret referral facts and feed valid referral outcomes into canonical funnel movement.
- Business responsibility:
  - Own referral recognition, referral conversion interpretation, and referral-context routing support.
- Owned capabilities:
  - Referral Agent
- Owned business processes:
  - Referral Conversion Process
- Dependencies:
  - Funnel Service
  - Notification Service
  - Business Event canon

## Service Responsibilities

### Funnel Service

- What it owns:
  - Funnel routing
  - Entry guidance
  - Re-entry routing logic within canonical process boundaries
- What it consumes:
  - User Record
  - User Lifecycle Record
  - Funnel Stage Record
  - Recommendation context
  - Entry and referral-related Business Events
- What it produces:
  - Next-step direction
  - Routing decisions
  - Handover to Recommendation or Notification Service
- What it must never own:
  - Recommendation authority
  - Subscription continuity handling
  - Premium qualification

### Recommendation Service

- What it owns:
  - Recommendation creation
  - Recommendation refresh
  - Reflection-to-recommendation handoff
- What it consumes:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Recommendation Record
  - Recommendation-relevant Business Events
- What it produces:
  - Recommendation Record
  - Recommendation Generated event context
  - Recommendation delivery requests
- What it must never own:
  - Subscription continuity
  - Funnel ownership
  - Human premium approval

### Engagement Service

- What it owns:
  - Participation support
  - Progress interpretation in active-product context
- What it consumes:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Subscription context where relevant
  - Participation-related Business Events
- What it produces:
  - Engagement support actions
  - Progress interpretation context
  - Handover to Reflection, Coach Support, or Analytics Service
- What it must never own:
  - Recommendation ownership
  - Subscription transitions
  - Product canon

### Coach Support Service

- What it owns:
  - Coach-facing contextual support
  - Premium-context interpretation up to human approval
- What it consumes:
  - User Record
  - Lifecycle context
  - Subscription context
  - Recommendation context
  - Delivery-related Business Events
- What it produces:
  - Coach support outputs
  - Human escalation requests
  - Premium-context interpretation
- What it must never own:
  - Final premium approval
  - Payment or subscription authority
  - Lifecycle ownership

### Continuity Service

- What it owns:
  - Subscription continuity handling
  - Payment-outcome interpretation
  - Activation, renewal, upgrade, downgrade, and expiration handling
- What it consumes:
  - Subscription Record
  - User Record
  - User Lifecycle Record
  - Product Record
  - Access Policy Record
  - Payment and subscription Business Events
- What it produces:
  - Subscription state transition requests
  - Continuity outcomes
  - Handover to Notification or Retention Service
- What it must never own:
  - Premium approval
  - Funnel ownership
  - Recommendation ownership

### Retention Service

- What it owns:
  - Recovery-path selection
  - Return support within canonical re-entry rules
- What it consumes:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation context
  - Recovery-related Business Events
- What it produces:
  - Recovery routing
  - Recovery recommendations
  - Handover to Funnel, Recommendation, or Notification Service
- What it must never own:
  - Subscription-state ownership
  - Direct premium qualification
  - Product canon

### Notification Service

- What it owns:
  - Business communication selection and delivery orchestration
- What it consumes:
  - User context
  - Lifecycle context
  - Subscription context
  - Recommendation context
  - Access policy context
  - Process-stage context
- What it produces:
  - Notifications
  - Delivery outcomes
  - Coach-aware communication escalation where relevant
- What it must never own:
  - Business policy
  - Subscription continuity
  - Recommendation ownership

### Analytics Service

- What it owns:
  - Cross-process business insight
  - Pattern interpretation
- What it consumes:
  - Business Event Record
  - User context
  - Lifecycle context
  - Product context
  - Subscription context
  - Recommendation context
- What it produces:
  - Interpretive insight
  - Escalation to human strategic review
- What it must never own:
  - Source-of-truth state
  - Product decisions
  - Continuity actions

### Referral Service

- What it owns:
  - Referral fact interpretation
  - Referral conversion context
- What it consumes:
  - User Record
  - Lifecycle context
  - Recommendation context
  - Referral Business Events
- What it produces:
  - Referral interpretation
  - Funnel handover
  - Referral communication requests
- What it must never own:
  - Funnel ownership
  - Subscription continuity
  - Product access authority

## Service Dependencies

### Funnel Service

- Upstream services:
  - None required for initial audience entry
- Downstream services:
  - Recommendation Service
  - Notification Service
- Dependency rules:
  - Must not depend on downstream services for ownership of funnel decisions

### Recommendation Service

- Upstream services:
  - Funnel Service
  - Engagement Service
  - Retention Service
- Downstream services:
  - Notification Service
  - Coach Support Service
- Dependency rules:
  - Must not depend on Notification Service for recommendation validity

### Engagement Service

- Upstream services:
  - Funnel Service
  - Recommendation Service
- Downstream services:
  - Recommendation Service
  - Coach Support Service
  - Analytics Service
  - Notification Service
- Dependency rules:
  - Must not own downstream recommendation or analytics authority

### Coach Support Service

- Upstream services:
  - Recommendation Service
  - Engagement Service
  - Analytics Service
- Downstream services:
  - Human decision authority
- Dependency rules:
  - Must escalate before human-only boundaries are crossed

### Continuity Service

- Upstream services:
  - Payment context
- Downstream services:
  - Notification Service
  - Retention Service
  - Funnel Service where continuity changes routing context
- Dependency rules:
  - Must own continuity decisions and not delegate them to Notification or Funnel Service

### Retention Service

- Upstream services:
  - Continuity Service
  - Notification Service
- Downstream services:
  - Funnel Service
  - Recommendation Service
  - Notification Service
  - Continuity Service when recovery reactivates continuity handling
- Dependency rules:
  - Must not bypass canonical return paths

### Notification Service

- Upstream services:
  - Funnel Service
  - Recommendation Service
  - Engagement Service
  - Continuity Service
  - Retention Service
  - Referral Service
- Downstream services:
  - Coach Support Service in coach-aware communication cases
- Dependency rules:
  - Must never become the owner of the business decision that caused the message

### Analytics Service

- Upstream services:
  - Engagement Service
  - Coach Support Service
  - Business Event context from all canonical processes
- Downstream services:
  - Human strategic review
- Dependency rules:
  - Must remain interpretive and not mutative

### Referral Service

- Upstream services:
  - Referral Business Event context
- Downstream services:
  - Funnel Service
  - Notification Service
- Dependency rules:
  - Must not bypass standard funnel routing

## Service Boundaries

### Funnel Service

- Owned business objects:
  - None as source-of-truth owners beyond funnel-routing outputs
- Consumed business objects:
  - User Record
  - User Lifecycle Record
  - Funnel Stage Record
  - Recommendation Record
- Emitted business events:
  - None independently

### Recommendation Service

- Owned business objects:
  - Recommendation Record
- Consumed business objects:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Business Event Record
- Emitted business events:
  - Recommendation Generated

### Engagement Service

- Owned business objects:
  - None as canonical source-of-truth owners
- Consumed business objects:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Subscription Record
  - Recommendation Record
- Emitted business events:
  - None independently

### Coach Support Service

- Owned business objects:
  - None as source-of-truth owners
- Consumed business objects:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
  - Product Record
- Emitted business events:
  - None independently

### Continuity Service

- Owned business objects:
  - Subscription Record
- Consumed business objects:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Access Policy Record
- Emitted business events:
  - Payment Received
  - Payment Failed
  - interprets canonical subscription events in continuity handling context

### Retention Service

- Owned business objects:
  - None as canonical source-of-truth owners
- Consumed business objects:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Emitted business events:
  - None independently

### Notification Service

- Owned business objects:
  - None as canonical source-of-truth owners
- Consumed business objects:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
  - Access Policy Record
- Emitted business events:
  - None independently

### Analytics Service

- Owned business objects:
  - None as source-of-truth owners
- Consumed business objects:
  - Company Record
  - Product Record
  - Subscription Record
  - Funnel Stage Record
  - User Record
  - User Lifecycle Record
  - Business Event Record
  - Recommendation Record
- Emitted business events:
  - None independently

### Referral Service

- Owned business objects:
  - None as source-of-truth owners
- Consumed business objects:
  - User Record
  - User Lifecycle Record
  - Recommendation Record
  - Business Event Record
- Emitted business events:
  - Referral Created
  - Referral Converted

## Service Collaboration

### Audience Entry Process

- Collaboration:
  - Funnel Service coordinates entry routing
  - Onboarding capability inside Funnel Service supports first-step guidance
  - Notification Service delivers entry communication if needed

### Diagnostic Entry Process

- Collaboration:
  - Funnel Service routes the user into the entry layer
  - Recommendation Service prepares next-step recommendation after diagnostic completion
  - Notification Service communicates the result

### Recommendation Delivery Process

- Collaboration:
  - Recommendation Service owns recommendation generation
  - Notification Service owns delivery
  - Funnel Service observes outcome for routing continuity

### FOCUS Activation Process

- Collaboration:
  - Continuity Service interprets payment and subscription activation
  - Notification Service communicates activation outcome
  - Funnel Service may observe new continuity context for later routing

### Platform Upgrade Process

- Collaboration:
  - Continuity Service owns upgrade handling
  - Retention Service observes continuity risk or opportunity
  - Notification Service communicates the outcome

### Premium Conversion Process

- Collaboration:
  - Recommendation Service may surface a premium-path recommendation
  - Coach Support Service supports the human premium decision boundary
  - Human authority makes the final premium decision

### Subscription Renewal Process

- Collaboration:
  - Continuity Service owns renewal handling
  - Notification Service communicates renewal outcome
  - Retention Service observes continuity patterns for future churn prevention

### Subscription Recovery Process

- Collaboration:
  - Continuity Service identifies loss of continuity
  - Retention Service selects the valid recovery path
  - Funnel Service restores canonical re-entry routing
  - Recommendation Service refreshes next-step guidance where needed
  - Notification Service delivers recovery communication

### Referral Conversion Process

- Collaboration:
  - Referral Service interprets referral facts
  - Funnel Service routes valid referral conversion into the standard funnel
  - Notification Service handles referral-related communication where applicable

### Recommendation Refresh Process

- Collaboration:
  - Engagement Service and Progress context may surface the need for a refreshed recommendation
  - Recommendation Service owns recommendation refresh
  - Retention Service may participate when recovery context is present
  - Notification Service communicates the refreshed next step

## Service Responsibility Matrix

| Service | Owns | Consumes | Produces | Dependencies | Forbidden Responsibilities |
| --- | --- | --- | --- | --- | --- |
| Funnel Service | Funnel routing, entry guidance, re-entry routing | User, Lifecycle, Funnel Stage, Recommendation, entry/recovery/referral events | Next-step direction, routing decisions, service handovers | Recommendation, Notification, Retention | Recommendation ownership, subscription continuity, premium approval |
| Recommendation Service | Recommendation creation and refresh | User, Lifecycle, Product, Recommendation, recommendation events | Recommendation Record, Recommendation Generated, delivery requests | Funnel, Engagement, Coach Support, Notification | Subscription continuity, funnel ownership, premium approval |
| Engagement Service | Participation support, progress interpretation context | User, Lifecycle, Product, Subscription, Recommendation, participation events | Engagement actions, progress context, service handovers | Recommendation, Coach Support, Analytics, Notification | Subscription transitions, product canon, recommendation ownership |
| Coach Support Service | Coach-facing context, premium-context interpretation before human boundary | User, Lifecycle, Subscription, Recommendation, Product, delivery events | Coach support outputs, human escalation | Recommendation, Engagement, Analytics, Human authority | Final premium approval, continuity ownership, lifecycle ownership |
| Continuity Service | Subscription continuity and payment-outcome interpretation | Subscription, User, Lifecycle, Product, Access Policy, payment/subscription events | Continuity outcomes, state transition requests, handovers | Notification, Retention, Funnel | Funnel ownership, premium qualification, recommendation ownership |
| Retention Service | Recovery-path selection and return support | User, Lifecycle, Subscription, Recommendation, recovery events | Recovery routing, recovery recommendations, service handovers | Continuity, Funnel, Recommendation, Notification | Subscription ownership, direct premium qualification, product canon |
| Notification Service | Communication selection and delivery orchestration | User, Lifecycle, Subscription, Recommendation, Access Policy, process context | Notifications, delivery outcomes, escalation signals | Funnel, Recommendation, Engagement, Continuity, Retention, Referral | Business policy, continuity ownership, recommendation ownership |
| Analytics Service | Cross-process business insight | Company, Product, Subscription, Funnel Stage, User, Lifecycle, Event, Recommendation | Interpretive insight, human review escalation | Engagement, Coach Support, process-wide event context | Source-of-truth state mutation, continuity handling, funnel ownership |
| Referral Service | Referral interpretation and referral conversion routing support | User, Lifecycle, Recommendation, referral events | Referral interpretation, funnel handover, referral communication requests | Funnel, Notification | Funnel ownership, access control, subscription continuity |

## Cross References

- AI Capability Model:
  - `docs/architecture/05-ai-capability-model.md`
- AI Interaction Model:
  - `docs/architecture/06-ai-interaction-model.md`
- Business Processes:
  - `docs/architecture/04-business-processes.md`
- Business Data Model:
  - `docs/architecture/02-data-model.md`
- Business State Machines:
  - `docs/architecture/03-state-machines.md`
- AI Decision Model:
  - `docs/architecture/08-ai-decision-model.md`
- AI Governance Model:
  - `docs/architecture/09-ai-governance-model.md`

## Governance

### Adding services

A new logical service may be added only when:

- an existing canonical capability set cannot remain cohesive inside current service boundaries;
- the new service has one clear responsibility;
- its owned capabilities and processes can be stated without overlap;
- it does not invent a new business capability outside the canonical architecture.

### Splitting services

A service must be split when:

- it owns more than one unrelated responsibility;
- least-privilege boundaries can no longer be preserved;
- service cohesion is lower than the clarity gained by separation.

### Merging services

A service may be merged only when:

- two services are effectively one coherent business responsibility;
- no ownership ambiguity is created;
- no canonical capability loses a clear owner.

### Deprecating services

A service may be deprecated only when:

- the underlying business responsibility no longer exists; or
- its owned capabilities and processes are fully absorbed into another canonical service without overlap.

Deprecated services must remain historically understandable until all dependent architecture and implementation are aligned.
