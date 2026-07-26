# Document

AI State Management

> 🇺🇦 Канонічний документ управління станом AI engineering процесу.

# Purpose

Defines the canonical execution state shared between AI Engineering Agents.

> 🇺🇦 Визначає спільний стан задачі, який передається між AI engineering агентами.

# Scope

Covers task execution state, ownership boundaries, update rules, validation rules, and human state intervention during the engineering lifecycle.

> 🇺🇦 Окреслює, який стан зберігається, хто ним володіє і як він валідується.

# Audience

AI engineers, prompt architects, project managers, reviewers, release owners, and repository governors.

> 🇺🇦 Документ для тих, хто проєктує або контролює engineering execution flow.

# Dependencies

- `docs/reference/ai-engineer-roles.md`
- `docs/reference/ai-agent-routing.md`
- `docs/reference/ai-context-loading.md`
- `docs/reference/ai-coding-constitution.md`
- `prompts/master-system-prompt.md`
- `prompts/task-planning-prompt.md`
- `prompts/implementation-prompt.md`
- `prompts/code-review-prompt.md`
- `prompts/bug-investigation-prompt.md`
- `prompts/refactoring-prompt.md`
- `prompts/release-readiness-prompt.md`

> 🇺🇦 Спирається на ролі, routing, context loading, constitutions і prompt stack.

# Related Documents

- `docs/reference/platform-reference-architecture.md`
- `docs/reviews/architecture-audit-v1.md`
- `docs/engineering/07-testing-blueprint.md`
- `docs/engineering/09-deployment-blueprint.md`

> 🇺🇦 Суміжні документи для загальної архітектури, validation і release safety.

---

# STEP 53 — AI State Management

> 🇺🇦 Канонічне управління станом AI Engineering процесу.
>
> Цей документ визначає, який стан задачі повинен
> зберігатися та передаватися між AI агентами під час
> виконання інженерного циклу.
>
> Документ не описує реалізацію пам'яті конкретної LLM.

---

# Purpose

Define the engineering execution state shared between AI Engineering Agents.

The execution state ensures continuity, traceability and deterministic behaviour throughout the engineering lifecycle.

---

# Principles

> 🇺🇦 Передається лише стан задачі, а не вся історія діалогу.

Rules

- Every task has one execution state.
- Every agent reads the current state.
- Every agent updates only the fields it owns.
- State belongs to the task, not to the AI model.
- The state must remain internally consistent.

---

# Execution State

Each task maintains the following state.

## Task

- task identifier
- task description
- current objective

---

## Planning

- implementation plan
- identified risks
- dependencies
- assumptions
- approval status

---

## Repository

- affected modules
- affected files
- analysed components
- related services

---

## Implementation

- completed changes
- pending work
- unresolved issues

---

## Validation

- review status
- test status
- architecture status
- release status

---

# State Ownership

| Agent | Owns |
|--------|------|
| Project Manager | task lifecycle |
| Task Planning | planning |
| Implementation | implementation |
| Code Review | review |
| Bug Investigation | investigation |
| Refactoring | refactoring |
| Release Readiness | release validation |

No agent may overwrite another agent's responsibility.

---

# State Updates

> 🇺🇦 Агент змінює лише власну частину стану.

After every execution the agent must

- update its section;
- preserve all other sections;
- record completion status.

---

# State Validation

Before execution every agent verifies

- required state exists;
- previous stage completed;
- required approvals exist;
- execution order is valid.

If validation fails, execution must stop.

---

# Human Interaction

> 🇺🇦 Людина може змінити стан задачі лише явно.

Human may

- cancel task;
- approve task;
- reject task;
- change priority;
- redefine scope.

All changes become part of the current execution state.

---

# Result

> 🇺🇦 Стан задачі стає незалежним від конкретної LLM.

Every AI Engineering Agent works on the same engineering state, ensuring deterministic execution across different AI models.
