# Result Delivery Trace

Date: 2026-07-08
Project: `starway-studio`
Scope: trace the real production path that delivers the AB test result after the 8th answer, identify the active content system, and verify the `msg1/msg2_*` delivery behavior.

## Short conclusion

The real result-delivery path after question 8 is:

1. callback `ab_test_answer:q8:*` enters `handleAbTestCallback`
2. `handleAbTestAnswer` marks the test as completed and routes the user into the email gate
3. after email confirmation, skip, or typed email capture, all active branches converge into `renderAbTestPostEmailSubmitSequence`
4. `renderAbTestPostEmailSubmitSequence` calls `dispatchAbTestResultSequence`
5. `dispatchAbTestResultSequence` uses `getAbTestResultDefinition`
6. `getAbTestResultDefinition` returns `AB_TEST_RESULTS[resultKey]`
7. `AB_TEST_RESULTS[resultKey].blocks` are built from `AB_TEST_RESULTS_BASE.msg1/msg1_audio/msg2_*`
8. actual Telegram delivery happens through `sendTelegramContentChunk` and direct `ctx.telegram.sendMessage`

The active runtime system for result delivery is the `AB_TEST_RESULTS_BASE -> buildAbTestResultBlocks -> dispatchAbTestResultSequence` path.

`getTestDriveResultSurface()` and `getTestDriveInsideSurface()` are not used anywhere in `backend/src` at runtime right now.

## Exact call chain after the 8th answer

### A. Completion of the test

1. `backend/src/products/ab-system/telegram/abTest.service.ts:234-377`
   `handleAbTestCallback(ctx, action)` parses the callback and dispatches `parsed.kind === 'answer'` into `handleAbTestAnswer(ctx, userId, parsed)`.

2. `backend/src/products/ab-system/telegram/abTest.callback.ts:75-84`
   `parseAbTestCallback()` parses `ab_test_answer:q8:*` into `{ kind: 'answer', questionId, answerId, revision }`.

3. `backend/src/products/ab-system/telegram/abTest.handlers.core.ts:150-171`
   `handleAbTestAnswer()` computes `nextQuestionId`; for `q8`, `nextQuestionId` becomes `null`, so `complete` becomes `true`, `status` becomes `'completed'`, and `stage` becomes `'S3_TEST_RESULT'`.

4. `backend/src/products/ab-system/telegram/abTest.handlers.core.ts:218-240`
   In the `complete` branch, the handler sets `email_stage: 'pending'`, saves progress, and calls `renderAbTestEmailGate(ctx, userId, pendingEmailProgress)`.

5. `backend/src/products/ab-system/telegram/abTest.views.ts:1226-1269`
   `renderAbTestEmailGate()` sends the email gate message with callbacks:
   `confirm_profile_email_for_result`, `change_email_for_result`, `skip_email_before_result`.

At this point the final result itself is not yet sent. The user is blocked on the email gate.

### B. Branch 1: user confirms profile email

1. `backend/src/products/ab-system/telegram/abTest.service.ts:392-394`
   `handleAbTestCallback()` routes `confirm_profile_email_for_result` into `handleConfirmEmail(ctx, userId)`.

2. `backend/src/products/ab-system/telegram/abTest.handlers.core.ts:449-471`
   `handleConfirmEmail()` persists email state through `ensureAbTestEmailCapturedFromProfile()` and then calls `renderAbTestPostEmailSubmitSequence(ctx, userId, savedProgress, { notifyOps: false })`.

3. `backend/src/products/ab-system/telegram/abTest.views.ts:1136-1217`
   `renderAbTestPostEmailSubmitSequence()` resolves `firstName`, protects against duplicate redelivery, tracks `RESULT_OPENED`, and calls `dispatchAbTestResultSequence(ctx, ...)`.

4. `backend/src/products/ab-system/telegram/abTest.views.ts:750-823`
   `dispatchAbTestResultSequence()` loads `resultDef`, prepares `introBlocks`, and sends the result intro plus preview CTA.

