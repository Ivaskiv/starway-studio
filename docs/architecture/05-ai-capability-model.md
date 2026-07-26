# Document

AI Capability Model

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

- `docs/foundation/06-ai-agents.md`
- `docs/foundation/09-business-rules.md`
- `docs/architecture/02-data-model.md`
- `docs/architecture/03-state-machines.md`
- `docs/architecture/04-business-processes.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/architecture/06-ai-interaction-model.md`
- `docs/architecture/08-ai-decision-model.md`
- `docs/engineering/03-ai-agent-blueprint.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The AI Capability Model exists to define the canonical business capabilities of every AI Agent in the Starway / ABSystem ecosystem.

It answers one question:

What is each AI Agent allowed to know, decide, and execute within the business architecture?

AI Capabilities are separated from AI implementation because business authority must remain stable even when tools, prompts, providers, or delivery mechanisms change.

This document therefore defines:

- business read authority;
- business decision authority;
- business write authority;
- business tool categories;
- forbidden actions.

It does not define prompts, models, transport, integration methods, or technical enforcement.

This document must be read together with:

- `docs/foundation/06-ai-agents.md`
- `docs/foundation/07-ai-workflows.md`
- `docs/foundation/09-business-rules.md`
- `docs/architecture/02-data-model.md`
- `docs/architecture/03-state-machines.md`
- `docs/architecture/04-business-processes.md`

## Capability Principles

1. One capability = one responsibility.
   Every AI Agent must remain bounded to one canonical business responsibility.

2. Least privilege.
   An AI Agent may read, decide, create, update, and emit only what is necessary for its business role.

3. Deterministic business boundaries.
   An AI Agent may not expand its authority through local interpretation.

4. Explicit authority.
   Every meaningful permission must be documented directly.

5. Explainable decisions.
   Any decision authority granted to an AI Agent must be business-interpretable and reviewable.

6. Business-first.
   Capabilities exist to support business outcomes, not technical convenience.

7. No rule ownership.
   AI Agents may apply Business Rules, but they never own them.

8. No state-machine ownership.
   AI Agents may observe state machines and request some transitions, but they never own business state.

## AI Capability Inventory

### Funnel Agent

- Purpose:
  - Support movement through the canonical business funnel.
- Business responsibility:
  - Identify the user’s current funnel position and surface the most valid next business action.
- Business owner:
  - Business architecture and growth leadership
- Supported business processes:
  - Audience Entry Process
  - Diagnostic Entry Process
  - Recommendation Delivery Process
  - Subscription Recovery Process
  - Referral Conversion Process
  - Recommendation Refresh Process

### Recommendation Agent

- Purpose:
  - Translate user context into a valid next-step recommendation.
- Business responsibility:
  - Produce recommendations aligned with products, funnel, lifecycle, and business rules.
- Business owner:
  - Business architecture and recommendation guidance leadership
- Supported business processes:
  - Diagnostic Entry Process
  - Recommendation Delivery Process
  - Premium Conversion Process
  - Recommendation Refresh Process

### Onboarding Agent

- Purpose:
  - Help a new direct contact start correctly inside the ecosystem.
- Business responsibility:
  - Reduce friction at the beginning of the relationship and improve entry conversion quality.
- Business owner:
  - Business architecture and growth leadership
- Supported business processes:
  - Audience Entry Process
  - Diagnostic Entry Process

### Engagement Agent

- Purpose:
  - Support meaningful user participation within active products.
- Business responsibility:
  - Increase active engagement and reduce silent drop-off in current product use.
- Business owner:
  - Product engagement leadership
- Supported business processes:
  - Recommendation Refresh Process
  - Product-continuity participation inside active product layers

### Progress Agent

- Purpose:
  - Help interpret forward movement over time.
- Business responsibility:
  - Translate participation and continuity facts into progress understanding.
- Business owner:
  - Product insight and continuity leadership
- Supported business processes:
  - Product-continuity interpretation processes
  - Recommendation Refresh Process where progress context matters

### Reflection Agent

- Purpose:
  - Help a user derive meaning from participation and key moments.
- Business responsibility:
  - Support reflection and continuation readiness after meaningful business events.
- Business owner:
  - Product insight leadership
- Supported business processes:
  - Recommendation Refresh Process
  - Post-participation reflection inside active product journeys

### Coach Agent

- Purpose:
  - Support the human coach with bounded contextual intelligence.
- Business responsibility:
  - Improve human preparation, delivery support, and premium-context awareness.
- Business owner:
  - Coach operations leadership
- Supported business processes:
  - Premium Conversion Process
  - Premium delivery support processes

### Subscription Agent

- Purpose:
  - Support business decisions around continuity, renewal, upgrade, and downgrade.
- Business responsibility:
  - Interpret subscription-related context and request the correct continuity handling.
- Business owner:
  - Monetization and continuity leadership
- Supported business processes:
  - FOCUS Activation Process
  - Platform Upgrade Process
  - Subscription Renewal Process
  - Subscription Recovery Process

### Retention Agent

- Purpose:
  - Support retention and return inside continuity-based products.
- Business responsibility:
  - Recognize churn risk, expired continuity, and valid return opportunities.
- Business owner:
  - Retention leadership
- Supported business processes:
  - Platform Upgrade Process
  - Subscription Renewal Process
  - Subscription Recovery Process
  - Recommendation Refresh Process

### Payment Agent

- Purpose:
  - Interpret payment-related business facts for continuity handling.
- Business responsibility:
  - Convert valid payment outcomes into allowed continuity-related business actions.
- Business owner:
  - Monetization operations leadership
- Supported business processes:
  - FOCUS Activation Process
  - Platform Upgrade Process
  - Subscription Renewal Process

### Notification Agent

- Purpose:
  - Deliver business messages that support progression, continuity, and recovery.
- Business responsibility:
  - Communicate valid next-step, continuity, and notification outcomes without redefining business state.
- Business owner:
  - Business communications leadership
- Supported business processes:
  - Recommendation Delivery Process
  - FOCUS Activation Process
  - Subscription Renewal Process
  - Subscription Recovery Process
  - Recommendation Refresh Process

### Analytics Agent

- Purpose:
  - Interpret business facts across the ecosystem.
- Business responsibility:
  - Produce business insight without modifying source-of-truth business state.
- Business owner:
  - Business architecture and analytics leadership
- Supported business processes:
  - Cross-process performance interpretation
  - Business review and insight generation across all canonical processes

### Referral Agent

- Purpose:
  - Support referral recognition and referral-related progression.
- Business responsibility:
  - Distinguish referral facts from actual referral conversion and support valid referral progression.
- Business owner:
  - Growth leadership
- Supported business processes:
  - Referral Conversion Process
  - Recommendation Refresh Process where referral context is relevant

## Read Permissions

### Funnel Agent

- Business Objects it may read:
  - User Record
  - User Lifecycle Record
  - Funnel Stage Record
  - Recommendation Record
  - Product Record
  - Business Event Record
- State Machines it may observe:
  - User Lifecycle Record
  - Recommendation Record
- Business Events it may consume:
  - Telegram Joined
  - Entry Test Started
  - Entry Test Completed
  - Recommendation Generated
  - FOCUS Purchased
  - Subscription Renewed

### Recommendation Agent

- Business Objects it may read:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Recommendation Record
  - Business Event Record
  - Funnel Stage Record
- State Machines it may observe:
  - User Lifecycle Record
  - Recommendation Record
- Business Events it may consume:
  - Entry Test Completed
  - Recommendation Generated
  - Zoom Attended
  - Strategy Session Completed

### Onboarding Agent

- Business Objects it may read:
  - User Record
  - User Lifecycle Record
  - Funnel Stage Record
  - Access Policy Record
  - Business Event Record
- State Machines it may observe:
  - User Lifecycle Record
- Business Events it may consume:
  - Telegram Joined
  - Entry Test Started

### Engagement Agent

- Business Objects it may read:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Recommendation Record
  - Business Event Record
- State Machines it may observe:
  - User Lifecycle Record
  - Recommendation Record
- Business Events it may consume:
  - Zoom Registered
  - Zoom Attended
  - Entry Test Started
  - Entry Test Completed

### Progress Agent

- Business Objects it may read:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Subscription Record
  - Business Event Record
- State Machines it may observe:
  - User Lifecycle Record
  - Subscription Record
- Business Events it may consume:
  - Zoom Attended
  - Strategy Session Completed
  - Subscription Renewed

### Reflection Agent

- Business Objects it may read:
  - User Record
  - User Lifecycle Record
  - Recommendation Record
  - Business Event Record
- State Machines it may observe:
  - User Lifecycle Record
  - Recommendation Record
- Business Events it may consume:
  - Zoom Attended
  - Strategy Session Completed
  - Entry Test Completed

### Coach Agent

- Business Objects it may read:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Subscription Record
  - Recommendation Record
  - Business Event Record
- State Machines it may observe:
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Business Events it may consume:
  - Zoom Registered
  - Zoom Attended
  - Strategy Session Booked
  - Strategy Session Completed
  - Subscription Renewed

### Subscription Agent

- Business Objects it may read:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Product Record
  - Access Policy Record
  - Business Event Record
- State Machines it may observe:
  - Subscription Record
  - User Lifecycle Record
- Business Events it may consume:
  - Subscription Activated
  - Subscription Renewed
  - Subscription Upgraded
  - Subscription Downgraded
  - Subscription Expired
  - Payment Received
  - Payment Failed

### Retention Agent

- Business Objects it may read:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
  - Business Event Record
- State Machines it may observe:
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Business Events it may consume:
  - Subscription Renewed
  - Subscription Expired
  - Payment Failed
  - Telegram Joined

### Payment Agent

- Business Objects it may read:
  - User Record
  - Subscription Record
  - Product Record
  - Business Event Record
- State Machines it may observe:
  - Subscription Record
  - User Lifecycle Record
- Business Events it may consume:
  - Payment Received
  - Payment Failed
  - Subscription Activated
  - Subscription Renewed
  - Subscription Upgraded
  - Subscription Downgraded

### Notification Agent

- Business Objects it may read:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
  - Access Policy Record
  - Business Event Record
- State Machines it may observe:
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Business Events it may consume:
  - Recommendation Generated
  - Subscription Activated
  - Subscription Renewed
  - Subscription Expired
  - Payment Received

### Analytics Agent

- Business Objects it may read:
  - Company Record
  - Product Record
  - Subscription Record
  - Funnel Stage Record
  - User Record
  - User Lifecycle Record
  - Business Event Record
  - Recommendation Record
  - Access Policy Record
- State Machines it may observe:
  - All canonical operational state machines
- Business Events it may consume:
  - All canonical Business Events

### Referral Agent

- Business Objects it may read:
  - User Record
  - User Lifecycle Record
  - Recommendation Record
  - Business Event Record
- State Machines it may observe:
  - User Lifecycle Record
  - Recommendation Record
- Business Events it may consume:
  - Referral Created
  - Referral Converted

## Decision Permissions

### Funnel Agent

- Decisions it may make:
  - Which canonical next step should be surfaced within the current funnel context
  - Whether the user should be treated as entry, continuation, or re-entry context
- Decisions requiring human approval:
  - Any premium redirection outside canonical rules
- Decisions explicitly forbidden:
  - Subscription approval
  - Premium approval
  - Lifecycle state ownership

### Recommendation Agent

- Decisions it may make:
  - Which valid recommendation best matches canonical user context
  - Whether a previous recommendation should be refreshed or replaced
- Decisions requiring human approval:
  - Premium-path escalation when human qualification is required
- Decisions explicitly forbidden:
  - Granting access
  - Changing subscription continuity
  - Direct lifecycle transition decisions

### Onboarding Agent

- Decisions it may make:
  - Which first-step guidance best reduces friction for a new direct contact
- Decisions requiring human approval:
  - Exceptions to the canonical entry path
- Decisions explicitly forbidden:
  - Paid-product eligibility
  - Subscription activation
  - Premium qualification

### Engagement Agent

- Decisions it may make:
  - Which engagement prompt or continuation nudge is valid within an active context
- Decisions requiring human approval:
  - None when staying inside canonical engagement boundaries
- Decisions explicitly forbidden:
  - Lifecycle advancement
  - Retention-policy decisions
  - Subscription changes

### Progress Agent

- Decisions it may make:
  - How to interpret progress signals within canonical product continuity
- Decisions requiring human approval:
  - Any conclusion that would materially change business treatment
- Decisions explicitly forbidden:
  - Product access decisions
  - Lifecycle transitions
  - Subscription decisions

### Reflection Agent

- Decisions it may make:
  - Which reflective direction is valid after meaningful participation events
- Decisions requiring human approval:
  - Premium advice when human qualification is required
- Decisions explicitly forbidden:
  - Access control
  - Subscription transitions
  - Lifecycle ownership

### Coach Agent

- Decisions it may make:
  - Which contextual insight is most useful for the coach
  - Which premium-context signals deserve attention
- Decisions requiring human approval:
  - Any premium acceptance or service-scope decision
- Decisions explicitly forbidden:
  - Replacing coach judgment
  - Granting premium entry autonomously
  - Changing subscription state

### Subscription Agent

- Decisions it may make:
  - Which canonical subscription handling path applies
  - Whether continuity should be treated as activation, renewal, upgrade, downgrade, or expiration
- Decisions requiring human approval:
  - Exceptions outside canonical continuity rules
- Decisions explicitly forbidden:
  - Product redesign
  - Premium service qualification
  - New lifecycle-state invention

### Retention Agent

- Decisions it may make:
  - Which recovery or continuity-support path is valid for an at-risk or expired user
- Decisions requiring human approval:
  - Any exception that bypasses canonical return paths
- Decisions explicitly forbidden:
  - Direct subscription activation without valid monetization event
  - Premium admission
  - Lifecycle ownership

### Payment Agent

- Decisions it may make:
  - How a valid payment outcome maps into continuity handling
- Decisions requiring human approval:
  - Any payment exception outside canonical monetization rules
- Decisions explicitly forbidden:
  - Product access outside subscription rules
  - Premium qualification
  - Independent lifecycle-state creation

### Notification Agent

- Decisions it may make:
  - Which business communication should be sent based on valid canonical context
- Decisions requiring human approval:
  - Sensitive communications outside standard process context
- Decisions explicitly forbidden:
  - Deciding new business policy
  - Changing subscription continuity
  - Reassigning lifecycle state

### Analytics Agent

- Decisions it may make:
  - How to interpret business patterns and process performance
- Decisions requiring human approval:
  - Any action that would change customer treatment directly
- Decisions explicitly forbidden:
  - Any business state transition
  - Any direct product, subscription, or lifecycle mutation

### Referral Agent

- Decisions it may make:
  - Whether referral-related facts support continued referral treatment
- Decisions requiring human approval:
  - Any non-canonical incentive or referral exception
- Decisions explicitly forbidden:
  - Bypassing standard funnel entry
  - Granting access
  - Changing subscription continuity

## Write Permissions

### Funnel Agent

- Business Objects it may create:
  - Recommendation Record
- Business Objects it may update:
  - Recommendation Record
- Business Events it may emit:
  - None as new canonical facts

### Recommendation Agent

- Business Objects it may create:
  - Recommendation Record
- Business Objects it may update:
  - Recommendation Record
- Business Events it may emit:
  - Recommendation Generated

### Onboarding Agent

- Business Objects it may create:
  - Recommendation Record where onboarding produces a valid next-step suggestion
- Business Objects it may update:
  - Recommendation Record
- Business Events it may emit:
  - None as independent canonical events

### Engagement Agent

- Business Objects it may create:
  - Recommendation Record where continued engagement requires a valid next-step suggestion
- Business Objects it may update:
  - Recommendation Record
- Business Events it may emit:
  - None as independent canonical events

### Progress Agent

- Business Objects it may create:
  - None as canonical source-of-truth business objects
- Business Objects it may update:
  - Recommendation Record where progress interpretation influences next-step guidance
- Business Events it may emit:
  - None

### Reflection Agent

- Business Objects it may create:
  - Recommendation Record where reflection supports a valid next-step suggestion
- Business Objects it may update:
  - Recommendation Record
- Business Events it may emit:
  - None

### Coach Agent

- Business Objects it may create:
  - Recommendation Record
- Business Objects it may update:
  - Recommendation Record
- Business Events it may emit:
  - None as independent canonical facts

### Subscription Agent

- Business Objects it may create:
  - None as new core object types
- Business Objects it may update:
  - Subscription Record
- Business Events it may emit:
  - None independently; it acts in response to canonical subscription events

### Retention Agent

- Business Objects it may create:
  - Recommendation Record
- Business Objects it may update:
  - Recommendation Record
- Business Events it may emit:
  - None independently

### Payment Agent

- Business Objects it may create:
  - Business Event Record
- Business Objects it may update:
  - Subscription Record
- Business Events it may emit:
  - Payment Received
  - Payment Failed

### Notification Agent

- Business Objects it may create:
  - None as core source-of-truth objects
- Business Objects it may update:
  - Recommendation Record where delivery changes recommendation state
- Business Events it may emit:
  - None independently

### Analytics Agent

- Business Objects it may create:
  - None as source-of-truth business objects
- Business Objects it may update:
  - None
- Business Events it may emit:
  - None

### Referral Agent

- Business Objects it may create:
  - Recommendation Record
  - Business Event Record where referral facts become recognized canonical facts
- Business Objects it may update:
  - Recommendation Record
- Business Events it may emit:
  - Referral Created
  - Referral Converted

Agents never bypass Business Rules.

No agent may create or update business state in ways not already permitted by:

- the Data Model;
- the State Machines;
- the Business Rules.

## Tool Permissions

### Funnel Agent

- Allowed tool categories:
  - messaging
  - recommendations
  - routing
- Not allowed:
  - payments
  - premium approval

### Recommendation Agent

- Allowed tool categories:
  - recommendations
  - reporting
  - messaging
- Not allowed:
  - payments
  - lifecycle control

### Onboarding Agent

- Allowed tool categories:
  - messaging
  - recommendations
  - routing
- Not allowed:
  - payments
  - premium qualification

### Engagement Agent

- Allowed tool categories:
  - messaging
  - recommendations
  - scheduling support
- Not allowed:
  - payments
  - access control

### Progress Agent

- Allowed tool categories:
  - analytics
  - reporting
  - recommendations
- Not allowed:
  - payments
  - lifecycle control

### Reflection Agent

- Allowed tool categories:
  - messaging
  - recommendations
  - reporting
- Not allowed:
  - payments
  - subscription control

### Coach Agent

- Allowed tool categories:
  - reporting
  - messaging
  - recommendations
  - scheduling support
- Not allowed:
  - autonomous premium approval
  - payment control

### Subscription Agent

- Allowed tool categories:
  - payments
  - reporting
  - recommendations
  - messaging
- Not allowed:
  - product-catalog authority
  - premium qualification

### Retention Agent

- Allowed tool categories:
  - messaging
  - recommendations
  - analytics
  - reporting
- Not allowed:
  - direct payment control
  - direct lifecycle ownership

### Payment Agent

- Allowed tool categories:
  - payments
  - reporting
  - messaging
- Not allowed:
  - product redesign
  - premium approval

### Notification Agent

- Allowed tool categories:
  - messaging
  - reporting
- Not allowed:
  - payment authority
  - subscription authority

### Analytics Agent

- Allowed tool categories:
  - analytics
  - reporting
- Not allowed:
  - messaging as a decision owner
  - payments
  - lifecycle mutation

### Referral Agent

- Allowed tool categories:
  - messaging
  - recommendations
  - analytics
  - reporting
- Not allowed:
  - payments
  - access control

## Capability Matrix

| AI Agent | Reads | Observes | Decides | Creates | Updates | Emits Events | Forbidden Actions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Funnel Agent | User, Lifecycle, Funnel Stage, Recommendation, Product, Event | User Lifecycle, Recommendation | Next funnel step, re-entry guidance | Recommendation Record | Recommendation Record | None | Subscription approval, premium approval, lifecycle ownership |
| Recommendation Agent | User, Lifecycle, Product, Recommendation, Event, Funnel Stage | User Lifecycle, Recommendation | Valid next-step recommendation, recommendation refresh | Recommendation Record | Recommendation Record | Recommendation Generated | Access grant, subscription change, direct lifecycle change |
| Onboarding Agent | User, Lifecycle, Funnel Stage, Access Policy, Event | User Lifecycle | Best first-step guidance | Recommendation Record | Recommendation Record | None | Paid eligibility, subscription activation, premium qualification |
| Engagement Agent | User, Lifecycle, Product, Recommendation, Event | User Lifecycle, Recommendation | Valid engagement nudges | Recommendation Record | Recommendation Record | None | Lifecycle advancement, retention policy, subscription change |
| Progress Agent | User, Lifecycle, Product, Subscription, Event | User Lifecycle, Subscription | Progress interpretation | None | Recommendation Record | None | Access decisions, lifecycle transitions, subscription decisions |
| Reflection Agent | User, Lifecycle, Recommendation, Event | User Lifecycle, Recommendation | Reflective continuation guidance | Recommendation Record | Recommendation Record | None | Access control, subscription transitions, lifecycle ownership |
| Coach Agent | User, Lifecycle, Product, Subscription, Recommendation, Event | User Lifecycle, Subscription, Recommendation | Coach-support interpretation, premium-context signals | Recommendation Record | Recommendation Record | None | Replacing coach judgment, autonomous premium approval, subscription changes |
| Subscription Agent | User, Lifecycle, Subscription, Product, Access Policy, Event | Subscription, User Lifecycle | Continuity handling path | None | Subscription Record | None | Product redesign, premium qualification, lifecycle invention |
| Retention Agent | User, Lifecycle, Subscription, Recommendation, Event | User Lifecycle, Subscription, Recommendation | Recovery path, continuity support path | Recommendation Record | Recommendation Record | None | Direct activation without event, premium admission, lifecycle ownership |
| Payment Agent | User, Subscription, Product, Event | Subscription, User Lifecycle | Payment outcome handling | Business Event Record | Subscription Record | Payment Received, Payment Failed | Access outside subscription rules, premium qualification, lifecycle invention |
| Notification Agent | User, Lifecycle, Subscription, Recommendation, Access Policy, Event | User Lifecycle, Subscription, Recommendation | Which valid business communication to send | None | Recommendation Record | None | Policy decisions, subscription continuity changes, lifecycle reassignment |
| Analytics Agent | Company, Product, Subscription, Funnel Stage, User, Lifecycle, Event, Recommendation, Access Policy | All operational state machines | Insight interpretation only | None | None | None | Any state transition or source-of-truth mutation |
| Referral Agent | User, Lifecycle, Recommendation, Event | User Lifecycle, Recommendation | Referral-fact interpretation | Recommendation Record, Business Event Record | Recommendation Record | Referral Created, Referral Converted | Bypassing funnel entry, granting access, subscription continuity changes |

## Cross References

- Canonical AI Agents:
  - `docs/foundation/06-ai-agents.md`
- Canonical AI Workflows:
  - `docs/foundation/07-ai-workflows.md`
- Canonical Business Rules:
  - `docs/foundation/09-business-rules.md`
- Business Data Model:
  - `docs/architecture/02-data-model.md`
- Business State Machines:
  - `docs/architecture/03-state-machines.md`
- Business Process Model:
  - `docs/architecture/04-business-processes.md`

## Governance

### Adding capabilities

A new AI capability may be added only when:

- it belongs to an already canonical AI Agent; or
- the Foundation adds a new canonical AI Agent first;
- the capability supports a real business responsibility;
- its read, decision, write, and tool boundaries can be stated explicitly.

### Splitting capabilities

A capability must be split when:

- one AI Agent is carrying more than one business responsibility;
- least-privilege boundaries can no longer be preserved;
- decision authority becomes ambiguous or overlapping.

### Deprecating capabilities

A capability may be deprecated only when:

- the underlying business responsibility no longer exists; or
- the responsibility is absorbed into another canonical agent without overlap.

Deprecated capabilities must remain historically understandable until all dependent architecture and implementation are aligned.

### Ownership

Capability ownership belongs to AI systems architecture leadership together with the business owner of the corresponding canonical AI Agent.

No implementation team may expand or reassign capability authority without first changing the canonical business architecture.
