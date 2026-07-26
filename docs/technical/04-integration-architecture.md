# Document

Integration Architecture

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
- `docs/technical/03-api-architecture.md`
- `docs/architecture/04-business-processes.md`
- `docs/architecture/05-ai-capability-model.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/technical/03-api-architecture.md`
- `docs/technical/05-event-architecture.md`
- `docs/engineering/08-security-blueprint.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The Integration Architecture exists to define the canonical logical integrations required by the Starway / ABSystem platform.

It answers one question:

Which logical integrations are allowed, what business capability does each one support, and how are providers isolated from business and AI logic?

Integrations must be isolated from Business and AI logic because:

- business capabilities belong to canonical services and agents;
- business decisions belong to canonical decision authority;
- provider behavior must not become the source of business truth;
- external dependencies must remain replaceable without changing business architecture.

This document therefore defines logical integrations only.

It does not define provider APIs, SDKs, transport protocols, infrastructure, or implementation patterns beyond their logical role.

It must be read together with:

- `docs/technical/01-ai-service-architecture.md`
- `docs/technical/02-system-component-architecture.md`
- `docs/technical/03-api-architecture.md`
- `docs/architecture/04-business-processes.md`
- `docs/architecture/05-ai-capability-model.md`
- `docs/foundation/09-business-rules.md`

## Integration Principles

1. Adapter pattern.
   Provider-specific behavior must be contained behind a logical integration boundary and must not leak into business logic.

2. Provider isolation.
   Canonical services and components must depend on integration roles, not on provider identity.

3. Replaceable integrations.
   Any provider fulfilling the same logical integration role must be replaceable without changing business ownership or business rules.

4. Canonical ownership.
   Every integration must have one owning service.

5. Deterministic communication.
   Integrations must support predictable business communication outcomes under valid business conditions.

6. Failure isolation.
   Provider failure must not redefine business truth or silently corrupt canonical state interpretation.

7. Explicit contracts.
   Integrations must consume and produce only documented logical contract outcomes.

8. No shadow business logic.
   Integrations may transport, translate, or relay business intent, but they must not become independent owners of business decisions.

## Integration Inventory

### Messaging Integration

- Purpose:
  - Deliver business messages to users or business participants through external communication channels.
- Business capability served:
  - Communication selection and delivery orchestration
- Owning service:
  - Notification Service

### Payments Integration

- Purpose:
  - Receive and relay payment outcomes required for continuity handling.
- Business capability served:
  - Payment outcome interpretation
  - Subscription continuity handling
- Owning service:
  - Continuity Service

### Video Meetings Integration

- Purpose:
  - Support participation-related meeting facts such as registration and attendance in meeting-based product experiences.
- Business capability served:
  - Engagement support
  - Progress interpretation
  - Coach support
- Owning service:
  - Engagement Service

### Authentication Integration

- Purpose:
  - Support identity confirmation or relationship-entry validity where external identity context is required.
- Business capability served:
  - Entry routing
  - User continuity and access-context support
- Owning service:
  - Funnel Service

### Notifications Integration

- Purpose:
  - Support business-triggered delivery of notifications through logical delivery channels.
- Business capability served:
  - Business communication delivery
- Owning service:
  - Notification Service

### Email Integration

- Purpose:
  - Deliver email-based business communication where the canonical process requires it.
- Business capability served:
  - Notification and communication delivery
  - Recovery communication support
- Owning service:
  - Notification Service

### Calendar Integration

- Purpose:
  - Support calendar-related scheduling context for business participation flows.
- Business capability served:
  - Engagement support
  - Coach support
  - Participation continuity
- Owning service:
  - Engagement Service

### AI Provider Integration

- Purpose:
  - Supply the reasoning substrate required by canonical AI capabilities without owning the business logic those capabilities apply.
- Business capability served:
  - All canonical AI Agent capabilities as enabled reasoning support
- Owning service:
  - The service that owns the consuming AI capability

### Analytics Integration

- Purpose:
  - Support interpretation and reporting of cross-process business patterns through external analytical or reporting systems where needed.
- Business capability served:
  - Analytics insight generation
- Owning service:
  - Analytics Service

### Storage Integration

- Purpose:
  - Support durable handling of non-canonical operational artifacts that services may need to persist outside source-of-truth business ownership.
- Business capability served:
  - Service support for governed memory, artifacts, and non-source-of-truth outputs
- Owning service:
  - The service that owns the artifact-producing capability

### Other canonical internal integrations

#### Human Review Integration

- Purpose:
  - Support escalation of human-owned decisions from AI-governed services.
- Business capability served:
  - Premium review
  - strategic review
  - governance escalation
- Owning service:
  - Coach Support Service or Analytics Service depending on the escalation path

#### Referral Context Integration

- Purpose:
  - Support relay of referral-related external facts into canonical referral interpretation.
- Business capability served:
  - Referral interpretation
- Owning service:
  - Referral Service

## Integration Responsibilities

### Messaging Integration

- Owns:
  - Provider-isolated message delivery behavior
- Consumes:
  - Communication outcomes
  - Message content intent
  - recipient context
- Produces:
  - Delivery outcome
  - delivery failure outcome
- Forbidden responsibilities:
  - Business message selection
  - Lifecycle decisions
  - subscription handling

### Payments Integration

- Owns:
  - Provider-isolated payment outcome relay
- Consumes:
  - Payment intent context
  - payment outcome signals
- Produces:
  - Canonical payment outcome context for Continuity Service
- Forbidden responsibilities:
  - Subscription decisions
  - premium approval
  - access decisions

### Video Meetings Integration

- Owns:
  - Provider-isolated meeting participation relay
- Consumes:
  - Meeting participation context
  - registration or attendance outcomes
- Produces:
  - Participation-related context and meeting-related facts
- Forbidden responsibilities:
  - Product progress interpretation
  - user lifecycle changes
  - recommendation generation

### Authentication Integration

- Owns:
  - Provider-isolated identity or access-validation relay
- Consumes:
  - Identity-entry context
- Produces:
  - Identity validation or entry context outcome
- Forbidden responsibilities:
  - Funnel decisions
  - lifecycle ownership
  - subscription ownership

### Notifications Integration

- Owns:
  - Delivery-path relay for notifications
- Consumes:
  - Communication outcomes
- Produces:
  - Notification delivery outcomes
- Forbidden responsibilities:
  - Business communication selection
  - business policy

### Email Integration

- Owns:
  - Email-channel delivery relay
- Consumes:
  - Email-eligible communication outcomes
- Produces:
  - Email delivery outcomes
- Forbidden responsibilities:
  - Communication selection
  - recommendation logic

### Calendar Integration

- Owns:
  - Scheduling-context relay
- Consumes:
  - Participation or meeting coordination context
- Produces:
  - Calendar-related participation support outcomes
- Forbidden responsibilities:
  - Subscription handling
  - coach judgment
  - lifecycle ownership

### AI Provider Integration

- Owns:
  - Provider-isolated reasoning access for AI capabilities
- Consumes:
  - Canonical AI task context
  - governed memory context
- Produces:
  - AI reasoning outputs returned into the owning service boundary
- Forbidden responsibilities:
  - Business rule ownership
  - business-state ownership
  - process ownership

### Analytics Integration

- Owns:
  - Provider-isolated reporting or analytical relay
- Consumes:
  - Canonical insight context
- Produces:
  - Analytical delivery or reporting outcomes
- Forbidden responsibilities:
  - Source-of-truth analytics decisions
  - state mutation

### Storage Integration

- Owns:
  - Provider-isolated artifact persistence support
- Consumes:
  - Non-source-of-truth artifacts
  - governed memory support context
- Produces:
  - Artifact storage outcomes
- Forbidden responsibilities:
  - Canonical business object ownership
  - lifecycle ownership
  - rule ownership

### Human Review Integration

- Owns:
  - Logical handoff from AI-governed context into human-owned review context
- Consumes:
  - Escalation requests
  - premium review context
  - strategic review context
- Produces:
  - Human review request outcome
- Forbidden responsibilities:
  - Final human decision
  - AI decision authority

### Referral Context Integration

- Owns:
  - Provider-isolated referral-signal relay
- Consumes:
  - Referral-related external context
- Produces:
  - Referral input context for Referral Service
- Forbidden responsibilities:
  - Referral interpretation ownership
  - funnel ownership

## Integration Boundaries

### Business logic boundaries

- Integrations may not decide business outcomes.
- Integrations may only relay, translate, or deliver context required by a canonical service.
- Canonical Business Rules, Business Processes, and State Machines remain outside integration ownership.

### Service boundaries

- Every integration belongs to one owning service.
- Consuming services must use service-exposed logical interfaces, not provider details.
- A provider-facing integration may support multiple services only through distinct service-owned logical boundaries, not through shared hidden ownership.

### Provider boundaries

- Providers are external fulfillers of a logical integration role.
- Provider details must not become part of canonical business architecture.
- Provider replacement must preserve the same logical integration role and contract.

### Ownership boundaries

- Owning services own business meaning.
- Integrations own provider isolation.
- Providers own none of the platform’s business logic, business state, or business rules.

## Integration Dependency Rules

### Who may call integrations

- Only the owning service, or components acting inside that owning service boundary, may call a logical integration directly.
- Downstream services must not bypass the owning service to call its provider-facing integration.

### Forbidden dependencies

- Services may not couple directly to provider-specific behavior.
- Business logic components may not depend on provider identity.
- Integrations may not depend on each other in order to create cross-provider business logic.
- Analytics integration may not be used to mutate source-of-truth business data.
- Messaging or notification integrations may not own communication policy.

### Provider replacement rules

- A provider may be replaced only if the logical integration contract remains valid.
- Provider replacement must not require changes to canonical Business Rules, State Machines, or Business Processes.
- If replacement changes logical capability, the architecture must be updated before replacement is considered canonical.

### Isolation requirements

- Provider failure must remain contained inside the owning integration boundary.
- Integration outcomes must be normalized back into canonical business context before downstream service use.
- AI logic must never depend on provider-specific quirks as business truth.

## Failure Handling Principles

### Unavailable provider

- Business behavior:
  - The owning service must preserve canonical business truth and avoid inventing successful outcomes.
- Expected handling:
  - Mark the interaction as incomplete, unavailable, or escalated according to service ownership.

### Timeout

- Business behavior:
  - Timeouts must not be interpreted as successful completion.
- Expected handling:
  - The owning service may defer, retry if canonically allowed, or escalate if the process requires it.

### Retry eligibility

- Business behavior:
  - Retry is allowed only when retrying does not violate business semantics or create duplicate meaning.
- Expected handling:
  - Retriable integration actions must remain idempotent in business meaning wherever the process requires stable outcomes.

### Graceful degradation

- Business behavior:
  - If an integration is unavailable, the platform should preserve the valid next business state without inventing unsupported continuity.
- Expected handling:
  - Degrade to:
    - delayed delivery;
    - human review;
    - deferred process continuation;
    - alternative communication path where canonically allowed.

### Escalation

- Business behavior:
  - When integration failure blocks a human-owned or financially sensitive outcome, escalation must occur.
- Expected handling:
  - Escalate to:
    - Human Review
    - Business Owner
    - AI Owner
    - Platform Owner
  depending on the blocked capability and its governance boundary.

## Integration Responsibility Matrix

| Integration | Purpose | Owner | Consumes | Produces | Dependencies | Forbidden Responsibilities |
| --- | --- | --- | --- | --- | --- | --- |
| Messaging Integration | Deliver business messages through external communication channels | Notification Service | Communication outcomes, recipient context | Delivery outcomes, failure outcomes | Notification Service interfaces, communication context | Message selection, lifecycle decisions, continuity ownership |
| Payments Integration | Relay payment outcomes into continuity handling | Continuity Service | Payment intent context, payment outcome signals | Canonical payment outcome context | Continuity Service, subscription context | Subscription decisions, premium approval, access decisions |
| Video Meetings Integration | Relay meeting participation facts | Engagement Service | Meeting participation context, registration/attendance outcomes | Participation-related context and facts | Engagement Service, participation processes | Progress ownership, recommendation ownership, lifecycle ownership |
| Authentication Integration | Relay identity-validation context | Funnel Service | Identity-entry context | Identity validation outcome | Funnel Service, entry context | Funnel ownership, lifecycle ownership, subscription ownership |
| Notifications Integration | Relay notification delivery | Notification Service | Communication outcomes | Notification delivery outcomes | Notification Service | Communication policy, business decisions |
| Email Integration | Relay email-based communication | Notification Service | Email-eligible communication outcomes | Email delivery outcomes | Notification Service | Communication selection, recommendation logic |
| Calendar Integration | Relay scheduling-related support context | Engagement Service | Participation and scheduling context | Calendar support outcomes | Engagement Service, Coach Support Service | Subscription handling, lifecycle ownership, coach judgment |
| AI Provider Integration | Supply reasoning substrate to owning service | Owning Service of the consuming capability | Canonical AI task context, governed memory | AI reasoning outputs | Owning service, AI capability boundary | Business rule ownership, business-state ownership, process ownership |
| Analytics Integration | Relay reporting or analytical delivery | Analytics Service | Insight context | Reporting or analytical outcomes | Analytics Service | Source-of-truth decisions, state mutation |
| Storage Integration | Relay non-source-of-truth artifact persistence | Owning Service of the artifact capability | Artifacts, governed memory support context | Artifact storage outcomes | Owning service, governed memory rules | Canonical business-object ownership, lifecycle ownership |
| Human Review Integration | Relay AI escalation into human review | Coach Support Service or Analytics Service depending on context | Escalation requests, review context | Human review request outcome | Human escalation paths | Final human decision, AI authority |
| Referral Context Integration | Relay external referral signals | Referral Service | External referral context | Referral input context | Referral Service | Referral interpretation ownership, funnel ownership |

## Cross References

- Service Architecture:
  - `docs/technical/01-ai-service-architecture.md`
- Component Architecture:
  - `docs/technical/02-system-component-architecture.md`
- API Architecture:
  - `docs/technical/03-api-architecture.md`
- Business Processes:
  - `docs/architecture/04-business-processes.md`
- AI Capability Model:
  - `docs/architecture/05-ai-capability-model.md`
- AI Decision Model:
  - `docs/architecture/08-ai-decision-model.md`
- AI Governance Model:
  - `docs/architecture/09-ai-governance-model.md`

## Governance

### Adding integrations

A new logical integration may be added only when:

- it supports an already canonical business capability;
- it has one owning service;
- it isolates provider behavior instead of embedding business logic;
- it does not duplicate an existing integration role.

### Replacing providers

A provider may be replaced only when:

- the logical integration role remains unchanged;
- service ownership does not change;
- business semantics and business contracts remain valid;
- replacement does not force undocumented business-rule or process changes.

### Deprecating integrations

An integration may be deprecated only when:

- the underlying business capability no longer requires it; or
- its role is fully absorbed into another canonical logical integration without ambiguity.

Deprecated integrations must remain historically understandable until all dependent architecture and implementation are aligned.

### Reviewing ownership

Integration ownership must be reviewed whenever:

- a service boundary changes;
- a provider replacement changes capability assumptions;
- a failure pattern reveals that business logic has leaked into the integration layer;
- a new process introduces cross-service reliance on an integration that may violate current ownership boundaries.
