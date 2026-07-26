# Document

User Lifecycle

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

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/foundation/03-funnel.md`
- `docs/foundation/05-business-events.md`
- `docs/architecture/03-state-machines.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

# Purpose

The User Lifecycle exists to define the canonical current business state of a person inside the Starway ecosystem.

It answers one question:

What is this user’s current business relationship to Starway right now?

This document does not replace `docs/foundation/01-company.md`.

The company document defines identity, principles, and the company-wide business foundation.

This document does not replace `docs/foundation/02-products.md`.

The product document defines what business products exist and what they include.

This document does not replace `docs/foundation/03-funnel.md`.

The funnel document defines how a person progresses through the business.

The lifecycle document defines the person’s current business state at any given moment inside or around that funnel.

#№ Lifecycle Principles

1. One user = one current lifecycle state.
   A user may have historical movement, but only one canonical current state at a time.

2. Deterministic transitions.
   Movement between states must happen through explicit business conditions.

3. Business-first meaning.
   Every state must describe a real business relationship, not a technical condition.

4. Implementation-independent.
   States must remain valid regardless of systems, tools, channels, or architecture details.

5. No duplicate states.
   Two different states must never describe the same business reality.

6. Every state must matter.
   If a state has no business consequence, it should not exist.

7. Access follows lifecycle.
   Product access, service access, renewal logic, and recovery logic must derive from the lifecycle state.

8. Recovery is explicit.
   Expiring, inactive, or dropped-off users must have defined lifecycle treatment rather than being left undefined.

# Canonical User States

## Anonymous

- Purpose: Represent a person known only as audience attention, not yet in a direct business relationship.
- Business description: The person has encountered Starway but has not yet become a direct contact.
- Entry conditions: The person sees Starway through public discovery or indirect exposure.
- Exit conditions: The person becomes a direct contact or disappears from the active business funnel.
- Allowed previous states:
  - None
- Allowed next states:
  - Telegram Contact
- Terminal: No

## Telegram Contact

- Purpose: Represent a person who has entered direct contact but has not yet completed the first diagnostic step.
- Business description: The person has moved from passive awareness into direct relationship and may be exploring the next step.
- Entry conditions: The person enters Telegram or another equivalent direct-response relationship channel.
- Exit conditions: The person starts the Entry Test, becomes inactive, or exits direct engagement.
- Allowed previous states:
  - Anonymous
  - Inactive
- Allowed next states:
  - Test Participant
  - Inactive
- Terminal: No

## Test Participant

- Purpose: Represent a person actively engaging with the diagnostic entry layer.
- Business description: The person is in the process of receiving a diagnosis and moving toward a first structured decision.
- Entry conditions: The person starts the Entry Test.
- Exit conditions: The person completes the test, abandons it, or becomes inactive.
- Allowed previous states:
  - Telegram Contact
  - Inactive
- Allowed next states:
  - Recommended
  - Inactive
- Terminal: No

## Recommended

- Purpose: Represent a person who has received a result and a defined recommended next step.
- Business description: The person understands the diagnosis and is deciding whether to accept the recommended product path.
- Entry conditions: The person completes the Entry Test and receives an entry recommendation.
- Exit conditions: The person accepts the recommendation, delays action, or falls inactive.
- Allowed previous states:
  - Test Participant
- Allowed next states:
  - FOCUS Member
  - Inactive
- Terminal: No

## FOCUS Member

- Purpose: Represent a person who currently has an active business relationship through FOCUS Membership.
- Business description: The person is an active core customer inside the first recurring paid product.
- Entry conditions: The person purchases or validly enters FOCUS Membership.
- Exit conditions: The person upgrades, reaches an expiring decision point, expires, or becomes inactive after losing active continuity.
- Allowed previous states:
  - Recommended
  - Subscription Expiring
  - Subscription Expired
  - Inactive
- Allowed next states:
  - Platform Subscriber
  - Subscription Expiring
  - Inactive
- Terminal: No

## Platform Subscriber

- Purpose: Represent a person who currently has active access to ABSystem Platform.
- Business description: The person is an active continuity customer using the deeper recurring support layer.
- Entry conditions: The person purchases or validly enters ABSystem Platform.
- Exit conditions: The person upgrades into a premium service, reaches an expiring decision point, expires, or becomes inactive after loss of continuity.
- Allowed previous states:
  - FOCUS Member
  - Subscription Expiring
  - Subscription Expired
  - Inactive
