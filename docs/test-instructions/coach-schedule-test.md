# Coach Schedule Test

## Test Steps
1. Open mini app URL: `/coach-schedule.html` from Telegram coach bot web app button.
2. Confirm schedule grid loads for next week.
3. Toggle several slots open/closed.
4. Verify UI state changes immediately after click.
5. Press save/close action.
6. Re-open mini app and verify persisted slot states.

## Expected Behavior
- Page loads successfully.
- Slot toggle works without full page reload.
- Unauthorized browser open (without Telegram initData) returns auth error on API calls.
- Saved changes remain after reopen.

## Pass Criteria
- All steps complete without runtime errors.
- Slot updates are persisted and visible after reopen.
- Unauthorized direct API calls are blocked.
