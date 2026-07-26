# Document

Domain Model

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

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/architecture/02-data-model.md`
- `docs/architecture/03-state-machines.md`
- `docs/technical/01-ai-service-architecture.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The Domain Model exists to translate the Foundation into one implementation-independent model of the business domain.

Its role is to identify the canonical business entities, define how they relate, and clarify what each entity owns.

This document depends on the Foundation and must be read as a structural interpretation of it, not as a new source of business truth.

It does not redefine:

- company identity;
- product catalog;
- funnel progression;
- user lifecycle;
- business events;
- AI agents;
- AI workflows;
- glossary terms;
- business rules.

Those concepts remain canonically owned by the Foundation documents.

This Domain Model exists so that future implementation teams can answer:

- what the core business entities are;
- how those entities relate;
- where ownership begins and ends;
- which invariants must survive implementation.

## Domain Modeling Principles

1. Business-first.
   The model must represent business meaning before any system shape.

2. Implementation-independent.
   Entities must remain valid regardless of databases, APIs, services, interfaces, or tooling.

3. One entity = one responsibility.
   An entity must exist because it owns one coherent business meaning.

4. One owner.
   Every entity must have one canonical business owner, even if many other entities reference it.

5. Explicit relationships.
   Every important relationship must be named and described directly.

6. Canonical language only.
   Entity names and meanings must align with the Foundation glossary and product canon.

7. Boundary preservation.
   An entity may collaborate with other entities, but it must not absorb their ownership.

8. Invariants before workflows.
   Stable business truth matters more than process sequencing.

## Domain Entities

### Company

- Name:
  - Company
- Purpose:
  - Represent the single business entity that owns the Starway ecosystem.
- Owner:
  - Business architecture leadership
- Responsibilities:
  - Own mission, vision, principles, and top-level business structure
  - Govern the existence of all lower business entities
- Lifecycle:
  - Persistent governing entity
- Related documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/08-glossary.md`

### Product

- Name:
  - Product
- Purpose:
  - Represent a distinct business offering with defined value, ownership, and place in the ecosystem.
- Owner:
  - Product architecture leadership
- Responsibilities:
  - Deliver customer-facing or internal business value
  - Participate in the product ecosystem and product hierarchy
  - Define included services and dependencies within product boundaries
- Lifecycle:
  - Draft
  - Beta
  - Active
  - Deprecated
  - Archived
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/08-glossary.md`

### Subscription

- Name:
  - Subscription
- Purpose:
  - Represent the recurring commercial relationship that grants continuity of access to eligible paid products.
- Owner:
  - Product and monetization leadership
- Responsibilities:
  - Define access continuity
  - Define renewal, expiration, upgrade, and downgrade behavior
  - Connect commercial entitlement to product access
- Lifecycle:
  - Intended
  - Active
  - Expiring
  - Expired
  - Renewed
  - Upgraded
  - Downgraded
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`

### Included Service

- Name:
  - Included Service
- Purpose:
  - Represent a service element delivered inside a product without becoming a separate standalone product by default.
- Owner:
  - The owning Product
- Responsibilities:
  - Deliver recurring or human-led value inside a product boundary
  - Support product fulfillment without fragmenting the catalog
- Lifecycle:
  - Inherited from the owning Product
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/08-glossary.md`

### Funnel Stage

- Name:
  - Funnel Stage
- Purpose:
  - Represent one canonical stage of business progression through the ecosystem.
- Owner:
  - Business architecture and growth leadership
- Responsibilities:
  - Define the current business progression layer
  - Define entry conditions, success criteria, primary CTA, and exit conditions
- Lifecycle:
  - Active while part of the canonical funnel
  - Deprecated when replaced by a new canonical stage
