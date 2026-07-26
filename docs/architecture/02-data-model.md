# Document

Business Data Model

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
- `docs/foundation/01-company.md`
- `docs/foundation/02-products.md`
- `docs/foundation/04-user-lifecycle.md`
- `docs/foundation/05-business-events.md`
- `docs/foundation/09-business-rules.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/architecture/01-domain-model.md`
- `docs/engineering/06-data-persistence-blueprint.md`
- `docs/technical/03-api-architecture.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The Business Data Model exists to define the canonical business data objects used across the Starway / ABSystem ecosystem.

It answers one question:

What business data exists, who owns it, and how is it allowed to change?

This document depends on:

- the Foundation for business meaning and canonical ownership;
- the Domain Model for entity boundaries and relationships.

The Foundation defines business truth.

The Domain Model defines the implementation-independent domain entities.

This Data Model defines the business objects and business attributes that future implementation must preserve without inventing alternative structures.

It does not define storage, schemas, APIs, object serialization, transport formats, or technical models.

## Modeling Principles

1. Business-first.
   Every business object must exist because the business needs its meaning, not because implementation prefers its shape.

2. Implementation-independent.
   Business data must remain valid regardless of platform, database, application, interface, or tooling.

3. One object = one owner.
   Every business object must have one canonical business owner.

4. No duplicated data ownership.
   The same business fact must not be owned by multiple business objects.

5. Immutable identifiers.
   If an object requires identity, its canonical identity must remain stable for the life of the object.

6. Explicit relationships.
   Object relationships must be named and described directly.

7. Canonical naming.
   Business object and attribute names must align with the glossary, domain model, and business rules.

8. Event-governed change.
   Mutable business attributes must change because valid business events occurred.

9. Rule-governed state.
   State changes must remain constrained by Business Rules rather than local interpretation.

## Business Objects

### Company Record

- Canonical object name:
  - Company Record
- Purpose:
  - Represent the governing business identity of the ecosystem.
- Business owner:
  - Business architecture leadership
- Business description:
  - Holds the canonical business identity, principles, and structural truth of Starway.
- Lifecycle:
  - Persistent

### Product Record

- Canonical object name:
  - Product Record
- Purpose:
  - Represent one canonical product in the ecosystem.
- Business owner:
  - Product architecture leadership
- Business description:
  - Holds the business identity, purpose, lifecycle, ownership, and value definition of a product.
- Lifecycle:
  - Draft
  - Beta
  - Active
  - Deprecated
  - Archived

### Subscription Record

- Canonical object name:
  - Subscription Record
- Purpose:
  - Represent one recurring commercial relationship for eligible paid access.
- Business owner:
  - Product and monetization leadership
- Business description:
  - Holds the continuity relationship between a user and a paid product or subscription scope.
- Lifecycle:
  - Intended
  - Active
  - Expiring
  - Expired
  - Renewed
  - Upgraded
  - Downgraded

### Included Service Record

- Canonical object name:
  - Included Service Record
- Purpose:
  - Represent a service element included inside a product.
- Business owner:
  - The owning Product
- Business description:
  - Holds the business meaning of value delivered inside a product without turning that value into a separate standalone product by default.
- Lifecycle:
  - Inherited from Product Record

### Funnel Stage Record

- Canonical object name:
  - Funnel Stage Record
- Purpose:
  - Represent one canonical business progression stage.
- Business owner:
  - Business architecture and growth leadership
- Business description:
  - Holds the stage meaning, entry logic, success criteria, and next-step intent for the funnel.
- Lifecycle:
  - Active
  - Deprecated

### User Record

- Canonical object name:
  - User Record
- Purpose:
  - Represent the business subject moving through the ecosystem.
- Business owner:
  - Business architecture leadership
- Business description:
  - Holds the canonical relationship subject to products, lifecycle, subscriptions, events, and recommendations.
- Lifecycle:
  - Persistent while the business relationship remains historically relevant

### User Lifecycle Record

- Canonical object name:
  - User Lifecycle Record
- Purpose:
  - Represent the user’s current business relationship state.
- Business owner:
  - Business architecture leadership
- Business description:
  - Holds the current lifecycle state and its governing business meaning for one user.
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

### Business Event Record

- Canonical object name:
  - Business Event Record
- Purpose:
  - Represent one immutable business fact.
- Business owner:
  - Business architecture and analytics leadership
- Business description:
  - Holds the occurrence of a fact that may influence lifecycle interpretation, recommendations, workflows, analytics, and customer treatment.
- Lifecycle:
  - Immutable after creation

### Recommendation Record

- Canonical object name:
  - Recommendation Record
- Purpose:
  - Represent one business recommendation about the next logical step.
- Business owner:
  - Business architecture and recommendation guidance leadership
- Business description:
  - Holds the recommended next action for a user without directly changing business state.
- Lifecycle:
  - Generated
  - Delivered
  - Accepted
  - Declined
  - Expired

### Access Policy Record

- Canonical object name:
  - Access Policy Record
- Purpose:
  - Represent the business interpretation of what a user may access under a given lifecycle and subscription context.
- Business owner:
  - Business architecture leadership
- Business description:
  - Holds the canonical business rules for availability, unavailability, and permission interpretation.
- Lifecycle:
  - Active while relevant to current product and lifecycle structure

### AI Agent Record

- Canonical object name:
  - AI Agent Record
- Purpose:
  - Represent one canonical AI business capability.
- Business owner:
  - AI systems architecture leadership
- Business description:
  - Holds the identity, responsibility, boundaries, and valid read/write business scope of an AI Agent.
- Lifecycle:
  - Proposed
  - Active
  - Deprecated
  - Archived

### AI Workflow Record

- Canonical object name:
  - AI Workflow Record
- Purpose:
  - Represent one canonical orchestration of AI Agents.
- Business owner:
  - AI systems architecture leadership
- Business description:
  - Holds the orchestration definition for a workflow serving one business objective.
- Lifecycle:
  - Proposed
  - Active
  - Deprecated
  - Archived

### Business Rule Record

- Canonical object name:
  - Business Rule Record
- Purpose:
  - Represent one global business invariant or constraint.
- Business owner:
  - Business architecture leadership
- Business description:
  - Holds the rule statement, rationale, and governing relationship to other business objects.
- Lifecycle:
  - Proposed
  - Active
  - Deprecated
  - Archived

## Business Attributes

### Company Record

- `company name`
  - Meaning: The canonical business name of the company.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/01-company.md`

