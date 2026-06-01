# Smoke Tests

## Checklist
- `coach-schedule.html` -> `200`
- `zoom-booking.html` -> `200`
- `api/zoom/slots/available` -> `401` (without auth)
- `api/coach/schedule` -> `401` (without auth)

## Expected Results
- Public mini app files are reachable with `200`.
- Protected API routes reject unauthenticated access with `401`.
- Any `000/404/5xx` is treated as fail and must be investigated.