- Related documents:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/08-glossary.md`

### User

- Name:
  - User
- Purpose:
  - Represent the person whose relationship to the ecosystem is tracked across funnel, lifecycle, products, subscriptions, and events.
- Owner:
  - Business architecture leadership
- Responsibilities:
  - Participate in the funnel
  - Occupy one current lifecycle state
  - Generate business events through business interaction
  - Hold access through products and subscriptions
- Lifecycle:
  - Defined through User Lifecycle State rather than through the User entity itself
- Related documents:
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
  - `docs/foundation/09-business-rules.md`

### User Lifecycle State

- Name:
  - User Lifecycle State
- Purpose:
  - Represent the user’s current business relationship to the ecosystem.
- Owner:
  - Business architecture leadership
- Responsibilities:
  - Define access eligibility
  - Define business treatment
  - Constrain valid state transitions
- Lifecycle:
  - Anonymous
  - Telegram Contact
  - Test Participant
  - Recommended
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
  - Subscription Expiring
  - Subscription Expired
  - Inactive
  - Archived
- Related documents:
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/08-glossary.md`
  - `docs/foundation/09-business-rules.md`

### Business Event

- Name:
  - Business Event
- Purpose:
  - Represent an immutable business fact that occurred in the ecosystem.
- Owner:
  - Business architecture and analytics leadership
- Responsibilities:
  - Record what happened
  - Provide factual input to lifecycle interpretation, AI agents, workflows, analytics, and business decisions
  - Preserve historical truth
- Lifecycle:
  - Immutable once it occurs
- Related documents:
  - `docs/foundation/05-business-events.md`
  - `docs/foundation/08-glossary.md`
  - `docs/foundation/09-business-rules.md`

### AI Agent

- Name:
  - AI Agent
- Purpose:
  - Represent a bounded AI business capability that interprets business context and produces a business outcome.
- Owner:
  - AI systems architecture leadership
- Responsibilities:
  - Observe business context
  - Perform one bounded business responsibility
  - Produce recommendations, decisions, notifications, tasks, or insights within its boundary
- Lifecycle:
  - Proposed
  - Active
  - Deprecated
  - Archived
- Related documents:
  - `docs/foundation/06-ai-agents.md`
  - `docs/foundation/09-business-rules.md`

### AI Workflow

- Name:
  - AI Workflow
- Purpose:
  - Represent an orchestration of multiple AI Agents toward one business objective.
- Owner:
  - AI systems architecture leadership
- Responsibilities:
  - Coordinate participating agents
  - Define valid entry conditions and completion conditions
  - Preserve orchestration boundaries without owning agent responsibilities
- Lifecycle:
  - Proposed
  - Active
  - Deprecated
  - Archived
- Related documents:
  - `docs/foundation/07-ai-workflows.md`
  - `docs/foundation/09-business-rules.md`

### Recommendation

- Name:
  - Recommendation
- Purpose:
  - Represent a business suggestion about the next logical step for a user.
- Owner:
  - Recommendation-related business capability under funnel and AI guidance
- Responsibilities:
  - Translate user context into a proposed next step
  - Support progression without changing business state directly
- Lifecycle:
  - Generated
  - Delivered
  - Accepted
  - Declined
  - Expired
- Related documents:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/05-business-events.md`
  - `docs/foundation/06-ai-agents.md`
  - `docs/foundation/09-business-rules.md`

### Access Policy

- Name:
  - Access Policy
- Purpose:
  - Represent the canonical business logic that determines which products and services are available in a given lifecycle and subscription context.
- Owner:
  - Business architecture leadership
- Responsibilities:
  - Connect lifecycle state and subscription status to permissions
  - Preserve consistency of allowed and unavailable services
- Lifecycle:
  - Active while the underlying lifecycle and product model remain active
- Related documents:
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/09-business-rules.md`

### Business Rule

- Name:
  - Business Rule
- Purpose:
  - Represent a global invariant or constraint that governs all lower layers.
- Owner:
  - Business architecture leadership
- Responsibilities:
  - Preserve deterministic meaning across the ecosystem
  - Constrain products, funnel, lifecycle, events, agents, workflows, and access
- Lifecycle:
  - Proposed
  - Active
  - Deprecated
  - Archived
- Related documents:
  - `docs/foundation/09-business-rules.md`
  - `docs/foundation/10-system-map.md`

