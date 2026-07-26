# Document

AI Memory and Knowledge Model

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

- `docs/architecture/02-data-model.md`
- `docs/architecture/05-ai-capability-model.md`
- `docs/architecture/06-ai-interaction-model.md`
- `docs/foundation/09-business-rules.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/architecture/05-ai-capability-model.md`
- `docs/architecture/08-ai-decision-model.md`
- `docs/engineering/03-ai-agent-blueprint.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The AI Memory & Knowledge Model exists to define how canonical AI Agents access, retain, and use knowledge inside the Starway / ABSystem ecosystem.

It answers one question:

What may an AI Agent remember, where does that knowledge come from, and when must it defer back to canonical business truth?

AI Memory is separated from Business Data because:

- Business Data is the source of truth for the business;
- AI Memory is only a governed way of accessing, carrying, and reusing context;
- memory may support reasoning and continuity, but it must never become an alternative owner of business facts.

This document must be read together with:

- `docs/architecture/02-data-model.md`
- `docs/architecture/05-ai-capability-model.md`
- `docs/architecture/06-ai-interaction-model.md`
- `docs/foundation/09-business-rules.md`

It does not define storage technology, retrieval technology, indexing, embeddings, vector search, or implementation.

## Memory Principles

1. Canonical source of truth.
   AI Memory must always defer to canonical Business Data and canonical Foundation documents when business truth matters.

2. AI never owns business data.
   AI Agents may read and temporarily use business data, but they do not own it and must not redefine it.

3. Explicit memory ownership.
   Every memory type must have one owner and one source-of-truth relationship.

4. Deterministic retrieval.
   When the same business question requires the same canonical source, the same type of memory retrieval should be used.

5. Explainable memory usage.
   Any meaningful AI use of memory must be explainable in business terms: what was read, why it was relevant, and why it was safe to use.

6. Minimal memory duplication.
   Memory may cache, summarize, or carry context, but it must not duplicate canonical business facts unnecessarily.

7. Freshness before convenience.
   Cached or remembered knowledge must not override current canonical business truth.

8. Temporary context is not ownership.
   Working context may exist during an interaction, but it does not become authoritative business memory by default.

## Knowledge Sources

### Foundation

- Description:
  - The canonical business architecture documents that define company, products, funnel, lifecycle, business events, AI agents, workflows, glossary, business rules, and system map.
- Canonical references:
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
  - `docs/foundation/11-foundation-review.md`

### Business Rules

- Description:
  - The global invariants that govern all lower knowledge use.
- Canonical reference:
  - `docs/foundation/09-business-rules.md`

### Business Processes

- Description:
  - The canonical end-to-end business processes that define when AI participation is valid.
- Canonical reference:
  - `docs/architecture/04-business-processes.md`

### Business Objects

- Description:
  - The canonical business objects and attributes that define the current business facts and stateful objects.
- Canonical references:
  - `docs/architecture/01-domain-model.md`
  - `docs/architecture/02-data-model.md`
  - `docs/architecture/03-state-machines.md`

### User Data

- Description:
  - The user-related portion of canonical business objects and business events relevant to one specific person or relationship.
- Canonical references:
  - `docs/architecture/02-data-model.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/05-business-events.md`

### AI Generated Knowledge

- Description:
  - Derived summaries, recommendations, interpretations, or contextual synthesis produced by AI Agents under canonical rules.
- Canonical references:
  - `docs/foundation/06-ai-agents.md`
  - `docs/architecture/05-ai-capability-model.md`
  - `docs/architecture/06-ai-interaction-model.md`

### External Knowledge

- Description:
  - Non-canonical knowledge outside Starway’s business architecture that may support interpretation but may never override canonical business truth.
- Canonical references:
  - Not owned by the Foundation
  - Allowed only when a business capability explicitly requires outside context and no conflict with canonical architecture exists

## Memory Types

### Global Memory

- Definition:
  - Stable cross-ecosystem knowledge that applies to all agents and all business contexts.

### Organizational Memory

- Definition:
  - Stable business knowledge specific to Starway as an organization, including canonical practices, ownership boundaries, and governance context.

### Product Memory

- Definition:
  - Stable knowledge about products, included services, value, lifecycle, and product-specific business context.

### User Memory

- Definition:
  - User-specific remembered context derived from canonical user-related business objects and business events.

### Session Memory

- Definition:
  - Interaction-bounded context accumulated during one active business conversation or working session.

### Working Memory

- Definition:
  - Temporary reasoning context assembled by an AI Agent while performing one bounded responsibility.

### Temporary Context

- Definition:
  - Short-lived context needed only to complete the immediate interaction step and discarded afterward unless canonically persisted elsewhere.

## Memory Ownership

### Global Memory

- Owner:
  - Enterprise architecture leadership
- Source of truth:
  - Foundation documents and architecture documents
- Retention:
  - Persistent while canonical architecture remains active
- Update authority:
  - Documentation and architecture ownership only
- Invalidation rules:
  - Invalidated when a newer canonical document version supersedes the prior business truth

### Organizational Memory

- Owner:
  - Business architecture leadership
- Source of truth:
  - `docs/foundation/01-company.md`
  - `docs/foundation/09-business-rules.md`
  - `docs/foundation/10-system-map.md`
- Retention:
  - Persistent while organizational truth remains valid
- Update authority:
  - Company and architecture leadership
- Invalidation rules:
  - Invalidated when company principles, ownership, or governance canon changes

### Product Memory

- Owner:
  - Product architecture leadership
- Source of truth:
  - `docs/foundation/02-products.md`
  - `docs/architecture/02-data-model.md`
- Retention:
  - Persistent while product canon remains valid
- Update authority:
  - Product architecture leadership
- Invalidation rules:
  - Invalidated when product definitions, subscription model, or product lifecycle canon changes

### User Memory

- Owner:
  - Business architecture leadership for truth
  - relevant AI Agent only for temporary use within permission boundaries
- Source of truth:
  - User-related Business Objects and Business Events
- Retention:
  - Bounded by ongoing business relevance and current canonical user context
- Update authority:
  - Canonical business object owners only
- Invalidation rules:
  - Must be refreshed when user lifecycle, subscription, recommendation, or business-event truth changes

### Session Memory

- Owner:
  - The active participating AI Agent during a single session
- Source of truth:
  - Current interaction plus canonical business context read during that session
- Retention:
  - Session-bounded
- Update authority:
  - The active AI Agent within its capability boundary
- Invalidation rules:
  - Expires when the session ends or when current session assumptions conflict with refreshed canonical data

### Working Memory

- Owner:
  - The active AI Agent performing a bounded task
- Source of truth:
  - Session context plus canonically retrieved business knowledge
- Retention:
  - Task-bounded
- Update authority:
  - The active AI Agent
- Invalidation rules:
  - Expires when the task completes, the agent hands off, or the underlying business context changes

### Temporary Context

- Owner:
  - The active AI Agent or interaction handover context
- Source of truth:
  - Immediate interaction need only
- Retention:
  - Short-lived and disposable
- Update authority:
  - The active AI Agent within the current interaction step
- Invalidation rules:
  - Expires immediately after the interaction step no longer requires it

## AI Memory Permissions

### Funnel Agent

- Readable memories:
  - Global Memory
  - Organizational Memory
  - Product Memory
  - User Memory
  - Session Memory
  - Working Memory
- Writable memories:
  - Session Memory
  - Working Memory
  - Temporary Context
- Temporary memories:
  - Funnel-position reasoning
  - Re-entry routing context
- Forbidden memories:
  - Independent persistent business truth about subscription outcomes
  - Human-only premium qualification memory

### Recommendation Agent

- Readable memories:
  - Global Memory
  - Product Memory
  - User Memory
  - Session Memory
  - Working Memory
- Writable memories:
  - Session Memory
  - Working Memory
  - Temporary Context
- Temporary memories:
  - Recommendation rationale context
  - Recommendation comparison context
- Forbidden memories:
  - Persistent alternative product truth
  - Persistent lifecycle truth outside canonical business objects

### Onboarding Agent

- Readable memories:
  - Global Memory
  - Organizational Memory
  - Product Memory
  - User Memory
  - Session Memory
- Writable memories:
  - Session Memory
  - Working Memory
  - Temporary Context
- Temporary memories:
  - Entry-friction context
  - First-step guidance context
- Forbidden memories:
  - Independent lifecycle-state ownership
  - Premium-eligibility memory as canonical truth

### Engagement Agent

- Readable memories:
  - Global Memory
  - Product Memory
  - User Memory
  - Session Memory
  - Working Memory
- Writable memories:
  - Session Memory
  - Working Memory
  - Temporary Context
- Temporary memories:
  - Engagement-risk context
  - Participation-continuity context
- Forbidden memories:
  - Subscription truth as owned memory
  - Permanent cross-user behavioral truth

### Progress Agent

- Readable memories:
  - Global Memory
  - Product Memory
  - User Memory
  - Session Memory
  - Working Memory
- Writable memories:
  - Working Memory
  - Temporary Context
- Temporary memories:
  - Progress-interpretation context
  - Momentum synthesis
- Forbidden memories:
  - Persistent user-state ownership
  - Subscription control memory

### Reflection Agent

- Readable memories:
  - Global Memory
  - Product Memory
  - User Memory
  - Session Memory
  - Working Memory
- Writable memories:
  - Session Memory
  - Working Memory
  - Temporary Context
- Temporary memories:
  - Reflection prompts and meaning context
  - Participation interpretation context
- Forbidden memories:
  - Persistent recommendation truth that bypasses canonical recommendation records

### Coach Agent

- Readable memories:
  - Global Memory
  - Organizational Memory
  - Product Memory
  - User Memory
  - Session Memory
  - Working Memory
- Writable memories:
  - Session Memory
  - Working Memory
  - Temporary Context
- Temporary memories:
  - Coach-support context
  - Premium-context preparation
- Forbidden memories:
  - Autonomous premium-approval memory as canonical truth
  - Persistent human-judgment replacement

### Subscription Agent

- Readable memories:
  - Global Memory
  - Product Memory
  - User Memory
  - Session Memory
  - Working Memory
- Writable memories:
  - Session Memory
  - Working Memory
  - Temporary Context
- Temporary memories:
  - Continuity-path evaluation
  - Renewal vs activation interpretation
- Forbidden memories:
  - Independent payment truth outside canonical business events
  - Product-policy rewrite memory

### Retention Agent

- Readable memories:
  - Global Memory
  - Product Memory
  - User Memory
  - Session Memory
  - Working Memory
- Writable memories:
  - Session Memory
  - Working Memory
  - Temporary Context
- Temporary memories:
  - Churn-risk context
  - Recovery-path context
- Forbidden memories:
  - Direct subscription-authority memory
  - Hidden lifecycle override context

### Payment Agent

- Readable memories:
  - Global Memory
  - Product Memory
  - User Memory
  - Session Memory
  - Working Memory
- Writable memories:
  - Session Memory
  - Working Memory
  - Temporary Context
- Temporary memories:
  - Payment-outcome interpretation context
  - Continuity-handoff context
- Forbidden memories:
  - Persistent subscription truth not grounded in business events
  - Premium-decision memory

### Notification Agent

- Readable memories:
  - Global Memory
  - Product Memory
  - User Memory
  - Session Memory
  - Working Memory
- Writable memories:
  - Session Memory
  - Temporary Context
- Temporary memories:
  - Delivery-context memory
  - Message-targeting context
- Forbidden memories:
  - Independent business-policy memory
  - Persistent access-control truth

### Analytics Agent

- Readable memories:
  - Global Memory
  - Organizational Memory
  - Product Memory
  - User Memory
  - Session Memory
  - Working Memory
- Writable memories:
  - Working Memory
  - Temporary Context
- Temporary memories:
  - Cross-process synthesis
  - Pattern interpretation context
- Forbidden memories:
  - Source-of-truth business state
  - Persistent user-state ownership

### Referral Agent

- Readable memories:
  - Global Memory
  - Product Memory
  - User Memory
  - Session Memory
  - Working Memory
- Writable memories:
  - Session Memory
  - Working Memory
  - Temporary Context
- Temporary memories:
  - Referral-context interpretation
  - Referral-conversion context
- Forbidden memories:
  - Independent funnel-bypass memory
  - Persistent access truth

## Knowledge Retrieval Rules

1. Canonical data must be read when:
   - a decision affects lifecycle, subscription, recommendation validity, access, product scope, or process routing;
   - a Business Rule is relevant to the decision;
   - user-specific truth may have changed since the last interaction.

2. Cached knowledge is allowed when:
   - the knowledge is stable canonical architecture or governance content;
   - the decision is low-risk and does not require live business-state truth;
   - the same active session already fetched the relevant canon and no contradicting event occurred.

3. Memory must be refreshed when:
   - a new Business Event changes user context;
   - a state-machine transition may have occurred;
   - a subscription or recommendation outcome is in question;
   - an interaction crosses from one AI Agent to another and freshness matters to the next decision.

4. AI must ignore cached information when:
   - canonical Business Data conflicts with remembered context;
   - a refreshed source-of-truth object exists;
   - the memory depends on a prior recommendation, lifecycle state, or continuity state that is no longer current;
   - a human decision has overridden the previously remembered assumption.

5. Foundation and Business Rules outrank remembered summaries.

6. User-specific current business state outranks older session memory.

## Memory Lifecycle

### Creation

Memory is created when:

- canonical knowledge is read into active agent context;
- a session begins and relevant context is assembled;
- an AI Agent forms temporary reasoning context from canonical inputs;
- an interaction handover requires passing bounded context to another AI Agent.

### Update

Memory is updated when:

- the underlying canonical source changes;
- a new Business Event changes relevant context;
- a new session or handover requires a fresher interpretation;
- an AI Agent refines temporary reasoning during the same bounded task.

### Expiration

Memory expires when:

- the session ends;
- the working task completes;
- the business context changes enough that the remembered content is no longer safe to reuse;
- the memory type is defined as temporary.

### Archival

Memory may be archived only when:

- it is organizational or global memory that has been superseded by a newer canonical version;
- it remains useful for historical understanding but is no longer active business truth.

### Deletion

Memory must be deleted or discarded when:

- it is temporary context no longer needed;
- it conflicts with updated canonical truth;
- its retention is no longer justified by the memory type’s governance rules.

## Cross References

- Business Data Model:
  - `docs/architecture/02-data-model.md`
- AI Capability Model:
  - `docs/architecture/05-ai-capability-model.md`
- AI Interaction Model:
  - `docs/architecture/06-ai-interaction-model.md`
- Business Rules:
  - `docs/foundation/09-business-rules.md`
- AI Agents:
  - `docs/foundation/06-ai-agents.md`
- Business Processes:
  - `docs/architecture/04-business-processes.md`

## Governance

### Adding memory types

A new memory type may be added only when:

- it represents a distinct business memory category not already covered;
- it has one owner;
- it has explicit retention, update authority, and invalidation rules;
- it does not duplicate an existing memory type unnecessarily.

### Changing ownership

Memory ownership may change only when:

- the underlying business ownership changes canonically; or
- the current ownership boundary is proven incorrect by architecture governance.

### Deprecating memory

A memory type or memory usage pattern may be deprecated only when:

- the underlying business need no longer exists; or
- the memory is absorbed into a clearer canonical memory type without ambiguity.

Deprecated memory must remain historically understandable until all dependent architecture and implementation are aligned.

### Versioning

The AI Memory & Knowledge Model must version with:

- the Foundation;
- the Business Data Model;
- the AI Capability Model;
- the AI Interaction Model.

No implementation may introduce undocumented persistent AI memory that contradicts canonical business truth or bypasses canonical business data ownership.