- `mission`
  - Meaning: The canonical reason the company exists.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/01-company.md`

- `vision`
  - Meaning: The long-term business direction of the company.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/01-company.md`

- `core principles`
  - Meaning: The non-negotiable operating principles of the company.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/01-company.md`

### Product Record

- `product name`
  - Meaning: The canonical business name of the product.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

- `product purpose`
  - Meaning: The core business purpose of the product.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

- `target customer`
  - Meaning: The primary business audience for the product.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

- `business value`
  - Meaning: The business outcome the product provides.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

- `entry conditions`
  - Meaning: The business conditions under which the product becomes a valid next step.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

- `exit conditions`
  - Meaning: The business conditions under which product engagement ends or transitions.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

- `product lifecycle state`
  - Meaning: The current business maturity state of the product.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

- `business owner`
  - Meaning: The accountable business owner of the product.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

### Subscription Record

- `subscription scope`
  - Meaning: The product or entitlement scope governed by the subscription.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/02-products.md`

- `subscriber`
  - Meaning: The user to whom the subscription applies.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: Domain relationship anchored in `docs/architecture/01-domain-model.md`

- `subscription state`
  - Meaning: The current business continuity state of the subscription.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

- `start condition`
  - Meaning: The business condition that began the subscription.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/05-business-events.md`

- `renewal rule`
  - Meaning: The business rule for continuing the subscription.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

- `expiration rule`
  - Meaning: The business rule for ending the subscription when not renewed.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

### Included Service Record

- `service name`
  - Meaning: The canonical name of the included service.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

- `owning product`
  - Meaning: The product that includes the service.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/02-products.md`

