# Document

Glossary

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

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/foundation/09-business-rules.md`
- `docs/reference/platform-reference-architecture.md`
- `docs/reference/ai-coding-constitution.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The glossary exists to make terminology deterministic across the entire Starway / ABSystem ecosystem.

Its role is to ensure that business architecture, AI systems, documentation, and future implementation all use the same language for the same concepts.

Without a canonical glossary, the same concept can drift into multiple names, and different names can mistakenly be treated as different concepts.

This glossary prevents that drift.

It must be used together with the existing foundation documents:

- `docs/foundation/01-company.md`
- `docs/foundation/02-products.md`
- `docs/foundation/03-funnel.md`
- `docs/foundation/04-user-lifecycle.md`
- `docs/foundation/05-business-events.md`
- `docs/foundation/06-ai-agents.md`
- `docs/foundation/07-ai-workflows.md`

This glossary does not replace those documents.

Those documents define the business architecture.

This glossary defines the canonical language used to talk about that architecture.

## Glossary Principles

1. One term = one meaning.
   A canonical term must always point to one stable concept.

2. One meaning = one canonical term.
   The same concept must not have competing names in active architecture.

3. No synonyms in architecture.
   Human-friendly variation may exist in marketing or copy, but business architecture must use the canonical term only.

4. Business-first terminology.
   Terms must describe business meaning before system behavior.

5. Implementation-independent language.
   A canonical term must remain valid even if tools, channels, or technical systems change.

6. Backward-compatible evolution.
   Terms may evolve, but old meanings must be deprecated deliberately rather than replaced silently.

7. Reference before reinvention.
   New documents must reference existing terms instead of redefining them locally.

8. Stability over style.
   Terminology should not change for aesthetic reasons; it should change only when business clarity improves materially.

## Core Business Terms

### Company

- Canonical name: Company
- Definition: The single business entity that owns the Starway ecosystem and all of its products, services, operations, and AI systems.
- Purpose: Provides the top-level identity and governing business context for every lower-level document.
- Related documents:
  - `docs/foundation/01-company.md`
- Forbidden synonyms:
  - Platform Business
  - Main System

### Product

- Canonical name: Product
- Definition: A distinct customer-facing or internal business offering with a defined role, ownership, and value.
- Purpose: Separates true offerings from channels, events, features, and workflows.
- Related documents:
  - `docs/foundation/02-products.md`
- Forbidden synonyms:
  - Module when the meaning is actually a product
  - Funnel Step when the meaning is actually a product

### Included Service

- Canonical name: Included Service
- Definition: A human-led, operational, or recurring value element that is included inside a product rather than existing as a separate standalone product.
- Purpose: Prevents business capabilities from being incorrectly promoted to product status.
- Related documents:
  - `docs/foundation/02-products.md`
- Forbidden synonyms:
  - Product Feature when the meaning is actually an included service
  - Mini Product

### Funnel

- Canonical name: Funnel
- Definition: The canonical business progression through which a person moves across the ecosystem.
- Purpose: Defines business movement from first attention to continuation and advocacy.
- Related documents:
  - `docs/foundation/03-funnel.md`
- Forbidden synonyms:
  - Journey Map when used as the active canonical progression model
  - Sales Pipeline when referring to the full Starway business funnel

### Funnel Stage

- Canonical name: Funnel Stage
- Definition: One business step inside the canonical funnel.
- Purpose: Makes progression deterministic and stage-based rather than ambiguous.
- Related documents:
  - `docs/foundation/03-funnel.md`
- Forbidden synonyms:
  - User State
  - Event Stage

### User Lifecycle

- Canonical name: User Lifecycle
- Definition: The canonical model of the user’s current business relationship to the ecosystem at any moment.
- Purpose: Gives one current business state to every user.
- Related documents:
  - `docs/foundation/04-user-lifecycle.md`
- Forbidden synonyms:
  - Funnel
  - Access Layer when used as the full lifecycle model

### Lifecycle State

- Canonical name: Lifecycle State
- Definition: One canonical current business state within the User Lifecycle.
- Purpose: Determines current relationship, access, and business treatment.
- Related documents:
  - `docs/foundation/04-user-lifecycle.md`
- Forbidden synonyms:
  - Funnel Stage
  - Event Status

### Business Event

- Canonical name: Business Event
- Definition: An immutable business fact that records what happened inside the ecosystem.
- Purpose: Creates a reusable language for facts used by analytics, AI, automations, notifications, and audit.
- Related documents:
  - `docs/foundation/05-business-events.md`
- Forbidden synonyms:
  - Technical Event
  - Workflow Step

### AI Agent

- Canonical name: AI Agent
- Definition: A bounded business capability that observes business context and produces a limited category of business outcome.
- Purpose: Separates reusable AI responsibilities from workflows and implementation.
- Related documents:
  - `docs/foundation/06-ai-agents.md`
