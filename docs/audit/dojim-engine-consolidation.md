# Dojim Engine Consolidation Audit

Date: 2026-07-07

## Deactivated legacy cron jobs

- `abTestR5R6Cron`
- `abTestR7R8Cron`

## Why they were deactivated

- These two scheduler registrations were sending Engine A result/offer followups that duplicated Engine B.
- Engine B already plans one-time followups through `NotificationJob` via [`backend/src/products/ab-system/telegram/abTest.scheduler.ts`](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.scheduler.ts) and keeps permanent deduplication state in [`backend/src/core/state-machine/abTestFoundation.ts`](/Users/viravira/Documents/starway-studio/backend/src/core/state-machine/abTestFoundation.ts).
- Engine B followups are also cancelled on payment through [`backend/src/products/ab-system/telegram/abTest.markers.ts`](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.markers.ts), so keeping Engine A active created duplicate reminder paths.

## Reminder keys no longer sent by Engine A

- `R5_RESULT_2H`
- `R6_RESULT_48H`
- `R7_OFFER_6H`
- `R8_OFFER_3D`

## Reminder paths that remain active

- Engine A remains active for `R1_TEST_24H`, `R2_TEST_72H`, `R3_PROGRESS_4H`, `R4_PROGRESS_24H`, `R9_PROGRESS_1D`, `Z1_ZOOM_MON_1800`, and `Z2_ZOOM_MON_1855`.
- Engine B remains the source of truth for `RESULT_FOLLOWUP_24H/48H/72H` and `RESULT_DOJIM_24H/48H/72H/5D/7D`.

## Tz mismatch: RESULT_FOLLOWUP_48H / RESULT_FOLLOWUP_72H

- `fokus_tayming_dlya_teh.pdf` describes only one trigger `+24h` for the branch "не натиснула кнопку після голосового".
- Code still schedules `RESULT_FOLLOWUP_24H`, `RESULT_FOLLOWUP_48H`, and `RESULT_FOLLOWUP_72H` from `resolveAbTestFlowTimerIdsForStage('S3_TEST_RESULT')` in [`backend/src/core/state-machine/abTestFoundation.ts`](/Users/viravira/Documents/starway-studio/backend/src/core/state-machine/abTestFoundation.ts:420).
- Explicit scheduling hits found by grep:
  - [`backend/src/products/ab-system/telegram/abTest.flows.ts`](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.flows.ts:173) schedules `scheduleFollowups(..., 'S3_TEST_RESULT')` after email capture completion.
  - [`backend/src/products/ab-system/telegram/abTest.canonical.ts`](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.canonical.ts:73) schedules `scheduleFollowups(..., 'S3_TEST_RESULT')` on canonical `OPEN_FOCUS`, immediately before scheduling `S4_FOCUS_INVITE`.
- Conclusion: `RESULT_FOLLOWUP_48H/72H` are reachable in current code and are not dead by grep inspection alone. Product-owner decision needed: remove them, or explicitly document them as intentional behavior beyond the PDF.

## Additional offset duplicates found by grep

- [`backend/src/services/notifications/NotificationService.ts`](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/NotificationService.ts:743) still hardcodes the old dojim offsets `24h/48h/72h/5d/7d` inside `scheduleDojimSeries()`.
- That path is wrapped by [`backend/src/core/orchestrator/testOrchestrator.ts`](/Users/viravira/Documents/starway-studio/backend/src/core/orchestrator/testOrchestrator.ts:37), but grep found no runtime call sites for `scheduleDojimFollowups(...)`, so this looks like a legacy/unreached parallel path today.
- If that path is reactivated later, its offsets will diverge from the canonical registry unless it is synchronized separately.

## Content mismatches after offset sync

- Text mismatch found: [`backend/src/products/ab-system/content/abTest.followups.ts`](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:373) and the block variant at [abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:389) say "Через тиждень після тесту...", but `RESULT_DOJIM_7D` is now delivered after 18 days.
- The underlying text source is also mirrored in [`backend/src/products/ab-system/content/abTest.results.ts`](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.results.ts:253), so the mismatch is content-level, not just one rendered followup file.
- No direct timing-language mismatch was found in `DOJIM_48H`, `DOJIM_72H`, or `DOJIM_5D` copy by grep inspection; the main confirmed contradiction is the former 7-day proof message now firing at day 18.