- `service purpose`
  - Meaning: The value the service delivers inside the product.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/02-products.md`

### Funnel Stage Record

- `stage name`
  - Meaning: The canonical name of the funnel stage.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/03-funnel.md`

- `stage purpose`
  - Meaning: The role of the stage in customer progression.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/03-funnel.md`

- `business objective`
  - Meaning: The business outcome expected at the stage.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/03-funnel.md`

- `customer objective`
  - Meaning: The customer-side progress expected at the stage.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/03-funnel.md`

- `primary cta`
  - Meaning: The primary next action intended for movement out of the stage.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/03-funnel.md`

### User Record

- `user identifier`
  - Meaning: The stable canonical identity of the user in business context.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: The User Record itself under `docs/architecture/01-domain-model.md`

- `current lifecycle state reference`
  - Meaning: The current lifecycle state assigned to the user.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/04-user-lifecycle.md`

- `active product relationships`
  - Meaning: The set of products the user is currently engaged with.
  - Required / optional: Optional
  - Immutable / mutable: Mutable
  - Source of truth: Derived from product, subscription, and lifecycle canon

- `active subscription relationships`
  - Meaning: The set of currently relevant subscriptions for the user.
  - Required / optional: Optional
  - Immutable / mutable: Mutable
  - Source of truth: Subscription Record

### User Lifecycle Record

- `lifecycle state`
  - Meaning: The canonical current business state of the user.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: `docs/foundation/04-user-lifecycle.md`

- `allowed previous states`
  - Meaning: The valid states from which the current state may be entered.
  - Required / optional: Required
  - Immutable / mutable: Immutable within a lifecycle definition version
  - Source of truth: `docs/foundation/04-user-lifecycle.md`

- `allowed next states`
  - Meaning: The valid states to which the current state may transition.
  - Required / optional: Required
  - Immutable / mutable: Immutable within a lifecycle definition version
  - Source of truth: `docs/foundation/04-user-lifecycle.md`

- `state meaning`
  - Meaning: The business interpretation of the current state.
  - Required / optional: Required
  - Immutable / mutable: Mutable only through canonical lifecycle revision
  - Source of truth: `docs/foundation/04-user-lifecycle.md`

### Business Event Record

- `event name`
  - Meaning: The canonical name of the business event.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/05-business-events.md`

- `event purpose`
  - Meaning: The reason the event exists in business interpretation.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/05-business-events.md`

- `related user`
  - Meaning: The user to whom the event applies when relevant.
  - Required / optional: Optional
  - Immutable / mutable: Immutable
  - Source of truth: Business Event Record itself

- `related product`
  - Meaning: The product context in which the event occurred when relevant.
  - Required / optional: Optional
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/05-business-events.md`

- `resulting business outcome`
  - Meaning: The business consequence that the event makes possible or valid.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/05-business-events.md`

### Recommendation Record

- `recommendation type`
  - Meaning: The canonical kind of recommendation being made.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: Recommendation canon derived from `docs/foundation/03-funnel.md` and `docs/foundation/06-ai-agents.md`

- `recommended next step`
  - Meaning: The product, action, or business direction being recommended.
  - Required / optional: Required
  - Immutable / mutable: Mutable until accepted, declined, or expired
  - Source of truth: Recommendation Record

- `recommendation state`
  - Meaning: The current business status of the recommendation.
  - Required / optional: Required
  - Immutable / mutable: Mutable
  - Source of truth: Recommendation Record governed by `docs/foundation/09-business-rules.md`

- `rationale`
  - Meaning: The business explanation for why this recommendation is valid.
  - Required / optional: Optional
  - Immutable / mutable: Mutable until delivery
  - Source of truth: Recommendation generation logic as constrained by foundation documents

### Access Policy Record

- `applicable lifecycle state`
  - Meaning: The lifecycle state for which the access interpretation is valid.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/04-user-lifecycle.md`

