# Document

AI Agent Routing

> 🇺🇦 Канонічний документ маршрутизації AI engineering агентів.

# Purpose

Defines the canonical execution flow between AI Engineering Agents.

> 🇺🇦 Визначає, у якому порядку запускаються AI engineering агенти.

# Scope

Covers routing order, allowed transitions, forbidden transitions, human intervention, and completion guarantees for the multi-agent engineering lifecycle.

> 🇺🇦 Окреслює правила передачі задач між агентами та умови завершення.

# Audience

AI engineers, prompt architects, project managers, reviewers, release owners, and repository governors.

> 🇺🇦 Документ для всіх, хто керує або перевіряє multi-agent engineering workflow.

# Dependencies

- `docs/reference/ai-engineer-roles.md`
- `docs/reference/ai-coding-constitution.md`
- `prompts/master-system-prompt.md`
- `prompts/task-planning-prompt.md`
- `prompts/implementation-prompt.md`
- `prompts/code-review-prompt.md`
- `prompts/bug-investigation-prompt.md`
- `prompts/refactoring-prompt.md`
- `prompts/release-readiness-prompt.md`

> 🇺🇦 Спирається на ролі агентів, constitutions і prompt stack.

# Related Documents

- `docs/reference/platform-reference-architecture.md`
- `docs/reviews/architecture-audit-v1.md`
- `docs/engineering/07-testing-blueprint.md`
- `docs/engineering/09-deployment-blueprint.md`

> 🇺🇦 Суміжні документи для навігації, release safety і validation.

---

# STEP 51 — AI Agent Routing

> 🇺🇦 Канонічний опис маршрутизації AI агентів.
>
> Цей документ визначає порядок запуску агентів,
> правила передачі задач між ними та умови завершення роботи.

---

# Purpose

Define the execution flow between AI Engineering Agents.

The routing system guarantees that every engineering task follows the same deterministic lifecycle.

No agent may be executed outside the routing rules.

---

# Routing Principles

> 🇺🇦 Усі задачі проходять однаковий маршрут.

Rules

- Every task starts with routing.
- Every task ends with Release Readiness or Human interruption.
- Agents execute sequentially unless explicitly allowed.
- No agent may skip mandatory validation.
- Human approval has the highest priority.

---

# Canonical Workflow

```text
Human Request
      │
      ▼
AI Project Manager
      │
      ▼
Task Planning Agent
      │
      ▼
Implementation Agent
      │
      ▼
Code Review Agent
      │
      ├───────────────┐
      │               │
      │               ▼
      │       Bug Investigation Agent
      │               │
      │               ▼
      │       Refactoring Agent
      │               │
      └───────────────┘
      │
      ▼
Release Readiness Agent
      │
      ▼
Human
```

---

# Routing Rules

## Rule 1

> 🇺🇦 Будь-яка задача починається з планування.

Human

↓

Project Manager

↓

Task Planning

---

## Rule 2

> 🇺🇦 Поки план не затверджений — код не пишеться.

Planning

↓

Approval

↓

Implementation

---

## Rule 3

> 🇺🇦 Після будь-якої реалізації обов'язково виконується Code Review.

Implementation

↓

Code Review

---

## Rule 4

> 🇺🇦 Якщо знайдено проблему — спочатку аналіз, потім виправлення.

Code Review

↓

Bug Investigation

↓

Implementation / Refactoring

↓

Code Review

---

## Rule 5

> 🇺🇦 Якщо потрібне лише покращення коду — використовується Refactoring Agent.

Planning

↓

Refactoring

↓

Code Review

---

## Rule 6

> 🇺🇦 Перед Merge або Production завжди запускається Release Readiness.

Code Review

↓

Release Readiness

↓

READY

or

NOT READY

---

# Allowed Transitions

| From | To |
|------|----|
| Human | Project Manager |
| Project Manager | Task Planning |
| Task Planning | Implementation |
| Task Planning | Refactoring |
| Implementation | Code Review |
| Code Review | Release Readiness |
| Code Review | Bug Investigation |
| Bug Investigation | Implementation |
| Bug Investigation | Refactoring |
| Refactoring | Code Review |
| Release Readiness | Human |

---

# Forbidden Transitions

> 🇺🇦 Заборонені переходи.

❌ Human → Implementation

❌ Human → Code Review

❌ Planning → Release

❌ Implementation → Release

❌ Bug Investigation → Release

❌ Refactoring → Release

❌ Skip Code Review

❌ Skip Planning

---

# Human Intervention

> 🇺🇦 Людина може втрутитися на будь-якому етапі.

Human may:

- approve
- reject
- cancel
- reprioritize
- request additional analysis

Every intervention returns control to the Project Manager.

---

# Routing Guarantees

Every engineering task is guaranteed to:

- start from planning;
- preserve architectural validation;
- undergo independent review;
- investigate defects before fixing;
- complete production validation before release.

---

# Result

> 🇺🇦 STEP 50 визначає ролі агентів.
>
> STEP 51 визначає маршрут їхньої взаємодії.

Together they create a deterministic multi-agent engineering workflow independent of any specific AI model.
