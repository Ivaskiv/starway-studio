# Document

Business Rules

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

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/architecture/03-state-machines.md`
- `docs/architecture/08-ai-decision-model.md`
- `docs/engineering/08-security-blueprint.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

Business Rules exist to define the global invariants, constraints, and non-negotiable policies that govern the entire Starway / ABSystem ecosystem.

They answer one question:

What must always remain true across the business?

This document does not replace `docs/foundation/01-company.md`.

The company document defines identity, mission, principles, and structural business truth.

This document does not replace `docs/foundation/02-products.md`.

The product document defines what offerings exist and how they relate.

This document does not replace `docs/foundation/03-funnel.md`.

The funnel document defines progression through the business.

This document does not replace `docs/foundation/04-user-lifecycle.md`.

The lifecycle document defines the current business state of a user.

This document does not replace `docs/foundation/05-business-events.md`.

The business events document defines immutable facts that occur in the business.

This document does not replace `docs/foundation/06-ai-agents.md`.

The AI agents document defines bounded business capabilities.

This document does not replace `docs/foundation/07-ai-workflows.md`.

The AI workflows document defines orchestration of agents around business objectives.

This document does not replace `docs/foundation/08-glossary.md`.

The glossary document defines canonical terminology.

Business Rules are different from all of the above:

- Products define what is offered.
- Funnel defines how progression happens.
- Lifecycle defines the user’s current state.
- Business Events define what happened.
- AI Agents define responsibilities.
- AI Workflows define orchestration.
- Business Rules define what is always true across all those layers.

## Business Rule Principles

1. One source of truth.
   Every global business invariant must be defined once at the highest valid layer.

2. Deterministic behaviour.
   Equivalent business situations must be governed by the same rules.

3. Explicit over implicit.
   Business constraints must be written directly, not assumed from scattered documents.

4. Business-first.
   Rules must describe business reality before any implementation concern.

5. Implementation-independent.
   A valid business rule must remain true even if systems, channels, or tooling change.

6. Rules outlive implementation.
   Architecture, tooling, and workflows may evolve; the governing business invariants should remain stable until the business itself changes.

7. No contradiction between layers.
   Lower-level documents may apply rules, but they must never override them.

8. Stable exceptions only.
   If a rule has exceptions, those exceptions must also be explicit business rules.

9. Access follows policy.
   Product access, continuation, recovery, and premium movement must derive from business rules rather than ad hoc interpretation.

10. Canonical business language only.
   Rules must use the glossary-defined canonical terms.

## Canonical Business Rules

### BR-001 — One Active Lifecycle State Per User

- Statement: A user may have history across many states, but at any moment the business recognizes exactly one canonical current lifecycle state.
- Rationale: Business treatment, access, recovery, and continuity all require one unambiguous current relationship.
- Affected business objects:
  - User Lifecycle
  - Access
  - Subscriptions
  - AI Agents
  - AI Workflows
- Related documents:
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/03-funnel.md`

### BR-002 — Products Never Own Lifecycle States

- Statement: Products may influence, require, or correspond to lifecycle states, but they do not define or own lifecycle states themselves.
- Rationale: Product structure and current user relationship are different business layers and must remain separable.
- Affected business objects:
  - Products
  - User Lifecycle
  - Access
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`

### BR-003 — Funnel Stages Never Replace Lifecycle States

- Statement: Funnel stages describe progression, while lifecycle states describe current user relationship; neither may substitute for the other.
- Rationale: The business must distinguish between where a person is moving and what their current business status is.
- Affected business objects:
  - Funnel
  - User Lifecycle
  - AI Agents
  - AI Workflows
- Related documents:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`

### BR-004 — Business Events Are Immutable

- Statement: Once a business event has occurred, it remains a historical fact and may not be redefined as if it never happened.
- Rationale: Auditability, analytics, continuity, and trustworthy business interpretation all depend on immutable facts.
- Affected business objects:
  - Business Events
  - Analytics
  - Audit
  - AI Workflows
- Related documents:
  - `docs/foundation/05-business-events.md`

### BR-005 — Every Business Event Has One Meaning

- Statement: A canonical business event must represent exactly one business fact.
- Rationale: Events are reusable across business functions only if they are semantically stable.
- Affected business objects:
  - Business Events
  - Analytics
  - Notifications
  - AI Agents
- Related documents:
  - `docs/foundation/05-business-events.md`
  - `docs/foundation/08-glossary.md`

### BR-006 — Recommendations Never Modify Business State Directly

- Statement: A recommendation may advise a next step, but it does not by itself change product access, lifecycle state, or subscription status.
- Rationale: Advice and business commitment are separate facts.
- Affected business objects:
  - Recommendations
  - Funnel
  - User Lifecycle
  - Products
- Related documents:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`

