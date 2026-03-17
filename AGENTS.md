# AGENTS.md

AI Mentor Platform — Repository Rules for AI Agents

This document defines architecture and coding rules that AI agents (Codex, assistants, etc.) MUST follow when modifying this repository.

---

<!-- # 1. Project overview -->

This repository contains the **AI Mentor platform**.

Core concept:
User goes through a structured system:

STATE → GOAL → CHOICE → DECISION → ACTION

Main modules:

* AI Mentor
* Wheel of Balance
* Daily Cycle
* Five-points Funnel
* Subscription / Trial system
* AI Producer assistant

The system is **not a chatbot product**.
It is a **structured decision system**.

AI only assists the flow.

---

<!-- # 2. Technology stack -->

Frontend:

* React
* TypeScript
* TailwindCSS
* RTK Query
* Vite

Backend:

* Node.js
* TypeScript
* Express
* Prisma
* PostgreSQL

Messaging / external:

* Telegram bot integration
* AI APIs

---

<!-- # 3. Backend architecture rules -->

All backend logic is **module based**.

Structure:

backend/src/modules/

module-name/
controller.ts
service.ts
routes.ts
types.ts

Rules:

Controllers

* Handle HTTP only
* No business logic

Services

* Contain business logic
* Handle Prisma queries

Routes

* Register controllers

Types

* Shared DTO types

DO NOT place logic outside modules.

---

<!-- # 4. Frontend architecture rules -->

Structure:

src/features/

feature-name/
components/
hooks/
services/
types/
pages/

Rules:

components/
UI only

hooks/
state / logic

services/
API calls only

pages/
compose components

Never mix API calls inside UI components.

---

<!-- # 5. Reuse-first policy -->

Before creating new code the agent MUST search for reusable logic.

Priority order:

1. reuse existing module
2. extend existing module
3. refactor existing module
4. create new module (only if necessary)

Example reuse targets:

* AIMentorChat.tsx → chat UI pattern
* mentor.api.ts → AI messaging
* funnel.api.ts → funnel logic
* wheel.api.ts → wheel API
* subscriptionEngine.ts → trial logic

---

<!-- # 6. Styling rules -->

Allowed:

* TailwindCSS
* CSS variables
* project utility classes

Forbidden:

* inline style={{}}
* SCSS modules

Design tokens:

--accent
--accent-rgb

Main UI styles:

liquid-glass
btn-primary

---

<!-- # 7. Database rules -->

Database: PostgreSQL via Prisma.

Rules:

* Do NOT duplicate models
* Always check schema before adding new model
* Use relations instead of duplicated data
* Prefer JSON config for flexible modules

Example models:

User
Subscription
DailyEntry
WheelEntry
FunnelProgress

---

<!-- # 8. AI assistant rules -->

AI assistants must:

* guide user through steps
* provide short answers
* never break system flow

Step system:

1. Funnel
2. Mentor
3. Product creation
4. Funnel clone
5. Distribution

AI must always guide to **next step only**.

Language: Ukrainian.

---

<!-- # 9. TypeScript requirements -->

Strict mode required.

Rules:

* no any
* no implicit any
* no unused imports
* zero TypeScript errors

Always run:

npx tsc --noEmit

before finalizing changes.

---

<!-- # 10. Before generating code -->

The AI agent MUST:

1. analyze existing files
2. detect duplicates
3. propose a plan
4. wait for confirmation

Only after confirmation may code be written.

---