- Allowed next states:
  - Premium Client
  - Subscription Expiring
  - Inactive
- Terminal: No

## Premium Client

- Purpose: Represent a person currently engaged in a premium high-context service relationship.
- Business description: The person is receiving direct, premium, human-led support beyond scalable recurring layers.
- Entry conditions: The person validly enters Strategic Session, Personal Program, or another approved premium service.
- Exit conditions: The person renews premium service, steps down into a lower layer, completes the service, or becomes inactive.
- Allowed previous states:
  - FOCUS Member
  - Platform Subscriber
  - Subscription Expiring
  - Subscription Expired
  - Inactive
- Allowed next states:
  - Subscription Expiring
  - FOCUS Member
  - Platform Subscriber
  - Inactive
- Terminal: No

## Subscription Expiring

- Purpose: Represent a person whose active paid relationship is approaching a continuation decision.
- Business description: The person still has active or recent value, but the business must now resolve renewal, downgrade, upgrade, or exit.
- Entry conditions: An active paid product approaches expiration or a premium commitment reaches a renewal decision point.
- Exit conditions: The person renews, upgrades, downgrades, expires, or becomes inactive.
- Allowed previous states:
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
- Allowed next states:
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
  - Subscription Expired
  - Inactive
- Terminal: No

## Subscription Expired

- Purpose: Represent a person whose paid access has ended but whose relationship is still recoverable.
- Business description: The person is no longer an active paying customer, but still belongs to a defined recovery or return population.
- Entry conditions: A paid relationship ends without valid continuation.
- Exit conditions: The person reactivates, re-enters through a lower stage, remains inactive, or is archived.
- Allowed previous states:
  - Subscription Expiring
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
- Allowed next states:
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
  - Inactive
  - Archived
- Terminal: No

## Inactive

- Purpose: Represent a person who remains known to the business but is not currently moving in an active commercial relationship.
- Business description: The person is neither an active paying customer nor an active progressing participant, but may still return.
- Entry conditions: Drop-off, disengagement, non-renewal without immediate reactivation, or abandonment of an earlier stage.
- Exit conditions: The person re-engages, restarts a journey, reactivates, or is archived.
- Allowed previous states:
  - Telegram Contact
  - Test Participant
  - Recommended
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
  - Subscription Expiring
  - Subscription Expired
- Allowed next states:
  - Telegram Contact
  - Test Participant
  - Recommended
  - FOCUS Member
  - Platform Subscriber
  - Premium Client
  - Archived
- Terminal: No

## Archived

- Purpose: Represent a person whose business relationship is treated as closed for active lifecycle purposes.
- Business description: The person remains in historical business records but is no longer part of the active lifecycle system.
- Entry conditions: The business decides the person should no longer be treated as active, recoverable, or commercially current.
- Exit conditions: None.
- Allowed previous states:
  - Subscription Expired
  - Inactive
- Allowed next states:
  - None
- Terminal: Yes

# State Transitions

## Anonymous → Telegram Contact

- Source state: Anonymous
- Destination state: Telegram Contact
- Trigger: The person enters direct relationship.
- Business validation: The person has taken an intentional action that establishes active contact.
- Blocked conditions: Passive content exposure without direct engagement.
- Resulting business outcome: The person becomes a direct prospect.

## Telegram Contact → Test Participant

- Source state: Telegram Contact
- Destination state: Test Participant
- Trigger: The person starts the Entry Test.
- Business validation: The person accepts structured diagnostic engagement.
- Blocked conditions: Passive reading without commitment.
- Resulting business outcome: The person enters the diagnostic layer.

## Telegram Contact → Inactive

- Source state: Telegram Contact
- Destination state: Inactive
- Trigger: The person stops engaging after direct contact.
- Business validation: There is no meaningful progression into the entry layer.
- Blocked conditions: Continued active engagement.
- Resulting business outcome: The person moves into recoverable inactivity.

## Test Participant → Recommended

- Source state: Test Participant
- Destination state: Recommended
- Trigger: The person completes the Entry Test.
- Business validation: The business has enough context to define a next step.
- Blocked conditions: Incomplete test participation.
- Resulting business outcome: The person receives a clear recommendation.

## Test Participant → Inactive

- Source state: Test Participant
- Destination state: Inactive
- Trigger: The person abandons the Entry Test.
- Business validation: The diagnostic path remains unfinished and no active commitment exists.
- Blocked conditions: Test completion.
- Resulting business outcome: The person moves into recoverable inactivity.

