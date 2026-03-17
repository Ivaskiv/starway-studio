# Codex Task: AI Producer Assistant — Refactor Mode

You are a **senior TypeScript architect** working on an existing production codebase.

Your task is to **extend and refactor existing functionality**, not generate new boilerplate.

The repository contains an **AI Mentor platform** with modular architecture.

---

# EXECUTION PROTOCOL (MANDATORY)

You MUST follow this order.

STEP 1 — CODEBASE AUDIT

Read and analyze all relevant files.

STEP 2 — ARCHITECTURE REPORT

Output:

existing modules
existing related functionality
what already solves part of the task
potential duplication risks
refactor opportunities

STEP 3 — IMPLEMENTATION PLAN

List:

files to reuse
files to modify
files to create

STEP 4 — WAIT FOR CONFIRMATION

Do NOT write code yet.

STEP 5 — IMPLEMENTATION

Write code only after plan approval.

---

# REFACTOR PRIORITY

Always follow this order:

1 reuse existing module
2 extend existing module
3 refactor existing module
4 create new module only if necessary

Never duplicate existing functionality.

---

# REPOSITORY SCAN

Run repository scan before analysis.

```bash
find src -type f -name "*.ts" -o -name "*.tsx" | head -200
find backend/src -type f -name "*.ts" | head -200
```

Search important modules:

```bash
grep -r "mentor" src
grep -r "funnel" src
grep -r "wheel" src
grep -r "subscription" backend/src
```

---

# EXISTING FILES TO ANALYZE

Read these files first:

```bash
cat src/features/ai-mentor/components/AIMentorChat.tsx
cat src/features/ai-mentor/services/mentor.api.ts
cat src/features/five-points-funnel/types/funnel.types.ts
cat src/features/five-points-funnel/services/funnel.api.ts
cat src/features/wheel/services/wheel.api.ts
cat src/features/subscription/engine/subscriptionEngine.ts
cat src/features/auth/hooks/useAuth.ts
cat src/config/routes.ts

cat backend/prisma/schema.prisma
ls backend/src/modules/
```

Check if producer feature already exists.

```bash
ls src/features/producer/ 2>/dev/null
ls backend/src/modules/producer/ 2>/dev/null
```

---

# FEATURE GOAL

Implement **AI Producer Assistant**.

Responsibilities:

guide users through funnel
help create products
help create funnels
guide toward subscription

System steps:

1 funnel
2 mentor
3 product creation
4 funnel creation
5 distribution

Assistant must guide user step-by-step.

---

# ARCHITECTURE RULES

Backend modules:

controller.ts
service.ts
routes.ts
types.ts

Controllers → HTTP only
Services → business logic

Frontend features:

components/
hooks/
services/
types/
pages/

Services contain API calls.

Components contain UI only.

---

# UI RULES

Allowed:

TailwindCSS
CSS variables

Forbidden:

inline style={{}}
SCSS modules

---

# TYPESCRIPT RULES

Strict TypeScript.

No errors allowed.

Final verification:

```bash
npx tsc --noEmit
```

---

# FINAL CHECK

Verify:

no duplicate Prisma models
no duplicate API routes
no duplicate UI components
no TypeScript errors
