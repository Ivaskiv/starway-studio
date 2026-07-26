# Document

Product Ecosystem

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

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/foundation/03-funnel.md`
- `docs/foundation/04-user-lifecycle.md`
- `docs/foundation/09-business-rules.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

# Product Ecosystem

This document is the canonical business source of truth for the Starway product ecosystem.

It defines which business products exist, how they relate, which subscriptions include them, and who owns them.

It must be read together with `docs/foundation/01-company.md`.

This document does not define implementation, channels, APIs, prompts, databases, or technical architecture.

It also does not treat business events, delivery activities, or AI capabilities as standalone products unless they are sold or owned as separate business offerings.

## Ecosystem Scope

The Starway ecosystem contains:

- acquisition channels;
- entry products;
- core recurring products;
- continuity products;
- premium services;
- internal operating products.

The canonical customer-facing product ladder is:

Instagram
↓
Telegram
↓
Entry Test
↓
Entry Recommendation
↓
FOCUS Membership
↓
ABSystem Platform
↓
Premium Services
↓
Renewal
↓
Advocate

In this ladder:

- Instagram and Telegram are business channels, not products;
- Entry Recommendation is a decision layer, not a standalone product;
- Renewal and Advocate are lifecycle outcomes, not products;
- Business events support products but are not products.

# Product Hierarchy

The Starway business hierarchy is:

Company
↓
Products
↓
Modules
↓
Features
↓
Services

## Hierarchy Definitions

- Company
  The single business entity and governing brand.

- Products
  Distinct customer-facing or internal business offerings with their own role, ownership, and business value.

- Modules
  Major value areas inside a product.

- Features
  Specific capabilities inside a module.

- Services
  Human-led, operational, or recurring value elements delivered inside or alongside a product.

## Canonical Hierarchy Rules

- Only business offerings may be listed as products.
- If something is included inside a product, it must be documented there as a module, feature, or service.
- A capability must not be promoted to product status unless it has its own business role, ownership, and commercial identity.

# Product Catalog

Document every business product that exists in the ecosystem.

For each product define:

- canonical name
- purpose
- target customer
- business value
- entry conditions
- exit conditions
- included services
- upgrade paths
- downgrade paths
- dependencies
- lifecycle
- business owner

If a capability belongs to another product, document it there as a service or feature.

## Entry Test

- Canonical name: Entry Test
- Purpose: Give the customer a clear diagnosis of their current state and identify the first meaningful next step.
- Target customer: A person who recognizes a problem or stagnation and is ready for structured self-reflection.
- Business value: Converts attention into the first meaningful commitment and creates readiness for the first paid offer.
- Entry conditions: The customer has entered the ecosystem through Telegram or an equivalent guided path.
- Exit conditions: The customer receives a result and moves into an entry recommendation, follow-up path, or paid next step.
- Included services:
  - Diagnostic assessment
  - Result interpretation
  - Entry recommendation
- Upgrade paths:
  - FOCUS Membership
  - Free Zoom Session where offered as a trust-building path
- Downgrade paths:
  - Follow-up nurture
  - Re-entry later through the same entry layer
- Dependencies:
  - Telegram channel relationship
  - Business messaging clarity
  - Entry conversion logic
- Lifecycle: Active
- Business owner: Product Owner

## FOCUS Membership

- Canonical name: FOCUS Membership
- Purpose: Move the customer from insight into recurring action, rhythm, and supported live practice.
- Target customer: A person who understands their blocker and is ready for structured weekly movement.
- Business value: First paid core revenue layer and the main activation product in the ecosystem.
- Entry conditions: Sufficient readiness after the Entry Test or another approved qualifying path.
- Exit conditions: The customer renews, upgrades, pauses, expires, or moves into a deeper support layer.
- Included services:
  - Weekly Zoom Practice
  - Community
  - Telegram Channel
  - Guided Exercises
- Upgrade paths:
  - ABSystem Platform
  - Premium Services
- Downgrade paths:
  - Return to entry or recovery flows
  - Non-renewal