- `applicable subscription context`
  - Meaning: The subscription condition relevant to the access interpretation.
  - Required / optional: Optional
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/02-products.md`

- `available products`
  - Meaning: The products available under this policy context.
  - Required / optional: Required
  - Immutable / mutable: Mutable when canonical access policy changes
  - Source of truth: `docs/foundation/04-user-lifecycle.md`

- `unavailable services`
  - Meaning: The services not available under this policy context.
  - Required / optional: Optional
  - Immutable / mutable: Mutable when canonical access policy changes
  - Source of truth: `docs/foundation/04-user-lifecycle.md`

### AI Agent Record

- `agent name`
  - Meaning: The canonical name of the AI Agent.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/06-ai-agents.md`

- `business responsibility`
  - Meaning: The one bounded business responsibility of the agent.
  - Required / optional: Required
  - Immutable / mutable: Mutable only through canonical agent revision
  - Source of truth: `docs/foundation/06-ai-agents.md`

- `observed business events`
  - Meaning: The event categories or event facts the agent may read.
  - Required / optional: Required
  - Immutable / mutable: Mutable only through canonical agent revision
  - Source of truth: `docs/foundation/06-ai-agents.md`

- `observed lifecycle states`
  - Meaning: The lifecycle states relevant to the agent.
  - Required / optional: Required
  - Immutable / mutable: Mutable only through canonical agent revision
  - Source of truth: `docs/foundation/06-ai-agents.md`

- `produced outcomes`
  - Meaning: The business outcomes the agent may produce.
  - Required / optional: Required
  - Immutable / mutable: Mutable only through canonical agent revision
  - Source of truth: `docs/foundation/06-ai-agents.md`

### AI Workflow Record

