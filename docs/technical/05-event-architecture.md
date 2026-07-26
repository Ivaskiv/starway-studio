# Document

Event Architecture

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

- `docs/foundation/05-business-events.md`
- `docs/architecture/03-state-machines.md`
- `docs/architecture/04-business-processes.md`
- `docs/technical/01-ai-service-architecture.md`
- `docs/technical/02-system-component-architecture.md`
- `docs/technical/03-api-architecture.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/foundation/05-business-events.md`
- `docs/technical/06-workflow-orchestration.md`
- `docs/technical/07-observability-operational-architecture.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The Event Architecture exists to define the canonical logical event model of the Starway / ABSystem platform.

It answers one question:

Which Business Events exist, who produces them, who consumes them, and how do they move through the business architecture?

Event Architecture is required because the platform already depends on Business Events for:

- business process orchestration;
- lifecycle transitions;
- recommendation timing;
- continuity handling;
- analytics and audit;
- AI interaction and decision-making.

Without a canonical Event Architecture, the same business fact could be published inconsistently, consumed ambiguously, or mapped to conflicting business outcomes.

This document defines logical events only.

It does not define brokers, queues, transports, delivery infrastructure, or implementation.

It must be read together with:

- `docs/foundation/05-business-events.md`
- `docs/architecture/04-business-processes.md`
- `docs/architecture/03-state-machines.md`
- `docs/technical/01-ai-service-architecture.md`
- `docs/technical/02-system-component-architecture.md`
- `docs/technical/03-api-architecture.md`

## Event Principles

1. Business events only.
   Only canonical business facts are part of the Event Architecture.

2. Immutable events.
   Once published as canonical business facts, events remain historically true and must not be rewritten as if they never happened.

3. Explicit ownership.
   Every Business Event must have one canonical owner and one canonical producer.

4. Deterministic publishing.
   The same business fact under the same business conditions must produce the same canonical event.

5. Idempotent consumption.
   Consumers must treat repeated delivery of the same canonical fact as the same business fact rather than as a new different fact.

6. Event traceability.
   Every event must be traceable to its business process, producing service, related business object, and downstream business consequences.

7. Canonical event lifecycle.
   Events must have a defined logical lifecycle from creation through archival.

8. No technical masquerading.
   Technical occurrences may support publication, but they are not themselves canonical business events unless the business architecture defines them as such.

## Event Inventory

### Telegram Joined

- Purpose:
  - Record entry into direct relationship through Telegram.
- Owner:
  - Business architecture and growth leadership
- Originating Business Process:
  - Audience Entry Process
- Related Business Object:
  - User Record
- Triggering condition:
  - A person enters the direct Telegram relationship from outside direct contact.

### Entry Test Started

- Purpose:
  - Record the start of the diagnostic entry process.
- Owner:
  - Business architecture and growth leadership
- Originating Business Process:
  - Diagnostic Entry Process
- Related Business Object:
  - User Record
- Triggering condition:
  - A direct contact begins the Entry Test.

### Entry Test Completed

- Purpose:
  - Record that the Entry Test was completed meaningfully.
- Owner:
  - Business architecture and recommendation guidance leadership
- Originating Business Process:
  - Diagnostic Entry Process
- Related Business Object:
  - User Record
- Triggering condition:
  - The Entry Test reaches valid business completion.

### Recommendation Generated

- Purpose:
  - Record that a defined next-step recommendation exists.
- Owner:
  - Business architecture and recommendation guidance leadership
- Originating Business Process:
  - Recommendation Delivery Process
  - Recommendation Refresh Process
- Related Business Object:
  - Recommendation Record
- Triggering condition:
  - A valid recommendation is produced from canonical user context.

### Zoom Registered

- Purpose:
  - Record commitment to attend a scheduled Zoom-based experience.
- Owner:
  - Product engagement leadership
- Originating Business Process:
  - Product-continuity participation support
- Related Business Object:
  - User Record
- Triggering condition:
  - A user registers for a valid live Zoom-based session.

### Zoom Attended

- Purpose:
  - Record actual attendance at a Zoom-based business event.
- Owner:
  - Product engagement leadership
- Originating Business Process:
  - Product-continuity participation support
  - Recommendation Refresh Process
- Related Business Object:
  - User Record
- Triggering condition:
  - A user is validly present at the scheduled live experience.

### FOCUS Purchased

- Purpose:
  - Record paid commitment into the first core paid product layer.
- Owner:
  - Monetization and continuity leadership
- Originating Business Process:
  - FOCUS Activation Process
- Related Business Object:
  - Subscription Record
- Triggering condition:
  - A valid FOCUS commercial offer is accepted with sufficient business confirmation to recognize purchase.

### Payment Received

- Purpose:
  - Record successful business receipt of payment.
- Owner:
  - Monetization operations leadership
- Originating Business Process:
  - FOCUS Activation Process
  - Platform Upgrade Process
  - Subscription Renewal Process
- Related Business Object:
  - Subscription Record
- Triggering condition:
  - A valid payment is confirmed as received for a canonical offer or continuity action.

### Payment Failed

- Purpose:
  - Record that a payment attempt did not complete successfully.
- Owner:
  - Monetization operations leadership
- Originating Business Process:
  - Subscription Recovery Process
  - payment-attempt handling before continuity can be granted
- Related Business Object:
  - Subscription Record
- Triggering condition:
  - A valid payment attempt fails or cannot be accepted as completed.

### Subscription Activated

- Purpose:
  - Record that paid continuity became actively available.
- Owner:
  - Monetization and continuity leadership
- Originating Business Process:
  - FOCUS Activation Process
- Related Business Object:
  - Subscription Record
- Triggering condition:
  - Valid paid access becomes active.

### Subscription Renewed

- Purpose:
  - Record successful continuation of an existing paid relationship.
- Owner:
  - Monetization and continuity leadership
- Originating Business Process:
  - Subscription Renewal Process
- Related Business Object:
  - Subscription Record
- Triggering condition:
  - A valid paid continuity relationship is successfully continued.

### Subscription Upgraded

- Purpose:
  - Record movement into a higher-value paid relationship.
- Owner:
  - Monetization and continuity leadership
- Originating Business Process:
  - Platform Upgrade Process
- Related Business Object:
  - Subscription Record
- Triggering condition:
  - A valid higher-tier continuity or purchase transition completes.

### Subscription Downgraded

- Purpose:
  - Record movement into a narrower paid relationship.
- Owner:
  - Monetization and continuity leadership
- Originating Business Process:
  - continuity handling for lower-scope paid continuation
- Related Business Object:
  - Subscription Record
- Triggering condition:
  - A valid lower-scope continuity change completes.

### Subscription Expired

- Purpose:
  - Record the end of paid continuity when it is no longer active.
- Owner:
  - Monetization and continuity leadership
- Originating Business Process:
  - Subscription Recovery Process
- Related Business Object:
  - Subscription Record
- Triggering condition:
  - A valid paid continuity relationship ends without preserved active continuation.

### Course Purchased

- Purpose:
  - Record purchase of the Course product.
- Owner:
  - Product and monetization leadership
- Originating Business Process:
  - premium or advanced-product acquisition paths where Course is the purchased offer
- Related Business Object:
  - Product Record
- Triggering condition:
  - A valid Course commercial offer is purchased successfully.

### Strategy Session Booked

- Purpose:
  - Record that a Strategy Session has been scheduled as a real business commitment.
- Owner:
  - Coach operations leadership
- Originating Business Process:
  - Premium Conversion Process
- Related Business Object:
  - User Record
- Triggering condition:
  - A valid Strategy Session booking occurs.

### Strategy Session Completed

- Purpose:
  - Record that a Strategy Session was actually completed.
- Owner:
  - Coach operations leadership
- Originating Business Process:
  - Premium delivery support processes
- Related Business Object:
  - User Record
- Triggering condition:
  - A valid booked Strategy Session is completed.

### Referral Created

- Purpose:
  - Record that a referral signal was created.
- Owner:
  - Growth leadership
- Originating Business Process:
  - Referral Conversion Process
- Related Business Object:
  - User Record
- Triggering condition:
  - A valid referral relationship is initiated.

### Referral Converted

- Purpose:
  - Record that referral became a real conversion fact.
- Owner:
  - Growth leadership
- Originating Business Process:
  - Referral Conversion Process
- Related Business Object:
  - User Record
- Triggering condition:
  - A referred person becomes a real business conversion under canonical funnel rules.

## Event Producers

### Telegram Joined

- Producer service:
  - Funnel Service
- Producer component:
  - Funnel Context Reader
- Ownership:
  - Funnel Service publishes the event within the audience-entry boundary
- Publication responsibility:
  - Recognize the transition from outside direct contact into direct Telegram relationship

### Entry Test Started

- Producer service:
  - Funnel Service
- Producer component:
  - Onboarding Guidance Component
- Ownership:
  - Funnel Service publishes the start of canonical diagnostic entry
- Publication responsibility:
  - Publish when entry guidance becomes real diagnostic participation

### Entry Test Completed

- Producer service:
  - Funnel Service
- Producer component:
  - Funnel Handover Component
- Ownership:
  - Funnel Service publishes valid diagnostic completion into downstream recommendation context
- Publication responsibility:
  - Publish when the completed entry process becomes a canonical recommendation trigger

### Recommendation Generated

- Producer service:
  - Recommendation Service
- Producer component:
  - Recommendation Decision Component
- Ownership:
  - Recommendation Service owns publication of recommendation facts
- Publication responsibility:
  - Publish when a valid recommendation has been generated

### Zoom Registered

- Producer service:
  - Engagement Service
- Producer component:
  - Participation Context Reader
- Ownership:
  - Engagement Service owns publication of live-participation commitment facts
- Publication responsibility:
  - Publish when valid registration is recognized

### Zoom Attended

- Producer service:
  - Engagement Service
- Producer component:
  - Participation Context Reader
- Ownership:
  - Engagement Service owns publication of live attendance facts
- Publication responsibility:
  - Publish when attendance is recognized as a real business fact

### FOCUS Purchased

- Producer service:
  - Continuity Service
- Producer component:
  - Continuity State Evaluator
- Ownership:
  - Continuity Service owns publication of the paid-commitment fact at the first core paid layer
- Publication responsibility:
  - Publish when a valid purchase is recognized in continuity handling

### Payment Received

- Producer service:
  - Continuity Service
- Producer component:
  - Payment Outcome Reader
- Ownership:
  - Continuity Service owns publication of successful payment facts
- Publication responsibility:
  - Publish when a payment outcome is recognized as valid receipt

### Payment Failed

- Producer service:
  - Continuity Service
- Producer component:
  - Payment Outcome Reader
- Ownership:
  - Continuity Service owns publication of failed payment facts
- Publication responsibility:
  - Publish when a payment attempt is recognized as unsuccessful

### Subscription Activated

- Producer service:
  - Continuity Service
- Producer component:
  - Continuity State Evaluator
- Ownership:
  - Continuity Service owns publication of active continuity facts
- Publication responsibility:
  - Publish when paid access becomes active

### Subscription Renewed

- Producer service:
  - Continuity Service
- Producer component:
  - Continuity State Evaluator
- Ownership:
  - Continuity Service owns publication of renewal facts
- Publication responsibility:
  - Publish when continuity is preserved as renewal

### Subscription Upgraded

- Producer service:
  - Continuity Service
- Producer component:
  - Continuity State Evaluator
- Ownership:
  - Continuity Service owns publication of upgrade facts
- Publication responsibility:
  - Publish when continuity is validly reclassified into higher-value scope

### Subscription Downgraded

- Producer service:
  - Continuity Service
- Producer component:
  - Continuity State Evaluator
- Ownership:
  - Continuity Service owns publication of downgrade facts
- Publication responsibility:
  - Publish when continuity is validly reclassified into lower-value scope

### Subscription Expired

- Producer service:
  - Continuity Service
- Producer component:
  - Continuity State Evaluator
- Ownership:
  - Continuity Service owns publication of expiration facts
- Publication responsibility:
  - Publish when active continuity is no longer preserved

### Course Purchased

- Producer service:
  - Continuity Service
- Producer component:
  - Continuity State Evaluator
- Ownership:
  - Continuity Service publishes course-purchase fact when continuity logic recognizes the valid purchased offer
- Publication responsibility:
  - Publish successful Course purchase recognition

### Strategy Session Booked

- Producer service:
  - Coach Support Service
- Producer component:
  - Coach Context Reader
- Ownership:
  - Coach Support Service owns publication of strategy-session booking facts
- Publication responsibility:
  - Publish when booking becomes a real business commitment

### Strategy Session Completed

- Producer service:
  - Coach Support Service
- Producer component:
  - Coach Context Reader
- Ownership:
  - Coach Support Service owns publication of strategy-session completion facts
- Publication responsibility:
  - Publish when a valid booked session is completed

### Referral Created

- Producer service:
  - Referral Service
- Producer component:
  - Referral Interpretation Component
- Ownership:
  - Referral Service owns publication of referral-creation facts
- Publication responsibility:
  - Publish when referral context becomes a valid referral signal

### Referral Converted

- Producer service:
  - Referral Service
- Producer component:
  - Referral Interpretation Component
- Ownership:
  - Referral Service owns publication of referral-conversion facts
- Publication responsibility:
  - Publish when referral becomes a real conversion fact

## Event Consumers

### Telegram Joined

- Consuming services:
  - Funnel Service
  - Retention Service
  - Analytics Service
- Consuming components:
  - Entry Routing Component
  - Retention Context Reader
  - Insight Context Reader
- Business purpose:
  - Start direct-contact routing and support re-entry analysis
- Resulting actions:
  - route to Telegram Contact
  - evaluate onboarding
  - record entry-pattern insight

### Entry Test Started

- Consuming services:
  - Funnel Service
  - Analytics Service
- Consuming components:
  - Entry Routing Component
  - Insight Context Reader
- Business purpose:
  - Confirm active diagnostic participation
- Resulting actions:
  - move user into test-participant flow
  - track diagnostic-start behavior

### Entry Test Completed

- Consuming services:
  - Recommendation Service
  - Funnel Service
  - Analytics Service
- Consuming components:
  - Recommendation Context Reader
  - Funnel Handover Component
  - Insight Context Reader
- Business purpose:
  - Trigger recommendation generation and record diagnostic completion
- Resulting actions:
  - generate recommendation
  - mark recommendation-eligible context
  - support completion analytics

### Recommendation Generated

- Consuming services:
  - Notification Service
  - Funnel Service
  - Retention Service
  - Analytics Service
- Consuming components:
  - Message Context Reader
  - Funnel Context Reader
  - Recovery Recommendation Component
  - Insight Context Reader
- Business purpose:
  - Deliver next-step recommendation and support refreshed guidance paths
- Resulting actions:
  - communicate recommendation
  - update routing context
  - evaluate refresh and retention relevance

### Zoom Registered

- Consuming services:
  - Engagement Service
  - Coach Support Service
  - Analytics Service
- Consuming components:
  - Engagement Decision Component
  - Coach Context Reader
  - Insight Context Reader
- Business purpose:
  - Track live participation commitment
- Resulting actions:
  - support engagement nudges
  - coach preparation
  - participation analytics

### Zoom Attended

- Consuming services:
  - Engagement Service
  - Recommendation Service
  - Coach Support Service
  - Analytics Service
- Consuming components:
  - Progress Interpretation Component
  - Reflection Interpretation Component
  - Coach Context Reader
  - Insight Context Reader
- Business purpose:
  - Confirm live participation and unlock reflection, progress, and recommendation context
- Resulting actions:
  - derive progress context
  - enable reflection
  - support refreshed recommendation or coach insight

### FOCUS Purchased

- Consuming services:
  - Continuity Service
  - Notification Service
  - Analytics Service
- Consuming components:
  - Access Continuity Component
  - Message Context Reader
  - Insight Context Reader
- Business purpose:
  - Recognize first core paid conversion
- Resulting actions:
  - prepare continuity activation handling
  - communicate paid conversion outcome
  - record monetization insight

### Payment Received

- Consuming services:
  - Continuity Service
  - Notification Service
  - Analytics Service
- Consuming components:
  - Continuity State Evaluator
  - Message Context Reader
  - Insight Context Reader
- Business purpose:
  - Trigger valid continuity handling and payment-success communication
- Resulting actions:
  - classify continuity outcome
  - communicate payment success
  - update revenue-related insight

### Payment Failed

- Consuming services:
  - Continuity Service
  - Retention Service
  - Notification Service
  - Analytics Service
- Consuming components:
  - Continuity State Evaluator
  - Retention Context Reader
  - Message Context Reader
  - Insight Context Reader
- Business purpose:
  - Prevent unauthorized continuity and trigger recovery handling
- Resulting actions:
  - block continuity grant
  - evaluate recovery path
  - communicate failure

### Subscription Activated

- Consuming services:
  - Continuity Service
  - Notification Service
  - Funnel Service
  - Analytics Service
- Consuming components:
  - Access Continuity Component
  - Message Context Reader
  - Funnel Context Reader
  - Insight Context Reader
- Business purpose:
  - Confirm active access and update funnel-valid continuity context
- Resulting actions:
  - activate continuity outcome
  - communicate activation
  - update downstream routing context

### Subscription Renewed

- Consuming services:
  - Continuity Service
  - Retention Service
  - Notification Service
  - Engagement Service
  - Analytics Service
- Consuming components:
  - Access Continuity Component
  - Retention Context Reader
  - Message Context Reader
  - Progress Interpretation Component
  - Insight Context Reader
- Business purpose:
  - Confirm preserved continuity and reduce churn risk
- Resulting actions:
  - restore or preserve active continuity
  - communicate renewal
  - strengthen continuity interpretation

### Subscription Upgraded

- Consuming services:
  - Continuity Service
  - Retention Service
  - Notification Service
  - Analytics Service
- Consuming components:
  - Access Continuity Component
  - Retention Context Reader
  - Message Context Reader
  - Insight Context Reader
- Business purpose:
  - Confirm deeper paid relationship
- Resulting actions:
  - update continuity scope
  - communicate upgrade
  - track deeper commitment

### Subscription Downgraded

- Consuming services:
  - Continuity Service
  - Notification Service
  - Analytics Service
- Consuming components:
  - Access Continuity Component
  - Message Context Reader
  - Insight Context Reader
- Business purpose:
  - Confirm narrower continuity scope
- Resulting actions:
  - update continuity scope downward
  - communicate downgraded continuity

### Subscription Expired

- Consuming services:
  - Retention Service
  - Continuity Service
  - Notification Service
  - Funnel Service
  - Analytics Service
- Consuming components:
  - Retention Context Reader
  - Continuity Handover Component
  - Message Context Reader
  - Funnel Context Reader
  - Insight Context Reader
- Business purpose:
  - Trigger canonical recovery and re-entry handling
- Resulting actions:
  - select recovery path
  - adjust continuity interpretation
  - communicate expiration

### Course Purchased

- Consuming services:
  - Continuity Service
  - Notification Service
  - Analytics Service
- Consuming components:
  - Access Continuity Component
  - Message Context Reader
  - Insight Context Reader
- Business purpose:
  - Recognize successful Course purchase as a monetized business fact
- Resulting actions:
  - prepare course-related continuity or product delivery context
  - communicate purchase confirmation

### Strategy Session Booked

- Consuming services:
  - Coach Support Service
  - Recommendation Service
  - Analytics Service
- Consuming components:
  - Premium Context Review Component
  - Recommendation Context Reader
  - Insight Context Reader
- Business purpose:
  - Trigger premium-context handling and coach preparation
- Resulting actions:
  - support Premium Client transition context
  - support premium review
  - record premium conversion insight

### Strategy Session Completed

- Consuming services:
  - Coach Support Service
  - Recommendation Service
  - Engagement Service
  - Analytics Service
- Consuming components:
  - Coach Preparation Component
  - Reflection Interpretation Component
  - Progress Interpretation Component
  - Insight Context Reader
- Business purpose:
  - Confirm premium live-value delivery and generate post-session insight
- Resulting actions:
  - coach insight
  - progress interpretation
  - refreshed recommendation context

### Referral Created

- Consuming services:
  - Referral Service
  - Analytics Service
- Consuming components:
  - Referral Routing Component
  - Insight Context Reader
- Business purpose:
  - Recognize referral creation as a valid growth signal
- Resulting actions:
  - track referral state
  - prepare possible later conversion interpretation

### Referral Converted

- Consuming services:
  - Funnel Service
  - Referral Service
  - Notification Service
  - Analytics Service
- Consuming components:
  - Funnel Context Reader
  - Referral Routing Component
  - Message Context Reader
  - Insight Context Reader
- Business purpose:
  - Bring successful referral into canonical funnel entry
- Resulting actions:
  - route into standard entry logic
  - support referral communication
  - record referral-conversion insight

## Event Lifecycle

### Creation

- A Business Event is created when a canonical business fact becomes true under the rules defined in the Foundation and Business Processes.

### Publication

- The canonical producer service and producer component publish the event as the logical representation of that fact.
- Publication must happen once per business fact meaning.

### Consumption

- Consumer services and components use the event to support:
  - business process continuation;
  - state transition handling;
  - communication;
  - recommendation;
  - analytics;
  - recovery.

### Completion

- An event is complete when:
  - its publication responsibility has been fulfilled; and
  - its relevant downstream business consequences have been made available to canonical consumers.

### Archival

- Events remain immutable historical facts.
- They may leave active operational attention, but they remain available for audit, analytics, and historical business interpretation.

## Event Dependency Rules

### Publishing rules

- Only the canonical producer may publish a given Business Event.
- Publication must reflect a completed business fact, not an anticipated one.
- A service may not publish an event owned by another service boundary.

### Subscription rules

- A service may consume an event only when that event supports one of its canonical capabilities or business processes.
- Consumption must not transfer ownership of the event.

### Ordering requirements

- Where one event semantically depends on another, the architecture must preserve business ordering.

Canonical ordering examples:

- `Telegram Joined` before `Entry Test Started`
- `Entry Test Started` before `Entry Test Completed`
- `Entry Test Completed` before `Recommendation Generated`
- `Payment Received` before or alongside continuity outcomes such as `Subscription Activated`
- `Strategy Session Booked` before `Strategy Session Completed`
- `Referral Created` before `Referral Converted`

### Replay eligibility

- Canonical Business Events are logically replay-eligible for:
  - analytics interpretation;
  - audit review;
  - deterministic downstream re-evaluation where needed.
- Replay must never reinterpret one event as a different business fact.

### Forbidden dependencies

- No consumer may depend on undocumented technical events instead of canonical Business Events.
- No service may require a provider-specific event format as business truth.
- No event may depend on a downstream consumer’s interpretation in order to become valid.
- No two services may both claim producer ownership of the same Business Event.

## Event Responsibility Matrix

| Business Event | Producer | Consumers | Business Object | Business Process | Resulting State Change | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| Telegram Joined | Funnel Service / Funnel Context Reader | Funnel, Retention, Analytics | User Record | Audience Entry Process | Anonymous → Telegram Contact | Business architecture and growth leadership |
| Entry Test Started | Funnel Service / Onboarding Guidance Component | Funnel, Analytics | User Record | Diagnostic Entry Process | Telegram Contact → Test Participant | Business architecture and growth leadership |
| Entry Test Completed | Funnel Service / Funnel Handover Component | Recommendation, Funnel, Analytics | User Record | Diagnostic Entry Process | Test Participant → Recommended | Business architecture and recommendation guidance leadership |
| Recommendation Generated | Recommendation Service / Recommendation Decision Component | Notification, Funnel, Retention, Analytics | Recommendation Record | Recommendation Delivery Process, Recommendation Refresh Process | Generated → Delivered or recommendation refresh context | Business architecture and recommendation guidance leadership |
| Zoom Registered | Engagement Service / Participation Context Reader | Engagement, Coach Support, Analytics | User Record | Product-continuity participation support | No direct canonical state change | Product engagement leadership |
| Zoom Attended | Engagement Service / Participation Context Reader | Engagement, Recommendation, Coach Support, Analytics | User Record | Product-continuity participation support, Recommendation Refresh Process | No direct canonical state change | Product engagement leadership |
| FOCUS Purchased | Continuity Service / Continuity State Evaluator | Continuity, Notification, Analytics | Subscription Record | FOCUS Activation Process | Purchase recognition leading toward active continuity | Monetization and continuity leadership |
| Payment Received | Continuity Service / Payment Outcome Reader | Continuity, Notification, Analytics | Subscription Record | FOCUS Activation Process, Platform Upgrade Process, Subscription Renewal Process | Enables continuity classification | Monetization operations leadership |
| Payment Failed | Continuity Service / Payment Outcome Reader | Continuity, Retention, Notification, Analytics | Subscription Record | Recovery and failed payment handling | Blocks continuity grant | Monetization operations leadership |
| Subscription Activated | Continuity Service / Continuity State Evaluator | Continuity, Notification, Funnel, Analytics | Subscription Record | FOCUS Activation Process | Intended → Active; Recommended → FOCUS Member or active continuity context | Monetization and continuity leadership |
| Subscription Renewed | Continuity Service / Continuity State Evaluator | Continuity, Retention, Notification, Engagement, Analytics | Subscription Record | Subscription Renewal Process | Active/Expired → Renewed → Active | Monetization and continuity leadership |
| Subscription Upgraded | Continuity Service / Continuity State Evaluator | Continuity, Retention, Notification, Analytics | Subscription Record | Platform Upgrade Process | Active → Upgraded → Active; FOCUS Member → Platform Subscriber | Monetization and continuity leadership |
| Subscription Downgraded | Continuity Service / Continuity State Evaluator | Continuity, Notification, Analytics | Subscription Record | Lower-scope continuity handling | Active → Downgraded → Active | Monetization and continuity leadership |
| Subscription Expired | Continuity Service / Continuity State Evaluator | Retention, Continuity, Notification, Funnel, Analytics | Subscription Record | Subscription Recovery Process | Active continuity → Expired; related lifecycle to Subscription Expired | Monetization and continuity leadership |
| Course Purchased | Continuity Service / Continuity State Evaluator | Continuity, Notification, Analytics | Product Record | Advanced-product acquisition path | No direct canonical state change specified | Product and monetization leadership |
| Strategy Session Booked | Coach Support Service / Coach Context Reader | Coach Support, Recommendation, Analytics | User Record | Premium Conversion Process | Platform Subscriber → Premium Client context | Coach operations leadership |
| Strategy Session Completed | Coach Support Service / Coach Context Reader | Coach Support, Recommendation, Engagement, Analytics | User Record | Premium delivery support processes | No direct canonical state change specified | Coach operations leadership |
| Referral Created | Referral Service / Referral Interpretation Component | Referral, Analytics | User Record | Referral Conversion Process | No direct canonical state change | Growth leadership |
| Referral Converted | Referral Service / Referral Interpretation Component | Funnel, Referral, Notification, Analytics | User Record | Referral Conversion Process | Supports canonical entry/re-entry routing | Growth leadership |

## Cross References

- Business Events:
  - `docs/foundation/05-business-events.md`
- Business Processes:
  - `docs/architecture/04-business-processes.md`
- State Machines:
  - `docs/architecture/03-state-machines.md`
- Service Architecture:
  - `docs/technical/01-ai-service-architecture.md`
- Component Architecture:
  - `docs/technical/02-system-component-architecture.md`
- API Architecture:
  - `docs/technical/03-api-architecture.md`
- AI Capability Model:
  - `docs/architecture/05-ai-capability-model.md`

## Governance

### Adding events

A new Business Event may be added only when:

- it originates from a canonical Business Process;
- it represents one distinct business fact;
- it has one owner;
- it has one producer service and one producer component;
- its consumers and state consequences are explicit.

### Changing ownership

Event ownership may change only when:

- the underlying business capability or process ownership changes canonically;
- the producer boundary is proven architecturally incorrect;
- no competing producer ownership remains.

### Deprecating events

An event may be deprecated only when:

- the underlying business fact no longer exists; or
- the fact is absorbed into a clearer canonical event without ambiguity.

Deprecated events must remain historically understandable until all dependent architecture and implementation are aligned.

### Auditing event flow

Event flow review is required whenever:

- a new producer is introduced;
- a consumer changes its business dependency on an event;
- a state-machine consequence changes;
- a business process changes the role of an event;
- provider or integration changes risk changing how a business fact is recognized.
