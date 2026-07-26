# Document

AI Interaction Model

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
- `docs/foundation/05-business-events.md`
- `docs/foundation/09-business-rules.md`
- `docs/architecture/05-ai-capability-model.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/architecture/05-ai-capability-model.md`
- `docs/architecture/07-ai-memory-model.md`
- `docs/technical/06-workflow-orchestration.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The AI Interaction Model exists to define how canonical AI Agents collaborate inside the Starway / ABSystem business architecture.

It answers one question:

When one AI Agent needs another, what is the allowed interaction, who owns it, and what must happen next?

AI interactions must be standardized because the architecture already defines:

- canonical agent responsibilities;
- canonical business processes;
- canonical business events;
- canonical business rules.

Without a standardized interaction model, agents could:

- duplicate responsibilities;
- delegate work in circles;
- override ownership boundaries;
- create non-deterministic orchestration;
- bypass human decision points.

This document therefore defines canonical agent-to-agent collaboration without defining prompts, protocols, transport, or implementation.

It must be read together with:

- `docs/foundation/05-business-events.md`
- `docs/foundation/06-ai-agents.md`
- `docs/foundation/07-ai-workflows.md`
- `docs/foundation/09-business-rules.md`
- `docs/architecture/04-business-processes.md`
- `docs/architecture/05-ai-capability-model.md`

## Interaction Principles

1. Event-driven collaboration.
   Agents collaborate only because valid business context or business events require collaboration.

2. Single responsibility.
   An interaction may request help from another agent, but it may not transfer ownership of the initiating agent’s responsibility.

3. No circular delegation.
   Agent A may not hand work to Agent B in a way that requires B to hand the same responsibility back to A as part of the same decision loop.

4. Explicit ownership.
   Every interaction must have one initiating owner and one receiving owner for the handover.

5. Deterministic orchestration.
   The same business trigger should produce the same interaction path under the same business context.

6. Human override.
   Any interaction that reaches a human-bound decision boundary must escalate rather than simulate authority it does not have.

7. No hidden interaction paths.
   If an interaction is not documented here, it is not canonically allowed.

8. Business-first collaboration.
   Interactions exist to complete business processes, not to create technical complexity.

## Interaction Roles

### Initiator

- Definition:
  - The AI Agent that first detects the need for another agent’s participation based on business context.

### Coordinator

- Definition:
  - The AI Agent that sequences or routes interaction between multiple agents inside a process without taking over their responsibilities.

### Executor

- Definition:
  - The AI Agent that performs the requested bounded business capability.

### Observer

- Definition:
  - The AI Agent that reads interaction-relevant context or outcomes without owning the handover.

### Reviewer

- Definition:
  - The AI Agent that evaluates whether a prior agent’s outcome is sufficient for the next step, without replacing the original agent’s responsibility.

### Human Decision Maker

- Definition:
  - The human business owner, coach, operator, or approver required where canonical AI authority ends.

Only canonical existing agents may hold AI interaction roles:

- Funnel Agent
- Recommendation Agent
- Onboarding Agent
- Engagement Agent
- Progress Agent
- Reflection Agent
- Coach Agent
- Subscription Agent
- Retention Agent
- Payment Agent
- Notification Agent
- Analytics Agent
- Referral Agent

## Interaction Inventory

### Funnel Agent

- Incoming interactions:
  - From Onboarding Agent when entry friction needs canonical funnel routing
  - From Retention Agent when a recovery path must map back into canonical funnel movement
  - From Referral Agent when referral context needs standard funnel treatment
- Outgoing interactions:
  - To Onboarding Agent for new-contact onboarding guidance
  - To Recommendation Agent when diagnostic completion requires a next-step recommendation
  - To Notification Agent when funnel guidance must be delivered
- Interaction triggers:
  - `Telegram Joined`
  - `Entry Test Started`
  - `Entry Test Completed`
  - `Subscription Expired`
  - `Referral Converted`
- Expected outcomes:
  - Clear funnel routing
  - Correct next-step direction
  - Canonical entry or re-entry path

### Recommendation Agent

- Incoming interactions:
  - From Funnel Agent after diagnostic completion or funnel ambiguity
  - From Reflection Agent when insight should become a valid next-step recommendation
  - From Retention Agent when recovery needs a fresh recommendation
  - From Coach Agent when premium-context interpretation requires next-step guidance
- Outgoing interactions:
  - To Notification Agent for recommendation delivery
  - To Coach Agent when premium-context recommendation requires human-bound review
  - To Funnel Agent when recommendation outcome must realign funnel movement
- Interaction triggers:
  - `Entry Test Completed`
  - `Recommendation Generated`
  - `Zoom Attended`
  - `Strategy Session Completed`
- Expected outcomes:
  - Valid recommendation
  - Recommendation refresh
  - Premium-path escalation when required

### Onboarding Agent

- Incoming interactions:
  - From Funnel Agent when a new direct contact needs first-step guidance
- Outgoing interactions:
  - To Funnel Agent when onboarding context requires canonical funnel routing
  - To Notification Agent when onboarding guidance must be delivered
- Interaction triggers:
  - `Telegram Joined`
  - `Entry Test Started`
- Expected outcomes:
  - Reduced onboarding friction
  - Correct first-step guidance

### Engagement Agent

- Incoming interactions:
  - From Funnel Agent when active participation needs support
  - From Recommendation Agent when a recommendation should be reinforced through engagement
- Outgoing interactions:
  - To Reflection Agent after meaningful participation signals
  - To Notification Agent for continuity-support communication
- Interaction triggers:
  - `Zoom Registered`
  - `Zoom Attended`
  - `Entry Test Started`
  - `Entry Test Completed`
- Expected outcomes:
  - Higher participation
  - Lower silent drop-off
  - Better transition into reflection or continuation

### Progress Agent

- Incoming interactions:
  - From Engagement Agent when participation patterns need interpretation
  - From Coach Agent when progress context should support human preparation
  - From Analytics Agent when cross-process pattern review needs user-level progress interpretation
- Outgoing interactions:
  - To Reflection Agent when progress should become meaningful interpretation
  - To Coach Agent when progress insight should support human delivery
  - To Analytics Agent when progress signals should contribute to business insight
- Interaction triggers:
  - `Zoom Attended`
  - `Strategy Session Completed`
  - `Subscription Renewed`
- Expected outcomes:
  - Progress visibility
  - Better context for reflection
  - Better context for human support

### Reflection Agent

- Incoming interactions:
  - From Engagement Agent after meaningful participation
  - From Progress Agent after progress interpretation
  - From Recommendation Agent when reflection may clarify the next step
- Outgoing interactions:
  - To Recommendation Agent when reflection supports a new recommendation
  - To Notification Agent when reflection support should be delivered
- Interaction triggers:
  - `Zoom Attended`
  - `Strategy Session Completed`
  - `Entry Test Completed`
- Expected outcomes:
  - Meaningful reflection
  - Improved continuation readiness
  - Valid recommendation context

### Coach Agent

- Incoming interactions:
  - From Recommendation Agent when premium-path guidance needs human-bound context
  - From Progress Agent when progress insight should support delivery
  - From Notification Agent when communication context needs coach-aware framing
- Outgoing interactions:
  - To Progress Agent when customer movement needs interpretation
  - To Recommendation Agent when human-contextual recommendation refinement is needed
  - To Human Decision Maker when premium judgment or delivery judgment is required
- Interaction triggers:
  - `Strategy Session Booked`
  - `Strategy Session Completed`
  - `Zoom Registered`
  - `Zoom Attended`
- Expected outcomes:
  - Better coach preparation
  - Better premium-context decisions
  - Explicit human escalation where required

### Subscription Agent

- Incoming interactions:
  - From Payment Agent when payment outcomes imply continuity handling
  - From Retention Agent when recovery intent requires subscription-path evaluation
  - From Funnel Agent when re-entry context must resolve into continuity handling
- Outgoing interactions:
  - To Notification Agent when continuity outcomes must be communicated
  - To Retention Agent when continuity is not restored and recovery should continue
  - To Funnel Agent when subscription context changes the valid business route
- Interaction triggers:
  - `Payment Received`
  - `Payment Failed`
  - `Subscription Activated`
  - `Subscription Renewed`
  - `Subscription Upgraded`
  - `Subscription Downgraded`
  - `Subscription Expired`
- Expected outcomes:
  - Correct continuity handling
  - Valid access state
  - Correct recovery routing when needed

### Retention Agent

- Incoming interactions:
  - From Subscription Agent when continuity is at risk or has ended
  - From Notification Agent when a recovery communication requires next-step logic
  - From Funnel Agent when re-entry opportunities must be evaluated for at-risk users
- Outgoing interactions:
  - To Funnel Agent for canonical return-path routing
  - To Recommendation Agent for refreshed recommendation context
  - To Notification Agent for recovery communication
  - To Subscription Agent when recovery leads back into continuity handling
- Interaction triggers:
  - `Subscription Expired`
  - `Payment Failed`
  - `Subscription Renewed`
  - `Telegram Joined`
- Expected outcomes:
  - Valid recovery path
  - Reduced churn loss
  - Correct re-entry or reactivation support

### Payment Agent

- Incoming interactions:
  - None from other agents as a required prerequisite for payment-fact interpretation
- Outgoing interactions:
  - To Subscription Agent when payment outcomes require continuity handling
  - To Notification Agent when payment outcomes require customer communication
- Interaction triggers:
  - `Payment Received`
  - `Payment Failed`
- Expected outcomes:
  - Correct payment outcome interpretation
  - Correct subscription-path follow-through

### Notification Agent

- Incoming interactions:
  - From Funnel Agent for funnel guidance delivery
  - From Recommendation Agent for recommendation delivery
  - From Onboarding Agent for onboarding guidance delivery
  - From Engagement Agent for continuity-support delivery
  - From Reflection Agent for reflection delivery
  - From Subscription Agent for subscription-related delivery
  - From Retention Agent for recovery delivery
  - From Payment Agent for payment outcome delivery
- Outgoing interactions:
  - To Coach Agent when coach-aware communication context is needed
  - To Retention Agent when message outcome should trigger further recovery handling
- Interaction triggers:
  - Any canonical process step requiring business communication
- Expected outcomes:
  - Correct business communication
  - Timely next-step delivery
  - No unauthorized business decision-making

### Analytics Agent

- Incoming interactions:
  - From Progress Agent when user-level movement needs business interpretation
  - From Coach Agent when delivery patterns need broader synthesis
  - From any process layer when performance interpretation is needed
- Outgoing interactions:
  - To Progress Agent when business insight requires more granular progress reading
  - To Human Decision Maker when business insight implies strategic review
- Interaction triggers:
  - Accumulated business-event context across processes
- Expected outcomes:
  - Business insight
  - Process performance interpretation
  - No mutation of source-of-truth state

### Referral Agent

- Incoming interactions:
  - From Funnel Agent when referral entry should map into standard funnel logic
  - From Retention Agent when advocacy or return behavior includes referral signals
- Outgoing interactions:
  - To Funnel Agent when referral conversion becomes valid entry context
  - To Notification Agent when referral communication is needed
- Interaction triggers:
  - `Referral Created`
  - `Referral Converted`
- Expected outcomes:
  - Canonical referral interpretation
  - Referral conversion without bypassing standard entry logic

## Handover Rules

### Funnel Agent → Onboarding Agent

- Sender:
  - Funnel Agent
- Receiver:
  - Onboarding Agent
- Trigger:
  - `Telegram Joined`
- Business context:
  - A direct contact has entered and needs first-step guidance.
- Expected response:
  - Onboarding guidance aligned to the canonical entry path.
- Completion condition:
  - The user receives correct entry guidance or proceeds into `Entry Test Started`.

### Funnel Agent → Recommendation Agent

- Sender:
  - Funnel Agent
- Receiver:
  - Recommendation Agent
- Trigger:
  - `Entry Test Completed`
- Business context:
  - Diagnostic completion requires a valid next-step recommendation.
- Expected response:
  - A recommendation aligned with funnel, lifecycle, and product canon.
- Completion condition:
  - `Recommendation Generated` is valid and ready for delivery.

### Recommendation Agent → Notification Agent

- Sender:
  - Recommendation Agent
- Receiver:
  - Notification Agent
- Trigger:
  - `Recommendation Generated`
- Business context:
  - The valid recommendation must be communicated as the active next step.
- Expected response:
  - Delivery of the recommendation in a business-valid format.
- Completion condition:
  - Recommendation Record reaches `Delivered`.

### Engagement Agent → Reflection Agent

- Sender:
  - Engagement Agent
- Receiver:
  - Reflection Agent
- Trigger:
  - `Zoom Attended`
- Business context:
  - Meaningful participation has occurred and should become interpretation.
- Expected response:
  - Reflection support that helps the user extract meaning from the experience.
- Completion condition:
  - Reflection context is produced for continuation or recommendation support.

### Progress Agent → Reflection Agent

- Sender:
  - Progress Agent
- Receiver:
  - Reflection Agent
- Trigger:
  - Progress insight becomes relevant after continued participation.
- Business context:
  - Progress interpretation should become user-meaningful reflection.
- Expected response:
  - Reflection guidance grounded in real progress context.
- Completion condition:
  - Reflection can support continuation readiness or recommendation refresh.

### Reflection Agent → Recommendation Agent

- Sender:
  - Reflection Agent
- Receiver:
  - Recommendation Agent
- Trigger:
  - Reflection indicates a valid new next-step context.
- Business context:
  - Reflection should influence what recommendation is now valid.
- Expected response:
  - Recommendation refresh or confirmation.
- Completion condition:
  - A new or reaffirmed valid recommendation exists.

### Payment Agent → Subscription Agent

- Sender:
  - Payment Agent
- Receiver:
  - Subscription Agent
- Trigger:
  - `Payment Received`
  - `Payment Failed`
- Business context:
  - Payment outcomes require continuity interpretation.
- Expected response:
  - Correct subscription handling path.
- Completion condition:
  - Subscription Record reflects the correct continuity state.

### Subscription Agent → Notification Agent

- Sender:
  - Subscription Agent
- Receiver:
  - Notification Agent
- Trigger:
  - Subscription activation, renewal, upgrade, downgrade, expiration, or failed continuity outcome
- Business context:
  - Continuity outcome must be communicated to the user.
- Expected response:
  - Correct continuity-related message.
- Completion condition:
  - User receives business-valid subscription communication.

### Subscription Agent → Retention Agent

- Sender:
  - Subscription Agent
- Receiver:
  - Retention Agent
- Trigger:
  - `Subscription Expired`
  - unresolved continuity after payment failure
- Business context:
  - Continuity was not preserved and recovery support is required.
- Expected response:
  - Valid recovery strategy within canonical return paths.
- Completion condition:
  - A valid recovery or re-entry path is selected.

### Retention Agent → Funnel Agent

- Sender:
  - Retention Agent
- Receiver:
  - Funnel Agent
- Trigger:
  - A valid return opportunity exists.
- Business context:
  - Recovery must re-enter the canonical funnel rather than inventing a side path.
- Expected response:
  - Funnel-valid re-entry guidance.
- Completion condition:
  - The user is routed to the correct return path.

### Retention Agent → Recommendation Agent

- Sender:
  - Retention Agent
- Receiver:
  - Recommendation Agent
- Trigger:
  - Recovery requires a refreshed or alternative next-step recommendation.
- Business context:
  - The previous recommendation is no longer sufficient.
- Expected response:
  - A valid refreshed recommendation.
- Completion condition:
  - Recommendation context is updated under canonical rules.

### Recommendation Agent → Coach Agent

- Sender:
  - Recommendation Agent
- Receiver:
  - Coach Agent
- Trigger:
  - Premium-context next-step guidance reaches a human-bound qualification boundary.
- Business context:
  - The recommendation may imply Premium Services, but AI does not own premium approval.
- Expected response:
  - Coach-aware review context.
- Completion condition:
  - Premium-path recommendation is either supported for human review or held from unauthorized execution.

### Coach Agent → Human Decision Maker

- Sender:
  - Coach Agent
- Receiver:
  - Human Decision Maker
- Trigger:
  - Premium acceptance or human delivery judgment is required.
- Business context:
  - Human judgment is the canonical owner beyond AI capability boundaries.
- Expected response:
  - Human decision.
- Completion condition:
  - Premium or delivery decision is resolved by authorized human ownership.

### Progress Agent → Analytics Agent

- Sender:
  - Progress Agent
- Receiver:
  - Analytics Agent
- Trigger:
  - User-level progress patterns need business-wide interpretation.
- Business context:
  - Operational insight should inform strategic understanding.
- Expected response:
  - Aggregated business insight.
- Completion condition:
  - Strategic interpretation exists without changing source-of-truth state.

### Referral Agent → Funnel Agent

- Sender:
  - Referral Agent
- Receiver:
  - Funnel Agent
- Trigger:
  - `Referral Converted`
- Business context:
  - A referral fact has become a valid entry context.
- Expected response:
  - Canonical funnel routing for the referred person.
- Completion condition:
  - Referral entry is handled through the standard funnel rather than a special bypass.

## Escalation Rules

### When AI escalates to AI

AI escalates to another AI Agent when:

- the next step belongs to another agent’s canonical responsibility;
- a business process requires sequential capabilities;
- interpretation from one agent must become action by another agent;
- continuity handling requires moving from one bounded responsibility to another.

Examples:

- Funnel Agent → Recommendation Agent
- Engagement Agent → Reflection Agent
- Payment Agent → Subscription Agent
- Retention Agent → Funnel Agent

### When AI escalates to Human

AI escalates to Human when:

- a premium decision requires human qualification;
- a coach judgment must remain human-owned;
- a requested outcome crosses the AI Agent’s documented authority;
- business rules require human override or exception handling.

Examples:

- Coach Agent → Human Decision Maker
- Recommendation Agent → Coach Agent → Human Decision Maker for premium-context cases

### Forbidden escalations

- AI may not escalate to another AI Agent in order to bypass its own forbidden actions.
- AI may not escalate in circles.
- AI may not escalate a business rule decision to an AI Agent that does not own the relevant responsibility.
- AI may not escalate directly to Premium Services approval without human involvement where human qualification is required.
- Analytics Agent may not escalate into state mutation agents for autonomous business changes.

## Interaction Matrix

| AI Agent | May Initiate | May Receive | May Coordinate | May Observe | Must Escalate | Forbidden Interactions |
| --- | --- | --- | --- | --- | --- | --- |
| Funnel Agent | Onboarding Agent, Recommendation Agent, Notification Agent | Onboarding Agent, Retention Agent, Referral Agent | Audience Entry, funnel routing, recovery routing | Recommendation delivery, recovery outcomes | To Recommendation Agent for next-step generation, to Human only through owning human layers when outside authority | Circular routing with Retention Agent, subscription ownership, premium approval |
| Recommendation Agent | Notification Agent, Coach Agent, Funnel Agent | Funnel Agent, Reflection Agent, Retention Agent, Coach Agent | Recommendation delivery and refresh | Funnel context, reflection outcomes | To Coach Agent or Human Decision Maker for premium-bound decisions | Direct subscription handling, direct lifecycle mutation |
| Onboarding Agent | Funnel Agent, Notification Agent | Funnel Agent | Entry guidance execution | Entry-state context | To Funnel Agent when onboarding needs canonical routing | Premium decisions, subscription routing |
| Engagement Agent | Reflection Agent, Notification Agent | Funnel Agent, Recommendation Agent | Participation support flow | User activity and recommendation context | To Reflection Agent for meaning-making | Subscription or premium handling |
| Progress Agent | Reflection Agent, Coach Agent, Analytics Agent | Engagement Agent, Coach Agent, Analytics Agent | Progress interpretation support | Participation and continuity context | To Analytics Agent for strategic synthesis, to Coach Agent for human delivery context | State mutation, subscription handling |
| Reflection Agent | Recommendation Agent, Notification Agent | Engagement Agent, Progress Agent, Recommendation Agent | Reflection-to-recommendation handover | Participation and progress context | To Recommendation Agent when next-step guidance is needed | Subscription handling, lifecycle ownership |
| Coach Agent | Progress Agent, Recommendation Agent, Human Decision Maker | Recommendation Agent, Progress Agent, Notification Agent | Premium-context and coach-support review | Premium-context signals, progress context | To Human Decision Maker when human judgment is required | Autonomous premium approval, subscription state change |
| Subscription Agent | Notification Agent, Retention Agent, Funnel Agent | Payment Agent, Retention Agent, Funnel Agent | Continuity handling and recovery routing | Payment outcomes, lifecycle context | To Retention Agent when continuity is not preserved | Product redesign, premium qualification, circular payment delegation |
| Retention Agent | Funnel Agent, Recommendation Agent, Notification Agent, Subscription Agent | Subscription Agent, Notification Agent, Funnel Agent | Recovery routing | Expiration, failed continuity, re-entry context | To Funnel Agent for re-entry, to Human only through owning business role if exception is needed | Direct activation without canonical path, circular recovery loops |
| Payment Agent | Subscription Agent, Notification Agent | None | Payment outcome initiation only | Payment facts | To Subscription Agent for all continuity consequences | Direct funnel routing, premium decisions |
| Notification Agent | Coach Agent, Retention Agent | Funnel Agent, Recommendation Agent, Onboarding Agent, Engagement Agent, Reflection Agent, Subscription Agent, Retention Agent, Payment Agent, Referral Agent | Communication delivery sequencing | Delivery outcomes | To Coach Agent when human-context messaging is needed, to Retention Agent when delivery should continue recovery | Independent business-policy creation, subscription ownership |
| Analytics Agent | Progress Agent, Human Decision Maker | Progress Agent, Coach Agent, cross-process observation | Cross-process interpretation only | All process outcomes and canonical facts | To Human Decision Maker for strategic review | Any state-mutation interaction, operational control loops |
| Referral Agent | Funnel Agent, Notification Agent | Funnel Agent, Retention Agent | Referral interpretation and routing | Referral-related facts and outcomes | To Funnel Agent when referral becomes valid entry context | Funnel bypass, access grant, subscription continuity handling |

## Cross References

- AI Capability Model:
  - `docs/architecture/05-ai-capability-model.md`
- Business Process Model:
  - `docs/architecture/04-business-processes.md`
- Business Rules:
  - `docs/foundation/09-business-rules.md`
- Business Events:
  - `docs/foundation/05-business-events.md`
- Canonical AI Agents:
  - `docs/foundation/06-ai-agents.md`
- Canonical AI Workflows:
  - `docs/foundation/07-ai-workflows.md`

## Governance

### Adding interactions

A new AI interaction may be added only when:

- it originates from an existing canonical Business Process;
- it is triggered by canonical Business Events or valid canonical process context;
- it does not create overlapping ownership;
- it does not introduce circular delegation.

### Changing responsibilities

An interaction may change only when:

- the canonical AI Capability Model changes;
- a canonical Business Process changes;
- a Business Rule changes the allowed authority boundary;
- a human decision boundary is clarified more precisely.

### Deprecating interactions

An interaction may be deprecated only when:

- the underlying business process no longer exists; or
- the interaction is absorbed into another canonical handover without ambiguity.

Deprecated interactions must remain historically understandable until all dependent business architecture and implementation are aligned.

### Ownership

The AI Interaction Model is owned by AI systems architecture leadership together with enterprise architecture leadership.

No implementation team may introduce undocumented agent-to-agent collaboration, hidden delegation, or circular orchestration outside this canonical model.
