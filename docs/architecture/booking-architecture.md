# Booking Architecture

## Purpose
Canonical Zoom booking and scheduling model for user and coach flows.

## Ownership
Product architecture and scheduling/runtime ownership.

## Source Of Truth
- Booking runtime code
- Calendar integrations
- Architecture hub

## Core Rules
- Availability, slot limits, and booking state must be derived from booking service and database state, never from UI copy or message text.
- Group and individual Zoom flows should share the same canonical booking model where possible; do not create a parallel individual-slot subsystem if the current Zoom model can be extended safely.
- Checkout is not equal to payment.
- Payment webhook is the confirmation point for paid individual bookings.
- Real scarcity only: do not invent reduced availability for marketing effect.

## Session Types
- `GROUP`
- `INDIVIDUAL`

Both types should be represented inside the same booking architecture whenever the current model supports safe extension.

## Booking Lifecycle
- `PENDING`
  Temporary hold with TTL.
- `CONFIRMED`
  Occupies a slot.
- `COMPLETED`
  Remains part of weekly stats/history.
- `CANCELLED`
  Frees the slot.
- `EXPIRED`
  Frees the slot after TTL/payment timeout.
- `NO_SHOW`
  Does not retroactively free a past slot.

## Weekly Capacity Model
- Coach-level config: `individualZoomWeeklyLimit`
- Default weekly limit: `3`
- The limit must be configurable, not hardcoded in handlers.

For each calendar week the system computes:

`availableSlots = weeklyLimit - confirmedBookings - manuallyBlockedSlots`

### Capacity Rules
- `PENDING` reserves capacity only for its TTL.
- `CONFIRMED` consumes capacity.
- `COMPLETED` remains part of weekly usage stats.
- `CANCELLED` frees capacity.
- `EXPIRED` frees capacity.
- `NO_SHOW` does not free a past slot retroactively.
- Capacity must be recalculated from database state.
- The same slot must never be sold to two participants.

## Post-Zoom Monetization Flow
After each completed group Zoom, the system may trigger a controlled sales flow for individual Zoom sessions.

This is not a mass broadcast.

### Non-Negotiable Rules
- Offer individual Zoom only after actual group Zoom attendance.
- Offer only to participants in `READY` segment.
- Use real weekly capacity.
- Close CTA automatically when no capacity remains.
- Do not send offers to users without attendance.
- Do not let AI invent scarcity or alter availability.

## READY Segmentation
Reuse existing READY logic instead of introducing another READY model.

Before implementation, verify:
- where READY is stored;
- which service or agent computes it;
- which signals are used;
- whether confidence score exists;
- whether coach can confirm or reject READY;
- whether READY is duplicated across services or models.

### Valid READY Signals
- user attended group Zoom;
- user expressed a concrete request;
- user has an unresolved problem;
- user actively interacted during or after Zoom;
- user showed intent for further work;
- coach or relevant AI agent recommended follow-up.

### READY Governance
- AI may recommend READY.
- Final decision must be either rule-based automatic by explicit product rules, or coach-confirmed.

### Exclusion Rules
Do not send the offer if participant:
- was not present;
- already declined;
- already has active booking;
- already purchased the relevant individual product;
- already received this offer within cooldown;
- was manually excluded by coach.

## Individual Slot Model
Individual Zoom booking should support:
- date;
- time;
- timezone;
- duration;
- coachId;
- participantId;
- status;
- price;
- currency;
- payment status;
- Zoom URL;
- booking source;
- `groupZoomId` that triggered the offer;
- READY reason;
- `offerSentAt`;
- `bookedAt`.

## Atomic Booking Rules
Booking confirmation must be atomic.

Before confirmation, re-check:
- slot is still free;
- weekly limit is not exceeded;
- participant has no conflicting active booking;
- access/subscription rules are satisfied;
- payment state is valid for paid flow.

## Participant Offer UX
Base offer copy:

> Ти сьогодні була на практиці й уже побачила свою ситуацію ясніше.
>
> Зараз відкрито {weeklyLimit} місця на індивідуальні сесії цього тижня.
>
> Залишилося: {availableSlots}.
>
> На індивідуальній зустрічі ми зможемо окремо розібрати твій запит і визначити наступний конкретний крок.

Buttons:
- `Записатися`
- `Пізніше`
- `Не пропонувати`

### UX Rules
- Adapt grammar correctly for `1`, `2-4`, `5+` slots.
- Never show `залишилося 0` with active booking CTA.
- If no capacity remains, show closed-state message and alternative actions.

Closed-state copy:

> Усі індивідуальні місця на цей тиждень уже зайняті.

Closed-state buttons:
- `Повідомити, якщо місце звільниться`
- `Наступний тиждень`
- `Назад`

## Offer Follow-Up Rules
### `Пізніше`
- Persist `offerStatus = DEFERRED`.
- Allow at most one reminder.
- Reminder only if capacity still exists.
- No reminder after week end.
- No reminder after booking.
- No reminder after explicit decline.
- Use cooldown.
- Recommended retry window: once after `12-24h`.