## Recommended → FOCUS Member

- Source state: Recommended
- Destination state: FOCUS Member
- Trigger: The person accepts the recommended first paid product.
- Business validation: Readiness and commitment are sufficient for FOCUS Membership.
- Blocked conditions: No payment, no commitment, or no acceptance of the recommended path.
- Resulting business outcome: The person becomes an active core customer.

## Recommended → Inactive

- Source state: Recommended
- Destination state: Inactive
- Trigger: The person does not act on the recommendation.
- Business validation: No active product relationship has been created.
- Blocked conditions: Paid entry into the recommended product.
- Resulting business outcome: The person remains known but not progressing.

## FOCUS Member → Platform Subscriber

- Source state: FOCUS Member
- Destination state: Platform Subscriber
- Trigger: The person enters ABSystem Platform.
- Business validation: The person is ready for continuity and deeper systemization.
- Blocked conditions: No valid platform entry or no sufficient readiness for that layer.
- Resulting business outcome: The person becomes an active continuity customer.

## FOCUS Member → Subscription Expiring

- Source state: FOCUS Member
- Destination state: Subscription Expiring
- Trigger: The active FOCUS term approaches a renewal decision point.
- Business validation: A continuation decision is required.
- Blocked conditions: No valid active FOCUS relationship.
- Resulting business outcome: The business must resolve continuation, change, or exit.

## FOCUS Member → Inactive

- Source state: FOCUS Member
- Destination state: Inactive
- Trigger: The person disengages materially before continuation is resolved.
- Business validation: The customer is no longer behaving as an active participant.
- Blocked conditions: Active continuity and participation.
- Resulting business outcome: The person becomes a recoverable inactive customer.

## Platform Subscriber → Premium Client

- Source state: Platform Subscriber
- Destination state: Premium Client
- Trigger: The person enters a premium high-context service.
- Business validation: Fit, trust, readiness, and premium need are all present.
- Blocked conditions: No qualification or no premium fit.
- Resulting business outcome: The person becomes a premium service client.

## Platform Subscriber → Subscription Expiring

- Source state: Platform Subscriber
- Destination state: Subscription Expiring
- Trigger: The platform term approaches a renewal decision point.
- Business validation: A continuation decision is required.
- Blocked conditions: No valid active platform relationship.
- Resulting business outcome: Renewal, downgrade, upgrade, or exit must be resolved.

## Platform Subscriber → Inactive

- Source state: Platform Subscriber
- Destination state: Inactive
- Trigger: The person disengages materially before continuity is resolved.
- Business validation: The customer is no longer behaving as an active continuity user.
- Blocked conditions: Ongoing active use and continuation.
- Resulting business outcome: The person becomes a recoverable inactive customer.

## Premium Client → Subscription Expiring

- Source state: Premium Client
- Destination state: Subscription Expiring
- Trigger: The premium service reaches a renewal or continuation decision point.
- Business validation: The business relationship requires a defined continuation decision.
- Blocked conditions: Open premium engagement with no current renewal decision.
- Resulting business outcome: The premium relationship moves into continuation management.

## Premium Client → FOCUS Member

- Source state: Premium Client
- Destination state: FOCUS Member
- Trigger: The person steps down into FOCUS as the correct active layer.
- Business validation: FOCUS is the right ongoing relationship after premium service.
- Blocked conditions: No valid lower-layer transition path.
- Resulting business outcome: The person remains active in the ecosystem through the core product.

## Premium Client → Platform Subscriber

- Source state: Premium Client
- Destination state: Platform Subscriber
- Trigger: The person steps down into ABSystem Platform as the correct active layer.
- Business validation: Platform continuity is the right ongoing relationship after premium service.
- Blocked conditions: No valid continuity path.
- Resulting business outcome: The person remains active in the ecosystem through the platform layer.

## Premium Client → Inactive

- Source state: Premium Client
- Destination state: Inactive
- Trigger: The person leaves premium support without immediate continuation.
- Business validation: No active premium or lower active relationship remains.
- Blocked conditions: Valid renewal or transition into another active product.
- Resulting business outcome: The person becomes a recoverable inactive former premium client.

## Subscription Expiring → FOCUS Member

- Source state: Subscription Expiring
- Destination state: FOCUS Member
- Trigger: The person renews or continues FOCUS.
- Business validation: The correct continuation decision is active FOCUS.
- Blocked conditions: No valid continuation.
- Resulting business outcome: The person remains an active FOCUS customer.

