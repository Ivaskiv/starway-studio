# Senior Architecture Review

## Scope

Targeted audit and fix for AB System Telegram flow:

- `test_completed`
- `email_capture`
- `result`
- `audio`
- `practice_preview`
- `offer`

No business-logic rewrite, no schema changes, no callback architecture rewrite.

## Findings

### Root cause 1: duplicate result delivery

Status: `WARNING`

Canonical result delivery path:

1. `backend/src/products/ab-system/telegram/abTest.service.ts`
   `handleAbTestCallback(...)`
2. `skip_email_before_result` / `confirm_profile_email_for_result` / `ab_test:show_result`
3. `backend/src/products/ab-system/telegram/abTest.views.ts`
   `renderAbTestPostEmailSubmitSequence(...)`
4. `dispatchAbTestResultSequence(...)`

Why the duplicate happened:

- AB-test callbacks are intentionally handled outside the global callback idempotency lock.
- After the first successful result delivery, the flow had no canonical "already delivered" guard in the active result path.
- A replayed callback on the email gate could call the same result sequence again and send the segment result a second time.

Canonical implementation:

- `renderAbTestPostEmailSubmitSequence(...)`

Legacy / risk contributor:

- `renderCurrentView(...)` on completed progress can re-enter result rendering without an explicit delivery guard.

Fix:

- Reused existing `result_opened_at` progress field as the delivery marker.
- Added a minimal duplicate guard in `renderAbTestPostEmailSubmitSequence(...)`.
- Allowed intentional re-open only for explicit `ab_test:show_result` via `forceRedelivery: true`.

### Root cause 2: missing practice button after result

Status: `WARNING`

Canonical button creation:

- `backend/src/products/ab-system/telegram/abTest.views.ts`
  `dispatchAbTestResultSequence(...)`
- `previewKeyboard`
- callback: `show_inside_${RESULT_KEY}`

Why the button could disappear:

- The practice CTA is sent after the voice step, not together with the first result message.
- If voice delivery throws, the sequence stops before `practice_preview` is sent.
- That leaves the user with the result text but without the inline CTA.

Fix:

- Kept the flow unchanged.
- Wrapped `sendVoice(...)` in a local catch and continued the sequence.
- Practice preview button now still renders even if Telegram rejects the audio message.

## File status

### SAFE

- `backend/src/products/ab-system/telegram/abTest.views.ts`
  Existing canonical result/practice rendering path preserved.

- `backend/src/products/ab-system/telegram/abTest.service.ts`
  Existing callback routing preserved; only targeted guards/logs added.

### WARNING

- `backend/src/products/ab-system/telegram/abTest.views.ts`
  Contains both canonical result-sequence code and legacy completed-result renderer.

### TECH DEBT

- `backend/src/products/ab-system/telegram/abTest.views.ts`
  `renderAbTestCompletedResult(...)` still exists beside the newer sequence-based renderer.

### DUPLICATE

- Result rendering responsibilities are split between:
  - `renderAbTestCompletedResult(...)`
  - `renderAbTestPostEmailSubmitSequence(...)`
  - `dispatchAbTestResultSequence(...)`

For this fix, the canonical active path remained:

- `renderAbTestPostEmailSubmitSequence(...)`
- `dispatchAbTestResultSequence(...)`

### DEAD CODE

- None removed in this change set.

## Changes made

### `backend/src/products/ab-system/telegram/abTest.views.ts`

- Added duplicate-delivery guard using `result_opened_at`
- Added explicit runtime logs:
  - `[RESULT_FLOW]`
  - `[RESULT_SENT]`
  - `[PRACTICE_BUTTON_RENDERED]`
  - `[FOCUS_OFFER_SENT]`
- Made voice send non-fatal for the rest of the sequence

### `backend/src/products/ab-system/telegram/abTest.service.ts`

- Explicit `ab_test:show_result` now forces intentional redelivery
- Added `[PRACTICE_BUTTON_CLICKED]` log before practice sequence dispatch

## Validation

- `pnpm -C backend exec tsc --noEmit` ✅

## Business logic confirmation

- Telegram funnel logic preserved
- Payment flow not changed
- Prisma schema not changed
- State machine not changed
- Callback contract not changed
- User-facing flow not rewritten
