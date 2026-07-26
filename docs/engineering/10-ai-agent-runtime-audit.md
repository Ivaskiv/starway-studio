# Document

AI Agent Runtime Audit

Status: Canonical
Version: 1.0.0
Owner: Engineering
Last Updated: 2026-07-25
Supersedes:

# Purpose

Define the canonical audit standard for building an evidence-driven runtime passport of one AI agent.

> 🇺🇦 Фіксує єдиний канонічний шаблон аудиту одного AI-агента без зміни коду чи архітектури.

# Scope

Covers read-only runtime audits for one concrete AI agent across identity, entrypoints, execution, state, contracts, authority, dependencies, resume behavior, failure modes, and canonical compliance.

> 🇺🇦 Охоплює лише аудит агента. Не охоплює реалізацію виправлень, рефакторинг чи редизайн.

# Audience

AI engineers, backend engineers, architects, reviewers, and runtime owners.

> 🇺🇦 Документ призначений для тих, хто аналізує, порівнює й нормалізує AI-агентів.

# Dependencies

- `docs/engineering/ENGINEERING-CONSTITUTION.md`
- `docs/engineering/03-ai-agent-blueprint.md`
- `docs/runtime/runtime-overview.md`
- `docs/architecture/05-ai-capability-model.md`
- `docs/architecture/06-ai-interaction-model.md`
- `docs/architecture/07-ai-memory-model.md`
- `docs/architecture/08-ai-decision-model.md`
- `docs/architecture/09-ai-governance-model.md`

> 🇺🇦 Аудит спирається на канонічні документи про агентів, runtime і governance.

# Related Documents

- `docs/audit/README.md`
- `docs/runtime/agent-runner.md`
- `docs/runtime/context-loader.md`
- `docs/reference/ai-state-management.md`

> 🇺🇦 Суміжні документи описують runtime-компоненти та місце збереження audit outputs.

---

## Audit Mode

The canonical `AI-AGENT-RUNTIME-AUDIT` must run in read-only mode.

Audit rules:

1. Do not modify code.
2. Do not optimize.
3. Do not refactor.
4. Do not redesign.
5. Do not implement fixes.
6. Every conclusion must be evidence-driven.

The objective is to build the canonical engineering passport of one AI agent using runtime evidence only.

## Non-Goals

This audit does not:

- redesign architecture;
- propose refactoring;
- optimize performance;
- fix bugs;
- change business logic;
- change contracts.

## Target

Every audit must name exactly one concrete target agent.

Required target fields:

- Agent Name
- Owning Runtime or Module
- Audit Date
- Repository Revision or Branch Reference

If the target agent is ambiguous, stop and clarify before auditing.

## Verdicts

Every audit must end with exactly one verdict:

- `CANONICAL_RUNTIME`
- `RUNTIME_FRAGMENTED`
- `ARCHITECTURE_VIOLATION`

The verdict must be supported by evidence gathered during the audit.

Verdict rules:

- `CANONICAL_RUNTIME`: all key runtime properties are verified and no critical fragmentation is confirmed.
- `RUNTIME_FRAGMENTED`: duplicated runtime ownership, duplicated state ownership, or multiple runtime paths are confirmed, but the architecture still performs the business capability.
- `ARCHITECTURE_VIOLATION`: a canonical execution path is absent or a confirmed architectural invariant is violated.

## Required Output Sections

Every canonical agent runtime audit must answer the following sections in order.

### 1. Identity

Required fields:

- Name
- Purpose
- Business Capability
- Owner
- Version
- Scope
- Out of Scope

### 2. Business Responsibility

Required fields:

- Owned business capability
- Responsibilities that must never be handled by this agent

### 3. Entry Points

List every confirmed entry point, including when applicable:

- Telegram
- Mini App
- Website
- REST API
- Internal API
- Webhook
- Scheduler
- Worker
- Queue
- Cron
- Internal Events
- CLI

### 4. Input Contract

For every confirmed entry point document:

- Input payload
- Context
- Authentication
- Authorization
- Preconditions
- Expected state

### 5. Runtime Execution Graph

Trace the complete execution path:

- Controller
- Services
- Repositories
- AI Providers
- External APIs
- Database
- Workers
- Events
- Output

Also identify:

- Critical Path
- Blocking Operations
- Sequential Operations
- Parallel Operations

### 6. State Ownership