5. `backend/src/products/ab-system/telegram/abTest.views.ts:797-806`
   Intro blocks are sent via `sendTelegramContentChunk(ctx, chatId, resultDef.title, introBlocks, { parseMode: 'HTML', separateBlocks: true })`.

6. `backend/src/products/ab-system/telegram/abTest.views.ts:817-823`
   The next CTA bubble is sent directly with `ctx.telegram.sendMessage(...)`.

### C. Branch 2: user skips email

1. `backend/src/products/ab-system/telegram/abTest.service.ts:388-390`
   `handleAbTestCallback()` routes `skip_email_before_result` into `handleSkipEmail(ctx, userId)`.

2. `backend/src/products/ab-system/telegram/abTest.handlers.core.ts:412-438`
   `handleSkipEmail()` sets `email_stage: 'skipped'` when needed and calls `renderAbTestPostEmailSubmitSequence(ctx, userId, savedProgress, { forceRedelivery: true })`.

3. `backend/src/products/ab-system/telegram/abTest.views.ts:1136-1217`
   `renderAbTestPostEmailSubmitSequence()` then follows the same path into `dispatchAbTestResultSequence()`.

4. `backend/src/products/ab-system/telegram/abTest.views.ts:750-823`
   `dispatchAbTestResultSequence()` sends intro blocks and the preview CTA as described above.

### D. Branch 3: user changes email and sends a new one as text

1. `backend/src/products/ab-system/telegram/abTest.handlers.core.ts:396-397`
   `handleAbTestCallback()` routes `change_email_for_result` into `handleChangeEmail(ctx, userId)`.

2. `backend/src/products/ab-system/telegram/abTest.handlers.core.ts:479-501`
   `handleChangeEmail()` switches the state back to email capture mode.

3. `backend/src/modules/telegram-mentor/index.ts:402-409`
   incoming text messages are passed into `handleAbTestEmailCaptureText(ctx, userId, text)`.

4. `backend/src/products/ab-system/telegram/abTest.flows.ts:82-197`
   `handleAbTestEmailCaptureText()` persists the typed email, schedules followups, then calls `renderAbTestPostEmailSubmitSequence(ctx, userId, progress, { notifyOps: false, forceRedelivery: true })`.

5. `backend/src/products/ab-system/telegram/abTest.views.ts:1136-1217`
   `renderAbTestPostEmailSubmitSequence()` converges into the same dispatch path.

6. `backend/src/products/ab-system/telegram/abTest.views.ts:750-823`
   `dispatchAbTestResultSequence()` sends the actual Telegram result.

## What really reads `msg1/msg2_*`

The runtime sender does not read `msg1` directly inside `dispatchAbTestResultSequence()`.

The actual transformation is:

1. `backend/src/products/ab-system/content/abTest.results.ts:561-579`
   module init mutates `AB_TEST_RESULTS` and assigns `result.blocks = buildAbTestResultBlocks(key, result)`.

2. `backend/src/products/ab-system/content/abTest.results.ts:581-610`
   `buildAbTestResultBlocks()` converts legacy-looking fields into delivery blocks:
   `msg1 -> intro[0]`
   `msg1_audio -> intro[1]`
   `AB_TEST_AUDIO_URL -> intro[2]`
   `msg2_practice/msg2_benefits/msg2_included/msg2_howItWorks -> practice`
   `msg2_review -> review`
   `msg3_pricing -> pricing`

3. `backend/src/products/ab-system/content/abTest.results.ts:648-651`
   `getAbTestResultDefinition()` returns `AB_TEST_RESULTS[resultKey]`.

4. `backend/src/products/ab-system/telegram/abTest.views.ts:761-776`
   `dispatchAbTestResultSequence()` reads `resultDef.blocks?.intro/practice/review/pricing`.

So `msg1/msg2_*` are still real runtime inputs. They are not dead data.

## Does `msg1` go as one Telegram bubble?

No. In the active result path, `msg1` is sent as a separate message block.

Evidence:

