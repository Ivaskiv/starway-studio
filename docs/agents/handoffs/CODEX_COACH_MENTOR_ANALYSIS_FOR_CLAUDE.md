# Starway Coach Mentor Analysis for Claude

## 1) What This Bot Is

This is the internal Starway coach panel bot, not the customer-facing AI mentor.

Current runtime uses:

- `coachBot` singleton in `backend/src/lib/telegram.ts`
- token from `COACH_BOT_TOKEN`
- optional webhook from `COACH_BOT_WEBHOOK_URL`
- access restricted to users with role `EXPERT` or `SUPERADMIN`

Primary UI title:

- `Starway Coach Panel`

Runtime display name:

- defaults currently resolve to `Starway DNA Coach`
- can now be overridden via env

## 2) Real Bot Identity

There are three different identity layers:

- Bot panel title: `Starway Coach Panel`
- Runtime bot name: `Starway DNA Coach` by default
- Telegram token identity: `COACH_BOT_TOKEN`

This distinction matters because Claude should not treat the panel title as the bot username.

## 3) Current Logic Map

### Bootstrap

Entry point:

- `backend/src/index.ts`

What happens:

- loads env
- creates `coachBot` singleton
- reads `COACH_BOT_TOKEN`
- registers coach handlers if token exists
- starts bot in webhook mode if `COACH_BOT_WEBHOOK_URL` is set
- otherwise falls back to polling

### Bot Construction

File:

- `backend/src/lib/telegram.ts`

What it does:

- lazily creates `bot`, `contentBot`, `coachBot`, and `testBot`
- `coachBot` is a separate `Telegraf` instance
- `testBot` is also separate and uses `TEST_BOT_TOKEN`
- `launchBot()` seeds fake `botInfo` and starts webhook or polling

### Access Control

Files:

- `backend/src/bot/handlers/coach/coachStart.handler.ts`
- `backend/src/bot/handlers/coachContent.handler.ts`
- `backend/src/bot/handlers/coach/schedule.handler.ts`

Access rules:

- chat must be private
- user must be found in Prisma by `telegramUserId` or `telegramChatId`
- `role` must be `EXPERT` or `SUPERADMIN`

If access fails, the bot replies that this is a coach-only bot and tells the user to contact an admin.

### Main Entry UI

File:

- `backend/src/bot/content/coachBot.content.ts`

Main menu sections:

- Zoom Calendar
- Schedule add / next week setup
- Analytics
- Users
- Notifications
- Audio
- Content planner
- Script
- Payments

### Schedule / Zoom Logic

File:

- `backend/src/bot/handlers/coach/schedule.handler.ts`

Behavior:

- generates current week and next week slot grids
- uses fixed hours: 9, 11, 13, 15, 17, 19
- stores availability in `prisma.zoomSlot`
- opens all next-week slots by default
- lets coach close/open days or individual hours
- confirms changes via inline keyboard

### Analytics Logic

Files:

- `backend/src/bot/handlers/coach/analytics.handler.ts`
- `backend/src/modules/analytics/service.ts`

Behavior:

- reads canonical metrics from analytics service
- shows total users, in-test users, completed tests, paid users, active Zoom users
- shows conversion, upgrades, revenue, and MRR
- uses edit-or-reply fallback for callback queries

### Content Planning Logic

Files:

- `backend/src/bot/handlers/coachContent.handler.ts`
- `backend/src/modules/coach-content/contentPlanner.service.ts`
- `backend/src/bot/content/coachContent.content.ts`

Behavior:

- validates the coach content catalog on startup
- supports Audio, Planner, Script, and Users workflows
- pulls Zoom sessions and notes for planner context
- uses `anthropic` provider in the planner service
- creates draft content plans from historical Zoom data and notes

### Telegram Mentor Runtime

Files:

- `backend/src/modules/telegram-mentor/index.ts`
- `backend/src/modules/telegram-mentor/handlers/start.ts`
- `backend/src/modules/telegram-mentor/handlers/aiMentor.ts`
- `backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts`

This is a separate domain:

- client-side AI mentor
- lifecycle-based decision routing
- product-room state management
- callbacks such as `continue_ai_mentor`, `continue_ai_mentor_chat`

Important:

- do not mix this with the internal coach panel logic
- the coach bot is operational/admin-facing
- the AI mentor is end-user-facing

## 4) What Claude Should Understand

Claude should see this as a two-layer system:

- Layer A: operational coach panel
- Layer B: customer AI mentor and lifecycle automation

The coach panel is responsible for:

- zoom availability
- analytics
- user management
- content planning
- notifications
- manual activation actions

The AI mentor layer is responsible for:

- user journey state
- activity recovery
- callback-driven continuation
- product-specific mentor prompts

## 5) Best Integration Strategy

Recommended approach:

1. Keep the coach panel bot as a thin transport layer.
2. Put business logic into services, not handlers.
3. Reuse `planMessage` / `planAck` wrappers for Telegram delivery.
4. Reuse Prisma-backed analytics and Zoom services.
5. Reuse Anthropic only through a provider/service abstraction.
6. Keep coach-only permissions in one guard layer.
7. Avoid adding Claude directly inside handlers unless it is a small, bounded response.

### Best Place for Claude Integration

Good integration points:

- `backend/src/modules/coach-content/contentPlanner.service.ts`
- a new internal `manager-agent` service
- a small assistant service for generating content drafts, summaries, and next actions

Avoid:

- putting Claude directly into `coachStart.handler.ts`
- mixing Claude with access checks
- using Claude to decide permissions
- letting Claude build raw Telegram keyboards

## 6) Suggested Claude Skill Scope

If Claude is going to write a skill for Starway Mentor, the skill should:

- inspect coach-only paths separately from user-facing mentor paths
- understand the runtime is multi-bot
- treat `coachBot` as admin/ops tooling
- treat `AI Mentor` as product logic
- use Prisma analytics and Zoom services as source of truth
- use Anthropic only for generation, not for orchestration

## 7) Current Bot Names and env

Existing env keys:

- `COACH_BOT_TOKEN`
- `COACH_BOT_WEBHOOK_URL`
- `TEST_BOT_TOKEN`
- `TEST_BOT_WEBHOOK_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_BOT_NAME`
- `COACH_BOT_NAME`
- `TEST_BOT_NAME`

Defaults:

- `TELEGRAM_BOT_NAME=Starway Main`
- `COACH_BOT_NAME=Starway DNA Coach`
- `TEST_BOT_NAME=Starway Test`

## 8) Practical Advice for Claude

Claude should generate code in this order:

1. add or extend service layer
2. add tests or validation helpers
3. wire handlers to services
4. keep the transport thin
5. preserve private-chat gating and role checks

Claude should not:

- rename the bot assumptions without checking env
- merge coach panel and AI mentor flows
- bypass Prisma roles
- rely on hardcoded user IDs except for explicit admin tooling

## 9) Short Prompt for Claude

Use this as a starter prompt:

```text
You are working on Starway's Telegram coach mentor system.

Important boundaries:
- Internal coach panel bot is separate from customer-facing AI mentor.
- Coach panel is for EXPERT/SUPERADMIN only.
- Keep bot handlers thin; move logic into services.
- Reuse Prisma analytics, Zoom slots, content planner, and Anthropic provider abstraction.

Task:
- analyze existing coach panel flows
- extend them safely
- preserve access control
- avoid mixing with AI mentor lifecycle logic
- integrate Claude only for bounded generation tasks like summaries, content drafts, and planning assistance
```

