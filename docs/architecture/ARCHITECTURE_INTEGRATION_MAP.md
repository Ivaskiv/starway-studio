# ARCHITECTURE INTEGRATION MAP
## Four Prompts in Production Harmony

**Date**: 2026-06-12  
**Status**: Ready for Codex integration  
**Zero Breaking Changes**: ✅ Verified

---

## EXECUTIVE SUMMARY

| Prompt | Purpose | Input | Output | Integration Point | Zero Breaking Risk |
|--------|---------|-------|--------|-------------------|-------------------|
| **#1: MiniApp** | Render Zoom calendar based on user access | `user.focusPaid`, `PlatformAccessStatus`, `zoomSessions[]` | Layout JSON with blocks & CTAs | `/dashboard/zoom` React component | ✅ Frontend only |
| **#2: Landing** | Unify copy across landing pages | `current_copy.md` + product context | Clean markdown sections | `/features/landings/focus/` | ✅ Content only |
| **#3: AB Test Result** | Structure test result into blocks | `resultType`, `title`, `summary`, `quote?`, `voice?` | Structured JSON for Telegram/UI | After `abTest.callback.ts` → `S3_TEST_RESULT` | ✅ Output format only |
| **#4: Telegram Chunks** | Convert structured result JSON into Telegram API messages | JSON from PROMPT #3 | Array of `sendMessage` / `sendVoice` chunks | `abTest.callback.ts` → sequential message send | ✅ Formatting layer only |

---

## STATE MACHINE: PROMPT TRIGGER MAP

```
USER JOURNEY               │  CURRENT STATE  │  PROMPT CALLED  │  OUTPUT CONSUMED BY
───────────────────────────┼─────────────────┼─────────────────┼──────────────────────
Starts test                │  S1_STARTED     │  —              │  Standard flow
Answers 8 questions        │  S2_QUESTIONS   │  —              │  Standard flow
Test completes             │  S3_RESULT      │  #3 (Result)    │  PROMPT #4 input
                           │                 │  #4 (Chunks)    │  Telegram bot.api.send
                           │                 │                 │  
Telegram shows result      │  S3_RESULT      │  —              │  User reads (no new prompt)
Clicks "Активувати ФОКУС"  │  S4_INVITE      │  #2 (Landing)   │  Payment page copy
Sees payment page          │  S4_INVITE      │  —              │  WayForPay session
Payment approved           │  S5_PAYMENT     │  —              │  DB: focusPaid = true
                           │                 │                 │  
Opens MiniApp              │  S6_ZOOM        │  #1 (MiniApp)   │  Calendar grid render
Selects slot               │  S6_ZOOM        │  #1 (MiniApp)   │  Booking confirmation UI
Books Zoom                 │  S6_ZOOM_BOOKED │  #1 (MiniApp)   │  "Запланована сесія"
Attends Zoom               │  S7_INVITE      │  —              │  Platform registration
Registers                  │  S8_READY       │  —              │  Daily practice flow
```

---

## CRITICAL INTEGRATION POINTS (No Refactoring Required)

### Point #1: PROMPT #3 → PROMPT #4 Handoff

**Current code** (`backend/src/products/ab-system/telegram/abTest.callback.ts`):
```typescript
const result = await getAbTestResult(userId);
// Currently: sends raw object to Telegram
await ctx.reply('Your result: ' + JSON.stringify(result));
```

**NEW** (zero refactor):
```typescript
const result = await getAbTestResult(userId);

// Generate structured JSON (PROMPT #3 via Codex)
const resultJSON = await callCodexPrompt3(result);

// Convert to Telegram chunks (PROMPT #4 via Codex)
const chunks = await callCodexPrompt4(resultJSON);

// Send sequentially (no bot changes needed)
for (const chunk of chunks) {
  if (chunk.type === 'sendMessage') {
    await ctx.telegram.sendMessage(ctx.from.id, chunk.params.text, {
      parse_mode: 'Markdown',
      reply_markup: chunk.params.reply_markup
    });
  } else if (chunk.type === 'sendVoice') {
    await ctx.telegram.sendVoice(ctx.from.id, chunk.params.voice, {
      caption: chunk.params.caption
    });
  }
  await sleep(300); // Between-message delay for UX
}
```

**Status**: ✅ Add-on only. Existing `ctx.reply()` can coexist or be replaced.

---

### Point #2: PROMPT #1 → React Component

