# Document

Business Events

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

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/foundation/04-user-lifecycle.md`
- `docs/architecture/03-state-machines.md`
- `docs/technical/05-event-architecture.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

Business Events exist to define the canonical facts that can happen inside the Starway ecosystem.

They answer a different question from the rest of the foundation:

What happened?

This document does not replace `docs/foundation/01-company.md`.

The company document defines business identity and principles.

This document does not replace `docs/foundation/02-products.md`.

The product document defines what offerings exist and how they relate.

This document does not replace `docs/foundation/03-funnel.md`.

The funnel document defines progression through the business.

This document does not replace `docs/foundation/04-user-lifecycle.md`.

The lifecycle document defines the user’s current business state.

Business Events are different from all of these:

- Products define what value exists.
- Funnel defines where a person moves.
- User Lifecycle defines what state the person is currently in.
- Business Events define the immutable facts that occur while the person interacts with the business.

## Business Event Principles

1. Every event is immutable.
   Once a business fact has happened, it remains part of the historical business record.

2. Every event has exactly one business meaning.
   One event must not represent multiple different facts.

3. Events describe facts.
   Events record what happened, not what should happen.

4. Events may influence lifecycle transitions.
   An event may justify a lifecycle change, but it is never itself a lifecycle state.

5. Events may influence funnel progression.
   An event may move a person through the funnel, but it is never itself a funnel stage.

6. Events never replace products.
   An event may happen within a product, but it is not the product itself.

7. Events never describe implementation.
   Business events must remain valid without reference to systems, channels, architecture, APIs, or technical delivery.

8. Events must be reusable across business functions.
   The same business event definition must support analytics, AI agents, notifications, audit, and automations without being redefined.

## Canonical Business Events

### Telegram Joined

- Purpose: Record that a person entered direct relationship with Starway through Telegram.
- Business description: The person moved from passive audience exposure into a direct contact channel.
- Trigger: The person joins or starts the Telegram relationship.
- Required business conditions: The person was previously outside direct contact.
- Resulting business outcome: The person becomes a direct contact and can enter the active entry layer.
- Related lifecycle state(s):
  - Telegram Contact
- Related product(s):
  - Entry Test

### Entry Test Started

- Purpose: Record that a person began the diagnostic entry process.
- Business description: The person has committed to engaging with the first structured business step.
- Trigger: The person starts the Entry Test.
- Required business conditions: The person is already a direct contact or equivalent active lead.
- Resulting business outcome: The person enters the diagnostic engagement layer.
- Related lifecycle state(s):
  - Test Participant
- Related product(s):
  - Entry Test

### Entry Test Completed

- Purpose: Record that the diagnostic process was completed.
- Business description: The business now has a complete first-stage diagnosis for the person.
- Trigger: The person completes the Entry Test.
- Required business conditions: The Entry Test was started and finished meaningfully.
- Resulting business outcome: The person becomes eligible for a recommendation.
- Related lifecycle state(s):
  - Recommended
- Related product(s):
  - Entry Test

### Recommendation Generated

- Purpose: Record that the business has issued a defined next-step recommendation.
- Business description: The diagnostic result has been translated into a business recommendation.
- Trigger: A valid recommendation is produced after test completion.
- Required business conditions: The Entry Test has been completed and interpreted.
- Resulting business outcome: The person reaches a decision point about the next product step.
- Related lifecycle state(s):
  - Recommended
- Related product(s):
  - Entry Test
  - FOCUS Membership

### Zoom Registered

- Purpose: Record that a person committed to attend a scheduled Zoom-based experience.
- Business description: The person has reserved participation in a live session connected to a product.
- Trigger: The person registers for a Zoom session.
- Required business conditions: A valid live session exists and the person is allowed to join it.
- Resulting business outcome: The person is expected in a live event tied to product delivery.
- Related lifecycle state(s):
  - Recommended
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
- Related product(s):
  - FOCUS Membership
  - Strategic Session
  - Personal Program

