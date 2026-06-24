# Zoom Booking Test

## Test Steps
1. Open mini app URL: `/zoom` from Telegram user flow.
2. Verify available slots list is loaded.
3. Click "Записатись" for one open slot.
4. Confirm button state changes to booked.
5. Verify success confirmation is shown.
6. Re-open mini app and confirm booked state is reflected.

## Expected Behavior
- Page loads successfully.
- Slots are displayed in sorted chronological order.
- Booking request succeeds for available slot.
- Duplicate booking attempt is prevented by UI/API.
- Unauthorized browser calls (no initData) are rejected.

## Pass Criteria
- Successful booking flow from load to confirmation.
- Correct booked state after reopen.
- Protected API behavior remains enforced.