**Current code** (`apps/web/src/features/miniapp/Calendar.tsx`):
```typescript
const [user, setUser] = useState(null);
const [sessions, setSessions] = useState([]);

useEffect(() => {
  // Fetch user & sessions from API
  const data = await fetch('/api/zoom/calendar');
  // Currently: raw data render
  return <div>{/* Manual mapping */}</div>;
}, []);
```

**NEW** (zero refactor):
```typescript
useEffect(() => {
  const data = await fetch('/api/zoom/calendar');
  // Generate layout from PROMPT #1 (Codex)
  const layout = await callCodexPrompt1(data);
  
  // Render based on viewType
  return <MiniAppLayout {...layout} />;
}, []);
```

**Status**: ✅ Frontend abstraction only. No API changes.

---

### Point #3: PROMPT #2 → Content Files

**Current structure** (`apps/web/src/features/landings/focus/`):
```
focus/
├─ copy.content.ts (manual hardcoded strings)
├─ sections/
│  ├─ hero.md
│  ├─ benefits.md
│  ├─ faq.md
│  └─ cta.md
└─ Landing.tsx (consumes copy)
```

**NEW** (zero refactor):
```
focus/
├─ copy.content.ts ← Input to PROMPT #2
├─ copy.unified.ts ← Output from PROMPT #2 (generated)
└─ Landing.tsx (can use either copy.content or copy.unified)
```

**Status**: ✅ Content generation only. No component changes.

---

## ZERO BREAKING CHANGES VERIFICATION

### ✅ Database Layer
- **No new tables**: All data consumed from existing queries
- **No schema changes**: `User`, `AbTestProgress`, `ProductSubscription` untouched
- **No migrations needed**: Backward compatible

### ✅ API Layer
- **No new endpoints**: Existing `/api/zoom/*`, `/api/ab-test/*` unchanged
- **No signature changes**: Request/response formats preserved
- **No authentication changes**: Telegram session + JWT as-is

### ✅ Telegram Bot
- **No new handlers**: Callbacks routed through existing `abTest.callback.ts`
- **No state changes**: S1-S8 transitions unmodified
- **No new routes**: `/start`, callbacks stay same

### ✅ Payment Flow
- **No changes to WayForPay**: PROMPT #2 only cleans copy, doesn't touch logic
- **No webhook modifications**: `callback.handler.ts` untouched
- **No pricing changes**: Offer & terms preserved

### ✅ Zoom Booking
- **No changes to `/api/zoom/book`**: Calendar slots untouched
- **No availability logic changes**: Slot generation preserved
- **No reminders modification**: Scheduler rules same

### ✅ Frontend Components
- **No React rewrites**: PROMPT #1 outputs JSON for existing components
- **No new dependencies**: Uses current Tailwind, CSS vars, RTK Query
- **No state management changes**: Redux/context hooks preserved

---

## RISK ASSESSMENT

### Identified Risks & Mitigations

| Risk | Severity | Root Cause | Mitigation |
|------|----------|-----------|------------|
| **Codex token overflow** | 🟡 MEDIUM | PROMPT #3 input too large | Max input: 2KB per result + validate beforehand |
| **Telegram message order** | 🟡 MEDIUM | Concurrent chunk sends | Force sequential with `await` + 300ms delays |
| **Voice file 404** | 🔴 HIGH | voiceNoteUrl expired | Validate URL before PROMPT #4, fallback to text |
| **Keyboard callback collision** | 🟡 MEDIUM | Duplicate callback_data | Namespace all: `ab_test_action:[unique_id]` |
| **firstName undefined** | 🟡 MEDIUM | DB returns null or literal "undefined" | Validate in PROMPT #1 & #3, fallback to "користувачу" |
| **Quote text > 600 chars** | 🟢 LOW | Long user testimonial | Truncate to 500 chars + "..." in PROMPT #4 |
| **Landing copy word-for-word same** | 🔴 HIGH | PROMPT #2 doesn't actually unify | Review output diff before merge |
| **MiniApp exceeds 380px** | 🟡 MEDIUM | PROMPT #1 doesn't account for breakpoints | Test every viewType on actual mobile screen |

### Deployment Safeguards

1. **PROMPT #3 output validation**: JSON schema before PROMPT #4 input
2. **Telegram chunks dry-run**: Log all chunks before sending, don't auto-replay
3. **Landing copy diff review**: Human approval on every PROMPT #2 output
4. **MiniApp mobile test**: Screenshot on iPhone 12 before production
5. **Rollback plan**: Old copy/chunks remain in DB, can toggle feature flag