- Dependencies:
  - Entry Test
  - Live delivery capacity
  - Membership continuity
  - Payment continuity
- Lifecycle: Active
- Business owner: Product Owner

## ABSystem Platform

- Canonical name: ABSystem Platform
- Purpose: Help the customer maintain continuity, structure, and self-directed progress between live touchpoints.
- Target customer: A customer who already values regular movement and is ready for a deeper personal system.
- Business value: Expands recurring value beyond live sessions and increases retention through daily usefulness.
- Entry conditions: The customer has enough readiness for structured continuity beyond the core live-practice layer.
- Exit conditions: The customer renews, upgrades, pauses, expires, or moves into premium services.
- Included services:
  - Wheel of Balance
  - Daily Cycle
  - AI Mentor
  - Goals
  - Progress
- Upgrade paths:
  - Premium Services
- Downgrade paths:
  - FOCUS Membership
  - Non-renewal
- Dependencies:
  - FOCUS Membership or equivalent readiness
  - Continuity value proposition
  - Ongoing subscription discipline
- Lifecycle: Active
- Business owner: Product Owner

## Course

- Canonical name: Course
- Purpose: Deliver a deeper structured learning and transformation path beyond the core recurring products.
- Target customer: A customer who is ready for broader guided development than live practice and continuity alone.
- Business value: Extends customer depth, learning value, and long-term progression.
- Entry conditions: Proven readiness for a deeper educational commitment.
- Exit conditions: Completion, continuation into another product, or disengagement.
- Included services:
  - Structured curriculum
  - Guided progression
  - Educational support
- Upgrade paths:
  - Premium Services
- Downgrade paths:
  - ABSystem Platform
  - FOCUS Membership
- Dependencies:
  - Curriculum ownership
  - Enrollment operations
  - Clear progression logic
- Lifecycle: Draft
- Business owner: Product Owner

## Personal Program

- Canonical name: Personal Program
- Purpose: Deliver the highest-context personalized support for customers who need direct, tailored transformation work.
- Target customer: A customer whose needs or goals require deeper human involvement than scalable formats can provide.
- Business value: Premium revenue and highest-depth transformation layer.
- Entry conditions: Qualification, fit, trust, and capacity alignment.
- Exit conditions: Program completion, renewal, continuation, or strategic pause.
- Included services:
  - Personalized guidance
  - Direct accountability
  - High-context transformation support
- Upgrade paths:
  - None as a standard ladder step beyond this premium layer
- Downgrade paths:
  - Strategic Session
  - ABSystem Platform
  - FOCUS Membership
- Dependencies:
  - Coach capacity
  - Qualification discipline
  - Premium delivery operations
- Lifecycle: Active
- Business owner: Coach Lead

## Strategic Session

- Canonical name: Strategic Session
- Purpose: Provide concentrated human-led direction, qualification, or escalation at a high-context decision point.
- Target customer: A customer who needs focused clarification before entering or changing a deeper support path.
- Business value: Improves premium qualification and helps the customer make a clearer next-step decision.
- Entry conditions: The customer reaches a decision point, escalation need, or high-context blockage.
- Exit conditions: The customer receives direction and either continues, upgrades, or exits.
- Included services:
  - Focused diagnosis
  - Direction-setting
  - Escalation recommendation
- Upgrade paths:
  - Personal Program
- Downgrade paths:
  - ABSystem Platform
  - FOCUS Membership
- Dependencies:
  - Coach capacity
  - Premium sales clarity
  - Service operations
- Lifecycle: Active
- Business owner: Coach Lead

## STANKEY

- Canonical name: STANKEY
- Purpose: Maintain a distinct product context when a separate bounded journey must remain isolated from the main FOCUS path.
- Target customer: A customer or lead who enters through a segmented offer path that should not collapse into the primary ladder immediately.
- Business value: Protects clarity and business discipline where an isolated journey is strategically required.
- Entry conditions: Product-specific segmented entry.
- Exit conditions: The customer completes the bounded path, restores into another product, or becomes inactive.
- Included services:
  - Segmented product journey
  - Isolated communication path
