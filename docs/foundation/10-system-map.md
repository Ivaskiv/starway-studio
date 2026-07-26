# Document

System Map

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
- `docs/foundation/06-ai-agents.md`
- `docs/foundation/07-ai-workflows.md`
- `docs/foundation/08-glossary.md`
- `docs/foundation/09-business-rules.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/reference/platform-reference-architecture.md`
- `docs/foundation/11-foundation-review.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The System Map exists to make the full Starway / ABSystem business architecture navigable as one coherent system.

It is the master architectural index over the foundation documents.

It does not introduce new business definitions.

It does not replace or duplicate the ownership of earlier foundation documents.

Its role is to answer one question:

Where does each concept belong, and how do all canonical documents connect?

This document serves as the navigation layer over the canonical architecture.

It references the foundation documents instead of redefining them.

Future contributors should use this document after reading the foundation set in order to understand:

- the architectural layers;
- the ownership boundary of each document;
- the dependency flow between documents;
- where new concepts belong;
- how business architecture connects to implementation without being replaced by it.

## Architectural Layers

The canonical business architecture follows this dependency chain:

Company
↓
Products
↓
Funnel
↓
User Lifecycle
↓
Business Events
↓
AI Agents
↓
AI Workflows
↓
Business Rules
↓
Implementation

### Company

- Purpose:
  Define why Starway exists and the principles that govern the ecosystem.
- Responsibility:
  Provide the highest-level business identity and operating logic.
- Owned concepts:
  - Mission
  - Vision
  - Core Principles
  - Company Structure
  - Documentation Rules
  - AI Governance at company level
- Dependencies:
  - None at the business architecture level
- Referenced documents:
  - `docs/foundation/01-company.md`

### Products

- Purpose:
  Define what the business offers to customers.
- Responsibility:
  Own the product catalog, product hierarchy, subscriptions, included services, and business ownership of products.
- Owned concepts:
  - Product Ecosystem
  - Product Catalog
  - Subscription Model
  - Product Relationships
  - Product Lifecycle
- Dependencies:
  - Company
- Referenced documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/02-products.md`

### Funnel

- Purpose:
  Define how a person moves through the business ecosystem.
- Responsibility:
  Own canonical progression, stage transitions, entry and exit rules, and conversion goals.
- Owned concepts:
  - Funnel Stages
  - Funnel Transitions
  - Conversion Goals
  - Entry and Exit Rules
  - Cross-Product Movement
- Dependencies:
  - Company
  - Products
- Referenced documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`

### User Lifecycle

- Purpose:
  Define the user’s current business relationship with the ecosystem.
- Responsibility:
  Own canonical user states, deterministic transitions, access matrix, and subscription behaviour at the state level.
- Owned concepts:
  - Lifecycle States
  - Lifecycle Transitions
  - Access Matrix
  - Subscription Behaviour
- Dependencies:
  - Company
  - Products
  - Funnel
- Referenced documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`

### Business Events

- Purpose:
  Define the immutable business facts that occur across the ecosystem.
- Responsibility:
  Own canonical event definitions, categories, and relationships to products, lifecycle, and funnel.
- Owned concepts:
  - Business Event Definitions
  - Event Categories
  - Event Relationships
- Dependencies:
  - Products
  - Funnel
  - User Lifecycle