### BR-007 — Subscriptions Determine Paid Access

- Statement: Active access to recurring paid products must derive from a valid subscription or equivalent active paid commercial relationship.
- Rationale: Paid products require a single commercial basis for granting access.
- Affected business objects:
  - Subscriptions
  - Products
  - Access Matrix
  - Renewal
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`

### BR-008 — Permissions Derive From Lifecycle And Subscription

- Statement: Customer permissions must derive from the user’s current lifecycle state together with the applicable active subscription or paid relationship.
- Rationale: Access and permission decisions must reflect both relationship status and commercial entitlement.
- Affected business objects:
  - User Lifecycle
  - Subscriptions
  - Products
  - Access
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`

### BR-009 — One Product Has One Canonical Identity

- Statement: Every business product must have exactly one canonical name, purpose, and ownership definition.
- Rationale: Product ambiguity causes broken pricing, broken routing, and inconsistent customer treatment.
- Affected business objects:
  - Products
  - Funnel
  - AI Agents
  - Documentation
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/08-glossary.md`

### BR-010 — Included Services Are Not Separate Products By Default

- Statement: A capability included inside a product remains an included service unless the business explicitly defines it as a standalone product.
- Rationale: This prevents product fragmentation and duplicate catalog entries.
- Affected business objects:
  - Products
  - Included Services
  - Product Catalog
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/08-glossary.md`

### BR-011 — Premium Movement Requires Business Validity

- Statement: Movement into Premium Services must happen only when fit, readiness, trust, and value justification are present.
- Rationale: Premium conversion must preserve product integrity and customer fit rather than shortcut the business ladder.
- Affected business objects:
  - Funnel
  - Premium Services
  - Recommendations
  - User Lifecycle
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`

### BR-012 — Renewal Is Distinct From First Purchase

- Statement: Renewal is a separate business decision layer and must not be treated as identical to first-time conversion.
- Rationale: Continuation, recovery, and retention require different business treatment than initial activation.
- Affected business objects:
  - Funnel
  - Subscriptions
  - Business Events
  - Retention
- Related documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/05-business-events.md`

### BR-013 — Recovery Must Use Canonical Return Paths

- Statement: Users in inactive or expired states may return only through defined business-valid re-entry paths.
- Rationale: Recovery should preserve clarity instead of improvising alternate journeys.
- Affected business objects:
  - User Lifecycle
  - Funnel
  - Retention
  - Re-engagement
- Related documents:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/07-ai-workflows.md`

### BR-014 — AI Agents Own Responsibilities, Not Rules

- Statement: AI Agents may apply business rules but must not become the source of those rules.
- Rationale: Business policy must remain stable even when agents or workflows change.
- Affected business objects:
  - AI Agents
  - AI Workflows
  - Business Rules
- Related documents:
  - `docs/foundation/06-ai-agents.md`
  - `docs/foundation/07-ai-workflows.md`

### BR-015 — Workflows Orchestrate Agents, Not Business Architecture

- Statement: AI Workflows may coordinate agents around a business objective, but they may not redefine products, funnel, lifecycle, events, or global policy.
- Rationale: Orchestration must remain downstream from business architecture.
- Affected business objects:
  - AI Workflows
  - AI Agents
  - Funnel
  - Lifecycle
  - Business Events
- Related documents:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
  - `docs/foundation/06-ai-agents.md`
  - `docs/foundation/07-ai-workflows.md`

### BR-016 — Canonical Terms Must Be Reused

- Statement: Active documentation must use canonical glossary terms instead of redefining or substituting alternate names.
- Rationale: Terminology stability is required for deterministic architecture and AI alignment.
- Affected business objects:
  - Documentation
  - Products
  - Funnel
  - User Lifecycle
  - Business Events
  - AI Agents
  - AI Workflows
- Related documents:
  - `docs/foundation/08-glossary.md`

### BR-017 — One Editable Source Of Truth Per Concept

- Statement: Each business concept must have exactly one active editable canonical document.
- Rationale: Competing active definitions create architecture drift and conflicting operational behavior.
- Affected business objects:
  - Documentation
  - Governance
  - All foundation layers
- Related documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/08-glossary.md`

### BR-018 — Business State Changes Require Business Facts

- Statement: A lifecycle transition or access change must always be justified by valid business facts and conditions.
- Rationale: User treatment must follow actual business reality, not undocumented assumptions.
- Affected business objects:
  - User Lifecycle
  - Business Events
  - Subscriptions
  - Permissions