- Upgrade paths:
  - FOCUS Membership when appropriate
- Downgrade paths:
  - Return to segment-specific recovery or inactivity state
- Dependencies:
  - Product segmentation rules
  - Clear routing discipline
- Lifecycle: Beta
- Business owner: Product Owner

## Admin Platform

- Canonical name: Admin Platform
- Purpose: Coordinate internal visibility, oversight, and operational control across the ecosystem.
- Target customer: Internal operators, product owners, support, sales, and delivery teams.
- Business value: Makes the ecosystem governable, traceable, and operationally scalable.
- Entry conditions: Internal operational need.
- Exit conditions: Continuous internal use; not a customer-lifecycle product.
- Included services:
  - Operational oversight
  - Internal reporting
  - Coordination support
- Upgrade paths:
  - None
- Downgrade paths:
  - None
- Dependencies:
  - Product governance
  - Subscription rules
  - Support and operations processes
- Lifecycle: Active
- Business owner: Operations Lead

# Subscription Model

Subscriptions exist only where recurring continuity is part of the business value.

## Entry Access

- Included products:
  - Entry Test
- Upgrade path:
  - FOCUS Membership
- Downgrade path:
  - Not applicable; this is the pre-paid entry layer
- Renewal rules:
  - Not subscription-based
- Expiration rules:
  - Not applicable as a subscription
- Access rules:
  - Free access may still be bounded by campaign, routing, or participation rules

## FOCUS Membership Subscription

- Included products:
  - FOCUS Membership
- Upgrade path:
  - ABSystem Platform
  - Strategic Session
  - Personal Program
- Downgrade path:
  - Return to follow-up or recovery state
  - Non-renewal
- Renewal rules:
  - Renewal preserves continuity rather than restarting the journey
- Expiration rules:
  - Access ends when the paid term ends without renewal
- Access rules:
  - Only active members receive FOCUS services during the valid paid period

## ABSystem Platform Subscription

- Included products:
  - ABSystem Platform
- Upgrade path:
  - Strategic Session
  - Personal Program
  - Course where strategically appropriate
- Downgrade path:
  - FOCUS Membership
  - Non-renewal
- Renewal rules:
  - Renewal preserves customer continuity and system history
- Expiration rules:
  - Platform access ends when the paid term ends without renewal
- Access rules:
  - Access is granted only to the purchased platform tier and included modules

## Course Access Model

- Included products:
  - Course
- Upgrade path:
  - Strategic Session
  - Personal Program
- Downgrade path:
  - ABSystem Platform
  - FOCUS Membership
- Renewal rules:
  - Determined by course format or cohort structure
- Expiration rules:
  - Ends according to course access period or completion policy
- Access rules:
  - Course access is governed by enrollment, not by platform subscription by default

## Personal Program Access Model

- Included products:
  - Personal Program
- Upgrade path:
  - None as a standard recurring ladder step
- Downgrade path:
  - Strategic Session
  - ABSystem Platform
  - FOCUS Membership
- Renewal rules:
  - Renewal is bespoke and based on fit, capacity, and value
- Expiration rules:
  - Access ends when the agreed program period ends
- Access rules:
  - Access is individually defined within the premium offer agreement

# Product Relationships

The ecosystem is sequential, readiness-based, and non-random.

## Canonical Relationship Flow

Instagram
↓
Telegram
↓
Entry Test
↓
Entry Recommendation
↓
FOCUS Membership
↓
ABSystem Platform
↓
Premium Services
↓
Renewal
↓
Advocate

## Relationship Rules

- Channels create attention and relationship.
- Entry products create diagnosis and decision.
- FOCUS creates rhythm and activation.
- ABSystem creates continuity and systemization.
- Premium Services create depth and personalized transformation.
- Renewal preserves continuity.
- Advocate is the post-value relationship state where trust can become recommendation, referral, or long-term loyalty.

## Premium Services

Premium Services is the canonical business layer that contains:

- Strategic Session
- Personal Program

Premium Services is a relationship layer, not a separate product by itself.

