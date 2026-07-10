# ADR — Content Engine Single Source of Truth Audit

Date: 2026-07-10
Project: `starway-studio`
Mode: audit-only, no code changes
Status: proposed architectural decision record

## Decision Question

Does the current AB-test / dojim content engine satisfy Single Source of Truth?

Short answer:

- No, not in the strict sense required by the current TZ.
- The active implementation stores two primary content representations for the same followup unit:
  - `body: string`
  - `blocks?: TelegramContentBlock[]`
- Different runtime paths read different fields.
- This creates a real class of bugs where `body !== blocks`.

## TZ Comparison

Target interpretation from current repo evidence:

- The TZ expects one content unit per segment and wave, not two independently maintained text variants.
- Telegram delivery may require structured transport output, but the content meaning should remain singular.

Evidence:

- Golden-standard content request example says: one dojim message for one segment/wave.
  - [docs/agents/ai-content/dna-content-generator-offer.md](/Users/viravira/Documents/starway-studio/docs/agents/ai-content/dna-content-generator-offer.md:66)
- Router spec describes the intended pattern as:
  1. classify user into a segment
  2. map to a content definition
  3. transform that definition into output blocks
  4. render in the delivery surface
  - [docs/architecture/dna-content-router-spec.md](/Users/viravira/Documents/starway-studio/docs/architecture/dna-content-router-spec.md:114)

Conclusion against TZ:

- The current model does not fully match the intended pattern for followups.
- Instead of `content definition -> derived transport blocks`, it currently stores `content definition as body` and `another content definition as blocks` side by side.

## Current State

### Active followup contract

The current followup content type is:

```ts
type FollowupCopy = {
  title: string
  body: string
  cta?: string
  blocks?: TelegramContentBlock[]
}
```

Evidence:

- [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:22)

### Content is duplicated inside the same artifact

Concrete example:

- `DOJIM_7D.body` is plain text
- `DOJIM_7D.blocks` is a second, manually authored structured variant

Evidence:

- [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:369)

This pattern repeats for:

- `DOJIM_24H`
- segment-specific `DOJIM_24H_BY_SEGMENT.*`
- `DOJIM_48H`
- `DOJIM_72H`
- `DOJIM_5D`
- `DOJIM_7D`

### Two runtime delivery families consume different fields

1. Notification/template/plain-card path consumes `body`
2. Telegram chunked/structured path consumes `blocks`

This is the core architectural split.

## Root Cause

The content engine mixes two generations of delivery contracts in one object:

1. older/simple notification contract:
   - `title`
   - `body`
   - `cta`
2. newer Telegram-structured contract:
   - `blocks`
   - `quote/image/pricing/cta` block semantics

This is not just an optimization layer.
It is two authorable sources of truth living together.

### Historical split likely origin

Evidence strongly suggests `blocks` were introduced for the structured Telegram renderer after a prior plain-text model already existed:

- `buildNotificationContent(...)` still returns `NotificationContent { title, body, ctaText, ctaUrl }`
  - [backend/src/lib/notifications/templates.ts](/Users/viravira/Documents/starway-studio/backend/src/lib/notifications/templates.ts:31)
- `TelegramDeliveryAdapter` renders from `telegramHtml` or from `title + body`
  - [backend/src/services/notifications/delivery/TelegramDeliveryAdapter.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/delivery/TelegramDeliveryAdapter.ts:104)
- The structured Telegram chunking prompt explicitly expects `blocks`
  - [backend/src/products/ab-system/telegram/prompts/TELEGRAM_CHUNKS.prompt.md](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/prompts/TELEGRAM_CHUNKS.prompt.md:13)
- The AB-test result path already follows `definition -> blocks -> render`
  - [backend/src/products/ab-system/content/abTest.results.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.results.ts:590)
  - [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:759)

ADR judgment:

- Yes, this looks like a historical compatibility layer left in place after the structured renderer was introduced.
- But for followups it was not fully normalized into a single canonical source.

## Evidence

### 1. Why do `body` and `blocks` both exist?

Because two different renderer families consume different fields.

Evidence:

- `buildNotificationContent(...)` returns `copy.body`
  - [backend/src/lib/notifications/templates.ts](/Users/viravira/Documents/starway-studio/backend/src/lib/notifications/templates.ts:179)
- `NotificationService` builds message body from `content.body`
  - [backend/src/services/notifications/NotificationService.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/NotificationService.ts:1983)
- `renderAbTestFocusOffer(...)` prefers `copy.blocks ?? splitTelegramContentBlocks(copy.body.split('\n'))`
  - [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1090)