1. `backend/src/products/ab-system/content/abTest.results.ts:590-594`
   `intro` is built as three blocks:
   `text(msg1)`, `text(msg1_audio)`, `audio(AB_TEST_AUDIO_URL)`.

2. `backend/src/products/ab-system/telegram/abTest.views.ts:797-806`
   `dispatchAbTestResultSequence()` sends `introBlocks` with `separateBlocks: true`.

3. `backend/src/products/ab-system/telegram/abTest.views.ts:537-550`
   `sendTelegramContentChunk()` sees `separateBlocks: true` and recursively sends each block as its own message.

4. `backend/src/products/ab-system/telegram/abTest.views.ts:498-504`
   audio block becomes `ctx.telegram.sendVoice(...)`.

5. `backend/src/products/ab-system/telegram/abTest.views.ts:554-557`
   text block becomes `ctx.telegram.sendMessage(...)`.

Therefore the active intro delivery is:

1. first bubble: `resultDef.title + msg1`
2. second bubble: `msg1_audio`
3. third send: voice message from `AB_TEST_AUDIO_URL`
4. fourth bubble: `AB_TEST_PRACTICE_PREVIEW_PROMPT` with inline button

So the current code does not intentionally merge steps 1+2+3+4 into one bubble.

## Is TEST_DRIVE_V2 active for real current users?

For newly started users on 2026-07-08, yes: `resolveTestDriveVersion()` returns `'v2'`.

Evidence:

1. `backend/src/products/ab-system/content/abTest.results.ts:152-154`
   rollout timestamp defaults to `2026-06-05T00:00:00.000Z`.

2. `backend/src/products/ab-system/content/abTest.results.ts:667-672`
   `resolveTestDriveVersion(startedAt)` returns `'v2'` when `startedAt >= rolloutAt`; otherwise `'legacy'`.

3. `backend/src/products/ab-system/telegram/abTest.handlers.ui.ts:84-100`
   a fresh test start writes `started_at: nowIso`.

4. `backend/src/products/ab-system/telegram/abTest.service.ts:128-147`
   restart/re-entry paths also preserve or refresh `started_at`.

Given the current date `2026-07-08`, users starting the test now receive a `started_at` after the rollout cutoff, so the resolver returns `'v2'`.

Important caveat: older users with pre-rollout `started_at`, or users with missing `started_at`, still resolve to `'legacy'`.

## Is TEST_DRIVE_V2 actually used in the real result sender?

Not in the traced result-delivery path.

Evidence:

1. `backend/src/products/ab-system/content/abTest.results.ts:682-740`
   `getTestDriveResultSurface()` and `getTestDriveInsideSurface()` exist and are gated by `resolveTestDriveVersion(...)`.

2. Search result in `backend/src`:
   there are no call sites for `getTestDriveResultSurface(` or `getTestDriveInsideSurface(` outside their own definitions.

3. `backend/src/products/ab-system/telegram/abTest.views.ts:750-930`
   both `dispatchAbTestResultSequence()` and `dispatchAbTestPracticeSequence()` use `getAbTestResultDefinition(...).blocks`, not the TEST_DRIVE_V2 surface helpers.

Conclusion: the V2 surface helpers are currently unused by the real runtime result sender.

## Final verdict on `AB_TEST_RESULTS_BASE`

`AB_TEST_RESULTS_BASE` cannot be deleted safely right now.

Why:

1. It is the real source data for `AB_TEST_RESULTS`.
2. `buildAbTestResultBlocks()` actively derives Telegram delivery blocks from its `msg1/msg2_*` fields.
3. `dispatchAbTestResultSequence()` and `dispatchAbTestPracticeSequence()` consume those derived blocks in production.

## Recommendation

Keep `AB_TEST_RESULTS_BASE` for now.

Safe next step, if cleanup is desired later:

1. first replace the runtime sender to use a single explicit structure everywhere
2. then remove the `as unknown as` cast
3. only after that evaluate deleting the legacy-shaped source fields

At the moment this is not dead code; it is active content feeding the production result-delivery path.
