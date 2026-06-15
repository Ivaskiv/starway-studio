# Canonical Entry Flow

**Date**: 2026-06-12  
**Status**: Canonical  
**Scope**: AB test acquisition flow, Focus conversion flow, Telegram entry routing

## Decision

`/ab-test` is the canonical entry point for cold leads.

`/focus` is a secondary conversion step that comes after the AB test result and CTA, not a competing primary landing.

## Canonical Flow

```text
Telegram
↓
/ab-test
↓
Quiz
↓
Result
↓
CTA: Активувати / Хочу у ФОКУС
↓
/focus
↓
Payment
↓
Zoom booking
↓
ABSystem platform
```

## What This Means

1. `/ab-test` owns cold acquisition.
2. `/ab-test/result` owns interpretation and transition into the offer.
3. `/focus` supports conversion after the result, but should not be designed or positioned as a separate competing funnel entry.
4. Prompt work for result rendering has higher architectural priority than long-form `/focus` copy work.

## Code Evidence

### Frontend routes

- [App.tsx](/Users/viravira/Documents/starway-studio/apps/web/src/App.tsx)
  - `/ab-test` → `AbTestLandingRouteView`
  - `/ab-test/quiz` → `AbTestPage`
  - `/ab-test/result` → `AbTestPage`
  - `/focus` → `FocusRouteView`

### AB test route constants

- [landing.config.ts](/Users/viravira/Documents/starway-studio/apps/web/src/features/ab-test-landing/config/landing.config.ts)
  - `AB_TEST_LANDING_ROUTE = '/ab-test'`
  - `AB_TEST_LANDING_QUIZ_ROUTE = '/ab-test/quiz'`
  - `AB_TEST_LANDING_RESULT_ROUTE = '/ab-test/result'`

### Telegram webapp entry

- [webapp.ts](/Users/viravira/Documents/starway-studio/backend/src/config/webapp.ts)
  - default Telegram webapp path resolves to `/ab-test`

- [abTest.buttons.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.buttons.ts)
  - AB test web button resolves to `${base}/ab-test`

- [start.context.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/handlers/start.context.ts)
  - referral/start links point to `/ab-test`

### Result → Focus transition

- [abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts)
  - Telegram result messages include `open_focus_payment`
  - preview CTA includes `show_inside_*`

- [AbTestPage.tsx](/Users/viravira/Documents/starway-studio/apps/web/src/features/ab-test/pages/AbTestPage.tsx)
  - result CTA navigates to `FOCUS_ROUTE`

## Product Implications

1. Designers should not treat `/focus` as the main cold-traffic landing while `/ab-test` remains the active Telegram entry.
2. Copy work for `/focus` should be framed as post-result conversion support.
3. The AB test result experience, CTA sequencing, and Telegram result rendering are the core path.
4. If product strategy changes and `/focus` becomes the primary cold entry later, this file must be updated explicitly.

## Current Priority Order

1. AB test result structure
2. Telegram chunk rendering
3. Result-to-Focus CTA flow
4. `/focus` conversion polishing