## Relationships

### Company ↔ Product

- Relationship:
  - One-to-many
- Business meaning:
  - One Company owns many Products.
- Ownership:
  - Company owns Product existence at the ecosystem level.
- Dependency:
  - Products depend on Company identity and business principles.

### Product ↔ Included Service

- Relationship:
  - One-to-many
- Business meaning:
  - One Product may include many Included Services.
- Ownership:
  - Product owns Included Services.
- Dependency:
  - Included Service depends on Product and must not exist independently by default.

### Product ↔ Subscription

- Relationship:
  - One-to-many
- Business meaning:
  - One Product may be governed by one or more Subscription models, and one Subscription model may govern access to one or more Products in a bundled context.
- Ownership:
  - Subscription is commercially owned within the Product ecosystem.
- Dependency:
  - Paid recurring access depends on Subscription validity.

### Funnel Stage ↔ Product

- Relationship:
  - Many-to-many
- Business meaning:
  - Funnel Stages reference Products as progression targets or active value layers.
- Ownership:
  - Funnel Stage does not own Products.
- Dependency:
  - Funnel depends on canonical Product definitions.

### User ↔ Funnel Stage

- Relationship:
  - Many-to-one at a point in time
- Business meaning:
  - Many Users may occupy the same Funnel Stage at a given moment in business progression.
- Ownership:
  - User does not own Funnel Stage; Funnel Stage does not own User identity.
- Dependency:
  - The user’s business journey is interpreted through the canonical funnel.

### User ↔ User Lifecycle State

- Relationship:
  - Many-to-one at a point in time
- Business meaning:
  - Many Users may share the same Lifecycle State, but each User has exactly one current Lifecycle State at a time.
- Ownership:
  - Lifecycle State does not own the User; it owns the meaning of the current relationship category.
- Dependency:
  - User treatment, access, and continuity depend on current Lifecycle State.

### User ↔ Subscription

- Relationship:
  - One-to-many over time
- Business meaning:
  - One User may have multiple Subscription relationships over time.
- Ownership:
  - Subscription does not own the User; it owns the commercial continuity relationship.
- Dependency:
  - Paid access depends on valid active Subscription context.

### User ↔ Product

- Relationship:
  - Many-to-many over time
- Business meaning:
  - A User may engage with multiple Products, and a Product serves many Users.
- Ownership:
  - Product does not own User identity.
- Dependency:
  - Access to Products depends on Lifecycle State and Subscription where applicable.

### User ↔ Business Event

- Relationship:
  - One-to-many
- Business meaning:
  - One User may generate many Business Events over time.
- Ownership:
  - Business Event does not own the User; it records facts related to the User.
- Dependency:
  - Lifecycle interpretation, recommendations, and workflows depend on Business Events.

### Product ↔ Business Event

- Relationship:
  - One-to-many
- Business meaning:
  - One Product may be associated with many Business Events.
- Ownership:
  - Product owns related business context, but not the canonical meaning of the event.
- Dependency:
  - Events may occur within or around Products.

### User Lifecycle State ↔ Access Policy

- Relationship:
  - One-to-many
- Business meaning:
  - One Lifecycle State may imply multiple access rules and availability constraints.
- Ownership:
  - Lifecycle State owns the business meaning; Access Policy owns the interpretive access matrix.
- Dependency:
  - Access Policy depends on Lifecycle State and relevant Subscription context.

### Subscription ↔ Access Policy

- Relationship:
  - One-to-many
- Business meaning:
  - One Subscription context may enable multiple access decisions.
- Ownership:
  - Subscription owns entitlement continuity; Access Policy owns access interpretation.
- Dependency:
  - Access Policy depends on Subscription validity where paid products are involved.

### Business Event ↔ User Lifecycle State

- Relationship:
  - Many-to-many through interpretation over time
- Business meaning:
  - Business Events may justify Lifecycle transitions, and Lifecycle States contextualize the meaning of Events.
- Ownership:
  - Events do not own states; states do not own events.
- Dependency:
  - Lifecycle transitions must be grounded in valid Business Events.

