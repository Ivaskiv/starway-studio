# ADR — /start for FOCUS_ACTIVE + TEST_COMPLETED

Date: 2026-08-01
Project: `starway-studio`
Mode: documentation-only, no code changes
Status: confirmed architectural decision

## Decision

`/start` for users in the `FOCUS_ACTIVE + TEST_COMPLETED` segment must show only the home screen via the `FOCUS_PAID` branch.

It must not auto-send the result screen on every `/start`.

## Why

This is intentional Continuation Logic behavior.

- The completed test is not replayed on every entry.
- `/start` acts as the current continuation entrypoint for the paid Focus relationship.
- The result remains available as a separate explicit action via `ПЕРЕГЛЯНУТИ РЕЗУЛЬТАТ`.

## Source of truth

- Runtime decision point:
  [backend/src/modules/telegram-mentor/handlers/start.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.ts:74)
- Effective branch:
  `resolveEffectiveStartLifecycleState()`
- Result flow owner:
  [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1360)

## Confirmed behavior

- If Focus access is active, `/start` resolves to the Focus home continuation path.
- The result screen is opened separately through `ПЕРЕГЛЯНУТИ РЕЗУЛЬТАТ` -> `dispatchAbTestResultSequence()`.

## Product confirmation

Confirmed by Vira on 2026-08-01.