### Zoom Attended

- Purpose: Record that a person actually participated in a Zoom-based business event.
- Business description: The person moved from intent to attendance in a live session.
- Trigger: A valid scheduled Zoom session is attended.
- Required business conditions: The person was registered or validly present at the session.
- Resulting business outcome: Live engagement and value realization are confirmed.
- Related lifecycle state(s):
  - FOCUS Member
  - Premium Client
- Related product(s):
  - FOCUS Membership
  - Strategic Session
  - Personal Program

### FOCUS Purchased

- Purpose: Record that the first paid core product was purchased.
- Business description: The person crossed from recommendation into paid activation through FOCUS.
- Trigger: A valid purchase for FOCUS Membership occurs.
- Required business conditions: A FOCUS commercial offer was accepted and payment was successful enough to grant purchase recognition.
- Resulting business outcome: The person becomes a paid core customer.
- Related lifecycle state(s):
  - FOCUS Member
- Related product(s):
  - FOCUS Membership

### Payment Received

- Purpose: Record that the business received a valid payment.
- Business description: A commercial transaction was successfully completed for an offer.
- Trigger: Payment is confirmed as received.
- Required business conditions: A valid commercial offer, payer, and payment intent existed.
- Resulting business outcome: The business can honor the purchased offer or continuation decision.
- Related lifecycle state(s):
  - Recommended
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
  - Subscription Expiring
- Related product(s):
  - FOCUS Membership
  - ABSystem Platform
  - Course
  - Personal Program
  - Strategic Session

### Payment Failed

- Purpose: Record that a payment attempt did not complete successfully.
- Business description: A commercial intent existed, but the business did not receive a valid completed payment.
- Trigger: A payment attempt fails or is not completed in a way the business can accept.
- Required business conditions: A valid payment attempt was initiated.
- Resulting business outcome: Access or continuation cannot be granted through that attempt.
- Related lifecycle state(s):
  - Recommended
  - Subscription Expiring
- Related product(s):
  - FOCUS Membership
  - ABSystem Platform
  - Course
  - Personal Program
  - Strategic Session

### Subscription Activated

- Purpose: Record that a paid product has become actively available to the user.
- Business description: Purchase intent has become a live active business relationship.
- Trigger: A valid paid product becomes active.
- Required business conditions: Payment and access conditions for the subscribed product are satisfied.
- Resulting business outcome: The person receives active product access.
- Related lifecycle state(s):
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
- Related product(s):
  - FOCUS Membership
  - ABSystem Platform
  - Personal Program

### Subscription Renewed

- Purpose: Record that an existing paid relationship has been successfully continued.
- Business description: A customer who was facing a continuation decision remains in an active paid relationship.
- Trigger: Renewal is accepted and completed successfully.
- Required business conditions: A valid active or expiring paid relationship exists.
- Resulting business outcome: Continuity is preserved without restarting the relationship.
- Related lifecycle state(s):
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
  - Subscription Expiring
- Related product(s):
  - FOCUS Membership
  - ABSystem Platform
  - Personal Program

### Subscription Upgraded

- Purpose: Record that a customer moved from one active paid level to a higher-value paid relationship.
- Business description: The person has increased commitment to a more advanced product layer.
- Trigger: A valid higher-tier continuation or purchase is completed.
- Required business conditions: The customer is eligible for the higher product and the move is business-valid.
- Resulting business outcome: The person enters a deeper paid relationship.
- Related lifecycle state(s):
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
  - Subscription Expiring
- Related product(s):
  - FOCUS Membership
  - ABSystem Platform
  - Personal Program
  - Strategic Session

### Subscription Downgraded

- Purpose: Record that a customer moved from a higher paid layer into a lower ongoing relationship.
- Business description: The person remains in the ecosystem but at a lower commitment or product depth.
- Trigger: A valid lower-tier continuation path is accepted.
- Required business conditions: The lower layer is still business-valid for the person.
- Resulting business outcome: Retention is preserved at a smaller scope of value.
- Related lifecycle state(s):
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
  - Subscription Expiring
