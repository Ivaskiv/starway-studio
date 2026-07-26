# Document

AI Context Loading

> 🇺🇦 Канонічний документ завантаження контексту для AI engineering агентів.

# Purpose

Defines the canonical context-loading strategy for AI Engineering Agents.

> 🇺🇦 Визначає, який контекст і в якому порядку мають читати AI engineering агенти.

# Scope

Covers context priority, context categories, loading order, optimization rules, cache invalidation, and validation before execution.

> 🇺🇦 Окреслює пріоритети, джерела, етапи та обмеження завантаження контексту.

# Audience

AI engineers, prompt architects, repository governors, reviewers, and multi-agent workflow designers.

> 🇺🇦 Документ для тих, хто проєктує або контролює поведінку AI engineering агентів.

# Dependencies

- `docs/reference/ai-engineer-roles.md`
- `docs/reference/ai-agent-routing.md`
- `docs/reference/ai-coding-constitution.md`
- `prompts/master-system-prompt.md`
- `prompts/task-planning-prompt.md`
- `prompts/implementation-prompt.md`
- `prompts/code-review-prompt.md`
- `prompts/bug-investigation-prompt.md`
- `prompts/refactoring-prompt.md`
- `prompts/release-readiness-prompt.md`

> 🇺🇦 Спирається на ролі агентів, routing, constitutions і prompt stack.

# Related Documents

- `docs/reference/platform-reference-architecture.md`
- `docs/engineering/01-repository-blueprint.md`
- `docs/reviews/architecture-audit-v1.md`

> 🇺🇦 Суміжні документи для navigation, repository discovery і canonical review.

---

# STEP 52 — AI Context Loading

> 🇺🇦 Канонічна стратегія завантаження контексту AI агентами.
>
> Цей документ визначає, **який контекст**, **коли** та **в якому порядку**
> повинен бути прочитаний перед виконанням будь-якої інженерної задачі.
>
> Мета — мінімізувати використання контекстного вікна без втрати якості.

---

# Purpose

Define how AI Engineering Agents load, prioritise and consume project context.

The objective is to provide every agent with exactly the information required to perform its responsibility.

No unnecessary documentation should be loaded.

---

# Principles

> 🇺🇦 Агент читає лише те, що необхідно.

Rules

- Load only relevant context.
- Prefer canonical documentation over repository inference.
- Never duplicate context already loaded.
- Repository state has priority over assumptions.
- Architecture documents always override implementation.

---

# Context Priority

> 🇺🇦 Порядок пріоритету джерел інформації.

Priority

1. Human Instructions
2. Canonical Documentation
3. AI Constitutions
4. Runtime Prompt
5. Repository Analysis
6. Existing Implementation
7. Tests
8. Logs
9. External References

---

# Context Categories

## 1. Canonical Documentation

> 🇺🇦 Канонічні документи.

Includes

- Business Architecture
- Product Architecture
- Domain Architecture
- AI Architecture
- Repository Architecture
- Engineering Standards
- Security
- Testing
- Deployment
- AI Constitutions

Always loaded when relevant.

---

## 2. Runtime Prompt

> 🇺🇦 Промпт поточного агента.

Each agent loads only its own runtime prompt.

Examples

Task Planning

↓

STEP 44

Implementation

↓

STEP 45

Review

↓

STEP 46

---

## 3. Repository Context

> 🇺🇦 Лише необхідні частини репозиторію.

Includes

- affected modules
- related services
- shared libraries
- interfaces
- configuration
- dependencies

Entire repository must never be loaded unnecessarily.

---

## 4. Existing Implementation

> 🇺🇦 Перед змінами AI повинен знайти вже існуючу реалізацію.

Search for

- existing feature
- similar implementation
- reusable components
- duplicated logic

Implementation begins only after repository discovery.

---

## 5. Tests

> 🇺🇦 Завантажуються лише пов'язані тести.

Includes

- unit tests
- integration tests
- e2e tests
- snapshots

Only tests related to the current task.

---

## 6. Logs

> 🇺🇦 Для аналізу дефектів.

Loaded only when

- debugging
- production incidents
- runtime failures

---

# Agent Context Matrix

| Agent | Required Context |
|--------|------------------|
| Project Manager | Human Request + STEP 50–52 |
| Task Planning | Canonical Docs + STEP 44 |
| Implementation | STEP 45 + Repository + Related Docs |
| Code Review | STEP 46 + Changed Files + Tests |
| Bug Investigation | STEP 47 + Logs + Repository |
| Refactoring | STEP 48 + Repository |
| Release Readiness | STEP 49 + Tests + Deployment |

---

# Loading Strategy

> 🇺🇦 Контекст завантажується поступово.

Stage 1

Human Request

↓

Stage 2

Relevant Canonical Documents

↓

Stage 3

Runtime Prompt

↓

Stage 4

Repository Discovery

↓

Stage 5

Related Files

↓

Stage 6

Implementation

---

# Context Optimisation Rules

> 🇺🇦 Правила економії контексту.

Always

- load minimum required files;
- reuse previous analysis;
- avoid duplicate reads;
- avoid unrelated modules;
- avoid full repository scans.

Never

- reload identical context;
- analyse unrelated packages;
- load complete documentation without reason;
- load entire repository.

---

# Context Cache

> 🇺🇦 Агент може повторно використовувати вже проаналізований контекст.

Reusable

- repository map
- dependency graph
- architecture references
- execution plan

Invalidate cache when

- repository changes;
- task changes;
- branch changes;
- architecture changes.

---

# Validation

Before execution every agent verifies

- required documents loaded;
- runtime prompt loaded;
- repository analysed;
- dependencies identified;
- context completeness confirmed.

Execution must not start until validation succeeds.

---

# Result

> 🇺🇦 STEP 52 визначає не лише що читати, а й чого **не читати**.

The AI Engineering System loads the minimum required context while preserving architectural correctness, deterministic execution and efficient context utilisation.
