# Document

Business State Machines

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
- `docs/architecture/02-data-model.md`
- `docs/foundation/05-business-events.md`
- `docs/foundation/09-business-rules.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/architecture/04-business-processes.md`
- `docs/technical/05-event-architecture.md`
- `docs/technical/06-workflow-orchestration.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

Business State Machines exist to define how canonical business objects are allowed to change over time.

They answer one question:

Which business states are valid, and which event-driven transitions between them are allowed?

This document exists because:

- Business Rules define what must always remain true.
- Business Events define which facts occurred.
- the Domain Model defines which business entities exist.
- the Data Model defines which business objects and mutable attributes exist.

The State Machines document defines the allowed motion of those business objects over time.

It does not redefine the objects, rules, or events themselves.

It defines their allowed state transitions.

## State Machine Principles

1. Deterministic transitions.
   The same valid event and rule context must lead to the same allowed transition.

2. Explicit states.
   Every allowed state must be named and defined canonically.

3. Explicit transition rules.
   Every allowed transition must reference a Business Event and a governing Business Rule.

4. No hidden states.
   No implementation may invent undocumented intermediate or shadow states.

5. One owner per state machine.
   Every business state machine must have one canonical business owner.

6. Event-driven transitions.
   State changes may occur only because valid Business Events have occurred.

7. Invalid transitions are forbidden.
   If a transition is not explicitly allowed here, implementation must treat it as invalid.

8. State meaning belongs to business architecture.
   Technical convenience must never redefine state meaning.

## State Machines

The canonical state machines in the current business architecture are:

- User Lifecycle Record
- Subscription Record
- Recommendation Record
- Product Record
- AI Agent Record
- AI Workflow Record

The first three have canonical business-event-driven operational transitions.

The last three have defined states but do not yet have a complete canonical runtime Business Event set for lifecycle movement in `docs/foundation/05-business-events.md`.

Therefore:

- their states are canonical;
- their unauthorized transitions are forbidden;
- no implementation may invent transition logic until corresponding Business Events are added to the Foundation.

## State Definitions

### User Lifecycle Record

#### `Anonymous`

- Canonical name:
  - Anonymous
- Business meaning:
  - A person known only as audience attention, not yet in direct relationship.
- Entry conditions:
  - Initial business presence before direct contact.
- Exit conditions:
  - The person becomes a direct contact.
- Terminal or non-terminal:
  - Non-terminal

#### `Telegram Contact`

- Canonical name:
  - Telegram Contact
- Business meaning:
  - A person in direct contact, not yet through the first structured diagnostic step.
- Entry conditions:
  - The person joins the direct Telegram relationship.
- Exit conditions:
  - The person starts the Entry Test or becomes inactive.
- Terminal or non-terminal:
  - Non-terminal

#### `Test Participant`

- Canonical name:
  - Test Participant
- Business meaning:
  - A person actively engaging with the Entry Test.
- Entry conditions:
  - The person starts the Entry Test.
- Exit conditions:
  - The person completes the Entry Test or becomes inactive.
- Terminal or non-terminal:
  - Non-terminal

#### `Recommended`

- Canonical name:
  - Recommended
- Business meaning:
  - A person who received a recommendation for the next logical step.
- Entry conditions:
  - A recommendation is generated after diagnostic completion.
- Exit conditions:
  - The person purchases the recommended next step or becomes inactive.
- Terminal or non-terminal:
  - Non-terminal

#### `FOCUS Member`

- Canonical name:
  - FOCUS Member
- Business meaning:
  - A user with active FOCUS continuity.
- Entry conditions:
  - FOCUS access becomes active through a valid subscription event.
- Exit conditions:
  - The user upgrades, approaches expiration, or becomes inactive.
- Terminal or non-terminal:
  - Non-terminal

#### `Platform Subscriber`

- Canonical name:
  - Platform Subscriber
- Business meaning:
  - A user with active ABSystem Platform continuity.
- Entry conditions:
  - Platform access becomes active through a valid subscription event.
- Exit conditions:
  - The user upgrades, approaches expiration, or becomes inactive.
- Terminal or non-terminal:
  - Non-terminal

#### `Premium Client`

- Canonical name:
  - Premium Client
- Business meaning:
  - A user in a premium human-led relationship layer.
- Entry conditions:
  - A valid premium movement occurs.
- Exit conditions:
  - The relationship steps down, approaches expiration, or becomes inactive.
- Terminal or non-terminal:
  - Non-terminal

#### `Subscription Expiring`

- Canonical name:
  - Subscription Expiring
- Business meaning:
  - A user whose paid continuity is at immediate risk of ending.
- Entry conditions:
  - The business has valid grounds to classify the active paid relationship as expiring.
- Exit conditions:
  - The subscription renews, expires, or the user returns to active continuity.
- Terminal or non-terminal:
  - Non-terminal

#### `Subscription Expired`

- Canonical name:
  - Subscription Expired
- Business meaning:
  - A user whose prior paid continuity has ended.
- Entry conditions:
  - The valid paid continuity has expired.
- Exit conditions:
  - The user reactivates through a valid subscription event or becomes archived.
- Terminal or non-terminal:
  - Non-terminal

#### `Inactive`

- Canonical name:
  - Inactive
- Business meaning:
  - A person whose business relationship is no longer currently active in the intended path.
- Entry conditions:
  - A valid drop-off or exit condition occurs.
- Exit conditions:
  - The person re-enters the ecosystem through a valid path or becomes archived.
- Terminal or non-terminal:
  - Non-terminal

#### `Archived`

- Canonical name:
  - Archived
- Business meaning:
  - A relationship retained only for historical business reference.
- Entry conditions:
  - The user is no longer part of the active recoverable business relationship.
- Exit conditions:
  - None
- Terminal or non-terminal:
  - Terminal

### Subscription Record

#### `Intended`

- Canonical name:
  - Intended
- Business meaning:
  - A subscription target exists conceptually, but continuity is not yet active.
- Entry conditions:
  - A paid continuity path is identified but not yet activated.
- Exit conditions:
  - The subscription activates or remains unrealized.
- Terminal or non-terminal:
  - Non-terminal

#### `Active`

- Canonical name:
  - Active
- Business meaning:
  - The subscription currently grants continuity of access.
- Entry conditions:
  - A valid activation or renewal event occurs.
- Exit conditions:
  - The subscription begins expiring, upgrades, downgrades, or expires.
- Terminal or non-terminal:
  - Non-terminal

#### `Expiring`

- Canonical name:
  - Expiring
- Business meaning:
  - The subscription remains current but is at immediate risk of ending.
- Entry conditions:
  - The business classifies the active subscription as nearing its end.
- Exit conditions:
  - Renewal, upgrade, downgrade, or expiration occurs.
- Terminal or non-terminal:
  - Non-terminal

#### `Expired`

- Canonical name:
  - Expired
- Business meaning:
  - The subscription continuity has ended.
- Entry conditions:
  - A subscription expiration event occurs.
- Exit conditions:
  - Renewal or fresh activation occurs.
- Terminal or non-terminal:
  - Non-terminal

#### `Renewed`

- Canonical name:
  - Renewed
- Business meaning:
  - The subscription has been explicitly continued.
- Entry conditions:
  - A renewal event occurs.
- Exit conditions:
  - The renewed continuity returns to active service or later becomes expiring again.
- Terminal or non-terminal:
  - Non-terminal

#### `Upgraded`

- Canonical name:
  - Upgraded
- Business meaning:
  - The subscription has moved into a higher continuity tier or scope.
- Entry conditions:
  - An upgrade event occurs.
- Exit conditions:
  - The upgraded continuity becomes active under the new scope.
- Terminal or non-terminal:
  - Non-terminal

#### `Downgraded`

- Canonical name:
  - Downgraded
- Business meaning:
  - The subscription has moved into a narrower continuity tier or scope.
- Entry conditions:
  - A downgrade event occurs.
- Exit conditions:
  - The downgraded continuity becomes active under the new scope.
- Terminal or non-terminal:
  - Non-terminal

### Recommendation Record

#### `Generated`

- Canonical name:
  - Generated
- Business meaning:
  - The recommendation has been formed as a valid business suggestion.
- Entry conditions:
  - A valid recommendation event occurs.
- Exit conditions:
  - The recommendation is delivered, accepted, declined, or expires.
- Terminal or non-terminal:
  - Non-terminal

#### `Delivered`

- Canonical name:
  - Delivered
- Business meaning:
  - The recommendation has reached the user as an active next-step suggestion.
- Entry conditions:
  - The recommendation is made visible in the business journey.
- Exit conditions:
  - The recommendation is accepted, declined, or expires.
- Terminal or non-terminal:
  - Non-terminal

#### `Accepted`

- Canonical name:
  - Accepted
- Business meaning:
  - The user has acted on the recommendation in a way recognized by the business.
- Entry conditions:
  - A valid downstream event fulfills the recommendation.
- Exit conditions:
  - None
- Terminal or non-terminal:
  - Terminal

#### `Declined`

- Canonical name:
  - Declined
- Business meaning:
  - The user has explicitly or behaviorally rejected the recommendation.
- Entry conditions:
  - A valid business fact shows non-acceptance with decision meaning.
- Exit conditions:
  - None
- Terminal or non-terminal:
  - Terminal

#### `Expired`

- Canonical name:
  - Expired
- Business meaning:
  - The recommendation is no longer the valid active next-step offer in its original form.
- Entry conditions:
  - A newer state or event makes the prior recommendation no longer active.
- Exit conditions:
  - None
- Terminal or non-terminal:
  - Terminal

### Product Record

#### `Draft`

- Canonical name:
  - Draft
- Business meaning:
  - The product is conceptually defined but not yet operating as an active business offer.
- Entry conditions:
  - Product intent and boundaries are defined.
- Exit conditions:
  - The product enters bounded live evaluation.
- Terminal or non-terminal:
  - Non-terminal

#### `Beta`

- Canonical name:
  - Beta
- Business meaning:
  - The product is live in a bounded and evaluative business context.
- Entry conditions:
  - The product is intentionally tested in a real but controlled environment.
- Exit conditions:
  - The product stabilizes into active use or is withdrawn.
- Terminal or non-terminal:
  - Non-terminal

#### `Active`

- Canonical name:
  - Active
- Business meaning:
  - The product is part of the normal operating business ecosystem.
- Entry conditions:
  - The product has stable business purpose and ownership.
- Exit conditions:
  - The product is intentionally reduced or retired.
- Terminal or non-terminal:
  - Non-terminal

#### `Deprecated`

- Canonical name:
  - Deprecated
- Business meaning:
  - The product remains known but is no longer part of forward expansion.
- Entry conditions:
  - The business decides the product should no longer be strategically expanded.
- Exit conditions:
  - The product becomes only historical.
- Terminal or non-terminal:
  - Non-terminal

#### `Archived`

- Canonical name:
  - Archived
- Business meaning:
  - The product remains only as historical business record.
- Entry conditions:
  - The product is no longer active or supported.
- Exit conditions:
  - None
- Terminal or non-terminal:
  - Terminal

### AI Agent Record

#### `Proposed`

- Canonical name:
  - Proposed
- Business meaning:
  - The agent is recognized as a candidate business capability but not yet active.
- Entry conditions:
  - A valid architectural intention exists.
- Exit conditions:
  - The agent becomes active or is abandoned.
- Terminal or non-terminal:
  - Non-terminal

#### `Active`

- Canonical name:
  - Active
- Business meaning:
  - The agent is part of the canonical active AI capability set.
- Entry conditions:
  - The agent is approved for active use.
- Exit conditions:
  - The agent is deprecated.
- Terminal or non-terminal:
  - Non-terminal

#### `Deprecated`

- Canonical name:
  - Deprecated
- Business meaning:
  - The agent remains known but should no longer be extended as an active business capability.
- Entry conditions:
  - A valid governance decision reduces its forward role.
- Exit conditions:
  - The agent is archived.
- Terminal or non-terminal:
  - Non-terminal

#### `Archived`

- Canonical name:
  - Archived
- Business meaning:
  - The agent remains only as historical business architecture record.
- Entry conditions:
  - The agent is no longer part of the active AI capability set.
- Exit conditions:
  - None
- Terminal or non-terminal:
  - Terminal

### AI Workflow Record

#### `Proposed`

- Canonical name:
  - Proposed
- Business meaning:
  - The workflow is recognized as a candidate orchestration pattern but is not active yet.
- Entry conditions:
  - A valid workflow concept exists.
- Exit conditions:
  - The workflow becomes active or is abandoned.
- Terminal or non-terminal:
  - Non-terminal

#### `Active`

- Canonical name:
  - Active
- Business meaning:
  - The workflow is part of the active canonical orchestration set.
- Entry conditions:
  - The workflow is approved for canonical business use.
- Exit conditions:
  - The workflow is deprecated.
- Terminal or non-terminal:
  - Non-terminal

#### `Deprecated`

- Canonical name:
  - Deprecated
- Business meaning:
  - The workflow is still known but is no longer part of forward orchestration strategy.
- Entry conditions:
  - A valid governance decision reduces its forward role.
- Exit conditions:
  - The workflow is archived.
- Terminal or non-terminal:
  - Non-terminal

#### `Archived`

- Canonical name:
  - Archived
- Business meaning:
  - The workflow remains only as historical architecture record.
- Entry conditions:
  - The workflow is no longer active or supported.
- Exit conditions:
  - None
- Terminal or non-terminal:
  - Terminal

## Transition Matrix

### User Lifecycle Record

| Current State | Business Event | Business Rule | Next State | Responsible Actor |
| --- | --- | --- | --- | --- |
| Anonymous | Telegram Joined | BR-018, BR-001 | Telegram Contact | Business relationship entry function |
| Telegram Contact | Entry Test Started | BR-018, BR-001 | Test Participant | User |
| Test Participant | Entry Test Completed | BR-018, BR-001 | Recommended | Recommendation generation layer |
| Recommended | Recommendation Generated | BR-006, BR-018, BR-001 | Recommended | Recommendation layer confirms and preserves state |
| Recommended | Subscription Activated | BR-007, BR-008, BR-018, BR-001 | FOCUS Member | Monetization continuity layer |
| FOCUS Member | Subscription Upgraded | BR-007, BR-008, BR-011, BR-018, BR-001 | Platform Subscriber | Monetization continuity layer |
| Platform Subscriber | Strategy Session Booked | BR-011, BR-018, BR-001 | Premium Client | Premium sales / service qualification layer |
| FOCUS Member | Subscription Expired | BR-007, BR-008, BR-018, BR-001 | Subscription Expired | Monetization continuity layer |
| Platform Subscriber | Subscription Expired | BR-007, BR-008, BR-018, BR-001 | Subscription Expired | Monetization continuity layer |
| Premium Client | Subscription Expired | BR-007, BR-008, BR-018, BR-001 | Subscription Expired | Monetization continuity layer |
| Subscription Expired | Subscription Renewed | BR-007, BR-008, BR-018, BR-001 | FOCUS Member or Platform Subscriber, depending on renewed scope | Monetization continuity layer |
| Inactive | Telegram Joined | BR-013, BR-018, BR-001 | Telegram Contact | Recovery / re-entry path |

### Subscription Record

| Current State | Business Event | Business Rule | Next State | Responsible Actor |
| --- | --- | --- | --- | --- |
| Intended | Subscription Activated | BR-007, BR-018 | Active | Monetization continuity layer |
| Active | Subscription Renewed | BR-007, BR-012, BR-018 | Renewed | Monetization continuity layer |
| Renewed | Payment Received | BR-007, BR-012, BR-018 | Active | Monetization continuity layer |
| Active | Subscription Upgraded | BR-007, BR-011, BR-018 | Upgraded | Monetization continuity layer |
| Upgraded | Payment Received | BR-007, BR-018 | Active | Monetization continuity layer |
| Active | Subscription Downgraded | BR-007, BR-018 | Downgraded | Monetization continuity layer |
| Downgraded | Payment Received | BR-007, BR-018 | Active | Monetization continuity layer |
| Active | Subscription Expired | BR-007, BR-018 | Expired | Monetization continuity layer |
| Expired | Subscription Renewed | BR-007, BR-012, BR-018 | Renewed | Monetization continuity layer |
| Expired | Subscription Activated | BR-007, BR-018 | Active | Monetization continuity layer |

### Recommendation Record

| Current State | Business Event | Business Rule | Next State | Responsible Actor |
| --- | --- | --- | --- | --- |
| Generated | Recommendation Generated | BR-006, BR-018 | Delivered | Recommendation layer |
| Delivered | Subscription Activated | BR-006, BR-007, BR-018 | Accepted | Monetization continuity layer |
| Delivered | Course Purchased | BR-006, BR-018 | Accepted | User / monetization layer |
| Delivered | Strategy Session Booked | BR-006, BR-011, BR-018 | Accepted | Premium movement layer |
| Delivered | Recommendation Generated | BR-006, BR-018 | Expired | Recommendation layer supersedes prior suggestion |

### Product Record

No canonical Business Events currently exist in `docs/foundation/05-business-events.md` for Product Record lifecycle movement between:

- Draft
- Beta
- Active
- Deprecated
- Archived

Therefore no runtime transition is currently authorized.

Implementation must not invent Product Record lifecycle transitions until canonical Product-related Business Events are added to the Foundation.

### AI Agent Record

No canonical Business Events currently exist in `docs/foundation/05-business-events.md` for AI Agent lifecycle movement between:

- Proposed
- Active
- Deprecated
- Archived

Therefore no runtime transition is currently authorized.

Implementation must not invent AI Agent lifecycle transitions until canonical governance Business Events are added to the Foundation.

### AI Workflow Record

No canonical Business Events currently exist in `docs/foundation/05-business-events.md` for AI Workflow lifecycle movement between:

- Proposed
- Active
- Deprecated
- Archived

Therefore no runtime transition is currently authorized.

Implementation must not invent AI Workflow lifecycle transitions until canonical governance Business Events are added to the Foundation.

## Invalid Transitions

### User Lifecycle Record

- Anonymous → Recommended
  - Invalid because no direct Business Event canonically bypasses direct contact and test participation.

- Telegram Contact → FOCUS Member
  - Invalid because recommendation and valid subscription activation are required first.

- Test Participant → Premium Client
  - Invalid because the funnel and lifecycle canon do not allow direct premium jump from test participation.

- Subscription Expired → Premium Client without a valid reactivation event
  - Invalid because state recovery must be grounded in a valid subscription or premium-entry event.

- Archived → any non-archived state
  - Invalid because Archived is terminal.

### Subscription Record

- Intended → Renewed
  - Invalid because renewal presumes prior active continuity.

- Active → Intended
  - Invalid because continuity cannot regress into pre-activation intent without ending or expiring first.

- Expired → Upgraded without activation or renewal
  - Invalid because a dead continuity relationship must be re-established before scope change.

### Recommendation Record

- Generated → Accepted without a fulfilling business event
  - Invalid because recommendations do not change state directly through suggestion alone.

- Delivered → Generated
  - Invalid because delivery is downstream of generation.

- Accepted → Delivered
  - Invalid because Accepted is terminal.

- Declined → Accepted without a new recommendation cycle
  - Invalid because a declined recommendation must be replaced by a new valid recommendation context.

### Product Record

- Any Product lifecycle transition triggered only by implementation choice
  - Invalid because no canonical Product Business Event currently authorizes such movement.

### AI Agent Record

- Proposed → Active without a canonical governance Business Event
  - Invalid because no canonically defined event authorizes the transition.

- Active → Deprecated without a canonical governance Business Event
  - Invalid because no canonically defined event authorizes the transition.

### AI Workflow Record

- Proposed → Active without a canonical governance Business Event
  - Invalid because no canonically defined event authorizes the transition.

- Active → Deprecated without a canonical governance Business Event
  - Invalid because no canonically defined event authorizes the transition.

## State Ownership

### User Lifecycle Record transitions

- Who initiates it:
  - User, monetization continuity layer, premium qualification layer, or recovery path depending on the triggering Business Event
- Who authorizes it:
  - Business architecture through the canonical lifecycle and business rules
- Who records it:
  - Canonical lifecycle interpretation layer
- Who observes it:
  - Product teams
  - AI Agents
  - AI Workflows
  - Support
  - Operations

### Subscription Record transitions

- Who initiates it:
  - User action or monetization continuity layer through valid payment and subscription events
- Who authorizes it:
  - Monetization leadership under Business Rules
- Who records it:
  - Canonical subscription continuity layer
- Who observes it:
  - User lifecycle interpretation
  - AI Agents
  - AI Workflows
  - Support
  - Operations

### Recommendation Record transitions

- Who initiates it:
  - Recommendation guidance layer or user-fulfilling downstream action
- Who authorizes it:
  - Business architecture and recommendation governance under canonical rules
- Who records it:
  - Canonical recommendation layer
- Who observes it:
  - Funnel layer
  - AI Agents
  - AI Workflows
  - Product and growth teams

### Product Record transitions

- Who initiates it:
  - Not canonically authorized yet
- Who authorizes it:
  - No runtime authorization exists until canonical Product Business Events are added
- Who records it:
  - No runtime recording authority exists yet for state movement
- Who observes it:
  - Enterprise architecture
  - Product architecture

### AI Agent Record transitions

- Who initiates it:
  - Not canonically authorized yet
- Who authorizes it:
  - No runtime authorization exists until canonical governance Business Events are added
- Who records it:
  - No runtime recording authority exists yet for state movement
- Who observes it:
  - AI systems architecture
  - Enterprise architecture

### AI Workflow Record transitions

- Who initiates it:
  - Not canonically authorized yet
- Who authorizes it:
  - No runtime authorization exists until canonical governance Business Events are added
- Who records it:
  - No runtime recording authority exists yet for state movement
- Who observes it:
  - AI systems architecture
  - Enterprise architecture

## AI Agent Responsibilities

### Funnel Agent

- Which state machines it may observe:
  - User Lifecycle Record
  - Recommendation Record
- Which transitions it may request:
  - Recommendation Record: Generated → Delivered
- Which transitions it may never trigger:
  - Any Subscription Record transition
  - Any terminal User Lifecycle transition

### Recommendation Agent

- Which state machines it may observe:
  - User Lifecycle Record
  - Recommendation Record
- Which transitions it may request:
  - Recommendation Record: Generated → Delivered
- Which transitions it may never trigger:
  - Subscription Record transitions
  - Direct User Lifecycle transitions into paid states

### Onboarding Agent

- Which state machines it may observe:
  - User Lifecycle Record
  - Recommendation Record
- Which transitions it may request:
  - None directly; it may request recommendation delivery actions
- Which transitions it may never trigger:
  - Subscription Record transitions
  - Terminal User Lifecycle transitions

### Engagement Agent

- Which state machines it may observe:
  - User Lifecycle Record
  - Recommendation Record
- Which transitions it may request:
  - Recommendation refresh through a new recommendation cycle
- Which transitions it may never trigger:
  - Subscription activation or expiration
  - Direct lifecycle upgrades

### Progress Agent

- Which state machines it may observe:
  - User Lifecycle Record
  - Recommendation Record
- Which transitions it may request:
  - None as canonical state transitions
- Which transitions it may never trigger:
  - Subscription transitions
  - Lifecycle transitions

### Reflection Agent

- Which state machines it may observe:
  - User Lifecycle Record
  - Recommendation Record
- Which transitions it may request:
  - Recommendation refresh through valid recommendation context
- Which transitions it may never trigger:
  - Subscription transitions
  - Lifecycle transitions into paid or premium states

### Coach Agent

- Which state machines it may observe:
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Which transitions it may request:
  - Premium-movement-related recommendations
- Which transitions it may never trigger:
  - Direct Subscription Record transitions
  - Direct User Lifecycle transitions without valid business event

### Subscription Agent

- Which state machines it may observe:
  - Subscription Record
  - User Lifecycle Record
- Which transitions it may request:
  - Intended → Active
  - Active → Renewed
  - Active → Upgraded
  - Active → Downgraded
  - Active → Expired
  - Expired → Renewed
  - Expired → Active
- Which transitions it may never trigger:
  - Recommendation terminal transitions
  - Product governance transitions

### Retention Agent

- Which state machines it may observe:
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Which transitions it may request:
  - Recommendation refresh or recovery-oriented recommendation cycles
- Which transitions it may never trigger:
  - Direct subscription activation without valid monetization event
  - Direct lifecycle movement into paid states

### Payment Agent

- Which state machines it may observe:
  - Subscription Record
  - User Lifecycle Record
- Which transitions it may request:
  - Intended → Active
  - Active → Renewed
  - Upgraded → Active
  - Downgraded → Active
  - Expired → Active
- Which transitions it may never trigger:
  - Product governance transitions
  - AI Agent or AI Workflow governance transitions

### Notification Agent

- Which state machines it may observe:
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Which transitions it may request:
  - Recommendation delivery-related state movement
- Which transitions it may never trigger:
  - Subscription activation, upgrade, downgrade, or expiration
  - User lifecycle paid-state transitions

### Analytics Agent

- Which state machines it may observe:
  - All canonical operational state machines
- Which transitions it may request:
  - None
- Which transitions it may never trigger:
  - Any business state transition

### Referral Agent

- Which state machines it may observe:
  - User Lifecycle Record
  - Recommendation Record
- Which transitions it may request:
  - Recommendation refresh through referral-conversion context
- Which transitions it may never trigger:
  - Subscription transitions
  - Direct user lifecycle transitions without valid re-entry event

## Cross References

- Domain entities and boundaries:
  - `docs/architecture/01-domain-model.md`
- Business objects and mutable attributes:
  - `docs/architecture/02-data-model.md`
- Canonical Business Events:
  - `docs/foundation/05-business-events.md`
- Canonical Business Rules:
  - `docs/foundation/09-business-rules.md`
- Canonical AI Agents:
  - `docs/foundation/06-ai-agents.md`
- Canonical AI Workflows:
  - `docs/foundation/07-ai-workflows.md`
- Canonical User Lifecycle:
  - `docs/foundation/04-user-lifecycle.md`
- Canonical Product and Subscription model:
  - `docs/foundation/02-products.md`

## Governance

### Adding states

A new business state may be added only when:

- it belongs to an existing canonical business object;
- it describes a distinct business reality not already covered by another state;
- its meaning, entry conditions, and exit conditions are explicit;
- its existence does not duplicate another state.

### Adding transitions

A new transition may be added only when:

- it originates from an existing canonical Business Event;
- it is governed by at least one existing canonical Business Rule;
- it does not contradict an existing state machine;
- it preserves deterministic behavior.

### Deprecating states

A state may be deprecated only when:

- the underlying business reality no longer exists; or
- the state has been fully absorbed by another canonical state without ambiguity.

Deprecated states must remain historically understandable until all dependent documentation and implementation are aligned.

### Versioning

State machines must version with the canonical architecture.

No implementation may add local undocumented transitions.

Any change to a canonical state machine requires corresponding review against:

- Business Events
- Business Rules
- Domain Model
- Data Model
- AI Agent responsibilities