- Related product(s):
  - FOCUS Membership
  - ABSystem Platform
  - Strategic Session

### Subscription Expired

- Purpose: Record that an active paid relationship ended without valid continuation.
- Business description: The person is no longer entitled to the paid product through the ended term.
- Trigger: A subscription or active paid relationship reaches end without successful continuation.
- Required business conditions: A valid active or expiring paid relationship existed before expiry.
- Resulting business outcome: The person leaves the active paid relationship and becomes part of the recovery population.
- Related lifecycle state(s):
  - Subscription Expired
- Related product(s):
  - FOCUS Membership
  - ABSystem Platform
  - Personal Program

### Course Purchased

- Purpose: Record that the customer entered the Course as a paid educational product.
- Business description: The customer committed to the deeper structured learning layer.
- Trigger: A valid Course purchase is completed.
- Required business conditions: The Course offer exists and the customer is eligible to enter it.
- Resulting business outcome: The customer becomes part of the Course business relationship.
- Related lifecycle state(s):
  - Platform Subscriber
  - Premium Client
- Related product(s):
  - Course

### Strategy Session Booked

- Purpose: Record that a customer reserved a Strategic Session.
- Business description: The person committed to a high-context directional service interaction.
- Trigger: A valid Strategic Session booking is confirmed.
- Required business conditions: The service is available and the customer is allowed to enter it.
- Resulting business outcome: A premium qualifying or directional interaction is scheduled.
- Related lifecycle state(s):
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
- Related product(s):
  - Strategic Session

### Strategy Session Completed

- Purpose: Record that a Strategic Session was completed.
- Business description: A high-context directional service interaction has been delivered.
- Trigger: The booked Strategic Session is completed.
- Required business conditions: The session was validly booked and delivered.
- Resulting business outcome: The customer receives clarity, qualification, or escalation direction.
- Related lifecycle state(s):
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
- Related product(s):
  - Strategic Session

### Referral Created

- Purpose: Record that an existing customer or advocate generated a referral opportunity.
- Business description: Trust has become strong enough for the person to recommend the business to someone else.
- Trigger: A customer or advocate creates a referral.
- Required business conditions: The person has sufficient relationship value and credibility to refer.
- Resulting business outcome: A new acquisition opportunity is created from trust rather than direct marketing.
- Related lifecycle state(s):
  - Premium Client
  - Inactive
  - Archived
- Related product(s):
  - Entry Test
  - FOCUS Membership
  - ABSystem Platform

### Referral Converted

- Purpose: Record that a referred person became a real business entrant or customer.
- Business description: A referral matured into a measurable business outcome.
- Trigger: A referred person enters the funnel successfully through the referral path.
- Required business conditions: A referral already exists and the referred person meaningfully engages.
- Resulting business outcome: Referral-driven growth is realized.
- Related lifecycle state(s):
  - Telegram Contact
  - Test Participant
  - Recommended
  - FOCUS Member
- Related product(s):
  - Entry Test
  - FOCUS Membership

## Event Categories

### Acquisition

- Telegram Joined
- Referral Created
- Referral Converted

### Engagement

- Entry Test Started
- Entry Test Completed
- Recommendation Generated
- Zoom Registered
- Zoom Attended

### Commerce

- FOCUS Purchased
- Payment Received
- Payment Failed
- Course Purchased
- Strategy Session Booked

### Subscription

- Subscription Activated
- Subscription Renewed
- Subscription Upgraded
- Subscription Downgraded
- Subscription Expired

### Service Delivery

- Strategy Session Completed

### Retention

- Subscription Renewed
- Subscription Downgraded
- Subscription Expired

## Event Relationships

### Event → Lifecycle Transition

