# Document

AI Collaboration Protocol

> 🇺🇦 Канонічний документ взаємодії AI engineering агентів.

# Purpose

Defines the canonical collaboration rules between AI Engineering Agents.

> 🇺🇦 Визначає правила співпраці між AI engineering агентами.

# Scope

Covers agent interaction rules, engineering artifacts, handoff format, conflict resolution, stop conditions, communication rules, and completion criteria.

> 🇺🇦 Окреслює артефакти, handoff, конфлікти, stop conditions і правила взаємодії.

# Audience

AI engineers, prompt architects, project managers, reviewers, release owners, and repository governors.

> 🇺🇦 Документ для всіх, хто проєктує або контролює multi-agent engineering process.

# Dependencies

- `docs/reference/ai-engineer-roles.md`
- `docs/reference/ai-agent-routing.md`
- `docs/reference/ai-context-loading.md`
- `docs/reference/ai-state-management.md`
- `docs/reference/ai-coding-constitution.md`
- `prompts/master-system-prompt.md`
- `prompts/task-planning-prompt.md`
- `prompts/implementation-prompt.md`
- `prompts/code-review-prompt.md`
- `prompts/bug-investigation-prompt.md`
- `prompts/refactoring-prompt.md`
- `prompts/release-readiness-prompt.md`

> 🇺🇦 Спирається на ролі, routing, context/state management, constitutions і prompt stack.

# Related Documents

- `docs/reference/platform-reference-architecture.md`
- `docs/reviews/architecture-audit-v1.md`
- `docs/engineering/07-testing-blueprint.md`
- `docs/engineering/09-deployment-blueprint.md`

> 🇺🇦 Суміжні документи для загальної архітектури, validation і release safety.

---

# STEP 54 — AI Collaboration Protocol

> 🇺🇦 Канонічний протокол взаємодії AI Engineering агентів.
>
> Цей документ визначає правила співпраці між агентами,
> формат передачі результатів, відповідальність за артефакти
> та порядок вирішення конфліктів.
>
> Жоден агент не працює ізольовано.
> Усі агенти є частиною єдиного інженерного процесу.

---

# Purpose

Define the collaboration rules between AI Engineering Agents.

The protocol guarantees deterministic communication, consistent engineering decisions and traceable execution across the entire engineering lifecycle.

---

# Principles

> 🇺🇦 Агенти взаємодіють лише через визначені артефакти.

Every interaction must be

- deterministic;
- reproducible;
- traceable;
- auditable;
- architecture-compliant.

Agents must never rely on implicit assumptions or hidden context.

---

# Collaboration Rules

## Rule 1

> 🇺🇦 Один агент = один результат.

Each agent produces one well-defined engineering artifact.

---

## Rule 2

> 🇺🇦 Агент не змінює артефакти інших агентів.

Agents may only create or extend artifacts they own.

Corrections must be returned through the routing process.

---

## Rule 3

> 🇺🇦 Передача задачі виконується лише після завершення власного етапу.

Incomplete work must never be handed over.

---

## Rule 4

> 🇺🇦 Кожен артефакт повинен бути перевіряємим.

Every artifact must contain sufficient information for the next agent to continue without redoing previous work.

---

# Engineering Artifacts

## Planning Artifact

Owner

Task Planning Agent

Contains

- task understanding
- scope
- dependencies
- risks
- implementation strategy

---

## Implementation Artifact

Owner

Implementation Agent

Contains

- completed work
- modified components
- architectural decisions
- remaining limitations

---

## Review Artifact

Owner

Code Review Agent

Contains

- findings
- violations
- recommendations
- approval status

---

## Investigation Artifact

Owner

Bug Investigation Agent

Contains

- observed behaviour
- root cause
- affected components
- recommended fix

---

## Refactoring Artifact

Owner

Refactoring Agent

Contains

- performed improvements
- preserved behaviour
- maintainability impact

---

## Release Artifact

Owner

Release Readiness Agent

Contains

- release status
- validation summary
- remaining risks
- production recommendation

---

# Standard Handoff

> 🇺🇦 Передача між агентами повинна бути стандартизована.

Each handoff must include

- current task
- execution status
- completed work
- remaining work
- referenced artifacts
- blocking issues
- required next action

---

# Conflict Resolution

> 🇺🇦 Конфлікти вирішуються через визначений процес.

If two agents disagree

↓

Code Review findings take precedence over Implementation.

↓

Bug Investigation findings take precedence over assumptions.

↓

Release Readiness may block deployment.

↓

Human has final authority.

---

# Planning Changes

> 🇺🇦 План може змінюватися лише контрольовано.

The implementation plan may be modified only by

- Human
- Project Manager
- Task Planning Agent

Implementation Agent must not redefine project scope independently.

---

# Stop Conditions

> 🇺🇦 Виконання повинно бути негайно зупинене якщо

- architecture violation detected;
- missing requirements;
- conflicting business rules;
- missing approval;
- repository inconsistency;
- critical production risk.

Execution resumes only after the issue is resolved.

---

# Communication Rules

Agents must communicate only through

- approved artifacts;
- validated execution state;
- canonical documentation;
- routing protocol.

Agents must never communicate through undocumented assumptions.

---

# Traceability

Every engineering decision must be traceable to

- Human request;
- Canonical Documentation;
- Runtime Prompt;
- Repository evidence;
- Produced artifact.

---

# Ownership

| Artifact | Owner |
|----------|-------|
| Planning | Task Planning Agent |
| Implementation | Implementation Agent |
| Review | Code Review Agent |
| Investigation | Bug Investigation Agent |
| Refactoring | Refactoring Agent |
| Release | Release Readiness Agent |

Ownership cannot be transferred during execution.

---

# Completion Criteria

A task is considered complete only when

- implementation finished;
- review completed;
- identified issues resolved;
- release validation passed;
- human approval received (when required).

---

# Result

> 🇺🇦 STEP 50 визначає **хто працює**.
>
> STEP 51 визначає **у якому порядку працює**.
>
> STEP 52 визначає **який контекст читає**.
>
> STEP 53 визначає **який стан задачі передає**.
>
> STEP 54 визначає **як агенти співпрацюють між собою**.

Together, STEP 50–54 define the complete operational model of the AI Engineering Team, independent of any specific AI model or implementation.
