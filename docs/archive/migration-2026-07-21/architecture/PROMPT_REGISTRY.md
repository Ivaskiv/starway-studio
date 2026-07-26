# PROMPT REGISTRY

Canonical index for the four production prompts.

---

## PROMPT #1: MINIAPP PROMPT

- **File:** [MINIAPP_CALENDAR.prompt.md](/Users/viravira/Documents/starway-studio/apps/web/src/features/miniapp/prompts/MINIAPP_CALENDAR.prompt.md)
- **Purpose:** Render Zoom calendar blocks for MiniApp / Telegram WebApp
- **Input:** `user.focusPaid`, `PlatformAccessStatus`, `zoomSessions[]`
- **Output:** Structured layout JSON for existing React renderer
- **Use When:** MiniApp calendar, booking flow, access-tier UI

---

## PROMPT #2: LANDING PROMPT

- **File:** [LANDING_UNIFY.prompt.md](/Users/viravira/Documents/starway-studio/apps/web/src/features/landings/prompts/LANDING_UNIFY.prompt.md)
- **Purpose:** Unify and clean landing page copy
- **Input:** `current_copy`, product context, optional personalization
- **Output:** Structured markdown sections for landing copy
- **Use When:** Hero, benefits, proof, CTA, FAQ copy normalization

---

## PROMPT #3: AB TEST RESULT PROMPT

- **File:** [RESULT_RENDER.prompt.md](/Users/viravira/Documents/starway-studio/apps/web/src/features/ab-test/prompts/RESULT_RENDER.prompt.md)
- **Purpose:** Convert AB Test result into structured screen JSON
- **Input:** `resultType`, `resultTitle`, `resultSummary`, `proofOrQuote`, `voiceNoteUrl`
- **Output:** Valid JSON blocks for result screen rendering
- **Use When:** User completes AB test and opens result state

---

## PROMPT #4: TELEGRAM CHUNKER

- **File:** [TELEGRAM_CHUNKS.prompt.md](/Users/viravira/Documents/starway-studio/backend/src/products/ab-system/telegram/prompts/TELEGRAM_CHUNKS.prompt.md)
- **Purpose:** Convert structured result JSON into Telegram API-ready chunks
- **Input:** Output from Prompt #3
- **Output:** Ordered `sendMessage` / `sendVoice` chunk array
- **Use When:** Telegram delivery of AB test results

---

## ROUTING SUMMARY

- `S3_TEST_RESULT` -> Prompt #3 -> Prompt #4
- Landing views -> Prompt #2
- MiniApp / Zoom calendar -> Prompt #1

---

## Production Rule

Prompts are documentation-first canonical sources.
Do not duplicate their rules in code unless required for execution.