- Related documents:
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`

## Business Constraints

### Uniqueness Constraints

- A user may have only one canonical current lifecycle state.
- A product may have only one canonical business identity.
- A business event name may represent only one business fact.
- An AI Agent may have only one primary business responsibility.
- An AI Workflow may have only one primary business objective.

### Ownership Constraints

- Every product must have a business owner.
- Every lifecycle state must have a business owner.
- Every event category must have a business owner.
- Every AI Agent must have a defined owner.
- Every AI Workflow must have a defined owner.
- Every foundation document must have a canonical ownership layer.

### Transition Constraints

- Funnel transitions must follow canonical business progression.
- Lifecycle transitions must remain deterministic.
- Premium movement requires valid business fit.
- Re-entry must use canonical return paths.

### Subscription Constraints

- Paid access requires valid commercial entitlement.
- Renewal must be treated distinctly from first activation.
- Upgrade and downgrade must map to canonical product relationships.
- Expiration must produce a defined lifecycle outcome.

### Payment Constraints

- Payment success and payment failure are separate business facts.
- Payment-related facts must not be inferred from recommendation alone.
- Paid access must not be granted from intent without valid paid activation conditions.

### Referral Constraints

- Referral is not acquisition by default until a real referral-driven business outcome occurs.
- Referral logic belongs to advocacy or trust-based growth, not arbitrary prompting.

### Content Constraints

- Business-facing content must not redefine products, funnel, lifecycle, events, agents, or workflows.
- Marketing language may vary in tone, but not in canonical business meaning.

## Decision Matrix

### Product Access Decision

- Governing rule(s):
  - BR-007
  - BR-008
  - BR-018
- Affected documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Expected business outcome:
  - Access is granted or denied consistently according to lifecycle and entitlement.

### Recommendation Decision

- Governing rule(s):
  - BR-006
  - BR-009
  - BR-011
- Affected documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/06-ai-agents.md`
- Expected business outcome:
  - Recommendations remain clear, valid, and non-destructive to business state.

### Renewal Decision

- Governing rule(s):
  - BR-007
  - BR-008
  - BR-012
  - BR-018
- Affected documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Expected business outcome:
  - Continuation is treated as a distinct business decision with consistent outcomes.

### Premium Upgrade Decision

- Governing rule(s):
  - BR-009
  - BR-011
  - BR-018
- Affected documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/07-ai-workflows.md`
- Expected business outcome:
  - Premium movement happens only when justified and well aligned.

### Lifecycle Transition Decision

- Governing rule(s):
  - BR-001
  - BR-003
  - BR-018
- Affected documents:
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`
- Expected business outcome:
  - Current user state remains unambiguous and fact-based.

### AI Responsibility Decision

- Governing rule(s):
  - BR-014
  - BR-015
- Affected documents:
  - `docs/foundation/06-ai-agents.md`
  - `docs/foundation/07-ai-workflows.md`
- Expected business outcome:
  - AI responsibility remains separated from orchestration and from business rule ownership.

### Terminology Decision

- Governing rule(s):
  - BR-016
  - BR-017
- Affected documents:
  - `docs/foundation/08-glossary.md`
  - All foundation documents
- Expected business outcome:
  - Stable language and lower documentation ambiguity across the ecosystem.

## Rule Relationships

Business Rules
↓
Products
↓
Funnel
↓
Lifecycle
↓
Business Events
↓
AI Agents
↓
AI Workflows
↓
Implementation

### Relationship Meaning

- Business Rules govern the allowable meanings and constraints of all lower layers.
- Products must comply with Business Rules.
- Funnel progression must comply with Business Rules.
- Lifecycle definitions and transitions must comply with Business Rules.
- Business Events must comply with Business Rules.
- AI Agents must comply with Business Rules.
- AI Workflows must comply with Business Rules.
- Any implementation must comply with every valid lower-layer canonical and therefore with the governing Business Rules above them.

## Governance

### Ownership

The canonical Business Rules are owned by the business architecture layer of Starway.

All lower-layer business documents must align with them.

### Versioning

This document must remain one canonical global rule set.

Historical rule sets must be archived rather than kept as parallel active policies.

### Introducing New Rules

A new rule may be introduced only when:

- it expresses a true global business invariant or constraint;
- it cannot be fully derived from an existing rule without ambiguity;
- it affects more than one lower business layer or must constrain the whole system.

### Changing Rules

A rule may change only when the business itself has changed or when the old rule no longer expresses the intended invariant clearly enough.

Any rule change must be reflected in downstream canonical documents that depend on it.

### Deprecation Policy

- A rule may be deprecated only when it is replaced by a clearer or more accurate governing rule, or when the underlying business reality no longer exists.
- Deprecated rules must remain historically understandable until related downstream migration is complete.

### Backward Compatibility

- New foundation documents must inherit these rules instead of redefining them.
- Lower-level documents may elaborate application, but they must not contradict the rules.
- Future implementation may enforce these rules through any technical mechanism, but it may not change their business meaning.