For every relevant state document:

- State
- Owner
- Read
- Write
- Derive
- Cache
- Persist
- Lifecycle
- Duplicate Owners

Evidence is required for every state claim.

### 7. Business Contracts

Document:

- Input Contract
- Output Contract
- State Contract
- Failure Contract
- Business Invariants

### 8. Authority Map

For every business entity document:

- Owner
- Allowed READ
- Allowed WRITE
- Allowed DERIVE
- Forbidden WRITE
- Forbidden State Mutation

Evidence is required for every authority claim.

### 9. Dependencies

Audit confirmed dependencies, including when applicable:

- Database
- Redis
- Telegram
- Mini App
- Website
- OpenAI
- Claude
- Workers
- Scheduler
- Payments
- Zoom
- Storage
- Other AI Agents

### 10. Side Effects

List everything the agent changes, including when applicable:

- Database rows
- Messages
- Subscriptions
- Progress
- Lifecycle
- Analytics
- Notifications
- Logs
- Session or Journey State

### 11. Events

Document:

- Published events
- Consumed events
- Ignored events

### 12. Resume and Cross-Channel Continuation

Determine and document:

- how the agent defines the resume point;
- how interruptions are handled;
- how context is restored;
- how another channel continues execution;
- which resume targets are used;
- whether any channel reconstructs state locally instead of consuming canonical runtime state.

This section is mandatory for every user-facing or multi-channel agent.

### 13. Performance Profile

Document the measured or confirmed runtime profile:

- DB calls
- HTTP calls
- AI calls
- Cache usage
- Cold start behavior
- Blocking operations
- Sequential vs parallel execution
- Critical path
- Latency budget

### 14. Failure Modes

For every major stage document:

- possible failures;
- retries;
- rollback;
- degradation path;
- recovery path.

### 15. Security and Permissions

Document:

- required permissions;
- access checks performed;
- behavior when permissions are missing.

### 16. Canonical Compliance

Evaluate the agent using only the following statuses:

- Canonical Runtime: `Compliant` / `Partial` / `No`
- Single Source of Truth: `Compliant` / `Partial` / `No`
- Business Ownership: `Clear` / `Partial` / `Mixed`
- Cross-Channel Continuation: `Compliant` / `Partial` / `No`
- State Duplication: `None` / `Low` / `High`
- Runtime Fragmentation: `None` / `Present`
- Resume Compliance: `Compliant` / `Partial` / `No`

Do not use arbitrary numeric scores.

### 17. Architectural Risks

List only confirmed risks with evidence.

Every risk must include:

- Risk
- Impact
- Evidence
- Why it violates or threatens canonical architecture

### 18. Minimal Architectural Corrections

Recommend only the minimal architectural corrections implied by the evidence.

Correction rules:

1. Do not implement fixes inside the audit.
2. Do not propose speculative redesign.
3. Do not introduce a parallel state model.
4. Prefer convergence toward the existing canonical owner.

### 19. Assumptions

List every assumption that could not be verified.

If none:

- `NONE`

### 20. Open Questions

List unresolved questions.

Rules:

1. Do not answer them inside the audit.
2. Do not speculate.

### 21. Executive Summary

Summarize:

- the agent purpose;
- major strengths;
- major problems;
- next recommended audit or correction step.

## Evidence Standard

Every material conclusion in sections 5, 6, 8, 12, 13, 14, and 17 must cite evidence.

Evidence levels:

- `L1 — Source Code`
- `L2 — Runtime Trace`
- `L3 — Automated Test`
- `L4 — Production Observation`
- `L5 — Manual QA`

Allowed evidence forms:

- file path
- function or class
- contract or DTO
- query or repository call
- runtime trace
- log evidence
- observed platform behavior

Every material conclusion should state the highest verified evidence level available.

If evidence is missing, mark the statement as unverified instead of presenting it as fact.

## System Relationship

`AI-AGENT-RUNTIME-AUDIT` is the canonical passport for one agent.

It should be used before any future system-level runtime audit that compares multiple agents, ownership boundaries, or cross-agent duplication.

## Result

The repository gains one canonical, repeatable, evidence-driven audit standard for understanding, comparing, and governing AI agents without introducing speculative fixes or parallel architecture.

> 🇺🇦 Після цього документа кожен агент можна аудіювати за одним шаблоном і порівнювати без субʼєктивних критеріїв.