- Referenced documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`

### AI Agents

- Purpose:
  Define the bounded AI business capabilities that observe context and produce outcomes.
- Responsibility:
  Own agent responsibilities, inputs, outputs, boundaries, and collaboration principles.
- Owned concepts:
  - Canonical AI Agents
  - Agent Collaboration
  - Agent Inputs
  - Agent Outputs
- Dependencies:
  - Products
  - User Lifecycle
  - Business Events
- Referenced documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
  - `docs/foundation/06-ai-agents.md`

### AI Workflows

- Purpose:
  Define how multiple AI Agents collaborate toward one business objective.
- Responsibility:
  Own workflow orchestration boundaries, entry conditions, completion conditions, and workflow relationships.
- Owned concepts:
  - Canonical AI Workflows
  - Workflow Composition
  - Workflow Relationships
- Dependencies:
  - Funnel
  - User Lifecycle
  - Business Events
  - AI Agents
- Referenced documents:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
  - `docs/foundation/06-ai-agents.md`
  - `docs/foundation/07-ai-workflows.md`

### Business Rules

- Purpose:
  Define the global invariants and constraints that govern every lower architectural layer.
- Responsibility:
  Own the rules that must always remain true across the ecosystem.
- Owned concepts:
  - Canonical Business Rules
  - Global Constraints
  - Decision Matrix
  - Rule Relationships
- Dependencies:
  - Company
  - Products
  - Funnel
  - User Lifecycle
  - Business Events
  - AI Agents
  - AI Workflows
  - Glossary
- Referenced documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
  - `docs/foundation/06-ai-agents.md`
  - `docs/foundation/07-ai-workflows.md`
  - `docs/foundation/08-glossary.md`
  - `docs/foundation/09-business-rules.md`

### Implementation

- Purpose:
  Execute the business architecture through real systems, products, operations, and delivery channels.
- Responsibility:
  Realize canonical architecture without redefining it.
- Owned concepts:
  - None at the business architecture layer
- Dependencies:
  - Every foundation layer above
- Referenced documents:
  - All foundation documents, with this System Map as the navigation entry point

## Dependency Map

### `01-company.md`

- Owns:
  - Company identity
  - Mission
  - Vision
  - Core Principles
  - Company-wide documentation and AI governance principles
- References:
  - None as business prerequisites
- Depended on by:
  - `02-products.md`
  - `03-funnel.md`
  - `04-user-lifecycle.md`
  - `09-business-rules.md`
  - `10-system-map.md`

### `02-products.md`

- Owns:
  - Product ecosystem
  - Product catalog rules
  - Product hierarchy
  - Subscription model
  - Product ownership
- References:
  - `01-company.md`
- Depended on by:
  - `03-funnel.md`
  - `04-user-lifecycle.md`
  - `05-business-events.md`
  - `06-ai-agents.md`
  - `09-business-rules.md`
  - `10-system-map.md`

### `03-funnel.md`

- Owns:
  - Canonical customer progression
  - Funnel stages
  - Transitions
  - Conversion goals
  - Entry and exit rules
- References:
  - `01-company.md`
  - `02-products.md`
- Depended on by:
  - `04-user-lifecycle.md`
  - `05-business-events.md`
  - `07-ai-workflows.md`
  - `09-business-rules.md`
  - `10-system-map.md`

### `04-user-lifecycle.md`

- Owns:
  - User states
  - State transitions
  - Access matrix
  - Subscription behaviour at user-state level
- References:
  - `01-company.md`
  - `02-products.md`
  - `03-funnel.md`
- Depended on by:
  - `05-business-events.md`
  - `06-ai-agents.md`
  - `07-ai-workflows.md`
  - `09-business-rules.md`
  - `10-system-map.md`

### `05-business-events.md`

- Owns:
  - Canonical business events
  - Event categories
  - Event relationships
- References:
  - `02-products.md`
  - `03-funnel.md`
  - `04-user-lifecycle.md`
- Depended on by:
  - `06-ai-agents.md`
  - `07-ai-workflows.md`
  - `09-business-rules.md`
  - `10-system-map.md`

### `06-ai-agents.md`

- Owns:
  - AI Agent responsibilities
  - Agent inputs and outputs
  - Agent boundaries
  - Agent collaboration principles
- References:
  - `02-products.md`
  - `04-user-lifecycle.md`
  - `05-business-events.md`
- Depended on by:
  - `07-ai-workflows.md`
  - `09-business-rules.md`
  - `10-system-map.md`

### `07-ai-workflows.md`

- Owns:
  - AI Workflow objectives
  - Workflow composition
  - Participating agent orchestration
  - Completion and failure boundaries
- References:
  - `03-funnel.md`
  - `04-user-lifecycle.md`
  - `05-business-events.md`
  - `06-ai-agents.md`
- Depended on by:
  - `09-business-rules.md`
  - `10-system-map.md`

### `08-glossary.md`

- Owns:
  - Canonical terminology
  - Naming standards
  - Deprecated terminology rules
- References:
  - `01-company.md`
  - `02-products.md`
  - `03-funnel.md`
  - `04-user-lifecycle.md`
  - `05-business-events.md`
  - `06-ai-agents.md`
  - `07-ai-workflows.md`
- Depended on by:
  - `09-business-rules.md`
  - `10-system-map.md`

### `09-business-rules.md`

- Owns:
  - Global business invariants
  - Business constraints
  - Governing decision matrix
- References:
  - `01-company.md`
  - `02-products.md`
  - `03-funnel.md`
  - `04-user-lifecycle.md`
  - `05-business-events.md`
  - `06-ai-agents.md`
  - `07-ai-workflows.md`
  - `08-glossary.md`
- Depended on by:
  - `10-system-map.md`
  - All future implementation and lower-level operational documents

### `10-system-map.md`

- Owns:
  - Architectural navigation
  - Document dependency index
  - Extension rules for the foundation set
- References:
  - `01-company.md`
  - `02-products.md`
  - `03-funnel.md`
  - `04-user-lifecycle.md`
  - `05-business-events.md`
  - `06-ai-agents.md`
  - `07-ai-workflows.md`
  - `08-glossary.md`
  - `09-business-rules.md`
- Depended on by:
  - Future contributors
  - Documentation maintainers
  - Implementation teams

There is no circular ownership.

Each document owns exactly one architectural boundary.

References may be many-to-many, but ownership remains singular and acyclic.

## Business Flow Overview

The ecosystem operates conceptually in this order:

Company
↓
Products
↓
Customer enters Funnel
↓
User Lifecycle changes
↓
Business Events occur
↓
AI Agents react
↓
AI Workflows orchestrate
↓
Business Rules govern
↓
Implementation executes

### Flow Meaning

- Company defines why the ecosystem exists and how it should behave.
- Products define what value the business offers.
- The Funnel defines how a person moves through the ecosystem commercially and experientially.
- The User Lifecycle defines the current business relationship of that person.
- Business Events record the facts that occur along the journey.
- AI Agents observe the relevant context and perform bounded business responsibilities.
- AI Workflows coordinate multiple agents toward one business objective.
- Business Rules govern every layer by defining the invariants that must remain true.
- Implementation executes all of the above through real systems, interfaces, and processes.

This is a business architecture overview only.

Each lower layer depends on canonical truth from the layers above it.

No lower layer is allowed to redefine a higher one.

## Document Index

### `01-company.md`

- Purpose:
  Define the highest-level business identity, principles, structure, and documentation governance.
- Owner:
  Business architecture leadership
- Dependencies:
  - None
- Future readers:
  - Founders
  - Product leadership
  - Architecture owners
  - Documentation owners
  - AI governance owners

### `02-products.md`

- Purpose:
  Define the product ecosystem, subscription model, product hierarchy, and product ownership.
- Owner:
  Product architecture leadership
- Dependencies:
  - `01-company.md`
- Future readers:
  - Product managers
  - Growth owners
  - Monetization owners
  - Business architects
  - Documentation owners

### `03-funnel.md`

- Purpose:
  Define canonical customer progression through the business.
- Owner:
  Business architecture and growth leadership
- Dependencies:
  - `01-company.md`
  - `02-products.md`
- Future readers:
  - Growth teams
  - Product teams
  - Lifecycle strategists
  - Analytics owners
  - AI workflow designers

### `04-user-lifecycle.md`

- Purpose:
  Define the current business relationship state of a user and the access implications of that state.
- Owner:
  Business architecture leadership
- Dependencies:
  - `01-company.md`
  - `02-products.md`
  - `03-funnel.md`
- Future readers:
  - Product teams
  - Retention owners
  - Access policy owners
  - AI designers
  - Implementation teams

### `05-business-events.md`

- Purpose:
  Define the immutable business facts that describe what happened in the ecosystem.
- Owner:
  Business architecture and analytics leadership
- Dependencies:
  - `02-products.md`
  - `03-funnel.md`
  - `04-user-lifecycle.md`
- Future readers:
  - Analytics owners
  - Automation designers
  - AI designers
  - Lifecycle owners
  - Documentation maintainers

### `06-ai-agents.md`

- Purpose:
  Define the canonical AI business capabilities and their boundaries.
- Owner:
  AI systems architecture leadership
- Dependencies:
  - `02-products.md`
  - `04-user-lifecycle.md`
  - `05-business-events.md`
- Future readers:
  - AI architects
  - Product teams
  - Workflow designers
  - Governance owners

### `07-ai-workflows.md`

- Purpose:
  Define the canonical orchestration of AI Agents toward business outcomes.
- Owner:
  AI systems architecture leadership
- Dependencies:
  - `03-funnel.md`
  - `04-user-lifecycle.md`
  - `05-business-events.md`
  - `06-ai-agents.md`
- Future readers:
  - AI workflow designers
  - Automation owners
  - Product teams
  - Governance owners

### `08-glossary.md`

- Purpose:
  Define the canonical terminology used across the ecosystem.
- Owner:
  Business architecture and documentation governance
- Dependencies:
  - `01-company.md`
  - `02-products.md`
  - `03-funnel.md`
  - `04-user-lifecycle.md`
  - `05-business-events.md`
  - `06-ai-agents.md`
  - `07-ai-workflows.md`
- Future readers:
  - Everyone who writes, reviews, or implements documentation

### `09-business-rules.md`

- Purpose:
  Define the global invariants and constraints that govern all lower layers.
- Owner:
  Business architecture leadership
- Dependencies:
  - `01-company.md`
  - `02-products.md`
  - `03-funnel.md`
  - `04-user-lifecycle.md`
  - `05-business-events.md`
  - `06-ai-agents.md`
  - `07-ai-workflows.md`
  - `08-glossary.md`
- Future readers:
  - Architecture owners
  - Product owners
  - AI system owners
  - Documentation owners
  - Implementation teams

### `10-system-map.md`

- Purpose:
  Provide the master architectural navigation layer over the full foundation set.
- Owner:
  Enterprise architecture leadership
- Dependencies:
  - `01-company.md`
  - `02-products.md`
  - `03-funnel.md`
  - `04-user-lifecycle.md`
  - `05-business-events.md`
  - `06-ai-agents.md`
  - `07-ai-workflows.md`
  - `08-glossary.md`
  - `09-business-rules.md`
- Future readers:
  - New contributors
  - Documentation maintainers
  - Product leaders
  - AI architects
  - Implementation teams

## Future Architecture Rules

1. New concepts belong to exactly one canonical document.

2. No duplicate definitions may exist across the foundation set.

3. Ownership is singular even when references are shared.

4. Reference instead of copy.

5. Implementation never changes business architecture by implication.

6. Business-first evolution.

7. If a concept is global, it belongs in the foundation.

8. If a concept is local to one domain, it must not be elevated into the wrong canonical layer.

9. New foundation documents may be added only when a stable new ownership boundary appears that cannot be represented cleanly in the existing set.

10. The System Map must be updated whenever the foundation set changes, so that architectural navigation remains current.

## Governance

### Architectural Ownership

The System Map is owned by enterprise architecture leadership.

Its responsibility is navigation, dependency clarity, and boundary preservation across the whole foundation.

### Documentation Lifecycle

- Foundation documents are living canonical documents.
- They may evolve only through explicit architectural change.
- System navigation must be updated whenever ownership boundaries or dependencies change.

### Versioning

- The System Map must version together with the rest of the foundation.
- Historical major architectural maps should be archived rather than overwritten without trace.

### Review Process

- Any change to the foundation set requires review for:
  - ownership clarity;
  - dependency correctness;
  - non-duplication;
  - architectural consistency.
- The System Map should be reviewed whenever a new canonical concept, document, or ownership boundary is proposed.

### Adding New Foundation Documents

A new foundation document may be added only when:

- it owns a distinct architectural concept set;
- that concept set cannot be cleanly placed into an existing canonical document;
- it introduces no duplicate ownership;
- it improves clarity rather than fragmentation.

### Deprecating Documents

- A foundation document may be deprecated only when its ownership boundary has been fully absorbed into another canonical document or when the business concept no longer exists.
- Deprecation must preserve historical understanding and must not create gaps in the dependency map.