### Business Event ↔ Recommendation

- Relationship:
  - One-to-many
- Business meaning:
  - One or more Business Events may lead to a Recommendation.
- Ownership:
  - Recommendation does not own the underlying Event facts.
- Dependency:
  - Recommendations depend on factual context.

### Recommendation ↔ Product

- Relationship:
  - Many-to-one
- Business meaning:
  - Many Recommendations may point toward the same Product or next-step offering.
- Ownership:
  - Recommendation does not own Product meaning.
- Dependency:
  - Recommendation depends on canonical Product definitions.

### AI Agent ↔ Business Event

- Relationship:
  - Many-to-many
- Business meaning:
  - AI Agents observe Business Events as input context.
- Ownership:
  - AI Agents do not own Business Events.
- Dependency:
  - AI Agent execution depends on event context.

### AI Agent ↔ User Lifecycle State

- Relationship:
  - Many-to-many
- Business meaning:
  - AI Agents observe Lifecycle States to produce context-aware outcomes.
- Ownership:
  - AI Agents do not own Lifecycle States.
- Dependency:
  - Agent behavior depends on lifecycle-aware interpretation.

### AI Workflow ↔ AI Agent

- Relationship:
  - One-to-many
- Business meaning:
  - One AI Workflow may orchestrate multiple AI Agents.
- Ownership:
  - AI Workflow does not own Agent responsibilities.
- Dependency:
  - AI Workflow depends on canonical AI Agent boundaries.

### AI Workflow ↔ Business Event

- Relationship:
  - Many-to-many
- Business meaning:
  - AI Workflows may start because of Business Events and may operate across multiple Events.
- Ownership:
  - AI Workflow does not own Event definitions.
- Dependency:
  - Workflow entry depends on valid event context.

### AI Workflow ↔ User Lifecycle State

- Relationship:
  - Many-to-many
- Business meaning:
  - AI Workflows may require one or more valid Lifecycle States to operate.
- Ownership:
  - Workflow does not own lifecycle meaning.
- Dependency:
  - Workflow validity depends on current Lifecycle context.

### Business Rule ↔ All Core Entities

- Relationship:
  - One-to-many governing relationship
- Business meaning:
  - Business Rules govern all other entities.
- Ownership:
  - Business Rule owns constraints, not the entities themselves.
- Dependency:
  - All entities depend on Business Rules for canonical invariants.

## Entity Boundaries

### Company

- Owns:
  - Identity, purpose, principles, and company-level structure
- Must never own:
  - Product definitions
  - Funnel stages
  - User state definitions
  - Event definitions

### Product

- Owns:
  - Product purpose, value, included services, dependencies, and business ownership
- Must never own:
  - User lifecycle states
  - Business event meaning
  - AI agent responsibilities

### Subscription

- Owns:
  - Commercial continuity and entitlement rules
- Must never own:
  - Product identity
  - User identity
  - Lifecycle meaning

### Included Service

- Owns:
  - Service value delivered inside a product
- Must never own:
  - Standalone product identity unless explicitly elevated in the product canon

### Funnel Stage

- Owns:
  - Progression meaning and next-step logic
- Must never own:
  - User lifecycle states
  - Product definitions
  - Event definitions

### User

- Owns:
  - The business subject whose relationships are interpreted
- Must never own:
  - Lifecycle meaning
  - Product definitions
  - Business rule definitions

### User Lifecycle State

- Owns:
  - The meaning of the current user-business relationship
- Must never own:
  - Funnel progression
  - Product catalog
  - Event history

### Business Event

- Owns:
  - Immutable fact meaning
- Must never own:
  - Lifecycle state definitions
  - Product definitions
  - Agent responsibilities

### AI Agent

- Owns:
  - One bounded AI business responsibility
- Must never own:
  - Business rules
  - Workflow orchestration
  - Product canon
  - Lifecycle definitions

### AI Workflow

- Owns:
  - Orchestration of agents around one business objective
