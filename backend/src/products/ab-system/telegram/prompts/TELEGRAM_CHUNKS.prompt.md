<!-- PROMPT #4: BACKEND TELEGRAM BLOCK CHUNKER

Path: backend/src/products/ab-system/telegram/prompts/TELEGRAM_CHUNKS.prompt.md

Usage: Call this for converting structured result JSON into Telegram API-ready message chunks

Integration Point: After PROMPT #3 generates result JSON, call this to render it as Telegram messages


ROLE & RESPONSIBILITY
═══════════════════════════════════════════════════════════════════

Ти backend developer для Telegram bot messaging logic.
Твоя задача — перетворити структурований результат (з PROMPT #3)
на готові chunks для Telegram API відправки.

Обов'язки:
✓ Розбити контент на читаємі chunks (< 1000 chars ideal, max 4096 hard limit)
✓ Генерувати inline keyboards без помилок
✓ Обробляти voice messages окремо
✓ Не ламати existing callback handler logic
✓ Усе — в межах Telegram Bot API v8.0+ constraints

Технологія: Telegram Node.js SDK (`telegraf` або `node-telegram-bot-api`)


DATA INPUT (FROM PROMPT #3 OUTPUT)
═══════════════════════════════════════════════════════════════════

{
  "screen": "ab_test_result",
  "resultType": "state" | "goal" | "choice" | "decision" | "action",
  "blocks": [
    { "type": "title", "content": "string" },
    { "type": "summary", "content": "string" },
    { "type": "what_it_means", "content": "string" },
    { "type": "quote", "content": "string", "attribution": "string" } | null,
    { "type": "voice_note", "duration": "string", "url": "string", "label": "string" } | null,
    { "type": "practical_next_step", "content": "string" },
    { "type": "cta_primary", "label": "string", "action": "url or route" },
    { "type": "cta_secondary", "label": "string", "action": "url or route" } | null
  ]
}


TELEGRAM API CONSTRAINTS (HARDCODED, DO NOT VIOLATE)
═══════════════════════════════════════════════════════════════════

MESSAGE LIMITS:
- Max 4,096 characters per message (hard limit)
- Recommended: < 1,024 characters (mobile readability)
- Min 1 character (but no empty messages)
- Newlines count as 1 character each

INLINE KEYBOARD LIMITS:
- Max 5 rows per keyboard
- Max 3 buttons per row (ideal: 1-2)
- Max 64 characters per button label
- Max 256 characters per callback_data or URL

MARKDOWN FORMATTING:
- Supported: *bold*, _italic_, __underline__, ~strikethrough~, `code`, ```preformatted```
- NO nested formatting: *_bold italic_* ← BREAKS
- NO emojis (per product rules)
- Max 2 formatting types per message recommended

VOICE MESSAGE CONSTRAINTS:
- Voice message MUST be separate message (no inline with text)
- File size: < 50 MB
- Format: OGG codec (Telegram optimized)
- Duration: 1 sec - 1 hour
- Max 1 voice per message block

CALLBACK DATA:
- Max 64 bytes per button callback_data
- Format: "ab_test_action:action_name:param1:param2"
- MUST be unique per keyboard
- Reserved prefixes: "ab_test_", "payment_", "zoom_"


CHUNKING STRATEGY
═══════════════════════════════════════════════════════════════════

CHUNK TYPES:
├─ TEXT_BLOCK: title + body + formatting
├─ QUOTE_BLOCK: isolated message with attribution
├─ VOICE_BLOCK: separate voice message
├─ KEYBOARD_BLOCK: text + inline buttons
└─ SEPARATOR: empty message for visual break (optional)

CHUNKING RULES:

Rule 1: TITLE + SUMMARY = Chunk #1
├─ Combine into one message
├─ Format: "*[Title]*\n\n[Summary]"
├─ Estimate length: ~200-400 chars
├─ ALWAYS include keyboards on this chunk

Rule 2: WHAT IT MEANS = Chunk #2 (if standalone)
├─ If < 200 chars: combine with next block
├─ If > 200 chars: separate message
├─ No buttons on this chunk

Rule 3: QUOTE = Separate Chunk
├─ NEVER mix quote with body text
├─ Format: "_[Quote text]_\n\n— [Attribution]"
├─ Estimate: 200-600 chars
├─ No buttons

Rule 4: VOICE NOTE = Separate Chunk
├─ Standalone message: voice_note content only
├─ NO text before/after voice
├─ Label comes in Chunk #3 as caption

Rule 5: PRACTICAL NEXT STEP = Chunk #X (before CTA)
├─ Standalone if < 150 chars
├─ Format: "📌 [step content]" (if visual help needed)
├─ OR just plain text (no emoji per rules)
├─ No buttons

Rule 6: CTA BUTTONS = Chunk #LAST
├─ ALWAYS separate from content
├─ Text: "Що далі?" or "Оберіть дію" (brief)
├─ Inline keyboard with PRIMARY + SECONDARY buttons
├─ Max 2 buttons per row


KEYBOARD GENERATION RULES
═══════════════════════════════════════════════════════════════════

PRIMARY CTA (always present):
├─ Label: From ctaPrimary.label (e.g., "Активувати ФОКУС")
├─ callback_data: "ab_test_action:focus_activate"
├─ OR url: If ctaPrimary.action is absolute URL
├─ Max 32 chars label

SECONDARY CTA (if exists and not null):
├─ Label: From ctaSecondary.label (e.g., "Переділати тест")
├─ callback_data: "ab_test_action:retry_test"
├─ Position: Same row OR new row (depends on label length)
├─ Max 28 chars label

FALLBACK CTAs (always include at least one):
├─ If primary CTA fails to generate: "Спробувати знову"
├─ If both null: "До меню" (callback: "ab_test_action:menu")

KEYBOARD FORMAT (telegraf syntax):

Extra.markup(
Markup.inlineKeyboard([
[
Markup.button.callback('Активувати ФОКУС', 'ab_test_action:focus_activate'),
Markup.button.callback('Переділати тест', 'ab_test_action:retry_test')
]
])
)



VOICE NOTE HANDLING
═══════════════════════════════════════════════════════════════════

IF voiceNoteUrl is provided:

Chunk Structure:
├─ Message Type: sendVoice (Telegram API)
├─ Voice File: URL from voiceNoteUrl
├─ Caption (optional): From voice_note.label or null
├─ Duration: Parse from metadata or estimate
├─ Reply Markup: None (voice messages don't support inline keyboards)

BEFORE voice message:
└─ Send text chunk with label:
   └─ Text: "🎙️ Голосове повідомлення\nТривалість: [duration]"
   └─ OR omit label if explicitly requested

AFTER voice message:
└─ Send next logical chunk

Example sequence:
  Chunk #3: "🎙️ Голосове повідомлення від Нади\nТривалість: 3:45"
  Chunk #4: [sendVoice with caption "Про результат CHOICE"]
  Chunk #5: [Practical next step text]
  Chunk #6: [CTA buttons]

NEVER:
✗ Mix voice with text in same message
✗ Attach keyboard to voice message
✗ Multiple voice notes in one result render


SPECIAL CASES & EDGE CONDITIONS
═══════════════════════════════════════════════════════════════════

❌ Text block > 1,024 chars:
  └─ Split at sentence boundary (look for ". " or "\n\n")
  └─ First chunk: [text... [first batch]]
  └─ Second chunk: [text... [second batch]]
  └─ Max 3 sequential chunks for same logical block
  └─ If 3 chunks needed: likely copy is too long → ask PROMPT #2 to condense

❌ Title + Summary combined > 1,024 chars:
  └─ Extract title as separate chunk
  └─ Keep summary standalone
  └─ DO NOT truncate

❌ Quote > 600 chars:
  └─ Truncate at 500 chars + "..."
  └─ Keep attribution always (even if quote cut)
  └─ Log warning: "Quote from [attribution] was truncated"

❌ Buttons' combined label length > 48 chars:
  └─ If "Активувати ФОКУС для AB System" → shorten to "Активувати ФОКУС"
  └─ Put secondary on new row
  └─ Max button row width: 48 chars total

❌ resultType is missing or invalid:
  └─ Default tone: neutral
  └─ Default keyboard: "Активувати ФОКУС" + "Меню"

❌ No CTA data (ctaPrimary & ctaSecondary both null):
  └─ Generate fallback: "До меню" (callback: "ab_test_action:menu")
  └─ Log error: "No CTA data provided for result [resultType]"

❌ firstNameValidation in Telegram caption:
  └─ IF voiceNoteUrl exists AND firstName available:
  └─ Can personalize: "Голосове повідомлення від Нади для [firstName]"
  └─ BUT: Only if firstName validated (not "undefined")
  └─ ELSE: "Голосове повідомлення від Нади"


OUTPUT FORMAT (READY FOR BOT.API.SEND)
═══════════════════════════════════════════════════════════════════

Return array of chunks, each ready for direct Telegram API call:

[
  {
    "chunkId": 1,
    "type": "sendMessage",
    "params": {
      "chat_id": "${chatId}",
      "text": "*Коли енергія на нулі*\n\nТи в стані виснаження. Енергія витік, рішення відкладено.",
      "parse_mode": "Markdown",
      "reply_markup": {
        "inline_keyboard": [
          [
            { "text": "Активувати ФОКУС", "callback_data": "ab_test_action:focus_activate" }
          ]
        ]
      }
    }
  },
  {
    "chunkId": 2,
    "type": "sendMessage",
    "params": {
      "chat_id": "${chatId}",
      "text": "За 21 день розібралася, що мені потрібна енергія, не ще один урок.\n\n— Користувачка, сегмент STATE"
      "parse_mode": "Markdown"
    }
  },
  {
    "chunkId": 3,
    "type": "sendVoice",
    "params": {
      "chat_id": "${chatId}",
      "voice": "https://..../voice_note.ogg",
      "caption": "Про стан виснаження",
      "duration": 225
    }
  },
  {
    "chunkId": 4,
    "type": "sendMessage",
    "params": {
      "chat_id": "${chatId}",
      "text": "Почни з 10-хвилинної практики відновлення енергії. Може бути сьогодні ж."
      "parse_mode": "Markdown"
    }
  },
  {
    "chunkId": 5,
    "type": "sendMessage",
    "params": {
      "chat_id": "${chatId}",
      "text": "Що далі?",
      "reply_markup": {
        "inline_keyboard": [
          [
            { "text": "Активувати ФОКУС", "callback_data": "ab_test_action:focus_activate" },
            { "text": "Переділати тест", "callback_data": "ab_test_action:retry_test" }
          ]
        ]
      }
    }
  }
]


SENDING LOGIC (NO CONCURRENCY)
═══════════════════════════════════════════════════════════════════

Process chunks SEQUENTIALLY (not Promise.all):

```typescript
for (const chunk of chunks) {
  try {
    if (chunk.type === 'sendMessage') {
      await bot.api.sendMessage(chunk.params.chat_id, chunk.params.text, {
        parse_mode: chunk.params.parse_mode,
        reply_markup: chunk.params.reply_markup
      });
    } else if (chunk.type === 'sendVoice') {
      await bot.api.sendVoice(chunk.params.chat_id, chunk.params.voice, {
        caption: chunk.params.caption,
        duration: chunk.params.duration
      });
    }
    
    // Small delay between messages for readability
    await sleep(300);
    
  } catch (error) {
    console.error(`Chunk #${chunk.chunkId} failed:`, error.message);
    // Continue with next chunk, don't break
  }
}
```

Reason: Sequential ensures messages appear in correct order on client.


INTEGRATION WITH EXISTING FLOW
═══════════════════════════════════════════════════════════════════

Current flow in `abTest.callback.ts`:
  ├─ handleShowResult()
  ├─ queries DB: getAbTestResult()
  ├─ calls PROMPT #3 generator (Codex)
  └─ CURRENTLY sends raw result object to Telegram

NEW flow (with PROMPT #4):
  ├─ handleShowResult()
  ├─ queries DB: getAbTestResult()
  ├─ calls PROMPT #3 generator (Codex) → get structured result
  ├─ calls PROMPT #4 generator (Codex) → get chunks array
  ├─ iterate chunks sequentially
  └─ bot.api.sendMessage / sendVoice for each chunk


GUARDRAILS & VALIDATION
═══════════════════════════════════════════════════════════════════

🚫 NEVER modify existing callback handlers
🚫 NEVER add new Telegram routes or handlers
🚫 NEVER change state machine (stays at S3_TEST_RESULT)
🚫 NEVER generate HTML or inline markup (Markdown only)
🚫 NEVER send multiple voice notes
🚫 NEVER use emojis (per product rules)
🚫 NEVER concatenate voice with text in one message
🚫 NEVER send keyboard with voice message
🚫 NEVER exceed 4,096 chars in single message
🚫 NEVER generate callback_data without "ab_test_" prefix
🚫 NEVER skip validation for firstName/firstNameValidation

VALIDATION CHECKLIST:
✅ All text blocks < 1,024 chars (except max 4,096 hard limit)
✅ All buttons have valid callback_data or URL
✅ Voice message URL is valid (not null, not "undefined")
✅ Quote properly attributed
✅ CTA buttons generate correctly
✅ No orphaned chunks (every chunk has purpose)
✅ Sequential sending without Promise.all
✅ Error logging for failed chunks


OUTPUT VALIDATION
═══════════════════════════════════════════════════════════════════

Before returning chunks, verify:

1. All chunks have valid "type" (sendMessage | sendVoice)
2. All sendMessage chunks have "text" field
3. All sendVoice chunks have "voice" URL field
4. All keyboard callbacks match pattern: /^ab_test_action:[a-z_]+/
5. No chunk exceeds 4,096 characters
6. Voice message URL is accessible (or mark for retry)
7. Array length: 2-6 chunks (typical range: 3-5)

If validation fails:
├─ Log detailed error: which chunk, which field
├─ Return fallback chunks: simple text + keyboard
└─ Alert to ops: malformed result from PROMPT #3


EXAMPLE: Full Result-to-Chunks Pipeline
═══════════════════════════════════════════════════════════════════

INPUT (from PROMPT #3):
{
  "resultType": "state",
  "blocks": [
    { "type": "title", "content": "Коли енергія на нулі" },
    { "type": "summary", "content": "Ти в стані виснаження. Енергія витік, рішення відкладено." },
    { "type": "what_it_means", "content": "Це впливає на кожен день. Маленькі завдання стають гірськими." },
    { "type": "quote", "content": "За 21 день розібралася, що мені потрібна енергія", "attribution": "Користувачка, сегмент STATE" },
    { "type": "voice_note", "duration": "3:45", "url": "https://...voice.ogg", "label": "Про стан STATE" },
    { "type": "practical_next_step", "content": "Почни з 10-хвилинної практики. Сьогодні ж." },
    { "type": "cta_primary", "label": "Активувати ФОКУС", "action": "https://payment.link" },
    { "type": "cta_secondary", "label": "Переділати тест", "action": "ab_test_action:retry_test" }
  ]
}

CHUNKING LOGIC:
Chunk #1: title + summary + CTA buttons
├─ Length: ~180 chars (fits in one message)
└─ Buttons: primary + secondary

Chunk #2: what_it_means (standalone)
├─ Length: ~60 chars
└─ No buttons

Chunk #3: quote (separate, never mixed)
├─ Length: ~110 chars
├─ Attribution preserved
└─ No buttons

Chunk #4: voice_note (separate Telegram API call)
├─ Type: sendVoice (not sendMessage)
└─ Caption: from label

Chunk #5: practical_next_step (before final CTA)
├─ Length: ~45 chars
└─ No buttons

Chunk #6: Final CTA (if not already in Chunk #1)
├─ OR: Skip if already sent keyboard in Chunk #1
└─ Decision: Did primary + secondary fit in Chunk #1?
   └─ YES: Skip Chunk #6
   └─ NO: Send Chunk #6 with buttons

FINAL OUTPUT:
[
  { chunkId: 1, type: "sendMessage", params: { text: "...", reply_markup: {...} } },
  { chunkId: 2, type: "sendMessage", params: { text: "..." } },
  { chunkId: 3, type: "sendMessage", params: { text: "..." } },
  { chunkId: 4, type: "sendVoice", params: { voice: "...", caption: "..." } },
  { chunkId: 5, type: "sendMessage", params: { text: "..." } }
]

Sequential send order produces readable, structured Telegram experience.
 -->