- `Telegram Joined` may justify movement into `Telegram Contact`.
- `Entry Test Started` may justify movement into `Test Participant`.
- `Entry Test Completed` and `Recommendation Generated` may justify movement into `Recommended`.
- `FOCUS Purchased` and `Subscription Activated` may justify movement into `FOCUS Member`.
- `Subscription Activated` may also justify movement into `Platform Subscriber` or `Premium Client` depending on the related product.
- `Subscription Renewed`, `Subscription Upgraded`, and `Subscription Downgraded` may justify movement between active paid lifecycle states as defined in `docs/foundation/04-user-lifecycle.md`.
- `Subscription Expired` may justify movement into `Subscription Expired`.

### Event → Funnel Progression

- `Telegram Joined` supports progression from audience attention into direct engagement.
- `Entry Test Started` and `Entry Test Completed` support progression through the entry layer.
- `Recommendation Generated` supports progression from diagnosis into the next-step decision.
- `FOCUS Purchased` supports progression from Entry Recommendation into FOCUS Membership.
- `Subscription Activated` supports progression into active paid product participation.
- `Subscription Upgraded` supports progression from FOCUS Membership into ABSystem Platform or from lower to higher paid layers.
- `Strategy Session Booked` and `Strategy Session Completed` support progression into or through Premium Services.
- `Subscription Renewed` supports progression into the Renewal layer.
- `Referral Created` and `Referral Converted` support progression into Advocate and acquisition return loops.

### Event → Products

Events must always reference products defined in `docs/foundation/02-products.md`.

- Entry events belong to `Entry Test`.
- Commerce and continuity events belong to the product being purchased, renewed, upgraded, downgraded, or expired.
- Session events belong to the product that owns the session experience.
- Referral events belong to the broader ecosystem but are still measured against product entry and conversion outcomes.

This document does not redefine the products themselves.

## Business Ownership

### Acquisition

- Owner: Marketing Lead with Product Owner
- Expected customer outcome: The person moves from passive attention into direct relationship.
- Expected business outcome: Qualified acquisition enters the active business funnel.

### Engagement

- Owner: Product Owner
- Expected customer outcome: The person gains clarity, participates meaningfully, and receives a defined next step.
- Expected business outcome: Higher completion, stronger readiness, and better routing into the correct paid layer.

### Commerce

- Owner: Product Owner with Sales Lead
- Expected customer outcome: The person completes a valid commercial step with clarity and fit.
- Expected business outcome: Revenue conversion, premium qualification, and commercial progression.

### Subscription

- Owner: Product Owner
- Expected customer outcome: The person enters, continues, changes, or exits a paid relationship clearly.
- Expected business outcome: Retention, expansion, continuity, and controlled churn handling.

### Service Delivery

- Owner: Coach Lead
- Expected customer outcome: The person receives the promised high-context human value.
- Expected business outcome: Delivery quality and premium outcome realization.

### Retention

- Owner: Product Owner with Marketing Lead
- Expected customer outcome: The person receives a valid continuation or recovery path rather than disappearing into ambiguity.
- Expected business outcome: Higher renewal, lower unnecessary churn, and better recovery.

## Governance

### Ownership

The Business Events catalog is owned by the business architecture layer of Starway.

All downstream documents that describe facts, triggers, analytics, automations, notifications, AI reactions, or audit records must reference this catalog.

### Naming Conventions

- Event names must be business-readable.
- Event names must describe a completed fact.
- Event names should use past-tense or completed-fact language where possible.
- Different events must never represent the same business fact.

### Versioning

This document must remain one canonical active event catalog.

Historical business event models must be archived rather than kept as competing active definitions.

### Deprecation Policy

- An event may be deprecated only if the business fact no longer exists or the event is replaced by a clearer canonical event.
- A deprecated event must remain historically understandable and must not be silently renamed in old records.

### Backward Compatibility

- New documents must use existing canonical event names whenever the fact already exists here.
- If a new business fact is introduced, it must be added here before downstream documents define it elsewhere.
- Future analytics, automations, AI agents, notifications, audit logs, and integrations must reference these Business Events instead of inventing conflicting business facts.