## Subscription Expiring → Platform Subscriber

- Source state: Subscription Expiring
- Destination state: Platform Subscriber
- Trigger: The person renews, upgrades, or continues into ABSystem Platform.
- Business validation: The correct continuation decision is active platform continuity.
- Blocked conditions: No valid platform continuation.
- Resulting business outcome: The person remains or becomes an active platform customer.

## Subscription Expiring → Premium Client

- Source state: Subscription Expiring
- Destination state: Premium Client
- Trigger: The person continues via a premium service path.
- Business validation: Premium support is the correct next relationship.
- Blocked conditions: No premium fit or no valid premium entry.
- Resulting business outcome: The person becomes an active premium client.

## Subscription Expiring → Subscription Expired

- Source state: Subscription Expiring
- Destination state: Subscription Expired
- Trigger: The subscription ends without valid continuation.
- Business validation: Access is no longer active and no renewal has taken place.
- Blocked conditions: Successful continuation in any active paid layer.
- Resulting business outcome: The person becomes a recoverable former subscriber.

## Subscription Expiring → Inactive

- Source state: Subscription Expiring
- Destination state: Inactive
- Trigger: The person disengages around renewal without a clean continuation outcome.
- Business validation: No active paying state remains and no immediate recovery occurs.
- Blocked conditions: Valid active continuation.
- Resulting business outcome: The person becomes an inactive recoverable user.

## Subscription Expired → FOCUS Member

- Source state: Subscription Expired
- Destination state: FOCUS Member
- Trigger: The person reactivates into FOCUS.
- Business validation: FOCUS is the correct return layer.
- Blocked conditions: No reactivation or wrong fit.
- Resulting business outcome: The person returns as an active core customer.

## Subscription Expired → Platform Subscriber

- Source state: Subscription Expired
- Destination state: Platform Subscriber
- Trigger: The person reactivates into ABSystem Platform.
- Business validation: Platform continuity is the correct return layer.
- Blocked conditions: No valid reactivation.
- Resulting business outcome: The person returns as an active platform customer.

## Subscription Expired → Premium Client

- Source state: Subscription Expired
- Destination state: Premium Client
- Trigger: The person returns through a valid premium service path.
- Business validation: Premium fit and business value are present.
- Blocked conditions: No premium qualification.
- Resulting business outcome: The person returns as an active premium client.

## Subscription Expired → Inactive

- Source state: Subscription Expired
- Destination state: Inactive
- Trigger: Time passes without reactivation or business return.
- Business validation: The relationship remains dormant but still recoverable.
- Blocked conditions: Reactivation into an active product.
- Resulting business outcome: The person becomes an inactive known user.

## Subscription Expired → Archived

- Source state: Subscription Expired
- Destination state: Archived
- Trigger: The business closes the relationship for active lifecycle purposes.
- Business validation: The user should no longer remain in active or recoverable commercial treatment.
- Blocked conditions: Ongoing recoverable relationship or valid re-entry path.
- Resulting business outcome: The person moves into historical record only.

## Inactive → Telegram Contact

- Source state: Inactive
- Destination state: Telegram Contact
- Trigger: The person re-engages directly without restarting inside the test immediately.
- Business validation: Direct relationship becomes active again.
- Blocked conditions: No active re-engagement.
- Resulting business outcome: The person becomes a direct active contact again.

## Inactive → Test Participant

- Source state: Inactive
- Destination state: Test Participant
- Trigger: The person restarts or resumes the Entry Test directly.
- Business validation: The entry diagnostic is again the correct business step.
- Blocked conditions: No active diagnostic engagement.
- Resulting business outcome: The person re-enters the entry layer.

## Inactive → Recommended

- Source state: Inactive
- Destination state: Recommended
- Trigger: The person returns to an already valid recommendation decision point.
- Business validation: The prior recommendation still remains business-valid.
- Blocked conditions: No valid recommendation context remains.
- Resulting business outcome: The person returns to decision stage without redoing the full funnel.

## Inactive → FOCUS Member

- Source state: Inactive
- Destination state: FOCUS Member
- Trigger: The person reactivates directly into FOCUS.
- Business validation: FOCUS is the correct current return layer.
- Blocked conditions: No valid paid re-entry.
- Resulting business outcome: The person becomes an active FOCUS customer again.

