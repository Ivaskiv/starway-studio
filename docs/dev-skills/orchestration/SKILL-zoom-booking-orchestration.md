# SKILL: Zoom Booking Orchestration

## Purpose
Reusable rules for booking, rescheduling, swapping, cancellations, reminders, and attendance flows.

## Ownership
Scheduling and product orchestration.

## Source Of Truth
- `docs/architecture/booking-architecture.md`
- Zoom routes and handlers
- Calendar integration code

## Scope
Use this skill for:
- group Zoom booking;
- individual Zoom booking;
- post-Zoom monetization to individual sessions;
- reschedule, swap, reminders, attendance, payment confirmation, and dedup.

## Required Rules
- Reuse the canonical booking architecture before introducing new booking models.
- Use real capacity from database state.
- Never invent scarcity in copy or AI prompts.
- Treat payment webhook, not checkout open, as booking confirmation.
- Individual post-Zoom offers go only to attended and READY-approved participants.
- Coach approval must exist before outbound batch sales messaging.

## Implementation Order
1. Check `docs/architecture/booking-architecture.md`.
2. Reuse existing READY logic.
3. Reuse existing booking/payment/reminder/idempotency primitives.
4. Extend models only when current state/event structure is insufficient.
5. Add tests for race conditions, duplicate sends, and repeated webhooks.