- `workflow name`
  - Meaning: The canonical name of the workflow.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/07-ai-workflows.md`

- `business objective`
  - Meaning: The primary business objective of the workflow.
  - Required / optional: Required
  - Immutable / mutable: Mutable only through canonical workflow revision
  - Source of truth: `docs/foundation/07-ai-workflows.md`

- `triggering business events`
  - Meaning: The events that may start the workflow.
  - Required / optional: Required
  - Immutable / mutable: Mutable only through canonical workflow revision
  - Source of truth: `docs/foundation/07-ai-workflows.md`

- `required lifecycle states`
  - Meaning: The lifecycle states that must be true for the workflow to be valid.
  - Required / optional: Required
  - Immutable / mutable: Mutable only through canonical workflow revision
  - Source of truth: `docs/foundation/07-ai-workflows.md`

- `participating agents`
  - Meaning: The AI Agents orchestrated by the workflow.
  - Required / optional: Required
  - Immutable / mutable: Mutable only through canonical workflow revision
  - Source of truth: `docs/foundation/07-ai-workflows.md`

### Business Rule Record

- `rule identifier`
  - Meaning: The canonical stable identifier of the business rule.
  - Required / optional: Required
  - Immutable / mutable: Immutable
  - Source of truth: `docs/foundation/09-business-rules.md`

- `rule statement`
  - Meaning: The invariant or constraint that must remain true.
  - Required / optional: Required
  - Immutable / mutable: Mutable only through canonical rule revision
  - Source of truth: `docs/foundation/09-business-rules.md`

- `rationale`
  - Meaning: The business reason the rule exists.
  - Required / optional: Required
  - Immutable / mutable: Mutable only through canonical rule revision
  - Source of truth: `docs/foundation/09-business-rules.md`

- `affected business objects`
  - Meaning: The objects governed by the rule.
  - Required / optional: Required
  - Immutable / mutable: Mutable only through canonical rule revision
  - Source of truth: `docs/foundation/09-business-rules.md`

## Object Relationships

### Company Record → Product Record

- Ownership:
  - Company Record governs the existence of Product Records.
- Reference:
  - Product Records reference company principles.
- Dependency:
  - Product meaning depends on company mission and structure.
- Cardinality:
  - One Company Record to many Product Records

### Product Record → Included Service Record

- Ownership:
  - Product Record owns Included Service Records.
- Reference:
  - Included Service Records reference the owning Product Record.
- Dependency:
  - Included Service Records depend on Product existence.
- Cardinality:
  - One Product Record to many Included Service Records

### Product Record ↔ Subscription Record

- Ownership:
  - Subscription Record owns continuity of entitlement; Product Record owns product identity.
- Reference:
  - Subscription Records reference Product Records as entitlement scope.
- Dependency:
  - Paid access depends on both objects together.
- Cardinality:
  - One Product Record to many Subscription Records over time

### User Record → User Lifecycle Record

- Ownership:
  - User Lifecycle Record owns current relationship state meaning for one User Record.
- Reference:
  - User Record references exactly one current Lifecycle Record at a time.
- Dependency:
  - User treatment depends on current lifecycle state.
- Cardinality:
  - One User Record to one current User Lifecycle Record at a time

### User Record ↔ Product Record

- Ownership:
  - Neither object owns the other.
- Reference:
  - User Record may reference active product relationships.
- Dependency:
  - Product access depends on user context, lifecycle, and subscription.
- Cardinality:
  - Many-to-many over time

### User Record ↔ Subscription Record

- Ownership:
  - Subscription Record owns continuity relationship; User Record owns subject identity.
- Reference:
  - Subscription Record references the User Record as subscriber.
- Dependency:
  - Ongoing paid access depends on this relationship.
- Cardinality:
  - One User Record to many Subscription Records over time

### User Record → Business Event Record

- Ownership:
  - Business Event Record owns fact meaning, not user identity.
- Reference:
  - Event Records may reference the related User Record.
- Dependency:
  - Lifecycle, recommendations, workflows, and analytics depend on Event history.
- Cardinality:
  - One User Record to many Business Event Records

### Product Record → Business Event Record

- Ownership:
  - Business Event Record owns event meaning.
- Reference:
  - Event Records may reference the related Product Record.
- Dependency:
  - Product-related business interpretation depends on linked event context.
- Cardinality:
  - One Product Record to many Business Event Records

### Business Event Record → Recommendation Record

- Ownership:
  - Recommendation Record owns recommendation state; Event Record owns the underlying fact.
- Reference:
  - Recommendation Record references relevant Event context.
- Dependency:
  - Recommendation validity depends on factual inputs.
- Cardinality:
  - One or more Event Records may support one Recommendation Record

### User Lifecycle Record ↔ Access Policy Record

- Ownership:
  - Access Policy Record owns the access interpretation; Lifecycle Record owns the state meaning.
- Reference:
  - Access Policy Record references lifecycle context.
- Dependency:
  - Access interpretation depends on lifecycle meaning.
- Cardinality:
  - One Lifecycle State meaning to many Access Policy interpretations

### Subscription Record ↔ Access Policy Record

- Ownership:
  - Access Policy Record owns interpretation; Subscription Record owns entitlement continuity.
- Reference:
  - Access Policy Record references subscription context where relevant.
- Dependency:
  - Paid access interpretation depends on valid subscription context.
- Cardinality:
  - One Subscription context to many Access Policy interpretations

### AI Agent Record ↔ Business Event Record

- Ownership:
  - Event Records own facts; Agent Records own responsibilities.
- Reference:
  - Agent Records reference the event sets they may observe.
- Dependency:
  - Agent decisions depend on business event inputs.
- Cardinality:
  - Many-to-many

### AI Agent Record ↔ User Lifecycle Record

- Ownership:
  - Lifecycle Records own state meaning; Agent Records own responsibility.
- Reference:
  - Agent Records reference the lifecycle states they may observe.
- Dependency:
  - Agent outputs depend on lifecycle context.
- Cardinality:
  - Many-to-many

### AI Workflow Record ↔ AI Agent Record

- Ownership:
  - Workflow Record owns orchestration; Agent Record owns responsibility.
- Reference:
  - Workflow Record references participating Agent Records.
- Dependency:
  - Workflow validity depends on canonical agent definitions.
- Cardinality:
  - One Workflow Record to many Agent Records

### Business Rule Record → All Mutable Business Objects

- Ownership:
  - Business Rule Record owns invariants and constraints.
- Reference:
  - Mutable business objects reference governing Business Rule Records conceptually.
- Dependency:
  - Valid changes depend on rule compliance.
- Cardinality:
  - One Business Rule Record may govern many Business Objects and attributes

## State Ownership

### `product lifecycle state`

- Who may change it:
  - Product architecture leadership
- Which Business Event changes it:
  - Product readiness decision or product deprecation decision as governed business events
- Which Business Rule governs it:
  - `BR-009 — One Product Has One Canonical Identity`

### `subscription state`

- Who may change it:
  - Product and monetization leadership
- Which Business Event changes it:
  - Payment Received
  - Payment Failed
  - Subscription Activated
  - Subscription Renewed
  - Subscription Upgraded
  - Subscription Downgraded
  - Subscription Expired
- Which Business Rule governs it:
  - `BR-007 — Subscriptions Determine Paid Access`
  - `BR-018 — Business State Changes Require Business Facts`

### `current lifecycle state reference`

- Who may change it:
  - Business architecture-governed lifecycle interpretation
- Which Business Event changes it:
  - Telegram Joined
  - Entry Test Started
  - Entry Test Completed
  - Recommendation Generated
  - Subscription Activated
  - Subscription Renewed
  - Subscription Expired
  - Payment Failed
  - Referral Converted where relevant
- Which Business Rule governs it:
  - `BR-001 — One Active Lifecycle State Per User`
  - `BR-003 — Funnel Stages Never Replace Lifecycle States`
  - `BR-018 — Business State Changes Require Business Facts`

### `recommendation state`

- Who may change it:
  - Recommendation guidance ownership under business architecture
- Which Business Event changes it:
  - Recommendation Generated
  - Entry Test Completed
  - Payment Received where recommendation is fulfilled
  - Subscription Activated where recommendation is fulfilled
- Which Business Rule governs it:
  - `BR-006 — Recommendations Never Modify Business State Directly`
  - `BR-018 — Business State Changes Require Business Facts`

### `available products`

- Who may change it:
  - Business architecture leadership
- Which Business Event changes it:
  - Subscription Activated
  - Subscription Renewed
  - Subscription Upgraded
  - Subscription Downgraded
  - Subscription Expired
  - Payment Failed
- Which Business Rule governs it:
  - `BR-008 — Permissions Derive From Lifecycle And Subscription`
  - `BR-018 — Business State Changes Require Business Facts`

### `unavailable services`

- Who may change it:
  - Business architecture leadership
- Which Business Event changes it:
  - Same governing entitlement and lifecycle events that affect access availability
- Which Business Rule governs it:
  - `BR-008 — Permissions Derive From Lifecycle And Subscription`

### `mission`

- Who may change it:
  - Company leadership
- Which Business Event changes it:
  - Foundational company direction decision
- Which Business Rule governs it:
  - `BR-017 — One Editable Source Of Truth Per Concept`

### `vision`

- Who may change it:
  - Company leadership
- Which Business Event changes it:
  - Foundational company direction decision
- Which Business Rule governs it:
  - `BR-017 — One Editable Source Of Truth Per Concept`

## Data Ownership Matrix

| Business Object | Business Owner | Source of Truth | Created By | Updated By | Referenced By |
| --- | --- | --- | --- | --- | --- |
| Company Record | Business architecture leadership | `docs/foundation/01-company.md` | Company leadership | Company leadership | Product, Funnel, Business Rule, System Map |
| Product Record | Product architecture leadership | `docs/foundation/02-products.md` | Product architecture leadership | Product architecture leadership | Subscription, Included Service, Funnel Stage, Recommendation, Business Event, Access Policy |
| Subscription Record | Product and monetization leadership | `docs/foundation/02-products.md` and `docs/foundation/04-user-lifecycle.md` | Monetization activation decision | Monetization leadership through valid subscription events | User, Access Policy, AI Agents, AI Workflows |
| Included Service Record | Owning Product | `docs/foundation/02-products.md` | Product architecture leadership | Product architecture leadership | Product, Access interpretation |
| Funnel Stage Record | Business architecture and growth leadership | `docs/foundation/03-funnel.md` | Business architecture and growth leadership | Business architecture and growth leadership | Recommendation, AI Agent, AI Workflow |
| User Record | Business architecture leadership | `docs/architecture/01-domain-model.md` plus lifecycle and event canon | Direct relationship entry into ecosystem | Business architecture-governed state interpretation | Subscription, Product, Business Event, Recommendation, AI Agent, AI Workflow |
| User Lifecycle Record | Business architecture leadership | `docs/foundation/04-user-lifecycle.md` | Valid lifecycle entry through business progression | Lifecycle interpretation governed by valid events | User, Access Policy, AI Agent, AI Workflow |
| Business Event Record | Business architecture and analytics leadership | `docs/foundation/05-business-events.md` | Business occurrence itself | Immutable after creation | User Lifecycle, Recommendation, AI Agent, AI Workflow, Analytics interpretation |
| Recommendation Record | Business architecture and recommendation guidance leadership | `docs/foundation/03-funnel.md`, `docs/foundation/06-ai-agents.md` | Recommendation generation process | Recommendation guidance ownership | User, Product, AI Agent, AI Workflow |
| Access Policy Record | Business architecture leadership | `docs/foundation/04-user-lifecycle.md` and `docs/foundation/09-business-rules.md` | Access policy definition | Business architecture leadership | User, Product, Subscription, AI Agent |
| AI Agent Record | AI systems architecture leadership | `docs/foundation/06-ai-agents.md` | AI systems architecture leadership | AI systems architecture leadership | AI Workflow, Governance |
| AI Workflow Record | AI systems architecture leadership | `docs/foundation/07-ai-workflows.md` | AI systems architecture leadership | AI systems architecture leadership | Governance, implementation planning |
| Business Rule Record | Business architecture leadership | `docs/foundation/09-business-rules.md` | Business architecture leadership | Business architecture leadership | All mutable business objects and governance layers |

## AI Read / Write Matrix

### Funnel Agent

- Objects it may read:
  - User Record
  - User Lifecycle Record
  - Funnel Stage Record
  - Recommendation Record
  - Business Event Record
  - Product Record
- Objects it may create:
  - Recommendation Record
- Objects it may update:
  - Recommendation Record
- Objects it must never modify:
  - User Lifecycle Record
  - Subscription Record
  - Product Record
  - Business Rule Record

### Recommendation Agent

- Objects it may read:
  - User Record
  - User Lifecycle Record
  - Business Event Record
  - Product Record
  - Funnel Stage Record
- Objects it may create:
  - Recommendation Record
- Objects it may update:
  - Recommendation Record
- Objects it must never modify:
  - Subscription Record
  - User Lifecycle Record
  - Product Record
  - Business Rule Record

### Onboarding Agent

- Objects it may read:
  - User Record
  - User Lifecycle Record
  - Funnel Stage Record
  - Business Event Record
  - Access Policy Record
- Objects it may create:
  - Recommendation Record
- Objects it may update:
  - Recommendation Record
- Objects it must never modify:
  - Subscription Record
  - Product Record
  - Business Rule Record

### Engagement Agent

- Objects it may read:
  - User Record
  - User Lifecycle Record
  - Business Event Record
  - Product Record
  - Recommendation Record
- Objects it may create:
  - Recommendation Record
- Objects it may update:
  - Recommendation Record
- Objects it must never modify:
  - Subscription Record
  - Access Policy Record
  - Business Rule Record

### Progress Agent

- Objects it may read:
  - User Record
  - User Lifecycle Record
  - Business Event Record
  - Product Record
- Objects it may create:
  - None as canonical business objects
- Objects it may update:
  - Recommendation Record
- Objects it must never modify:
  - Subscription Record
  - User Lifecycle Record
  - Product Record
  - Business Rule Record

### Reflection Agent

- Objects it may read:
  - User Record
  - User Lifecycle Record
  - Business Event Record
  - Recommendation Record
- Objects it may create:
  - Recommendation Record
- Objects it may update:
  - Recommendation Record
- Objects it must never modify:
  - Subscription Record
  - User Lifecycle Record
  - Product Record
  - Business Rule Record

### Coach Agent

- Objects it may read:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Subscription Record
  - Business Event Record
  - Recommendation Record
- Objects it may create:
  - Recommendation Record
- Objects it may update:
  - Recommendation Record
- Objects it must never modify:
  - User Lifecycle Record
  - Subscription Record
  - Business Rule Record

### Subscription Agent

- Objects it may read:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Product Record
  - Business Event Record
  - Access Policy Record
- Objects it may create:
  - None as independent business objects beyond valid subscription initiation context
- Objects it may update:
  - Subscription Record
- Objects it must never modify:
  - Product Record
  - Business Rule Record
  - User Lifecycle Record directly without valid lifecycle governance

### Retention Agent

- Objects it may read:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
  - Business Event Record
- Objects it may create:
  - Recommendation Record
- Objects it may update:
  - Recommendation Record
- Objects it must never modify:
  - Subscription Record directly unless within Subscription Agent authority
  - User Lifecycle Record
  - Business Rule Record

### Payment Agent

- Objects it may read:
  - User Record
  - Subscription Record
  - Product Record
  - Business Event Record
- Objects it may create:
  - Business Event Record
- Objects it may update:
  - Subscription Record
- Objects it must never modify:
  - User Lifecycle Record directly
  - Product Record
  - Business Rule Record

### Notification Agent

- Objects it may read:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
  - Business Event Record
  - Access Policy Record
- Objects it may create:
  - None as canonical business objects
- Objects it may update:
  - Recommendation Record where notification delivery changes recommendation state
- Objects it must never modify:
  - Subscription Record
  - Product Record
  - Business Rule Record

### Analytics Agent

- Objects it may read:
  - All Business Event Records
  - User Record
  - User Lifecycle Record
  - Product Record
  - Subscription Record
  - Recommendation Record
- Objects it may create:
  - None as canonical business objects
- Objects it may update:
  - None
- Objects it must never modify:
  - All canonical source-of-truth business objects

### Referral Agent

- Objects it may read:
  - User Record
  - User Lifecycle Record
  - Business Event Record
  - Recommendation Record
- Objects it may create:
  - Recommendation Record
  - Business Event Record when referral facts are recognized
- Objects it may update:
  - Recommendation Record
- Objects it must never modify:
  - Subscription Record
  - User Lifecycle Record
  - Product Record
  - Business Rule Record

## Cross References

- Domain entities and boundaries:
  - `docs/architecture/01-domain-model.md`
- Business event canon:
  - `docs/foundation/05-business-events.md`
- Global invariants:
  - `docs/foundation/09-business-rules.md`
- AI responsibility boundaries:
  - `docs/foundation/06-ai-agents.md`
- AI orchestration boundaries:
  - `docs/foundation/07-ai-workflows.md`
- Product canon:
  - `docs/foundation/02-products.md`
- Funnel canon:
  - `docs/foundation/03-funnel.md`
- Lifecycle canon:
  - `docs/foundation/04-user-lifecycle.md`
- Terminology canon:
  - `docs/foundation/08-glossary.md`

## Governance

### Adding business objects

A new Business Object may be added only when:

- it originates from an existing canonical business concept;
- it cannot be represented by an existing Business Object without collapsing ownership;
- it has one clear business owner;
- its relationships can be stated explicitly without duplicating another object’s ownership.

### Adding attributes

A new business attribute may be added only when:

- it expresses a real business fact or business state;
- its source of truth is singular;
- its mutability is explicit;
- its governing event and rule are known when mutable.

### Deprecating attributes

A business attribute may be deprecated only when:

- the underlying business meaning no longer exists; or
- the meaning has been absorbed into another canonical attribute without ambiguity.

Deprecated attributes must remain historically understandable until all dependent architecture and implementation are aligned.

### Ownership changes

An ownership change may occur only when:

- the Foundation changes canonical ownership; or
- the current ownership boundary is proven incorrect by architectural review.

No ownership change may be made locally in implementation without first changing the canonical business documentation.