- `sendFocusDojimTelegramSequence(...)` extracts pricing from `copy.blocks`
  - [backend/src/services/notifications/NotificationService.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/NotificationService.ts:662)

### 2. Is this a historical leftover after an older renderer?

Most likely yes.

Evidence:

- notification stack still speaks in `body`
- structured Telegram renderer speaks in `blocks`
- AB-test result system already contains a transform step from content fields into blocks
- followups skipped that normalization step and now store both side by side

Relevant files:

- [backend/src/lib/notifications/templates.ts](/Users/viravira/Documents/starway-studio/backend/src/lib/notifications/templates.ts:31)
- [backend/src/services/notifications/delivery/TelegramDeliveryAdapter.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/delivery/TelegramDeliveryAdapter.ts:104)
- [backend/src/products/ab-system/content/abTest.results.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.results.ts:561)
- [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:131)

### 3. Are both fields really required today?

Runtime answer:

- Both are used today.
- But they are not both required as independent authoring sources.

Evidence:

- `body` is used by:
  - `buildNotificationContent(...)`
  - `TelegramDeliveryAdapter.buildText(...)`
  - `NotificationRepository` / `NotificationRecordService` persistence
- `blocks` is used by:
  - AB-test Telegram content sends
  - dojim-specific structured sends
  - pricing extraction logic

Therefore:

- both fields are operationally used
- but independent manual maintenance of both is not architecturally required

### 4. Which renderer reads `body`?

Confirmed readers of `body`:

- `buildNotificationContent(...)`
  - returns `copy.body`
  - [backend/src/lib/notifications/templates.ts](/Users/viravira/Documents/starway-studio/backend/src/lib/notifications/templates.ts:179)
- `TelegramDeliveryAdapter.buildText(...)`
  - renders `<b>title</b>\n\nbody`
  - [backend/src/services/notifications/delivery/TelegramDeliveryAdapter.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/delivery/TelegramDeliveryAdapter.ts:104)
- `NotificationService` AB followup message assembly
  - `body: customBody ?? content.body`
  - [backend/src/services/notifications/NotificationService.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/NotificationService.ts:2010)

### 5. Which renderer reads `blocks`?

Confirmed readers of `blocks`:

- `renderAbTestFocusOffer(...)`
  - [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1099)
- `sendFocusDojimTelegramSequence(...)`
  - pricing extraction from `copy.blocks`
  - [backend/src/services/notifications/NotificationService.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/NotificationService.ts:662)
- `extractFocusDojimPricingText(blocks)`
  - [backend/src/services/notifications/NotificationService.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/NotificationService.ts:402)

### 6. Can `blocks` become a derived representation of `body` without business-logic changes?

Answer: partially yes, fully not from current `body` as-is.

#### Why partially yes

The repo already has a parser:

- `splitTelegramContentBlocks(lines)`
  - [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:255)

And some runtime paths already do:

- `copy.blocks ?? splitTelegramContentBlocks(copy.body.split('\n'))`
  - [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1099)

This proves derivation is already conceptually accepted.

#### Why not fully from current `body`

Current `body` does not always preserve all structured semantics required by `blocks`.

Examples:

- `DOJIM_7D.blocks` contains:
  - `quote`
  - `image`
  - `pricing`
  - `cta`
  - [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:386)
- `DOJIM_7D.body` contains the quote text and pricing text, but not the screenshot asset key as a recoverable marker and not an explicit CTA block
  - [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:371)

Counterexample detail:

- the parser can reconstruct images only when body contains a screenshot marker
  - [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:280)
- the marker system exists:
  - `buildAbTestScreenshotMarker(key)`
  - [backend/src/products/ab-system/content/abTest.shared.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.shared.ts:422)
- but `DOJIM_7D.body` does not use the recoverable marker form

ADR judgment:

- `blocks` can become a derived representation
- but not safely from the current plain `body` strings without either:
  - enriching `body` with structured markers, or
  - changing the canonical source shape to a richer content definition than plain body

### 7. Would that reduce future desynchronization risk?

Yes, materially.

Reason:

- current system has two manually edited fields for the same message
- every copy change can land in one and not the other
- the bug class is structural, not incidental

Evidence:

- `DOJIM_7D` already has independently authored `body` and `blocks`
  - [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:369)
- `renderAbTestFocusOffer()` already contains fallback logic because the system expects `blocks` may be absent
  - [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:1099)

Conclusion:

- moving to one canonical source + derived transport view would reduce the future risk of `body ≠ blocks`

### 8. Which files would be touched by a future structural fix?

No changes are proposed in this ADR, but the eventual structural fix would likely involve:

- Canonical followup content:
  - [backend/src/products/ab-system/content/abTest.followups.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.followups.ts:1)
