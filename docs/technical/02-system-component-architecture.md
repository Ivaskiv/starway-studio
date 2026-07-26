# Document

System Component Architecture

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
- `docs/architecture/04-business-processes.md`
- `docs/architecture/05-ai-capability-model.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/technical/01-ai-service-architecture.md`
- `docs/technical/03-api-architecture.md`
- `docs/engineering/02-module-blueprint.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The System Component Architecture exists to define the internal logical components of each canonical service in the Starway / ABSystem AI platform.

It answers one question:

Inside each logical service, which components exist, what does each component own, and how are they allowed to collaborate?

This document refines the service layer without changing service boundaries, business capabilities, or business process ownership.

It does not define code structure, APIs, storage, runtime processes, or deployment.

Its purpose is to make internal service composition explicit, deterministic, and replaceable.

## Component Principles

1. Single responsibility.
   Every component must own one coherent internal responsibility.

2. Replaceable components.
   A component should be logically swappable without changing the service’s business ownership boundary.

3. Explicit dependencies.
   Every component dependency must be named and justified.

4. High cohesion.
   The responsibilities inside one component must strongly belong together.

5. Low coupling.
   Components should collaborate through explicit inputs and outputs, not hidden assumptions.

6. No ownership leakage.
   A component may support another component, but it must not silently absorb that component’s responsibility.

7. Service-first containment.
   Components exist inside one service boundary and may not redefine service ownership.

## Component Inventory

### Funnel Service

#### Funnel Context Reader

- Purpose:
  - Assemble the canonical funnel-relevant business context for one user or relationship.
- Owned responsibility:
  - Read and normalize funnel inputs before routing decisions.
- Dependencies:
  - Business Data canon
  - User and lifecycle context

#### Entry Routing Component

- Purpose:
  - Determine the valid entry, continuation, or re-entry path inside the funnel.
- Owned responsibility:
  - Own canonical funnel routing decisions inside the service.
- Dependencies:
  - Funnel Context Reader
  - Business Rule context

#### Onboarding Guidance Component

- Purpose:
  - Produce the first-step guidance for new direct contacts.
- Owned responsibility:
  - Own onboarding guidance inside funnel boundaries.
- Dependencies:
  - Funnel Context Reader
  - Entry Routing Component

#### Funnel Handover Component

- Purpose:
  - Hand off routing outcomes to downstream services.
- Owned responsibility:
  - Own outbound handover from Funnel Service to Recommendation, Notification, or Retention-related flows.
- Dependencies:
  - Entry Routing Component
  - Onboarding Guidance Component

### Recommendation Service

#### Recommendation Context Reader

- Purpose:
  - Assemble recommendation-relevant context from user, lifecycle, product, and event data.
- Owned responsibility:
  - Own read-side preparation for recommendation decisions.
- Dependencies:
  - Business Data canon
  - Business Event canon

#### Recommendation Decision Component

- Purpose:
  - Determine the most valid next-step recommendation.
- Owned responsibility:
  - Own recommendation-generation logic inside canonical recommendation boundaries.
- Dependencies:
  - Recommendation Context Reader
  - Business Rule context

#### Recommendation Refresh Component

- Purpose:
  - Determine whether an existing recommendation remains valid or should be replaced.
- Owned responsibility:
  - Own recommendation refresh and supersession decisions.
- Dependencies:
  - Recommendation Context Reader
  - Recommendation Decision Component

#### Reflection Interpretation Component

- Purpose:
  - Translate reflection signals into recommendation-relevant context.
- Owned responsibility:
  - Own the reflection-to-recommendation bridge inside the service.
- Dependencies:
  - Recommendation Context Reader
  - Reflection-related event context

#### Recommendation Handover Component

- Purpose:
  - Deliver recommendation outcomes to Notification Service or Coach Support Service.
- Owned responsibility:
  - Own outbound service handovers for recommendation results.
- Dependencies:
  - Recommendation Decision Component
  - Recommendation Refresh Component

### Engagement Service

#### Participation Context Reader

- Purpose:
  - Assemble current participation and engagement context.
- Owned responsibility:
  - Own read-side preparation for engagement decisions.
- Dependencies:
  - Business Data canon
  - Participation event context

#### Engagement Decision Component

- Purpose:
  - Determine the most valid engagement-support action.
- Owned responsibility:
  - Own active participation support decisions.
- Dependencies:
  - Participation Context Reader
  - Business Rule context

#### Progress Interpretation Component

- Purpose:
  - Interpret participation continuity as progress context.
- Owned responsibility:
  - Own progress interpretation inside engagement boundaries.
- Dependencies:
  - Participation Context Reader
  - Engagement Decision Component

#### Engagement Handover Component

- Purpose:
  - Hand off engagement outcomes to Reflection, Analytics, Coach Support, or Notification flows.
- Owned responsibility:
  - Own outbound collaboration from Engagement Service.
- Dependencies:
  - Engagement Decision Component
  - Progress Interpretation Component

### Coach Support Service

#### Coach Context Reader

- Purpose:
  - Assemble coach-relevant user, lifecycle, subscription, and product context.
- Owned responsibility:
  - Own read-side preparation for coach-support decisions.
- Dependencies:
  - Business Data canon
  - Delivery-related event context

#### Premium Context Review Component

- Purpose:
  - Evaluate whether premium-context signals require human-bound review.
- Owned responsibility:
  - Own premium-context interpretation up to the human decision boundary.
- Dependencies:
  - Coach Context Reader
  - Business Rule context

#### Coach Preparation Component

- Purpose:
  - Translate context into actionable human-facing preparation support.
- Owned responsibility:
  - Own coach-preparation outputs.
- Dependencies:
  - Coach Context Reader
  - Premium Context Review Component

#### Human Escalation Component

- Purpose:
  - Trigger escalation to the human decision boundary when required.
- Owned responsibility:
  - Own the coach-support-to-human escalation handover.
- Dependencies:
  - Premium Context Review Component
  - Coach Preparation Component

### Continuity Service

#### Payment Outcome Reader

- Purpose:
  - Interpret canonical payment outcomes in continuity context.
- Owned responsibility:
  - Own read-side preparation for payment-related continuity handling.
- Dependencies:
  - Payment-related Business Events
  - Subscription context

#### Continuity State Evaluator

- Purpose:
  - Determine whether continuity is activation, renewal, upgrade, downgrade, or expiration.
- Owned responsibility:
  - Own canonical continuity classification.
- Dependencies:
  - Payment Outcome Reader
  - Business Rule context
  - State Machine canon

#### Access Continuity Component

- Purpose:
  - Translate continuity classification into allowed access continuity outcomes.
- Owned responsibility:
  - Own continuity outcome interpretation against lifecycle and access policy context.
- Dependencies:
  - Continuity State Evaluator
  - Access policy context

#### Continuity Handover Component

- Purpose:
  - Pass continuity outcomes to Notification Service, Retention Service, or funnel-relevant consumers.
- Owned responsibility:
  - Own outbound service handovers from Continuity Service.
- Dependencies:
  - Continuity State Evaluator
  - Access Continuity Component

### Retention Service

#### Retention Context Reader

- Purpose:
  - Assemble churn-risk, expired continuity, and recovery context.
- Owned responsibility:
  - Own read-side preparation for recovery decisions.
- Dependencies:
  - Business Data canon
  - Recovery-related event context

#### Recovery Path Decision Component

- Purpose:
  - Determine the valid canonical recovery path.
- Owned responsibility:
  - Own recovery-path selection.
- Dependencies:
  - Retention Context Reader
  - Business Rule context

#### Recovery Recommendation Component

- Purpose:
  - Determine whether recovery should include refreshed next-step guidance.
- Owned responsibility:
  - Own recovery-oriented recommendation support inside retention boundaries.
- Dependencies:
  - Retention Context Reader
  - Recovery Path Decision Component

#### Retention Handover Component

- Purpose:
  - Hand off recovery outcomes to Funnel Service, Recommendation Service, Notification Service, or Continuity Service.
- Owned responsibility:
  - Own outbound service handovers from Retention Service.
- Dependencies:
  - Recovery Path Decision Component
  - Recovery Recommendation Component

### Notification Service

#### Message Context Reader

- Purpose:
  - Assemble lifecycle, continuity, recommendation, and process-stage context for communication.
- Owned responsibility:
  - Own read-side preparation for business communication decisions.
- Dependencies:
  - Business Data canon
  - Process-stage context

#### Message Selection Component

- Purpose:
  - Determine which valid business communication should be produced.
- Owned responsibility:
  - Own communication selection inside canonical messaging boundaries.
- Dependencies:
  - Message Context Reader
  - Business Rule context

#### Delivery Orchestration Component

- Purpose:
  - Coordinate message delivery as a logical business outcome.
- Owned responsibility:
  - Own delivery sequencing and message-output preparation.
- Dependencies:
  - Message Selection Component

#### Communication Escalation Component

- Purpose:
  - Escalate communication to coach-aware or human-review contexts when needed.
- Owned responsibility:
  - Own exceptional communication escalation.
- Dependencies:
  - Message Selection Component
  - Delivery Orchestration Component

### Analytics Service

#### Insight Context Reader

- Purpose:
  - Assemble cross-process business context for interpretation.
- Owned responsibility:
  - Own read-side preparation for analytics decisions.
- Dependencies:
  - Business Data canon
  - Business Event canon

#### Pattern Interpretation Component

- Purpose:
  - Interpret cross-process business patterns.
- Owned responsibility:
  - Own business pattern interpretation.
- Dependencies:
  - Insight Context Reader
  - Business Rule context

#### Strategic Review Component

- Purpose:
  - Determine whether insight should escalate to human strategic review.
- Owned responsibility:
  - Own strategic-review escalation decisions.
- Dependencies:
  - Pattern Interpretation Component

#### Analytics Handover Component

- Purpose:
  - Deliver interpretive outputs to business review and human oversight contexts.
- Owned responsibility:
  - Own outbound analytics handover.
- Dependencies:
  - Pattern Interpretation Component
  - Strategic Review Component

### Referral Service

#### Referral Context Reader

- Purpose:
  - Assemble referral-related business context and user linkage.
- Owned responsibility:
  - Own read-side preparation for referral interpretation.
- Dependencies:
  - Referral event context
  - User and lifecycle context

#### Referral Interpretation Component

- Purpose:
  - Determine whether referral context is only a signal or a valid conversion fact.
- Owned responsibility:
  - Own canonical referral interpretation.
- Dependencies:
  - Referral Context Reader
  - Business Rule context

#### Referral Routing Component

- Purpose:
  - Route valid referral conversion into standard funnel treatment.
- Owned responsibility:
  - Own referral-to-funnel handover preparation.
- Dependencies:
  - Referral Interpretation Component

#### Referral Handover Component

- Purpose:
  - Hand off referral outcomes to Funnel Service or Notification Service.
- Owned responsibility:
  - Own outbound service handovers from Referral Service.
- Dependencies:
  - Referral Interpretation Component
  - Referral Routing Component

## Component Responsibilities

### Funnel Context Reader

- Owns:
  - Funnel-relevant context assembly
- Consumes:
  - User Record
  - User Lifecycle Record
  - Funnel Stage Record
  - Recommendation context
- Produces:
  - Normalized funnel context
- Forbidden responsibilities:
  - Routing decisions
  - Recommendation generation

### Entry Routing Component

- Owns:
  - Funnel routing decisions
- Consumes:
  - Normalized funnel context
  - Business Rule context
- Produces:
  - Routing outcome
- Forbidden responsibilities:
  - Notification delivery
  - Subscription handling

### Onboarding Guidance Component

- Owns:
  - First-step onboarding guidance
- Consumes:
  - Normalized funnel context
  - Routing outcome
- Produces:
  - Onboarding guidance outcome
- Forbidden responsibilities:
  - Recommendation ownership
  - Continuity handling

### Funnel Handover Component

- Owns:
  - Outbound service handovers from Funnel Service
- Consumes:
  - Routing outcome
  - Onboarding guidance outcome
- Produces:
  - Handover payloads to downstream services
- Forbidden responsibilities:
  - Downstream decision ownership

### Recommendation Context Reader

- Owns:
  - Recommendation-relevant context assembly
- Consumes:
  - User context
  - Lifecycle context
  - Product context
  - Event context
- Produces:
  - Normalized recommendation context
- Forbidden responsibilities:
  - Recommendation decisions

### Recommendation Decision Component

- Owns:
  - Recommendation generation decisions
- Consumes:
  - Normalized recommendation context
  - Business Rule context
- Produces:
  - Recommendation outcome
- Forbidden responsibilities:
  - Notification delivery
  - Subscription handling

### Recommendation Refresh Component

- Owns:
  - Recommendation refresh decisions
- Consumes:
  - Normalized recommendation context
  - Existing recommendation context
- Produces:
  - Recommendation supersession outcome
- Forbidden responsibilities:
  - Funnel ownership
  - Premium approval

### Reflection Interpretation Component

- Owns:
  - Reflection-to-recommendation interpretation
- Consumes:
  - Reflection-related context
  - Recommendation context
- Produces:
  - Recommendation-relevant reflection output
- Forbidden responsibilities:
  - Coach escalation ownership

### Recommendation Handover Component

- Owns:
  - Recommendation outbound handovers
- Consumes:
  - Recommendation outcome
  - Refresh outcome
- Produces:
  - Handover payloads to Notification or Coach Support Service
- Forbidden responsibilities:
  - Delivery ownership

### Participation Context Reader

- Owns:
  - Participation and engagement context assembly
- Consumes:
  - User context
  - Product context
  - Subscription context
  - Participation events
- Produces:
  - Normalized participation context
- Forbidden responsibilities:
  - Engagement decisions

### Engagement Decision Component

- Owns:
  - Engagement-support decisions
- Consumes:
  - Normalized participation context
  - Business Rule context
- Produces:
  - Engagement outcome
- Forbidden responsibilities:
  - Progress interpretation ownership
  - Recommendation ownership

### Progress Interpretation Component

- Owns:
  - Progress interpretation
- Consumes:
  - Normalized participation context
  - Engagement outcome
- Produces:
  - Progress context
- Forbidden responsibilities:
  - Strategic analytics ownership
  - Subscription handling

### Engagement Handover Component

- Owns:
  - Outbound engagement service handovers
- Consumes:
  - Engagement outcome
  - Progress context
- Produces:
  - Handover payloads to downstream services
- Forbidden responsibilities:
  - Downstream decision ownership

### Coach Context Reader

- Owns:
  - Coach-relevant context assembly
- Consumes:
  - User context
  - Lifecycle context
  - Subscription context
  - Product context
  - Delivery events
- Produces:
  - Normalized coach context
- Forbidden responsibilities:
  - Premium decisions

### Premium Context Review Component

- Owns:
  - Premium-context interpretation
- Consumes:
  - Normalized coach context
  - Business Rule context
- Produces:
  - Premium review outcome
- Forbidden responsibilities:
  - Final premium approval

### Coach Preparation Component

- Owns:
  - Coach-facing preparation outputs
- Consumes:
  - Normalized coach context
  - Premium review outcome
- Produces:
  - Coach preparation outcome
- Forbidden responsibilities:
  - Human approval authority

### Human Escalation Component

- Owns:
  - Human escalation handover
- Consumes:
  - Premium review outcome
  - Coach preparation outcome
- Produces:
  - Human review request
- Forbidden responsibilities:
  - Acting as the human approver

### Payment Outcome Reader

- Owns:
  - Payment-context assembly
- Consumes:
  - Payment-related events
  - Subscription context
- Produces:
  - Normalized payment continuity context
- Forbidden responsibilities:
  - Continuity classification

### Continuity State Evaluator

- Owns:
  - Continuity classification decisions
- Consumes:
  - Normalized payment continuity context
  - Business Rule context
  - State Machine canon
- Produces:
  - Continuity classification outcome
- Forbidden responsibilities:
  - Notification delivery
  - Recovery ownership

### Access Continuity Component

- Owns:
  - Access continuity interpretation
- Consumes:
  - Continuity classification outcome
  - Access policy context
- Produces:
  - Access continuity outcome
- Forbidden responsibilities:
  - Funnel routing

### Continuity Handover Component

- Owns:
  - Outbound continuity handovers
- Consumes:
  - Continuity classification outcome
  - Access continuity outcome
- Produces:
  - Handover payloads to Notification, Retention, or Funnel consumers
- Forbidden responsibilities:
  - Downstream ownership

### Retention Context Reader

- Owns:
  - Recovery-context assembly
- Consumes:
  - User context
  - Lifecycle context
  - Subscription context
  - Recovery events
- Produces:
  - Normalized recovery context
- Forbidden responsibilities:
  - Recovery decisions

### Recovery Path Decision Component

- Owns:
  - Recovery-path decisions
- Consumes:
  - Normalized recovery context
  - Business Rule context
- Produces:
  - Recovery path outcome
- Forbidden responsibilities:
  - Subscription-state ownership

### Recovery Recommendation Component

- Owns:
  - Recovery-oriented recommendation support
- Consumes:
  - Normalized recovery context
  - Recovery path outcome
- Produces:
  - Recovery recommendation context
- Forbidden responsibilities:
  - Recommendation ownership outside retention scope

### Retention Handover Component

- Owns:
  - Outbound recovery handovers
- Consumes:
  - Recovery path outcome
  - Recovery recommendation context
- Produces:
  - Handover payloads to downstream services
- Forbidden responsibilities:
  - Downstream service ownership

### Message Context Reader

- Owns:
  - Communication-relevant context assembly
- Consumes:
  - User context
  - Lifecycle context
  - Subscription context
  - Recommendation context
  - Process context
- Produces:
  - Normalized message context
- Forbidden responsibilities:
  - Message selection

### Message Selection Component

- Owns:
  - Business communication selection
- Consumes:
  - Normalized message context
  - Business Rule context
- Produces:
  - Message decision outcome
- Forbidden responsibilities:
  - Business policy creation
  - Delivery orchestration ownership outside message selection

### Delivery Orchestration Component

- Owns:
  - Delivery sequencing and output preparation
- Consumes:
  - Message decision outcome
- Produces:
  - Delivery outcome
- Forbidden responsibilities:
  - Upstream business decision ownership

### Communication Escalation Component

- Owns:
  - Exceptional communication escalation
- Consumes:
  - Message decision outcome
  - Delivery outcome
- Produces:
  - Escalation handover
- Forbidden responsibilities:
  - Human approval authority

### Insight Context Reader

- Owns:
  - Analytics context assembly
- Consumes:
  - Cross-process business context
  - Business event context
- Produces:
  - Normalized insight context
- Forbidden responsibilities:
  - Pattern interpretation

### Pattern Interpretation Component

- Owns:
  - Pattern interpretation
- Consumes:
  - Normalized insight context
  - Business Rule context
- Produces:
  - Insight outcome
- Forbidden responsibilities:
  - Strategic human decision ownership
  - Source-of-truth mutation

### Strategic Review Component

- Owns:
  - Strategic escalation decisions
- Consumes:
  - Insight outcome
- Produces:
  - Strategic review request
- Forbidden responsibilities:
  - Autonomous strategic action

### Analytics Handover Component

- Owns:
  - Outbound analytics handovers
- Consumes:
  - Insight outcome
  - Strategic review request
- Produces:
  - Human review handover
- Forbidden responsibilities:
  - Business-state ownership

### Referral Context Reader

- Owns:
  - Referral-context assembly
- Consumes:
  - Referral events
  - User and lifecycle context
- Produces:
  - Normalized referral context
- Forbidden responsibilities:
  - Referral decisions

### Referral Interpretation Component

- Owns:
  - Referral interpretation decisions
- Consumes:
  - Normalized referral context
  - Business Rule context
- Produces:
  - Referral interpretation outcome
- Forbidden responsibilities:
  - Funnel ownership

### Referral Routing Component

- Owns:
  - Referral-to-funnel routing preparation
- Consumes:
  - Referral interpretation outcome
- Produces:
  - Referral routing outcome
- Forbidden responsibilities:
  - Funnel decision ownership

### Referral Handover Component

- Owns:
  - Outbound referral handovers
- Consumes:
  - Referral interpretation outcome
  - Referral routing outcome
- Produces:
  - Handover payloads to Funnel or Notification Service
- Forbidden responsibilities:
  - Downstream service ownership

## Component Collaboration

### Funnel Service

- Collaboration flow:
  - Funnel Context Reader gathers canonical context
  - Entry Routing Component determines the valid path
  - Onboarding Guidance Component adds first-step guidance where relevant
  - Funnel Handover Component passes the outcome to downstream services

### Recommendation Service

- Collaboration flow:
  - Recommendation Context Reader gathers canonical recommendation inputs
  - Recommendation Decision Component determines the valid next-step recommendation
  - Recommendation Refresh Component decides whether an older recommendation remains valid
  - Reflection Interpretation Component enriches recommendation context when reflection matters
  - Recommendation Handover Component routes the outcome outward

### Engagement Service

- Collaboration flow:
  - Participation Context Reader gathers active participation context
  - Engagement Decision Component chooses the best engagement-support action
  - Progress Interpretation Component derives progress context
  - Engagement Handover Component routes outputs to dependent services

### Coach Support Service

- Collaboration flow:
  - Coach Context Reader gathers delivery and premium-context data
  - Premium Context Review Component determines whether human-bound review is needed
  - Coach Preparation Component produces coach-facing support
  - Human Escalation Component escalates when the human boundary is reached

### Continuity Service

- Collaboration flow:
  - Payment Outcome Reader gathers continuity-relevant payment context
  - Continuity State Evaluator classifies the continuity outcome
  - Access Continuity Component interprets access consequences
  - Continuity Handover Component routes the outcome to dependent services

### Retention Service

- Collaboration flow:
  - Retention Context Reader gathers recovery context
  - Recovery Path Decision Component selects the valid return path
  - Recovery Recommendation Component determines whether refreshed guidance is needed
  - Retention Handover Component coordinates downstream service handoffs

### Notification Service

- Collaboration flow:
  - Message Context Reader assembles communication context
  - Message Selection Component chooses the correct message outcome
  - Delivery Orchestration Component prepares the logical delivery
  - Communication Escalation Component handles exceptional escalation paths

### Analytics Service

- Collaboration flow:
  - Insight Context Reader gathers cross-process context
  - Pattern Interpretation Component produces insight
  - Strategic Review Component determines whether human review is needed
  - Analytics Handover Component passes outputs to review contexts

### Referral Service

- Collaboration flow:
  - Referral Context Reader gathers referral-related context
  - Referral Interpretation Component decides whether the referral is only a signal or a valid conversion fact
  - Referral Routing Component prepares funnel-aligned routing
  - Referral Handover Component passes outcomes to Funnel or Notification Service

## Component Dependency Rules

### Allowed dependencies

- A Reader component may feed Decision, Interpretation, Review, or Routing components inside the same service.
- A Decision or Interpretation component may feed Handover or Escalation components inside the same service.
- A Preparation component may depend on Context Reader and Review components inside the same service.
- A Handover component may depend on any completed upstream internal component output inside the same service.

### Forbidden dependencies

- A Reader component may not depend on a downstream Handover component.
- A Handover component may not determine the business decision it only carries outward.
- An Escalation component may not replace the decision or review component that triggered it.
- A Routing component inside one service may not own another service’s decision boundary.
- No component may depend on hidden internal state from another service.
- No component may create undocumented cross-service ownership.

## Component Responsibility Matrix

| Component | Purpose | Consumes | Produces | Dependencies | Forbidden Responsibilities |
| --- | --- | --- | --- | --- | --- |
| Funnel Context Reader | Assemble funnel context | User, Lifecycle, Funnel Stage, Recommendation | Normalized funnel context | Business data context | Routing decisions, recommendation generation |
| Entry Routing Component | Determine funnel path | Normalized funnel context, rules | Routing outcome | Funnel Context Reader | Notification delivery, subscription handling |
| Onboarding Guidance Component | Produce first-step guidance | Funnel context, routing outcome | Onboarding guidance outcome | Funnel Context Reader, Entry Routing Component | Recommendation ownership, continuity handling |
| Funnel Handover Component | Pass funnel outcomes outward | Routing outcome, onboarding outcome | Handover payloads | Entry Routing Component, Onboarding Guidance Component | Downstream decision ownership |
| Recommendation Context Reader | Assemble recommendation context | User, Lifecycle, Product, Events | Normalized recommendation context | Business data, event context | Recommendation decisions |
| Recommendation Decision Component | Generate recommendation | Recommendation context, rules | Recommendation outcome | Recommendation Context Reader | Notification delivery, continuity handling |
| Recommendation Refresh Component | Refresh recommendation validity | Recommendation context, existing recommendation | Refresh outcome | Recommendation Context Reader, Recommendation Decision Component | Funnel ownership, premium approval |
| Reflection Interpretation Component | Convert reflection into recommendation context | Reflection context, recommendation context | Reflection output | Recommendation Context Reader | Coach escalation ownership |
| Recommendation Handover Component | Pass recommendation outcomes outward | Recommendation outcome, refresh outcome | Handover payloads | Decision, Refresh components | Delivery ownership |
| Participation Context Reader | Assemble participation context | User, Lifecycle, Product, Subscription, Events | Participation context | Business data, event context | Engagement decisions |
| Engagement Decision Component | Choose engagement action | Participation context, rules | Engagement outcome | Participation Context Reader | Progress ownership, recommendation ownership |
| Progress Interpretation Component | Interpret progress | Participation context, engagement outcome | Progress context | Participation Context Reader, Engagement Decision Component | Analytics ownership, continuity handling |
| Engagement Handover Component | Pass engagement outputs outward | Engagement outcome, progress context | Handover payloads | Engagement Decision, Progress Interpretation | Downstream ownership |
| Coach Context Reader | Assemble coach context | User, Lifecycle, Subscription, Product, Events | Coach context | Business data, event context | Premium decisions |
| Premium Context Review Component | Interpret premium context | Coach context, rules | Premium review outcome | Coach Context Reader | Final premium approval |
| Coach Preparation Component | Prepare coach support | Coach context, premium review outcome | Coach preparation outcome | Coach Context Reader, Premium Context Review | Human approval authority |
| Human Escalation Component | Escalate to human | Premium review outcome, preparation outcome | Human review request | Premium Review, Coach Preparation | Acting as human approver |
| Payment Outcome Reader | Assemble payment continuity context | Payment events, subscription context | Payment continuity context | Payment event context | Continuity classification |
| Continuity State Evaluator | Classify continuity outcome | Payment continuity context, rules, state canon | Continuity classification | Payment Outcome Reader | Notification delivery, recovery ownership |
| Access Continuity Component | Interpret access continuity | Continuity classification, access policy | Access continuity outcome | Continuity State Evaluator | Funnel routing |
| Continuity Handover Component | Pass continuity outcomes outward | Continuity classification, access outcome | Handover payloads | State Evaluator, Access Continuity | Downstream ownership |
| Retention Context Reader | Assemble recovery context | User, Lifecycle, Subscription, Events | Recovery context | Business data, recovery events | Recovery decisions |
| Recovery Path Decision Component | Select recovery path | Recovery context, rules | Recovery path outcome | Retention Context Reader | Subscription-state ownership |
| Recovery Recommendation Component | Determine recovery guidance | Recovery context, recovery path outcome | Recovery recommendation context | Retention Context Reader, Recovery Path Decision | Recommendation ownership outside retention scope |
| Retention Handover Component | Pass recovery outcomes outward | Recovery path outcome, recovery recommendation | Handover payloads | Recovery Path Decision, Recovery Recommendation | Downstream ownership |
| Message Context Reader | Assemble communication context | User, Lifecycle, Subscription, Recommendation, Process context | Message context | Business data, process context | Message selection |
| Message Selection Component | Choose business message | Message context, rules | Message decision outcome | Message Context Reader | Policy creation, delivery ownership |
| Delivery Orchestration Component | Prepare logical delivery | Message decision outcome | Delivery outcome | Message Selection Component | Upstream decision ownership |
| Communication Escalation Component | Escalate exceptional communication | Message decision outcome, delivery outcome | Escalation handover | Message Selection, Delivery Orchestration | Human approval authority |
| Insight Context Reader | Assemble analytics context | Cross-process business context, events | Insight context | Business data, event context | Pattern interpretation |
| Pattern Interpretation Component | Interpret business patterns | Insight context, rules | Insight outcome | Insight Context Reader | Strategic decision ownership, source-of-truth mutation |
| Strategic Review Component | Decide strategic escalation | Insight outcome | Strategic review request | Pattern Interpretation Component | Autonomous strategic action |
| Analytics Handover Component | Pass analytics outputs outward | Insight outcome, strategic review request | Human review handover | Pattern Interpretation, Strategic Review | Business-state ownership |
| Referral Context Reader | Assemble referral context | Referral events, user/lifecycle context | Referral context | Event context, user context | Referral decisions |
| Referral Interpretation Component | Interpret referral status | Referral context, rules | Referral interpretation outcome | Referral Context Reader | Funnel ownership |
| Referral Routing Component | Prepare referral routing | Referral interpretation outcome | Referral routing outcome | Referral Interpretation Component | Funnel decision ownership |
| Referral Handover Component | Pass referral outcomes outward | Referral interpretation, routing outcome | Handover payloads | Referral Interpretation, Referral Routing | Downstream ownership |

## Cross References

- Service Architecture:
  - `docs/technical/01-ai-service-architecture.md`
- AI Capability Model:
  - `docs/architecture/05-ai-capability-model.md`
- Business Processes:
  - `docs/architecture/04-business-processes.md`
- AI Interaction Model:
  - `docs/architecture/06-ai-interaction-model.md`
- AI Decision Model:
  - `docs/architecture/08-ai-decision-model.md`

## Governance

### Adding components

A new component may be added only when:

- it represents a distinct internal responsibility inside an existing service;
- that responsibility cannot be cleanly absorbed by an existing component without harming cohesion;
- its dependencies and forbidden responsibilities are explicit.

### Splitting components

A component must be split when:

- it owns more than one unrelated internal responsibility;
- its inputs and outputs no longer align to one coherent role;
- replacement or reasoning would materially improve through separation.

### Removing components

A component may be removed only when:

- its responsibility no longer exists; or
- its responsibility has been fully absorbed into another component without ambiguity or ownership overlap.

Removed components must remain historically understandable until all dependent technical architecture and implementation are aligned.
