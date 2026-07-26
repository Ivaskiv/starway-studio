# Document

Logical API Architecture

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

- `docs/technical/01-ai-service-architecture.md`
- `docs/technical/02-system-component-architecture.md`
- `docs/architecture/02-data-model.md`
- `docs/architecture/03-state-machines.md`
- `docs/architecture/04-business-processes.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/technical/04-integration-architecture.md`
- `docs/technical/05-event-architecture.md`
- `docs/engineering/05-tool-blueprint.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The logical API Architecture exists to define the canonical communication contracts between the logical services and components of the Starway / ABSystem platform.

It answers one question:

How do services communicate through explicit business interfaces without exposing implementation details?

Logical API contracts are required because the architecture already defines:

- canonical business capabilities;
- canonical logical services;
- canonical internal components;
- canonical business processes;
- canonical business objects;
- canonical state machines.

Without logical API contracts, services could couple to each other through hidden assumptions, ambiguous dependencies, or overlapping ownership.

This document therefore defines logical interfaces only.

It does not define protocols, transports, endpoints, schemas, DTOs, or implementation styles.

It must be read together with:

- `docs/technical/01-ai-service-architecture.md`
- `docs/technical/02-system-component-architecture.md`
- `docs/architecture/04-business-processes.md`
- `docs/architecture/02-data-model.md`
- `docs/architecture/03-state-machines.md`
- `docs/architecture/05-ai-capability-model.md`

## API Principles

1. Contract-first.
   Every inter-service interaction must be defined as a business contract before implementation is allowed to realize it.

2. Implementation-independent.
   Logical interfaces must remain valid regardless of transport or runtime technology.

3. Deterministic interfaces.
   The same business request under the same business conditions must imply the same logical interface contract.

4. Explicit ownership.
   Every interface must have one owning service.

5. Versionable contracts.
   Contracts must be evolvable without ambiguity.

6. Backward compatibility.
   Contract evolution must preserve valid existing consumers unless a deliberate breaking change is approved canonically.

7. Single responsibility.
   Each interface must serve one coherent business communication boundary.

8. No hidden coupling.
   Services may consume only documented logical interfaces and not undocumented internal component behavior.

## API Inventory

### Funnel Service

#### `Funnel Routing Interface`

- Purpose:
  - Expose canonical funnel-routing decisions and next-step path selection.
- Owner:
  - Funnel Service
- Consumers:
  - Recommendation Service
  - Retention Service
  - Referral Service
  - Notification Service
- Business capability:
  - Funnel routing

#### `Entry Guidance Interface`

- Purpose:
  - Expose onboarding and entry-guidance outcomes for new direct contacts.
- Owner:
  - Funnel Service
- Consumers:
  - Notification Service
  - Recommendation Service
- Business capability:
  - Onboarding guidance

### Recommendation Service

#### `Recommendation Decision Interface`

- Purpose:
  - Expose recommendation creation and recommendation refresh decisions.
- Owner:
  - Recommendation Service
- Consumers:
  - Funnel Service
  - Retention Service
  - Coach Support Service
  - Notification Service
- Business capability:
  - Recommendation generation

#### `Recommendation Review Interface`

- Purpose:
  - Expose whether an existing recommendation remains valid, is superseded, or requires premium-context review.
- Owner:
  - Recommendation Service
- Consumers:
  - Coach Support Service
  - Notification Service
  - Funnel Service
- Business capability:
  - Recommendation refresh and review

### Engagement Service

#### `Engagement Support Interface`

- Purpose:
  - Expose active participation support decisions.
- Owner:
  - Engagement Service
- Consumers:
  - Notification Service
  - Recommendation Service
  - Retention Service
- Business capability:
  - Engagement support

#### `Progress Interpretation Interface`

- Purpose:
  - Expose progress-context interpretation derived from participation and continuity signals.
- Owner:
  - Engagement Service
- Consumers:
  - Recommendation Service
  - Coach Support Service
  - Analytics Service
- Business capability:
  - Progress interpretation

### Coach Support Service

#### `Coach Context Interface`

- Purpose:
  - Expose coach-relevant contextual interpretation for premium or delivery-related human support.
- Owner:
  - Coach Support Service
- Consumers:
  - Human decision authority
  - Analytics Service
  - Notification Service in coach-aware communication cases
- Business capability:
  - Coach support

#### `Premium Review Interface`

- Purpose:
  - Expose whether premium-context situations require human-bound escalation.
- Owner:
  - Coach Support Service
- Consumers:
  - Recommendation Service
  - Human decision authority
- Business capability:
  - Premium-context review

### Continuity Service

#### `Continuity Classification Interface`

- Purpose:
  - Expose continuity handling outcomes for activation, renewal, upgrade, downgrade, or expiration.
- Owner:
  - Continuity Service
- Consumers:
  - Retention Service
  - Notification Service
  - Funnel Service where continuity changes route validity
- Business capability:
  - Continuity classification

#### `Access Continuity Interface`

- Purpose:
  - Expose continuity outcomes translated into access-relevant business results.
- Owner:
  - Continuity Service
- Consumers:
  - Notification Service
  - Funnel Service
  - Retention Service
- Business capability:
  - Access continuity interpretation

### Retention Service

#### `Recovery Path Interface`

- Purpose:
  - Expose the valid canonical recovery path for at-risk or expired users.
- Owner:
  - Retention Service
- Consumers:
  - Funnel Service
  - Recommendation Service
  - Notification Service
  - Continuity Service
- Business capability:
  - Recovery-path selection

#### `Recovery Recommendation Interface`

- Purpose:
  - Expose whether recovery requires refreshed recommendation context.
- Owner:
  - Retention Service
- Consumers:
  - Recommendation Service
  - Notification Service
- Business capability:
  - Recovery recommendation support

### Notification Service

#### `Business Communication Interface`

- Purpose:
  - Expose the selection of the correct business communication for a canonical process step.
- Owner:
  - Notification Service
- Consumers:
  - Funnel Service
  - Recommendation Service
  - Engagement Service
  - Continuity Service
  - Retention Service
  - Referral Service
- Business capability:
  - Communication selection and delivery orchestration

#### `Communication Escalation Interface`

- Purpose:
  - Expose communication outcomes that require coach-aware or human-review escalation.
- Owner:
  - Notification Service
- Consumers:
  - Coach Support Service
  - Human review authority
- Business capability:
  - Exceptional communication escalation

### Analytics Service

#### `Insight Interpretation Interface`

- Purpose:
  - Expose cross-process business insight derived from canonical business facts.
- Owner:
  - Analytics Service
- Consumers:
  - Coach Support Service
  - Human strategic review authority
  - Product and business review contexts
- Business capability:
  - Insight interpretation

#### `Strategic Review Interface`

- Purpose:
  - Expose insight that requires human strategic review.
- Owner:
  - Analytics Service
- Consumers:
  - Human strategic review authority
- Business capability:
  - Strategic escalation

### Referral Service

#### `Referral Interpretation Interface`

- Purpose:
  - Expose whether referral context is only a signal or a valid referral conversion fact.
- Owner:
  - Referral Service
- Consumers:
  - Funnel Service
  - Notification Service
- Business capability:
  - Referral interpretation

#### `Referral Routing Interface`

- Purpose:
  - Expose referral outcomes that should be routed into canonical funnel progression.
- Owner:
  - Referral Service
- Consumers:
  - Funnel Service
  - Notification Service
- Business capability:
  - Referral routing support

## API Operations

### `Funnel Routing Interface`

- Supported business operations:
  - Determine current canonical funnel route
  - Determine canonical re-entry route
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Funnel Stage Record
  - Recommendation Record
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Valid funnel routing outcome
  - Handover to recommendation or communication flows

### `Entry Guidance Interface`

- Supported business operations:
  - Generate first-step guidance
  - Confirm valid entry-path direction
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Funnel Stage Record
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Entry guidance outcome

### `Recommendation Decision Interface`

- Supported business operations:
  - Generate recommendation
  - Refresh recommendation
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Recommendation Record
- Produced Business Events:
  - Recommendation Generated
- Expected outcomes:
  - Recommendation outcome
  - Recommendation replacement decision when needed

### `Recommendation Review Interface`

- Supported business operations:
  - Evaluate recommendation validity
  - Determine whether recommendation requires premium-context review
- Required Business Objects:
  - Recommendation Record
  - User Record
  - User Lifecycle Record
  - Product Record
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Recommendation validity status
  - Premium-context review signal

### `Engagement Support Interface`

- Supported business operations:
  - Determine engagement-support action
  - Determine participation-continuity support
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Recommendation Record
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Engagement-support outcome

### `Progress Interpretation Interface`

- Supported business operations:
  - Interpret participation as progress context
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Product Record
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Progress interpretation outcome

### `Coach Context Interface`

- Supported business operations:
  - Prepare coach-support context
  - Prepare delivery-related business context
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Product Record
  - Recommendation Record
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Coach context outcome

### `Premium Review Interface`

- Supported business operations:
  - Determine whether premium-context escalation is required
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Premium review signal
  - Human escalation need

### `Continuity Classification Interface`

- Supported business operations:
  - Classify continuity as activation, renewal, upgrade, downgrade, or expiration
- Required Business Objects:
  - Subscription Record
  - User Record
  - User Lifecycle Record
  - Product Record
- Produced Business Events:
  - Payment Received
  - Payment Failed
  - interprets canonical subscription events
- Expected outcomes:
  - Continuity classification outcome

### `Access Continuity Interface`

- Supported business operations:
  - Translate continuity outcome into access outcome
- Required Business Objects:
  - Subscription Record
  - User Lifecycle Record
  - Access Policy Record
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Access continuity outcome
  - Valid downstream state transition request context

### `Recovery Path Interface`

- Supported business operations:
  - Determine valid recovery path
  - Determine valid re-entry support path
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Recovery path outcome

### `Recovery Recommendation Interface`

- Supported business operations:
  - Determine whether recovery should include refreshed recommendation context
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Recommendation Record
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Recovery recommendation outcome

### `Business Communication Interface`

- Supported business operations:
  - Select canonical business communication
  - Prepare communication outcome for delivery
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
  - Access Policy Record
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Communication outcome
  - Delivery-ready communication selection

### `Communication Escalation Interface`

- Supported business operations:
  - Escalate sensitive or exceptional communication outcomes
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - relevant recommendation or continuity context
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Escalation signal
  - Coach-aware or human-review handover

### `Insight Interpretation Interface`

- Supported business operations:
  - Interpret business patterns
  - Produce cross-process insight
- Required Business Objects:
  - Company Record
  - Product Record
  - Subscription Record
  - Funnel Stage Record
  - User Record
  - User Lifecycle Record
  - Business Event Record
  - Recommendation Record
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Insight outcome

### `Strategic Review Interface`

- Supported business operations:
  - Escalate strategic review cases
- Required Business Objects:
  - Insight interpretation outcome
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Human strategic review request

### `Referral Interpretation Interface`

- Supported business operations:
  - Determine referral signal vs referral conversion
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Recommendation Record
- Produced Business Events:
  - Referral Created
  - Referral Converted
- Expected outcomes:
  - Referral interpretation outcome

### `Referral Routing Interface`

- Supported business operations:
  - Route valid referral conversion into canonical funnel progression
- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - referral interpretation context
- Produced Business Events:
  - None independently
- Expected outcomes:
  - Referral routing outcome

## Input Contracts

### General input contract rules

For every logical operation:

- required business inputs must be canonical Business Objects only;
- validation must rely on canonical Business Rules and canonical State Machines;
- preconditions must be satisfied before the interface may be consumed.

### Validation dependencies

- Funnel-related operations depend on:
  - current User Lifecycle Record
  - valid funnel stage context
  - BR-001, BR-003, BR-013, BR-018

- Recommendation-related operations depend on:
  - valid recommendation context
  - product canon
  - BR-006, BR-011, BR-018

- Continuity-related operations depend on:
  - current Subscription Record
  - lifecycle context
  - access policy context where relevant
  - BR-007, BR-008, BR-012, BR-018

- Retention-related operations depend on:
  - expired or at-risk continuity context
  - recovery-path validity
  - BR-007, BR-013, BR-018

- Communication-related operations depend on:
  - process-stage context
  - current recommendation or continuity state
  - BR-006, BR-008, BR-018

- Analytics-related operations depend on:
  - immutable Business Event context
  - current canonical state interpretation
  - BR-004, BR-005, BR-016, BR-018

### Business preconditions

- No operation may proceed on stale or contradictory business-state assumptions.
- No interface may be consumed for a responsibility owned by another service.
- No interface may accept inputs that would imply forbidden state transitions or forbidden authority.

## Output Contracts

### General output contract rules

Outputs may include only:

- returned Business Objects or Business Object interpretations;
- emitted Business Events that the owning service is canonically allowed to emit;
- resulting State Changes as state transition requests or outcomes grounded in canonical State Machines.

### Returned Business Objects

- Funnel interfaces return:
  - routing outcomes
  - entry guidance outcomes

- Recommendation interfaces return:
  - Recommendation Record outcomes
  - recommendation validity outcomes

- Engagement interfaces return:
  - engagement-support outcomes
  - progress interpretation outcomes

- Coach Support interfaces return:
  - coach-context outcomes
  - premium review outcomes

- Continuity interfaces return:
  - continuity classification outcomes
  - access continuity outcomes

- Retention interfaces return:
  - recovery path outcomes
  - recovery recommendation outcomes

- Notification interfaces return:
  - communication outcomes
  - escalation signals

- Analytics interfaces return:
  - insight outcomes
  - strategic review signals

- Referral interfaces return:
  - referral interpretation outcomes
  - referral routing outcomes

### Emitted Business Events

- Recommendation Service may emit:
  - Recommendation Generated

- Continuity Service may emit or surface:
  - Payment Received
  - Payment Failed
  - canonical continuity event consequences

- Referral Service may emit:
  - Referral Created
  - Referral Converted

Other services do not independently emit new canonical Business Events unless separately authorized by the canonical architecture.

### Resulting State Changes

- Recommendation outputs may result in:
  - Recommendation Record state changes

- Continuity outputs may result in:
  - Subscription Record state transition requests
  - User Lifecycle transition requests through canonical continuity handling

- Recovery outputs may result in:
  - Recommendation refresh requests
  - canonical re-entry routing requests

No logical interface may imply undocumented state changes.

## API Dependency Rules

### Allowed consumers

- A service may consume only interfaces that support its documented dependencies in the Service Architecture.
- A component may consume only its own service’s exposed interfaces indirectly through service-level ownership boundaries.
- Human review and human strategic authority may consume interfaces explicitly meant for escalation.

### Forbidden consumers

- A service may not consume another service’s internal component outputs directly.
- A service may not consume an interface in order to take over the owning service’s responsibility.
- Notification Service consumers may not use communication interfaces as substitutes for business decision interfaces.
- Analytics Service outputs may not be consumed as authority to mutate source-of-truth business state.

### Dependency direction

- Dependency direction must follow canonical service dependencies only.
- No interface may create reverse ownership of an upstream dependency.
- No interface may create circular authority, even if interaction is bidirectional in business sequence.

### Ownership rules

- Each interface has exactly one owner service.
- Consumers may interpret outputs only within their own canonical responsibility.
- Ownership of inputs never transfers to the consumer.

## Contract Matrix

| Interface | Owner | Consumers | Inputs | Outputs | Business Capability | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| Funnel Routing Interface | Funnel Service | Recommendation, Retention, Referral, Notification | User, Lifecycle, Funnel Stage, Recommendation, routing events | Routing outcome, next-step direction | Funnel routing | Business Data, Business Rules, Funnel canon |
| Entry Guidance Interface | Funnel Service | Notification, Recommendation | User, Lifecycle, Funnel Stage | Entry guidance outcome | Onboarding guidance | Funnel context, lifecycle context |
| Recommendation Decision Interface | Recommendation Service | Funnel, Retention, Coach Support, Notification | User, Lifecycle, Product, Recommendation, recommendation events | Recommendation outcome, Recommendation Generated | Recommendation generation | Product canon, lifecycle canon, recommendation rules |
| Recommendation Review Interface | Recommendation Service | Coach Support, Notification, Funnel | Recommendation, User, Lifecycle, Product | Recommendation validity outcome, premium review signal | Recommendation refresh and review | Recommendation context, premium validity rules |
| Engagement Support Interface | Engagement Service | Notification, Recommendation, Retention | User, Lifecycle, Product, Recommendation, participation events | Engagement-support outcome | Engagement support | Participation context, engagement rules |
| Progress Interpretation Interface | Engagement Service | Recommendation, Coach Support, Analytics | User, Lifecycle, Subscription, Product, participation context | Progress interpretation outcome | Progress interpretation | Participation continuity context |
| Coach Context Interface | Coach Support Service | Human decision authority, Analytics, Notification | User, Lifecycle, Subscription, Product, Recommendation, delivery events | Coach context outcome | Coach support | Coach context, premium-context interpretation |
| Premium Review Interface | Coach Support Service | Recommendation, Human authority | User, Lifecycle, Subscription, Recommendation | Premium review signal | Premium-context review | Premium rules, coach context |
| Continuity Classification Interface | Continuity Service | Retention, Notification, Funnel | Subscription, User, Lifecycle, Product, continuity events | Continuity classification outcome | Continuity classification | Continuity rules, state machines |
| Access Continuity Interface | Continuity Service | Notification, Funnel, Retention | Subscription, Lifecycle, Access Policy | Access continuity outcome | Access continuity interpretation | Subscription rules, access rules |
| Recovery Path Interface | Retention Service | Funnel, Recommendation, Notification, Continuity | User, Lifecycle, Subscription, Recommendation, recovery events | Recovery path outcome | Recovery-path selection | Recovery rules, lifecycle state |
| Recovery Recommendation Interface | Retention Service | Recommendation, Notification | User, Lifecycle, Recommendation, recovery context | Recovery recommendation outcome | Recovery recommendation support | Recovery context, recommendation context |
| Business Communication Interface | Notification Service | Funnel, Recommendation, Engagement, Continuity, Retention, Referral | User, Lifecycle, Subscription, Recommendation, Access Policy, process context | Communication outcome | Communication selection | Process context, communication rules |
| Communication Escalation Interface | Notification Service | Coach Support, Human review authority | User, Lifecycle, communication-sensitive context | Escalation signal | Exceptional communication escalation | Communication outcome, escalation rules |
| Insight Interpretation Interface | Analytics Service | Coach Support, Human strategic review, business review contexts | Company, Product, Subscription, Funnel Stage, User, Lifecycle, Event, Recommendation | Insight outcome | Insight interpretation | Cross-process event context, analytics rules |
| Strategic Review Interface | Analytics Service | Human strategic review authority | Insight outcome | Strategic review request | Strategic escalation | Strategic review policy |
| Referral Interpretation Interface | Referral Service | Funnel, Notification | User, Lifecycle, Recommendation, referral events | Referral interpretation outcome, Referral Created / Converted | Referral interpretation | Referral rules, lifecycle context |
| Referral Routing Interface | Referral Service | Funnel, Notification | User, Lifecycle, referral interpretation context | Referral routing outcome | Referral routing support | Referral interpretation, funnel alignment |

## Versioning Principles

### Contract evolution

- A logical contract may evolve only when the owning service, capability, or business process changes canonically.
- Evolution must preserve the interface’s single responsibility.

### Backward compatibility

- Existing valid consumers must remain supported unless a deliberate canonical breaking change is approved.
- Additive clarification is preferred over disruptive replacement.

### Deprecation policy

- An interface may be deprecated only when:
  - its capability no longer exists; or
  - its responsibility is absorbed into another canonical interface without ambiguity.

Deprecated contracts must remain historically understandable until all dependent architecture and implementation are aligned.

### Breaking changes

A breaking change may occur only when:

- the canonical Business Capability changes;
- service ownership changes canonically;
- Business Rules or State Machines make the prior contract invalid;
- affected consumers are explicitly reviewed and updated in the architecture.

## Cross References

- Service Architecture:
  - `docs/technical/01-ai-service-architecture.md`
- Component Architecture:
  - `docs/technical/02-system-component-architecture.md`
- Business Processes:
  - `docs/architecture/04-business-processes.md`
- Data Model:
  - `docs/architecture/02-data-model.md`
- State Machines:
  - `docs/architecture/03-state-machines.md`
- AI Capability Model:
  - `docs/architecture/05-ai-capability-model.md`
- AI Decision Model:
  - `docs/architecture/08-ai-decision-model.md`

## Governance

### Adding interfaces

A new logical interface may be added only when:

- it originates from an existing canonical business capability;
- it has one owner service;
- its consumers, inputs, outputs, and dependency direction are explicit;
- it does not duplicate an existing interface responsibility.

### Changing contracts

A contract may change only when:

- the owning service changes canonically;
- the underlying business capability changes;
- Business Processes, Business Rules, or State Machines require the change;
- compatibility impact is explicitly reviewed.

### Deprecating interfaces

An interface may be deprecated only when:

- its underlying capability no longer exists; or
- its responsibility is fully absorbed into another canonical interface without overlap.

Deprecated interfaces must remain historically understandable until all dependent architecture and implementation are aligned.

### Reviewing dependencies

Dependency reviews are required whenever:

- a new consumer appears;
- a service boundary changes;
- a contract evolution changes expected business inputs or outputs;
- a risk of reverse ownership or circular authority appears.