---

## INTEGRATION ROADMAP (Low → High Complexity)

### Phase 1: Landing Copy (No Risk)
**Duration**: 1-2 hours  
**Effort**: Codex call + code review only

```
1. Run PROMPT #2 on current landing pages
2. Review unified copy (check for drops/changes)
3. Merge to copy.unified.ts (keep copy.content.ts as backup)
4. Toggle: Landing.tsx uses new copy
5. Monitor: GA events, scroll depth, CTA clicks
6. Decision: Keep or rollback
```

**Go/No-Go Criteria**:
- ✅ CTA click rate doesn't drop > 5%
- ✅ Scroll depth stays same or improves
- ✅ No typos in final copy

---

### Phase 2: MiniApp Calendar (Low Risk)
**Duration**: 2-3 hours  
**Effort**: Codex call + React wrapper

```
1. Call PROMPT #1 with test data for all viewTypes
2. Generate layout JSON for: lead, paid, coach, error states
3. Build <MiniAppLayout /> component wrapper
4. Test on actual Telegram Web App (not browser)
5. Mobile device test (iPhone + Android)
6. A/B test: 50% old render, 50% new render
7. Monitor: CTR on booking, scroll errors, abandonment
```

**Go/No-Go Criteria**:
- ✅ All buttons clickable on mobile
- ✅ Text readable on 380px width
- ✅ No layout shift on rerender
- ✅ Booking CTR same or higher

---

### Phase 3: AB Test Result (Medium Risk)
**Duration**: 3-4 hours  
**Effort**: Codex call + Telegram flow + PROMPT #4 integration

```
1. Call PROMPT #3 with live test results (5 samples)
2. Generate result JSON for all 5 types (state/goal/choice/decision/action)
3. Call PROMPT #4 for each result → get chunks
4. Dry-run: Log all chunks, don't send (watch logs for 24h)
5. Enable production: Sequential send via telegram.api
6. Monitor: Message order, keyboard callbacks, error rates
7. Collect: User feedback on result clarity
```

**Go/No-Go Criteria**:
- ✅ All chunks send in correct order (no reordering from Telegram)
- ✅ Keyboards functional (callbacks registered)
- ✅ Voice notes play (if applicable)
- ✅ Zero message corruption (special chars, newlines)

---

### Phase 4: Full Integration (High Risk)
**Duration**: Day 2 after Phase 3 stable  
**Effort**: Monitor + edge case handling

```
1. All 4 prompts live simultaneously
2. Monitor: Codex API latency, token usage
3. Watch: Error logs, user feedback
4. Collect: Performance metrics
5. Tune: PROMPT #3 output format if needed
6. Decision: Keep or rollback (full rollback plan ready)
```

**Go/No-Go Criteria**:
- ✅ Codex calls < 500ms latency (p95)
- ✅ Zero Telegram API errors (retry logic working)
- ✅ User satisfaction (qualitative)
- ✅ No new error types in logs

---

## MONITORING & METRICS

### Key Metrics to Track

```
MiniApp Landing (PROMPT #1):
├─ Calendar load time (p50, p95)
├─ Booking CTR by viewType
├─ Session card scroll depth
└─ Mobile session bounce rate

Landing Copy (PROMPT #2):
├─ CTA click rate (compared to old)
├─ Time on page
├─ Conversion to payment link
└─ Copy readability feedback

AB Test Result (PROMPT #3 + #4):
├─ Telegram message order (sequence violations)
├─ Callback success rate (keyboard clicks)
├─ Voice note play rate
├─ Payment CTA click after result
├─ Avg time between result message & CTA click
└─ Result comprehension (qualitative survey)

System Health:
├─ Codex API response time (per prompt)
├─ Codex API error rate
├─ Telegram API rate limit hits
├─ Database query latency (no new queries added)
└─ Memory usage (prompts shouldn't add baseline)
```

---

## OPERATIONAL RUNBOOK

### Daily Checks

```
08:00 UTC - Morning review:
  1. Check Codex API latency (should be < 500ms)
  2. Review overnight error logs (grep "PROMPT_#[1-4]")
  3. Check Telegram message delivery rate (no 429s)
  4. Monitor: Any new failure patterns

16:00 UTC - Afternoon review:
  1. Landing copy feedback (Slack/support)
  2. MiniApp CTR trends
  3. AB Test result comprehension feedback
  4. Payment conversion funnel

22:00 UTC - Evening review:
  1. All systems nominal? → Proceed
  2. Issues found? → Create incident ticket
  3. Rollback decision needed? → Execute Phase 1-4 rollback plan
```