## Inactive → Platform Subscriber

- Source state: Inactive
- Destination state: Platform Subscriber
- Trigger: The person reactivates directly into ABSystem Platform.
- Business validation: Platform continuity is the correct return layer.
- Blocked conditions: No valid continuity re-entry.
- Resulting business outcome: The person becomes an active platform customer again.

## Inactive → Premium Client

- Source state: Inactive
- Destination state: Premium Client
- Trigger: The person returns through a valid premium path.
- Business validation: Premium fit, trust, and value are present.
- Blocked conditions: No premium qualification.
- Resulting business outcome: The person becomes an active premium client again.

## Inactive → Archived

- Source state: Inactive
- Destination state: Archived
- Trigger: The business closes the relationship for active lifecycle treatment.
- Business validation: The user no longer belongs in active or recoverable handling.
- Blocked conditions: Active recovery or re-entry potential being intentionally maintained.
- Resulting business outcome: The person becomes a historical record only.

# Access Matrix

## Anonymous

- Available products: None
- Available services: Public awareness and discovery only
- Unavailable services:
  - Entry Test
  - FOCUS Membership
  - ABSystem Platform
  - Premium Services
- Required subscription: None
- Permissions: Public attention only

## Telegram Contact

- Available products:
  - Entry Test
- Available services:
  - Direct contact
  - Guided entry
- Unavailable services:
  - FOCUS Membership
  - ABSystem Platform
  - Premium Services
- Required subscription: None
- Permissions: Direct engagement and entry participation

## Test Participant

- Available products:
  - Entry Test
- Available services:
  - Diagnostic participation
  - Result path progression
- Unavailable services:
  - FOCUS Membership
  - ABSystem Platform
  - Premium Services
- Required subscription: None
- Permissions: Continue and complete the entry diagnostic

## Recommended

- Available products:
  - Entry Test outcome path
  - FOCUS Membership as the primary next offer
- Available services:
  - Recommendation review
  - Follow-up and trust-building paths where allowed
- Unavailable services:
  - Active ABSystem Platform access
  - Premium Services access
- Required subscription: None
- Permissions: Accept or postpone the recommended next step

## FOCUS Member

- Available products:
  - FOCUS Membership
- Available services:
  - FOCUS included services as defined in `docs/foundation/02-products.md`
- Unavailable services:
  - ABSystem Platform unless separately active
  - Premium Services unless separately entered
- Required subscription:
  - Active FOCUS Membership
- Permissions: Participate in FOCUS and pursue valid next-step progression

## Platform Subscriber

- Available products:
  - ABSystem Platform
  - FOCUS Membership if separately preserved by business policy
- Available services:
  - ABSystem Platform included services as defined in `docs/foundation/02-products.md`
- Unavailable services:
  - Premium Services unless separately entered
- Required subscription:
  - Active ABSystem Platform subscription
- Permissions: Use active platform continuity and pursue valid premium progression

## Premium Client

- Available products:
  - Premium Services
  - Any lower active product still included by business agreement
- Available services:
  - Premium service delivery
  - High-context support
- Unavailable services:
  - Products or services not included in the customer’s active commercial relationship
- Required subscription:
  - Active premium commercial agreement where applicable
- Permissions: Receive premium service support and valid continuation paths

## Subscription Expiring

- Available products:
  - The currently expiring active product
  - Valid continuation products
- Available services:
  - Renewal treatment
  - Continuation decision support
- Unavailable services:
  - New access outside the allowed continuation or valid next-step scope
- Required subscription:
  - A paid relationship at continuation decision point
- Permissions: Renew, upgrade, downgrade, or allow expiration

## Subscription Expired

- Available products:
  - Valid recovery or reactivation products
- Available services:
  - Recovery
  - Reactivation
  - Return paths
- Unavailable services:
  - Active paid services from the expired product
- Required subscription:
  - None active
- Permissions: Return through a valid business re-entry path

## Inactive

- Available products:
  - Re-entry products appropriate to the current business context
- Available services:
  - Recovery
  - Re-engagement
- Unavailable services:
  - Active paid delivery without valid reactivation
- Required subscription:
  - None active by default
- Permissions: Re-enter through an approved business path

## Archived

- Available products: None
- Available services: None
- Unavailable services:
  - Entry Test
  - FOCUS Membership
  - ABSystem Platform
  - Premium Services
- Required subscription: None
- Permissions: Historical record only

