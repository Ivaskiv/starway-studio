# Document

AI Decision Model

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
- `docs/architecture/03-state-machines.md`
- `docs/architecture/04-business-processes.md`
- `docs/architecture/05-ai-capability-model.md`
- `docs/architecture/07-ai-memory-model.md`
- `docs/foundation/09-business-rules.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/architecture/05-ai-capability-model.md`
- `docs/architecture/09-ai-governance-model.md`
- `docs/technical/06-workflow-orchestration.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The AI Decision Model exists to define how canonical AI Agents make business decisions inside the Starway / ABSystem ecosystem.

It answers one question:

Which business decisions may AI make, on what authority, from which canonical inputs, and with which required explanation?

AI decision making must be standardized because the architecture already defines:

- canonical AI responsibilities;
- canonical business objects;
- canonical business events;
- canonical business rules;
- canonical business processes;
- canonical state machines.

Without a decision model, AI Agents could:

- act outside their authority;
- use incomplete inputs;
- make conflicting decisions;
- bypass human approval points;
- create non-explainable business outcomes.

This document defines business decision authority only.

It does not define prompts, models, inference logic, scoring logic, or technical enforcement.

It must be read together with:

- `docs/architecture/05-ai-capability-model.md`
- `docs/architecture/07-ai-memory-model.md`
- `docs/architecture/04-business-processes.md`
- `docs/architecture/03-state-machines.md`
- `docs/foundation/09-business-rules.md`

## Decision Principles

1. Business-first.
   Every AI decision must exist to support a real business outcome, not a technical convenience.

2. Deterministic decisions.
   The same valid business context should lead to the same class of allowed decision.

3. Explainability.
   Every meaningful decision must be explainable through canonical business inputs and rules.

4. Least authority.
   An AI Agent may decide only what its canonical responsibility requires.

5. Human override.
   Any decision that crosses a human-owned boundary must escalate to human authority.

6. Traceability.
   Every decision must be attributable to a canonical agent, canonical inputs, and canonical rules.

7. Rule-driven decisions.
   AI decisions must be grounded in Business Rules and may not invent local decision law.

8. No hidden decisions.
   If a decision type is not documented here, it is not canonically authorized.

## Decision Inventory

### Funnel Agent

- Business decisions:
  - Determine the most valid next funnel step
  - Determine whether the current context is entry, continuation, or re-entry
- Decision purpose:
  - Keep movement through the canonical funnel clear and deterministic
- Decision owner:
  - Business architecture and growth leadership
- Business impact:
  - Affects guidance, routing, and next-step communication

### Recommendation Agent

- Business decisions:
  - Determine the most valid recommendation
  - Determine whether a prior recommendation should be refreshed or replaced
- Decision purpose:
  - Turn user context into a valid next-step recommendation
- Decision owner:
  - Business architecture and recommendation guidance leadership
- Business impact:
  - Affects next-step direction, offer relevance, and progression quality

### Onboarding Agent

- Business decisions:
  - Determine the best first-step onboarding guidance
- Decision purpose:
  - Reduce friction at the start of the relationship
- Decision owner:
  - Business architecture and growth leadership
- Business impact:
  - Affects entry conversion quality and start-rate into the ecosystem

### Engagement Agent

- Business decisions:
  - Determine the most valid engagement-support action
- Decision purpose:
  - Improve participation and reduce silent drop-off
- Decision owner:
  - Product engagement leadership
- Business impact:
  - Affects continuity, participation, and active use of current products

### Progress Agent

- Business decisions:
  - Determine how progress should be interpreted
- Decision purpose:
  - Turn participation and continuity facts into meaningful progress understanding
- Decision owner:
  - Product insight and continuity leadership
- Business impact:
  - Affects interpretation quality and continuity reinforcement

### Reflection Agent

- Business decisions:
  - Determine the most valid reflection direction
- Decision purpose:
  - Help users extract meaning from participation and key events
- Decision owner:
  - Product insight leadership
- Business impact:
  - Affects continuation readiness and reflective value

### Coach Agent

- Business decisions:
  - Determine which customer context is most important for coach awareness
  - Determine whether a situation should be escalated to the human coach
- Decision purpose:
  - Support better human judgment and delivery preparation
- Decision owner:
  - Coach operations leadership
- Business impact:
  - Affects premium-context interpretation and quality of human-led service

### Subscription Agent

- Business decisions:
  - Determine the correct continuity path
  - Determine whether a continuity event is activation, renewal, upgrade, downgrade, or expiration
- Decision purpose:
  - Preserve correct subscription handling and access continuity
- Decision owner:
  - Monetization and continuity leadership
- Business impact:
  - Affects paid access, renewal treatment, continuity, and recovery readiness

### Retention Agent

- Business decisions:
  - Determine the valid recovery path
  - Determine whether a user should receive recovery-oriented continuation support
- Decision purpose:
  - Reduce churn and preserve return opportunities
- Decision owner:
  - Retention leadership
- Business impact:
  - Affects re-entry quality, retention outcomes, and churn recovery

### Payment Agent

- Business decisions:
  - Determine how a payment outcome should be interpreted for continuity handling
- Decision purpose:
  - Convert valid payment facts into correct continuity-related decisions
- Decision owner:
  - Monetization operations leadership
- Business impact:
  - Affects subscription handling and downstream continuity actions

### Notification Agent

- Business decisions:
  - Determine which valid business communication should be sent
  - Determine whether communication is recommendation, continuity, recovery, or onboarding related
- Decision purpose:
  - Ensure the correct business message is delivered at the correct stage
- Decision owner:
  - Business communications leadership
- Business impact:
  - Affects clarity, continuity, and timely user communication

### Analytics Agent

- Business decisions:
  - Determine how business patterns should be interpreted
  - Determine when business insight should escalate to human review
- Decision purpose:
  - Produce insight without mutating source-of-truth business state
- Decision owner:
  - Business architecture and analytics leadership
- Business impact:
  - Affects strategic interpretation and process review

### Referral Agent

- Business decisions:
  - Determine whether referral context is only a signal or a valid conversion fact
  - Determine how referral context should feed canonical funnel routing
- Decision purpose:
  - Preserve valid referral treatment without bypassing standard business progression
- Decision owner:
  - Growth leadership
- Business impact:
  - Affects referral handling, entry attribution, and recommendation refresh context

## Decision Inputs

### Funnel Agent decisions

- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Funnel Stage Record
  - Recommendation Record
- Required Business Events:
  - Telegram Joined
  - Entry Test Started
  - Entry Test Completed
  - Subscription Expired
  - Referral Converted where relevant
- Required State Machines:
  - User Lifecycle Record
  - Recommendation Record
- Required Business Rules:
  - BR-001
  - BR-003
  - BR-013
  - BR-018

### Recommendation Agent decisions

- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Recommendation Record
- Required Business Events:
  - Entry Test Completed
  - Recommendation Generated
  - Zoom Attended
  - Strategy Session Completed
- Required State Machines:
  - User Lifecycle Record
  - Recommendation Record
- Required Business Rules:
  - BR-006
  - BR-011
  - BR-018

### Onboarding Agent decisions

- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Funnel Stage Record
  - Access Policy Record
- Required Business Events:
  - Telegram Joined
  - Entry Test Started
- Required State Machines:
  - User Lifecycle Record
- Required Business Rules:
  - BR-001
  - BR-003
  - BR-018

### Engagement Agent decisions

- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Product Record
  - Recommendation Record
- Required Business Events:
  - Zoom Registered
  - Zoom Attended
  - Entry Test Started
  - Entry Test Completed
- Required State Machines:
  - User Lifecycle Record
  - Recommendation Record
- Required Business Rules:
  - BR-008
  - BR-018

### Progress Agent decisions

- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Product Record
- Required Business Events:
  - Zoom Attended
  - Strategy Session Completed
  - Subscription Renewed
- Required State Machines:
  - User Lifecycle Record
  - Subscription Record
- Required Business Rules:
  - BR-008
  - BR-018

### Reflection Agent decisions

- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Recommendation Record
- Required Business Events:
  - Zoom Attended
  - Strategy Session Completed
  - Entry Test Completed
- Required State Machines:
  - User Lifecycle Record
  - Recommendation Record
- Required Business Rules:
  - BR-006
  - BR-018

### Coach Agent decisions

- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Product Record
  - Recommendation Record
- Required Business Events:
  - Strategy Session Booked
  - Strategy Session Completed
  - Zoom Attended
  - Subscription Renewed
- Required State Machines:
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Required Business Rules:
  - BR-011
  - BR-018

### Subscription Agent decisions

- Required Business Objects:
  - Subscription Record
  - User Record
  - User Lifecycle Record
  - Product Record
  - Access Policy Record
- Required Business Events:
  - Subscription Activated
  - Subscription Renewed
  - Subscription Upgraded
  - Subscription Downgraded
  - Subscription Expired
  - Payment Received
  - Payment Failed
- Required State Machines:
  - Subscription Record
  - User Lifecycle Record
- Required Business Rules:
  - BR-007
  - BR-008
  - BR-012
  - BR-018

### Retention Agent decisions

- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Required Business Events:
  - Subscription Expired
  - Payment Failed
  - Subscription Renewed
  - Telegram Joined
- Required State Machines:
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Required Business Rules:
  - BR-007
  - BR-013
  - BR-018

### Payment Agent decisions

- Required Business Objects:
  - Subscription Record
  - User Record
  - Product Record
- Required Business Events:
  - Payment Received
  - Payment Failed
- Required State Machines:
  - Subscription Record
  - User Lifecycle Record
- Required Business Rules:
  - BR-007
  - BR-018

### Notification Agent decisions

- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
  - Access Policy Record
- Required Business Events:
  - Recommendation Generated
  - Subscription Activated
  - Subscription Renewed
  - Subscription Expired
  - Payment Received
- Required State Machines:
  - User Lifecycle Record
  - Subscription Record
  - Recommendation Record
- Required Business Rules:
  - BR-006
  - BR-008
  - BR-018

### Analytics Agent decisions

- Required Business Objects:
  - Company Record
  - Product Record
  - Subscription Record
  - Funnel Stage Record
  - User Record
  - User Lifecycle Record
  - Business Event Record
  - Recommendation Record
- Required Business Events:
  - All canonical Business Events relevant to the process under review
- Required State Machines:
  - All canonical operational state machines
- Required Business Rules:
  - BR-004
  - BR-005
  - BR-016
  - BR-018

### Referral Agent decisions

- Required Business Objects:
  - User Record
  - User Lifecycle Record
  - Recommendation Record
- Required Business Events:
  - Referral Created
  - Referral Converted
- Required State Machines:
  - User Lifecycle Record
  - Recommendation Record
- Required Business Rules:
  - BR-005
  - BR-013
  - BR-018

## Decision Outputs

The canonical AI decision outputs are:

- resulting Business Events where the agent is allowed to emit a canonical event;
- Recommendations where the decision produces a next-step suggestion;
- state transition requests where the agent may request but not own a transition;
- Notifications where the decision produces or selects a business communication.

### Output by decision class

- Funnel routing decisions:
  - Recommendations
  - Notifications
  - state transition requests only through canonical downstream process layers

- Recommendation decisions:
  - Recommendation Generated
  - Recommendations
  - Notifications through Notification Agent

- Onboarding decisions:
  - Recommendations
  - Notifications

- Engagement decisions:
  - Recommendations
  - Notifications

- Progress decisions:
  - Recommendations in limited continuation context
  - escalation for interpretation review

- Reflection decisions:
  - Recommendations
  - Notifications

- Coach-support decisions:
  - escalation to Human Decision Maker
  - Recommendations in premium-context support only

- Subscription decisions:
  - state transition requests on Subscription Record
  - state transition requests affecting User Lifecycle through canonical continuity handling
  - Notifications through Notification Agent

- Retention decisions:
  - Recommendations
  - Notifications
  - state transition requests only through canonical recovery paths

- Payment decisions:
  - Payment Received
  - Payment Failed
  - state transition requests on Subscription Record via continuity handling

- Notification decisions:
  - Notifications

- Analytics decisions:
  - escalation to Human Decision Maker
  - interpretive insight only

- Referral decisions:
  - Referral Created
  - Referral Converted
  - Recommendations
  - Notifications

## Decision Authority

### Funnel Agent

- Authority:
  - AI autonomous for funnel-routing and next-step guidance within canonical paths

### Recommendation Agent

- Authority:
  - AI autonomous for standard recommendation decisions
  - AI with human approval for premium-context recommendation escalation

### Onboarding Agent

- Authority:
  - AI autonomous for canonical onboarding guidance

### Engagement Agent

- Authority:
  - AI autonomous for engagement-support decisions inside canonical product boundaries

### Progress Agent

- Authority:
  - AI autonomous for progress interpretation
  - AI with human approval if interpretation would materially alter human treatment

### Reflection Agent

- Authority:
  - AI autonomous for reflection direction
  - AI with human approval where reflection implies premium escalation

### Coach Agent

- Authority:
  - AI autonomous for coach-support interpretation
  - AI with human approval for premium-context judgment support
  - human only for final premium acceptance and human delivery judgment

### Subscription Agent

- Authority:
  - AI autonomous for canonical continuity-path decisions
  - AI with human approval for any exception outside canonical continuity handling

### Retention Agent

- Authority:
  - AI autonomous for canonical recovery-path decisions
  - AI with human approval for exception recovery handling

### Payment Agent

- Authority:
  - AI autonomous for payment-outcome interpretation
  - AI with human approval for non-canonical payment exceptions

### Notification Agent

- Authority:
  - AI autonomous for standard business communication selection
  - AI with human approval for sensitive or exceptional communication contexts

### Analytics Agent

- Authority:
  - AI autonomous for business insight interpretation
  - human only for strategic action decisions based on that insight

### Referral Agent

- Authority:
  - AI autonomous for canonical referral interpretation
  - AI with human approval for referral exceptions outside the standard funnel

## Decision Constraints

### Forbidden decisions

- No AI Agent may invent new lifecycle states.
- No AI Agent may invent new subscription states.
- No AI Agent may bypass Business Rules.
- No AI Agent may grant Premium Services access autonomously where human qualification is required.
- No AI Agent may treat recommendation as state change by itself.
- No AI Agent may replace canonical business events with remembered assumptions.

### Mandatory validations

- Lifecycle-sensitive decisions must validate current User Lifecycle Record.
- Continuity-sensitive decisions must validate Subscription Record.
- Recommendation decisions must validate current recommendation context and product canon.
- Recovery decisions must validate canonical return-path rules.
- Notification decisions must validate the message purpose against current business state and process stage.

### Conflicting rules

When rules appear to conflict:

- Business Rules outrank remembered context;
- current canonical Business Data outranks cached AI memory;
- human-owned boundaries outrank AI autonomous authority;
- more specific canonical process constraints apply within the broader Business Rule framework.

### Escalation requirements

- Premium acceptance requires human escalation.
- Any non-canonical continuity exception requires human escalation.
- Any decision with insufficient current canonical data must escalate for refresh or human review.
- Any decision crossing a documented forbidden boundary must not proceed autonomously.

## Explainability Requirements

### Funnel Agent decisions

- Reasoning source:
  - Current funnel context, lifecycle state, relevant business events
- Referenced Business Rules:
  - BR-001, BR-003, BR-013, BR-018
- Referenced Business Data:
  - User Record, User Lifecycle Record, Funnel Stage Record, Recommendation Record
- Explanation requirements:
  - Must explain why this is the valid next path and why other paths are not currently valid

### Recommendation Agent decisions

- Reasoning source:
  - Diagnostic context, current lifecycle, product canon, recommendation history
- Referenced Business Rules:
  - BR-006, BR-011, BR-018
- Referenced Business Data:
  - User Record, User Lifecycle Record, Product Record, Recommendation Record
- Explanation requirements:
  - Must explain why the recommendation is valid, what it is based on, and whether premium escalation is required

### Onboarding Agent decisions

- Reasoning source:
  - Entry context and current stage
- Referenced Business Rules:
  - BR-001, BR-003, BR-018
- Referenced Business Data:
  - User Record, User Lifecycle Record, Funnel Stage Record, Access Policy Record
- Explanation requirements:
  - Must explain why the selected onboarding guidance fits the current entry context

### Engagement Agent decisions

- Reasoning source:
  - Participation signals and current active product context
- Referenced Business Rules:
  - BR-008, BR-018
- Referenced Business Data:
  - User Record, User Lifecycle Record, Product Record, Recommendation Record
- Explanation requirements:
  - Must explain what engagement signal was detected and why the chosen support action is valid

### Progress Agent decisions

- Reasoning source:
  - Participation continuity and progression context
- Referenced Business Rules:
  - BR-008, BR-018
- Referenced Business Data:
  - User Record, User Lifecycle Record, Subscription Record, Product Record
- Explanation requirements:
  - Must explain which progress signals were used and what interpretation they support

### Reflection Agent decisions

- Reasoning source:
  - Meaningful participation context and reflective relevance
- Referenced Business Rules:
  - BR-006, BR-018
- Referenced Business Data:
  - User Record, User Lifecycle Record, Recommendation Record
- Explanation requirements:
  - Must explain why this reflection direction is appropriate now

### Coach Agent decisions

- Reasoning source:
  - Customer context relevant to human delivery and premium judgment
- Referenced Business Rules:
  - BR-011, BR-018
- Referenced Business Data:
  - User Record, User Lifecycle Record, Subscription Record, Recommendation Record
- Explanation requirements:
  - Must explain why the situation needs coach attention or human escalation

### Subscription Agent decisions

- Reasoning source:
  - Continuity events, subscription state, access policy, lifecycle context
- Referenced Business Rules:
  - BR-007, BR-008, BR-012, BR-018
- Referenced Business Data:
  - Subscription Record, User Record, User Lifecycle Record, Product Record, Access Policy Record
- Explanation requirements:
  - Must explain why the continuity outcome is classified as activation, renewal, upgrade, downgrade, or expiration

### Retention Agent decisions

- Reasoning source:
  - Expiration context, recovery relevance, and return-path validity
- Referenced Business Rules:
  - BR-007, BR-013, BR-018
- Referenced Business Data:
  - User Record, User Lifecycle Record, Subscription Record, Recommendation Record
- Explanation requirements:
  - Must explain why the chosen recovery path is valid and what conditions support it

### Payment Agent decisions

- Reasoning source:
  - Payment outcome and related continuity scope
- Referenced Business Rules:
  - BR-007, BR-018
- Referenced Business Data:
  - Subscription Record, User Record, Product Record
- Explanation requirements:
  - Must explain how the payment outcome maps to continuity handling

### Notification Agent decisions

- Reasoning source:
  - Current process step, lifecycle context, recommendation or continuity state
- Referenced Business Rules:
  - BR-006, BR-008, BR-018
- Referenced Business Data:
  - User Record, User Lifecycle Record, Subscription Record, Recommendation Record, Access Policy Record
- Explanation requirements:
  - Must explain why this business message is appropriate now

### Analytics Agent decisions

- Reasoning source:
  - Cross-process business-event patterns and state-machine outcomes
- Referenced Business Rules:
  - BR-004, BR-005, BR-016, BR-018
- Referenced Business Data:
  - Company Record, Product Record, Subscription Record, Funnel Stage Record, User Record, User Lifecycle Record, Business Event Record, Recommendation Record
- Explanation requirements:
  - Must explain which pattern was observed and why it matters without claiming source-of-truth mutation

### Referral Agent decisions

- Reasoning source:
  - Referral facts, referral conversion context, and standard funnel-entry validity
- Referenced Business Rules:
  - BR-005, BR-013, BR-018
- Referenced Business Data:
  - User Record, User Lifecycle Record, Recommendation Record
- Explanation requirements:
  - Must explain whether the referral is only a signal or a true conversion fact and why

## Decision Matrix

| AI Agent | Decision | Authority | Required Inputs | Outputs | Escalation | Business Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Funnel Agent | Next funnel step, entry vs re-entry routing | AI autonomous | User, Lifecycle, Funnel Stage, Recommendation, relevant events | Recommendations, notifications, downstream routing requests | Escalate when outside canonical funnel path | BR-001, BR-003, BR-013, BR-018 |
| Recommendation Agent | Valid next-step recommendation, recommendation refresh | AI autonomous / AI with human approval for premium-context | User, Lifecycle, Product, Recommendation, recommendation-relevant events | Recommendation Generated, recommendations, notifications | Escalate to Coach Agent / Human for premium-bound cases | BR-006, BR-011, BR-018 |
| Onboarding Agent | Best onboarding guidance | AI autonomous | User, Lifecycle, Funnel Stage, Access Policy, entry events | Recommendations, notifications | Escalate if canonical entry path is insufficient | BR-001, BR-003, BR-018 |
| Engagement Agent | Best engagement-support action | AI autonomous | User, Lifecycle, Product, Recommendation, participation events | Recommendations, notifications | Escalate if engagement action would cross continuity or policy boundaries | BR-008, BR-018 |
| Progress Agent | Progress interpretation | AI autonomous / AI with human approval for materially sensitive interpretation | User, Lifecycle, Subscription, Product, progress-relevant events | Recommendations, interpretive outputs | Escalate for human-sensitive treatment impacts | BR-008, BR-018 |
| Reflection Agent | Reflection direction | AI autonomous / AI with human approval for premium implications | User, Lifecycle, Recommendation, reflection-relevant events | Recommendations, notifications | Escalate when reflection implies human-bound premium movement | BR-006, BR-018 |
| Coach Agent | Coach-support context, need for human escalation | AI autonomous / human only for final premium judgment | User, Lifecycle, Subscription, Product, Recommendation, coach-relevant events | Recommendations, escalation to human | Must escalate to Human Decision Maker for premium acceptance | BR-011, BR-018 |
| Subscription Agent | Continuity handling classification | AI autonomous / AI with human approval for exceptions | Subscription, User, Lifecycle, Product, Access Policy, continuity events | State transition requests, notifications | Escalate for non-canonical continuity handling | BR-007, BR-008, BR-012, BR-018 |
| Retention Agent | Recovery path selection | AI autonomous / AI with human approval for exceptions | User, Lifecycle, Subscription, Recommendation, recovery events | Recommendations, notifications, routing requests | Escalate when return path is non-canonical | BR-007, BR-013, BR-018 |
| Payment Agent | Payment-outcome interpretation | AI autonomous / AI with human approval for exceptions | Subscription, User, Product, payment events | Payment Received / Failed, continuity requests | Escalate for payment exceptions outside canon | BR-007, BR-018 |
| Notification Agent | Appropriate business communication | AI autonomous / AI with human approval for sensitive exceptions | User, Lifecycle, Subscription, Recommendation, Access Policy, process-relevant events | Notifications | Escalate for sensitive or exceptional communication | BR-006, BR-008, BR-018 |
| Analytics Agent | Business insight interpretation | AI autonomous / human only for strategic action | Company, Product, Subscription, Funnel Stage, User, Lifecycle, Event, Recommendation | Interpretive outputs, human review escalation | Must escalate for strategic decisions | BR-004, BR-005, BR-016, BR-018 |
| Referral Agent | Referral signal vs conversion fact | AI autonomous / AI with human approval for exceptions | User, Lifecycle, Recommendation, referral events | Referral Created / Converted, recommendations, notifications | Escalate for referral exceptions outside standard funnel | BR-005, BR-013, BR-018 |

## Cross References

- AI Capability Model:
  - `docs/architecture/05-ai-capability-model.md`
- AI Memory Model:
  - `docs/architecture/07-ai-memory-model.md`
- Business Rules:
  - `docs/foundation/09-business-rules.md`
- Business Process Model:
  - `docs/architecture/04-business-processes.md`
- Business State Machines:
  - `docs/architecture/03-state-machines.md`
- Business Data Model:
  - `docs/architecture/02-data-model.md`
- AI Interaction Model:
  - `docs/architecture/06-ai-interaction-model.md`

## Governance

### Adding decisions

A new AI decision may be added only when:

- it belongs to an existing canonical AI Agent;
- it originates from canonical Business Rules and canonical Business Processes;
- its required inputs, outputs, authority, and escalation path are explicit;
- it does not duplicate another agent’s decision ownership.

### Changing authority

Decision authority may change only when:

- Business Rules change;
- the AI Capability Model changes;
- human-approval boundaries are redefined canonically;
- a business process changes the decision boundary explicitly.

### Deprecating decisions

A decision may be deprecated only when:

- the underlying business need no longer exists; or
- the decision is absorbed into another canonical decision without overlap.

Deprecated decisions must remain historically understandable until all dependent architecture and implementation are aligned.

### Auditing decisions

AI decisions must be auditable against:

- the canonical AI Agent that made the decision;
- the Business Objects and Business Events used as inputs;
- the Business Rules referenced;
- the authority class under which the decision was made;
- the escalation path taken if human approval or exception handling was required.