- Forbidden synonyms:
  - Workflow
  - Bot Logic when referring to canonical business capability

### AI Workflow

- Canonical name: AI Workflow
- Definition: A canonical orchestration of multiple AI Agents around one business objective.
- Purpose: Defines how agents collaborate without merging their responsibilities.
- Related documents:
  - `docs/foundation/07-ai-workflows.md`
- Forbidden synonyms:
  - Agent
  - Automation Chain when referring to the canonical business workflow concept

### Subscription

- Canonical name: Subscription
- Definition: A recurring commercial access model for a product where continuity over time is part of the value.
- Purpose: Defines how recurring paid access is granted, renewed, changed, or expired.
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`
- Forbidden synonyms:
  - Membership Plan when referring to the full canonical commercial model

### Premium Service

- Canonical name: Premium Service
- Definition: A high-context human-led service layer that provides deeper personalized support than scalable products.
- Purpose: Distinguishes premium high-touch support from recurring scalable products.
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
- Forbidden synonyms:
  - Premium Product when referring specifically to the high-touch service layer

### Recommendation

- Canonical name: Recommendation
- Definition: The canonical next-step business guidance produced after valid diagnostic or contextual evaluation.
- Purpose: Connects user understanding to the correct next commercial or support path.
- Related documents:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/05-business-events.md`
  - `docs/foundation/06-ai-agents.md`
- Forbidden synonyms:
  - Offer Decision
  - Suggestion when used as the formal business routing concept

### Entry Test

- Canonical name: Entry Test
- Definition: The diagnostic entry product that gives a person language for their current state and creates the first meaningful conversion point.
- Purpose: Acts as the first structured step into the product ecosystem.
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
- Forbidden synonyms:
  - Quiz
  - Lead Magnet Test

### FOCUS Membership

- Canonical name: FOCUS Membership
- Definition: The first paid core product that turns insight into recurring action, rhythm, and supported live practice.
- Purpose: Activates the first paid customer relationship and creates momentum.
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
- Forbidden synonyms:
  - FOCUS Program
  - FOCUS Course

### ABSystem Platform

- Canonical name: ABSystem Platform
- Definition: The continuity and systemization product layer that helps the customer sustain movement between live touchpoints.
- Purpose: Extends recurring value and supports deeper ongoing progress.
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
- Forbidden synonyms:
  - ABSystem AI when referring to the canonical platform product
  - Platform Layer as a product name

### Renewal

- Canonical name: Renewal
- Definition: The continuation decision layer where an existing paid relationship is preserved, changed, or allowed to end.
- Purpose: Distinguishes continuity management from first-time conversion.
- Related documents:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Forbidden synonyms:
  - Retention Stage when referring specifically to the funnel stage
  - Repurchase when referring to the canonical continuation layer

### Advocate

- Canonical name: Advocate
- Definition: The post-value business relationship in which trust becomes recommendation, referral, or durable loyalty.
- Purpose: Defines the positive long-term relational outcome after value realization.
- Related documents:
  - `docs/foundation/03-funnel.md`
- Forbidden synonyms:
  - Ambassador
  - Evangelist

### Premium Services

- Canonical name: Premium Services
- Definition: The canonical business layer that contains high-context services such as Strategic Session and Personal Program.
- Purpose: Groups deeper human-led offerings without redefining them as one product.
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
- Forbidden synonyms:
  - High Ticket Layer
  - VIP Layer

### Strategic Session

- Canonical name: Strategic Session
- Definition: A concentrated human-led premium service for direction, qualification, or escalation at a high-context decision point.
- Purpose: Provides focused clarity and premium-path guidance.
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/05-business-events.md`
- Forbidden synonyms:
  - Strategy Call
  - Clarity Session

### Personal Program

- Canonical name: Personal Program
- Definition: The highest-context personalized premium service for customers who need direct tailored transformation support.
- Purpose: Defines the deepest human-led layer in the ecosystem.
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`
- Forbidden synonyms:
  - 1:1 Program
  - Coaching Package

### Subscription Expiring

- Canonical name: Subscription Expiring
- Definition: The lifecycle state in which an active paid relationship is approaching a continuation decision.
- Purpose: Distinguishes active continuity risk from already-ended access.
- Related documents:
  - `docs/foundation/04-user-lifecycle.md`
- Forbidden synonyms:
  - Expiry Warning State
  - Renewal Pending

### Subscription Expired

- Canonical name: Subscription Expired
- Definition: The lifecycle state in which a paid relationship has ended but remains recoverable.
- Purpose: Distinguishes ended paid access from generic inactivity.
- Related documents:
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Forbidden synonyms:
  - Churned
  - Lost Customer

### Inactive

- Canonical name: Inactive
- Definition: The lifecycle state in which a known person is not currently moving in an active commercial relationship but may still return.
- Purpose: Defines dormant but recoverable business status.
- Related documents:
  - `docs/foundation/04-user-lifecycle.md`