# Product Lifecycle

Every product must exist in exactly one lifecycle state.

## Draft

- Meaning: The product is conceptually defined but not yet operating as an active business offer.
- Entry rule: The business role, target customer, and purpose are defined.
- Exit rule: The product moves to Beta when it is intentionally tested in a bounded real environment.

## Beta

- Meaning: The product is being tested in a live but controlled business context.
- Entry rule: The product has a defined offer, bounded audience, and active learning goals.
- Exit rule: The product moves to Active when its purpose, ownership, and business role are stable enough for normal use.

## Active

- Meaning: The product is part of the normal operating ecosystem and may be sold, renewed, or expanded.
- Entry rule: The product has stable purpose, ownership, and place in the ladder.
- Exit rule: The product moves to Deprecated when it should no longer be expanded as a strategic active offer.

## Deprecated

- Meaning: The product remains known to the business but is no longer part of forward expansion.
- Entry rule: The company has decided to replace, retire, isolate, or reduce the product.
- Exit rule: The product moves to Archived when it is no longer part of the active commercial ecosystem.

## Archived

- Meaning: The product exists only as a historical business record.
- Entry rule: The product no longer functions as an active or supported offer.
- Exit rule: None.

# Business Ownership

## Entry Test

- Business owner: Product Owner
- Technical owner: Backend Lead
- Documentation owner: Business Operations
- AI owner: AI Strategy Lead

## FOCUS Membership

- Business owner: Product Owner
- Technical owner: Backend Lead
- Documentation owner: Business Operations
- AI owner: AI Mentor Lead

## ABSystem Platform

- Business owner: Product Owner
- Technical owner: Platform Lead
- Documentation owner: Business Operations
- AI owner: AI Product Lead

## Course

- Business owner: Product Owner
- Technical owner: Platform Lead
- Documentation owner: Business Operations
- AI owner: AI Product Lead

## Personal Program

- Business owner: Coach Lead
- Technical owner: Operations Lead
- Documentation owner: Business Operations
- AI owner: AI Mentor Lead

## Strategic Session

- Business owner: Coach Lead
- Technical owner: Operations Lead
- Documentation owner: Business Operations
- AI owner: AI Strategy Lead

## STANKEY

- Business owner: Product Owner
- Technical owner: Backend Lead
- Documentation owner: Documentation Architecture
- AI owner: AI Seller Lead

## Admin Platform

- Business owner: Operations Lead
- Technical owner: Platform Lead
- Documentation owner: Documentation Architecture
- AI owner: AI Operations Lead

# Business Events

Business events occur during the funnel, but they are not products.

Business events support products.

Products own business events.

## Canonical Rules For Business Events

- A business event must not be documented as a product unless it becomes a separately owned commercial offering.
- A business event must always belong to a product or to a defined lifecycle stage.
- Product documents own the meaning of the business event.

## Examples Of Business Events

- Zoom Registration
  - Owned by: FOCUS Membership

- Weekly Zoom Practice
  - Owned by: FOCUS Membership

- Payment
  - Owned by: The product being purchased or renewed

- Subscription Renewal
  - Owned by: FOCUS Membership or ABSystem Platform

- Strategy Session
  - Owned by: Strategic Session as a product, but a scheduled session instance is a business event

- Entry Recommendation
  - Owned by: Entry Test

# Canonical Rules

This document is the only business source of truth for:

- product names
- product hierarchy
- subscriptions
- upgrade paths
- business ownership
- lifecycle

## Canonical Enforcement Rules

1. No other document may redefine a product name or product purpose.

2. No other document may define a competing subscription model.

3. No other document may invent a different product ladder or upgrade path.

4. Channels, business events, AI capabilities, features, and services must not be promoted to product status unless this document explicitly defines them as products.

5. Lower-level documents may describe how a product operates in their own domain, but they must reference this file for what the product is.

6. If a product changes lifecycle state, ownership, hierarchy, or subscription relationship, this document must be updated first or in the same change.

7. If a new product is introduced, it does not exist in the Starway ecosystem until it is added here.