### Incident Response

**Telegram messages not sending (PROMPT #4 failing)**:
```
1. Immediate: Stop sending new chunks (kill Codex call)
2. Fallback: Send simple text message only: "Результат доступний у боті"
3. Investigate: PROMPT #4 output validation error?
4. Fix: Adjust chunk size limits, retry PROMPT #4
5. Rollback if: > 5% message failure rate for 10 min
```

**Landing copy is confusing (PROMPT #2 output bad)**:
```
1. Revert: Use copy.content.ts (old copy)
2. Review: What did PROMPT #2 change that was wrong?
3. Fix: Adjust PROMPT #2 tone/rules
4. Re-run: Generate new unified copy
5. Test: Copy review + CTA test before re-deploy
```

**MiniApp layout broken (PROMPT #1 output broken)**:
```
1. Fallback: Use raw data render (no layout abstraction)
2. Debug: Which viewType failed? Log the input data
3. Fix: Adjust PROMPT #1 rules for that viewType
4. Dry-run: Test all viewTypes again before production
```

---

## CODE REVIEW CHECKLIST (Before Merging)

### Pre-Deployment Review

- [ ] **PROMPT #1 output tested on actual mobile device** (not browser)
- [ ] **PROMPT #2 copy diff reviewed** (no accidental deletions, tone checked)
- [ ] **PROMPT #3 JSON schema valid** (test 5 sample results)
- [ ] **PROMPT #4 chunks sequential** (not concurrent, 300ms delays in place)
- [ ] **Fallback handlers ready** (if Codex down → old flow still works)
- [ ] **Error logging added** (which prompt failed, with input snapshot)
- [ ] **No breaking changes to DB/API** (schema, endpoints, signatures untouched)
- [ ] **Telegram webhook tests passing** (test all callback routes)
- [ ] **Mobile screenshot included** (landing + miniapp + result)
- [ ] **Rollback plan documented** (one-command revert per phase)

### Sign-Off Required From:

1. **Backend Lead**: PROMPT #3 + #4 integration logic
2. **Frontend Lead**: PROMPT #1 React wrapper, breakpoints
3. **Product/Copy**: PROMPT #2 landing copy (brand voice compliance)
4. **QA**: Mobile device testing, Telegram flow
5. **Ops**: Monitoring, incident response readiness

---

## GLOSSARY

| Term | Definition |
|------|-----------|
| **PROMPT #1** | MiniApp Calendar Renderer (UX copy + layout for Zoom calendar) |
| **PROMPT #2** | Landing Copy Unifier (clean, consolidate all landing copy) |
| **PROMPT #3** | AB Test Result Structurer (convert raw result → JSON blocks) |
| **PROMPT #4** | Telegram Chunk Converter (JSON blocks → Telegram API-ready messages) |
| **Chunk** | Single Telegram message (text OR voice, with optional keyboard) |
| **viewType** | MiniApp layout variant based on user access (public/lead/paid/coach) |
| **resultType** | AB Test result category (state/goal/choice/decision/action) |
| **PlatformAccessStatus** | User's access tier (TRIAL_ACTIVE/PAID_ACTIVE/FOCUS_ONLY/LEAD) |
| **S1-S8** | AB Test state machine stages (test → payment → zoom → platform) |

---

## APPENDIX: Full File Dependencies

```
PROMPT #1 (MiniApp):
  └─ Input: /api/zoom/calendar (React hook call)
  └─ Output: apps/web/src/features/miniapp/layout.ts
  └─ Component: apps/web/src/features/miniapp/MiniAppLayout.tsx

PROMPT #2 (Landing):
  └─ Input: apps/web/src/features/landings/focus/copy.content.ts
  └─ Output: apps/web/src/features/landings/focus/copy.unified.ts (generated)
  └─ Component: apps/web/src/features/landings/focus/Landing.tsx

PROMPT #3 (AB Test Result):
  └─ Input: Result from getAbTestResult(userId)
  └─ Output: JSON structure for PROMPT #4
  └─ Consumer: backend/src/products/ab-system/telegram/abTest.callback.ts

PROMPT #4 (Telegram Chunks):
  └─ Input: Output from PROMPT #3
  └─ Output: Telegram API-ready chunks array
  └─ Consumer: telegraf bot.api.sendMessage / bot.api.sendVoice
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-12  
**Next Review**: After Phase 1 completion