# Lifecycle & Funnel Relationship

The Funnel and the Lifecycle describe different business dimensions.

The Funnel describes progression through the business journey.

The Lifecycle describes the user’s current business state.

The Funnel answers:

Where is this person moving?

The Lifecycle answers:

What is this person’s current business relationship right now?

The funnel may be linear as a journey model.

The lifecycle must always resolve to one current state.

Neither replaces the other.

The Funnel remains the source of truth for progression.

This Lifecycle remains the source of truth for current user state, access, and business treatment.

# Subscription Behaviour

## When a subscription starts

- The user enters the lifecycle state tied to the active paid product.
- Starting FOCUS creates a FOCUS Member.
- Starting ABSystem Platform creates a Platform Subscriber.
- Starting a premium service creates a Premium Client.

## When a subscription renews

- The user remains in the same active lifecycle state if the same product continues.
- Renewal preserves continuity rather than restarting the relationship.

## When a subscription upgrades

- The user moves into the lifecycle state that matches the new active higher-value product.
- Upgrade must follow valid product relationships defined in `docs/foundation/02-products.md`.

## When a subscription downgrades

- The user moves into the lifecycle state that matches the lower active product.
- Downgrade must preserve a valid active relationship rather than force unnecessary inactivity.

## When payment fails

- The user does not move into a new active paid state.
- If the user is already active and the failure concerns continuation, the correct lifecycle treatment is Subscription Expiring or Subscription Expired depending on business timing and outcome.

## When a subscription expires

- The user first moves into Subscription Expiring when a continuation decision exists.
- If continuation does not occur, the user becomes Subscription Expired.
- If the person remains dormant, the next business treatment may be Inactive or Archived depending on business policy.

# Lifecycle Ownership

## Anonymous

- Business owner: Marketing Lead
- Expected customer outcome: Awareness and first resonance
- Expected business outcome: Qualified attention

## Telegram Contact

- Business owner: Product Owner with Sales Lead
- Expected customer outcome: Direct engagement and curiosity
- Expected business outcome: Entry participation

## Test Participant

- Business owner: Product Owner
- Expected customer outcome: Diagnostic engagement
- Expected business outcome: Test completion and segmentation

## Recommended

- Business owner: Product Owner
- Expected customer outcome: Clarity about the next step
- Expected business outcome: Correct routing into the first active product

## FOCUS Member

- Business owner: Product Owner
- Expected customer outcome: Rhythm, action, and supported movement
- Expected business outcome: Paid activation and early retention

## Platform Subscriber

- Business owner: Product Owner
- Expected customer outcome: Continuity and self-directed structure
- Expected business outcome: Recurring retention and deeper value realization

## Premium Client

- Business owner: Coach Lead
- Expected customer outcome: High-context transformation
- Expected business outcome: Premium revenue and deeper customer outcomes

## Subscription Expiring

- Business owner: Product Owner
- Expected customer outcome: Clear continuation decision
- Expected business outcome: Renewal, correct transition, or clean exit

## Subscription Expired

- Business owner: Product Owner
- Expected customer outcome: Opportunity for recovery or intentional closure
- Expected business outcome: Reactivation opportunity or clear former-customer treatment

## Inactive

- Business owner: Product Owner with Marketing Lead
- Expected customer outcome: Opportunity to return when ready
- Expected business outcome: Recoverable dormant relationship

## Archived

- Business owner: Operations Lead
- Expected customer outcome: None; active commercial treatment has ended
- Expected business outcome: Historical clarity and clean business boundaries

# Governance

## Ownership

The User Lifecycle is owned by the business architecture layer of Starway.

Changes must be aligned with:

- `docs/foundation/01-company.md`
- `docs/foundation/02-products.md`
- `docs/foundation/03-funnel.md`

## Versioning

This document must remain one canonical lifecycle definition.

Historical lifecycle models must be archived rather than kept active in parallel.

## Modification Rules

- No new user state may be introduced without unique business meaning.
- No state may be duplicated under a different name.
- No lower-level document may invent competing user states.
- Access, subscriptions, dashboards, automations, AI agents, and business processes must reference this lifecycle rather than redefine state logic.

## Backward Compatibility

When lifecycle states change:

- downstream documents must be updated to align with the new lifecycle;
- historical lifecycle definitions must be archived if they remain useful for traceability;
- no active competing state model may remain in the repository.

Future documents must reference this lifecycle instead of redefining user states.