- Must never own:
  - Agent responsibilities
  - Event definitions
  - Lifecycle meaning
  - Product definitions

### Recommendation

- Owns:
  - Suggested next-step business direction
- Must never own:
  - Product access
  - Lifecycle transitions by itself
  - Subscription state

### Access Policy

- Owns:
  - Interpretation of access from lifecycle and subscription context
- Must never own:
  - Product identity
  - Lifecycle state definitions
  - Subscription definitions

### Business Rule

- Owns:
  - Global invariants and constraints
- Must never own:
  - Product details
  - Workflow logic
  - Agent responsibilities
  - Event history

## Aggregate Candidates

### User aggregate

- Natural aggregate root:
  - User
- Why:
  - User is the central business subject connected to lifecycle, subscriptions, events, recommendations, and product access.
  - Many important business decisions are evaluated in relation to one user context.

### Product aggregate

- Natural aggregate root:
  - Product
- Why:
  - Product owns included services, product dependencies, and subscription relationships at the catalog level.
  - Product boundaries determine whether something is a product, module, feature, or included service.

### Subscription aggregate

- Natural aggregate root:
  - Subscription
- Why:
  - Subscription is the natural commercial continuity boundary for renewal, expiry, upgrade, downgrade, and paid access entitlement.

### Business Event aggregate

- Natural aggregate root:
  - Business Event
- Why:
  - Events are immutable fact units and should remain semantically independent.
  - They are interpreted by other entities, but their meaning must remain stable.

### AI Workflow aggregate

- Natural aggregate root:
  - AI Workflow
- Why:
  - Workflow is the natural orchestration boundary for multiple participating AI Agents around one business objective.

## Domain Invariants

1. One User has exactly one current User Lifecycle State at a time.

2. A Business Event is immutable once it has occurred.

3. A Product has exactly one canonical identity in the ecosystem.

4. An Included Service does not become a Product unless the product canon explicitly elevates it.

5. Paid recurring access must derive from valid Subscription context.

6. Access must derive from User Lifecycle State and Subscription context rather than from ad hoc interpretation.

7. A Recommendation may guide a next step but must not change business state directly.

8. AI Agents may apply Business Rules but must not own them.

9. AI Workflows may orchestrate AI Agents but must not replace their responsibilities.

10. Funnel Stages must never replace User Lifecycle States.

11. Business Rules govern all entities and relationships without redefining their owned concepts.

12. Every entity must preserve its canonical owner boundary and must not absorb adjacent ownership.

## Cross References

- Company foundation:
  - `docs/foundation/01-company.md`
- Product ecosystem and subscriptions:
  - `docs/foundation/02-products.md`
- Business progression:
  - `docs/foundation/03-funnel.md`
- User state and access:
  - `docs/foundation/04-user-lifecycle.md`
- Business facts:
  - `docs/foundation/05-business-events.md`
- AI capabilities:
  - `docs/foundation/06-ai-agents.md`
- AI orchestration:
  - `docs/foundation/07-ai-workflows.md`
- Canonical terminology:
  - `docs/foundation/08-glossary.md`
- Global invariants:
  - `docs/foundation/09-business-rules.md`
- Architectural navigation:
  - `docs/foundation/10-system-map.md`
- Foundation consistency review:
  - `docs/foundation/11-foundation-review.md`

## Governance

### Ownership

The Domain Model is owned by enterprise architecture leadership.

Its purpose is to preserve one implementation-independent model of the business domain.

### Evolution

The Domain Model may evolve only when the Foundation changes or when a missing entity boundary becomes explicitly necessary.

It must never evolve independently from the Foundation’s canonical business truth.

### Adding Entities

A new entity may be added only when:

- it represents a distinct business concept;
- that concept cannot be fully represented by an existing entity;
- it has one clear owner;
- its relationships can be stated explicitly without duplicating an existing entity.

### Deprecating Entities

An entity may be deprecated only when:

- the underlying business concept no longer exists; or
- the concept has been absorbed into another canonical entity without ambiguity.

Deprecated entities must remain historically understandable until all dependent documentation has been updated.