- Shared Telegram block semantics / markers:
  - [backend/src/products/ab-system/content/abTest.shared.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/content/abTest.shared.ts:120)
- Telegram block parser / renderer:
  - [backend/src/products/ab-system/telegram/abTest.views.ts](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/abTest.views.ts:255)
- Notification template bridge:
  - [backend/src/lib/notifications/templates.ts](/Users/viravira/Documents/starway-studio/backend/src/lib/notifications/templates.ts:1)
- Notification runtime assembly:
  - [backend/src/services/notifications/NotificationService.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/NotificationService.ts:662)
- Telegram delivery adapter:
  - [backend/src/services/notifications/delivery/TelegramDeliveryAdapter.ts](/Users/viravira/Documents/starway-studio/backend/src/services/notifications/delivery/TelegramDeliveryAdapter.ts:104)
- Optional persistence/reporting surfaces that currently store plain `body`:
  - `NotificationRecordService`
  - `NotificationRepository`

### 9. What is the regression risk?

If a structural fix is attempted later, the regression risk is medium-to-high.

Why:

- AB-test followups run across more than one delivery path
- some paths depend on plain text
- some paths depend on `pricing` / `quote` / `image` block semantics
- notifications are persisted as plain `body`

Highest-risk zones:

1. Focus dojim pricing split flow
   - `sendFocusDojimTelegramSequence(...)`
   - pricing depends on `blocks`
2. Notification history / dedupe / support visibility
   - existing persisted `Notification.body`
3. Telegram message formatting
   - body-derived parsing may alter line breaks, quote detection, or image placement

Lower-risk zones:

- simple text-only lifecycle reminders without media/pricing semantics

### 10. Does the current implementation match the TZ?

Strict answer: no.

Why:

- TZ implies one canonical message per wave/segment
- current implementation stores two editable representations for the same unit
- therefore the content engine is not a strict Single Source of Truth

It does match Telegram transport needs, but it does not match SSOT discipline.

## Target State

Desired target:

- one canonical content definition per segment and timer wave
- renderer-specific output derived from that canonical source
- no independent editing of both `body` and `blocks`

Two acceptable target shapes:

1. `body` canonical, `blocks` derived
   - only if body is enriched enough to recover media/pricing/cta semantics
2. richer structured canonical source, `body` derived
   - likely closer to the AB-test result system pattern already used in `abTest.results.ts`

From current repo evidence, option 2 is architecturally cleaner.

Why:

- the result engine already uses `definition -> build blocks -> render`
- followups with quote/image/pricing/cta are already structured in practice
- plain body is a lossy representation for some followups

## Risk

### If we do only local `DOJIM_7D` copy fixes

Benefits:

- low-risk
- fastest containment

Remaining risk:

- structural class of bugs remains open
- future edits can again desync `body` and `blocks`

### If we do one structural fix later

Benefits:

- removes the bug class, not just one symptom
- better SSOT compliance

Risks:

- regression in Telegram followup formatting
- regression in notification persistence/history semantics
- migration complexity across both interactive Telegram and notification-worker paths

## Migration Strategy

No code changes in this ADR.

If the team chooses structural fix path later, recommended migration order:

1. Identify canonical source decision
   - plain body with markers
   - or structured scenario contract
2. Make one renderer read only derived output from that canonical source
3. Add equivalence tests for current live followups before switching writers
4. Migrate Focus dojim path first because it is the highest-value and highest-risk content
5. Remove manual dual-authoring only after all live readers are switched

Recommended safety principle:

- never flip all readers at once
- convert one content family, compare outputs, then continue

## Regression Strategy

Before any structural implementation:

1. Snapshot current outputs for:
   - `RESULT_DOJIM_24H`
   - `RESULT_DOJIM_48H`
   - `RESULT_DOJIM_72H`
   - `RESULT_DOJIM_5D`
   - `RESULT_DOJIM_7D`
   - all five result segments
2. Capture both:
   - plain notification text
   - Telegram structured send sequence
3. Add explicit tests for:
   - quote rendering
   - screenshot marker/image rendering
   - pricing extraction
   - CTA preservation
   - first-name interpolation
4. Compare post-change output against current production-equivalent snapshots

## Final Recommendation

Based on current evidence:

- A local `DOJIM_7D` fix is valid only as a narrow containment action.
- But the deeper root cause is real: the followup content engine is not SSOT-compliant.

Decision fork:

- Option A: do local `DOJIM_7D` fix now if speed matters most
- Option B: plan one controlled structural fix that removes the class of bugs `body ≠ blocks`

Architecture recommendation:

- Prefer Option B as the durable direction
- But execute it only as a controlled migration, not as an opportunistic refactor