- Forbidden synonyms:
  - Sleeping User
  - Cold User

### Archived

- Canonical name: Archived
- Definition: The lifecycle state in which a person remains only as a historical record and no longer belongs to active lifecycle treatment.
- Purpose: Creates a terminal business state for closed relationships.
- Related documents:
  - `docs/foundation/04-user-lifecycle.md`
- Forbidden synonyms:
  - Deleted
  - Removed User

## Naming Standards

### Business Entities

- Use singular title case for canonical business entities.
- Prefer business nouns over technical nouns.
- Do not use implementation words to name business concepts.

### Lifecycle States

- Use singular, business-readable state names.
- Each state name must describe a current relationship, not a workflow or event.
- Avoid emotional or vague labels when a clearer business term exists.

### Business Events

- Use completed-fact language.
- Event names must describe what happened, not what should happen.
- Different event names must never represent the same business fact.

### AI Agents

- Agent names must reflect one business responsibility.
- Avoid technical or model-specific names.
- Avoid names that imply a whole workflow if the agent owns only one responsibility.

### AI Workflows

- Workflow names must reflect one business objective.
- Workflow names must not duplicate agent names unless the orchestration objective truly matches.
- Workflow names must remain readable to non-technical business stakeholders.

### Products

- Product names must remain stable across documents.
- A product name must not be replaced by a feature, service, or marketing slogan inside architecture.
- Included services must not be promoted to product names unless explicitly defined as products.

### Documents

- Foundation documents must use numbered stable filenames where sequence matters.
- Document titles should reflect business meaning, not temporary project language.
- Folder and file names should not introduce alternate vocabulary for existing canonical terms.

## Deprecated Terminology

### ABSystem AI

- Deprecated term: ABSystem AI
- Replacement term: ABSystem Platform
- Migration note: Use `ABSystem Platform` when referring to the canonical product. `ABSystem AI` may remain as historical or marketing language but must not be used as the business-architecture product name.

### Ambassador

- Deprecated term: Ambassador
- Replacement term: Advocate
- Migration note: Use `Advocate` as the canonical business term for the post-value referral and loyalty relationship.

### Evangelist

- Deprecated term: Evangelist
- Replacement term: Advocate
- Migration note: Do not introduce brand or marketing synonyms where the foundation already defines the business term.

### Quiz

- Deprecated term: Quiz
- Replacement term: Entry Test
- Migration note: The entry product is a business diagnostic step, not a casual quiz.

### Strategy Call

- Deprecated term: Strategy Call
- Replacement term: Strategic Session
- Migration note: Use `Strategic Session` as the canonical premium-service name unless a distinct product is created formally.

### Course when referring to FOCUS

- Deprecated term: Course when used for FOCUS Membership
- Replacement term: FOCUS Membership
- Migration note: FOCUS is a membership product, not a course.

### Churned

- Deprecated term: Churned
- Replacement term: Subscription Expired or Inactive
- Migration note: Use the lifecycle term that reflects the actual current business state instead of a broad generic label.

## Cross References

### Company

- Canonical origin:
  - `docs/foundation/01-company.md`

### Products

- Canonical origin:
  - `docs/foundation/02-products.md`

### Funnel

- Canonical origin:
  - `docs/foundation/03-funnel.md`

### User Lifecycle

- Canonical origin:
  - `docs/foundation/04-user-lifecycle.md`

### Business Events

- Canonical origin:
  - `docs/foundation/05-business-events.md`

### AI Agents

- Canonical origin:
  - `docs/foundation/06-ai-agents.md`

### AI Workflows

- Canonical origin:
  - `docs/foundation/07-ai-workflows.md`

This glossary does not replace those source documents.

It standardizes the terms used to reference them.

## Governance

### Ownership

The canonical glossary is owned by the business architecture layer of Starway.

All future architecture, product, lifecycle, event, AI, and operations documents must align with it.

### Versioning

This glossary must remain one canonical active terminology source.

Historical terminology maps must be archived rather than kept active in parallel.

### Adding New Terms

A new term may be added only when:

- it represents a genuinely new business concept;
- that concept cannot be expressed using an existing canonical term;
- the new term is assigned a unique stable meaning.

### Renaming Terms

Terms may be renamed only when business clarity improves materially.

Renaming must include:

- the new canonical term;
- the deprecated prior term;
- a migration note.

### Deprecation Policy

- Deprecated terms must remain documented in the glossary until they are no longer needed for repository-wide migration clarity.
- Deprecated terms must not remain active in new business architecture documents.

### Backward Compatibility

- Future documents must reference existing canonical terms instead of redefining them.
- Existing documents may be migrated gradually, but no new conflicting term definitions may be introduced.
- If a lower-level document conflicts with this glossary, the glossary governs terminology and the lower-level document must be aligned.