### `Не пропонувати`
- Persist `offerStatus = DECLINED`.
- Stop follow-up for this offer.
- Do not interpret as permanent refusal of all services.
- Do not re-send same offer after every Zoom.
- Apply cooldown, default `30 days` unless product defines otherwise.
- Coach should see decline in participant history.

## Payment Flow
Reuse the current server checkout flow where available.

Correct flow:
1. User taps book.
2. User chooses available slot.
3. System creates temporary hold.
4. System opens checkout.
5. System receives payment webhook.
6. System confirms booking.
7. System creates or attaches Zoom meeting.
8. System sends confirmation and reminders.

### Payment Safety Rules
- Do not treat checkout open as success.
- If payment does not complete during TTL, move booking to `EXPIRED`.
- Expired hold frees slot and recomputes availability.
- Notify user with clear explanation after expiry.
- Do not rely on Telegram WebView checkout if project already uses safer server checkout pattern.

## Exchange And Transfer
If exchange/transfer of individual Zoom already exists, reuse its business logic.

Do not implement exchange as direct `participantId` rewrite.

Safe exchange flow:
1. Current owner creates transfer request.
2. System validates product rules.
3. New participant accepts.
4. System checks access.
5. Financial history remains immutable.
6. Audit trail is preserved.
7. Participant is switched only after confirmation.
8. Coach is notified.
9. Old personal notes do not transfer to new participant.

If paid exchange is required:
- payment must be separate transaction;
- original payment must remain unchanged;
- fee and currency must be explicit;
- transfer finishes only after webhook confirmation.

If there is no ready business logic for exchange, prepare a separate proposal before implementation.

## Coach Workspace Requirements
Inside `Провести Zoom` after group session completion show:
- attendees count;
- READY count;
- who already received offer;
- who booked;
- who deferred;
- who declined;
- remaining individual capacity this week.

Coach actions:
- `Визначити READY`
- `Переглянути кандидатів`
- `Підтвердити кандидатів`
- `Надіслати пропозицію`
- `Переглянути індивідуальні слоти`
- `Переглянути конверсію`

Before mass send, coach must see preview:

> Пропозицію отримають 4 учасники.
> Доступно 3 місця.
> Продовжити?

Preview actions:
- `Надіслати`
- `Змінити список`
- `Скасувати`

AI must not send outbound sales messages without explicit approval policy.

## Analytics
Add separate Focus analytics block for individual Zoom monetization:

### Volume Metrics
- READY after group Zoom;
- offers sent;
- booking flow opened;
- slot selected;
- checkout opened;
- paid;
- booking confirmed;
- attended;
- no-show;
- revenue split by currency;
- average time from group Zoom to booking.

### Conversion Metrics
- attended group Zoom -> READY;
- READY -> offer sent;
- offer sent -> booking opened;
- booking opened -> paid;
- READY -> paid;
- paid -> attended individual Zoom.

### Analytics Rules
- Keep people count, booking count, payment count, and revenue separate.
- Show UAH and EUR independently.
- On small samples, AI should not produce categorical growth recommendations.

## Dedup And Idempotency
Each post-Zoom offer should have dedup key:

`participantId + sourceGroupZoomId + offerType`

System must not:
- send same offer twice;
- re-run follow-up after payment;
- offer occupied slot;
- send offer after cancelled Zoom;
- send offer to absent participant;
- run duplicate scheduler jobs for same event;
- process same payment webhook twice.

Reuse current dedup and idempotency primitives.

## Offer State Model
Prefer adapting current states and events before adding new Prisma enums.

Target state machine:
- `ELIGIBLE`
- `READY_RECOMMENDED`
- `READY_APPROVED`
- `OFFER_SENT`
- `OPENED`
- `DEFERRED`
- `SLOT_SELECTED`
- `CHECKOUT_OPENED`
- `PAID`
- `BOOKED`
- `COMPLETED`
- `DECLINED`
- `EXPIRED`
- `CANCELLED`

Do not add all states blindly via migration before checking current models/events.

## Acceptance Criteria
- Offer goes only to confirmed READY participants.
- Participant actually attended group Zoom.
- Weekly limit is configurable.
- Remaining capacity is computed from database state.
- Scarcity is real, not invented.
- Same slot cannot be sold twice.
- Checkout is not treated as payment.
- Webhook confirms booking.
- `Пізніше` does not create spam.
- Decline stops follow-up.
- Coach controls recipients.
- AI recommends but does not invent data.
- Conversion metrics are code-derived.
- UAH and EUR are reported separately.
- Audit trail exists.
- Tests cover race conditions, dedup, and repeated webhook handling.

## Product Navigation Placement
Do not add separate top-level monetization button.

Embed flow here:
- `Провести Zoom`
  - `Завершити груповий Zoom`
  - `Визначити READY`
  - `Підтвердити кандидатів`
  - `Надіслати пропозицію`
  - `Запис -> оплата -> індивідуальний Zoom`
- `Календар Zoom`
  - `Групові`
  - `Індивідуальні`
- `Аналітика ФОКУСУ`
  - `Конверсія в індивідуальні сесії`
