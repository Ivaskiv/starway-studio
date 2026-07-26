# Document

Runtime Orchestrator

# Purpose

Define the canonical runtime component that coordinates the complete AI Engineering lifecycle from initial request through final readiness verdict.

> 🇺🇦 Описує оркестратор, який керує всім runtime-процесом від старту задачі до фінального завершення.

# Responsibilities

- own end-to-end engineering task orchestration;
- initialize and maintain the task execution lifecycle;
- apply routing rules from STEP 51;
- coordinate handoffs between agents;
- invoke Human Approval at required checkpoints;
- stop or resume execution based on validation, risk, and approval state;
- ensure artifact and state continuity across the lifecycle.

> 🇺🇦 Оркестратор керує послідовністю дій, але не підміняє агентів або їх власні ролі.

# Inputs

- human request and priority signals;
- routing rules;
- current shared execution state;
- canonical prompt and agent registry references;
- artifact availability and validation status;
- approval outcomes;
- release-readiness results.

> 🇺🇦 На вхід отримує задачу, стан, правила маршрутизації та результати від інших runtime-компонентів.

# Outputs

- ordered agent execution steps;
- runtime routing decisions;
- pause/resume signals;
- approval checkpoint requests;
- escalation signals;
- task completion or blocked-state outcomes.

> 🇺🇦 На виході оркестратор дає чітке next-step рішення для всього інженерного процесу.

# Lifecycle

1. Accept a human-originated engineering task.
2. Create or reopen the task execution state.
3. Determine the first valid agent according to routing rules.
4. Request context loading and repository analysis.
5. Trigger agent execution through the Agent Runner.
6. Wait for artifact validation and state updates.
7. Route to the next allowed agent.
8. Insert approval or interruption points where required.
9. Continue until Release Readiness yields a final verdict or the human stops execution.

> 🇺🇦 Життєвий цикл оркестратора віддзеркалює canonical route і не допускає “стрибків” між ролями.

# Rules

- every task must start from routing;
- no agent may execute outside allowed transitions;
- no implementation path may start before planning and approvals are valid;
- no handoff may happen before the current artifact is complete and validated;
- no final completion may occur before release-readiness or human interruption resolves the task;
- routing must remain sequential unless the canonical routing rules explicitly permit divergence;
- orchestration must not invent new agents, states, or workflow branches.

> 🇺🇦 Оркестратор лише застосовує канонічні правила, а не створює нові сценарії виконання.

# Failure Handling

- if required context fails to load, pause before execution;
- if routing validation fails, block the task and surface the invalid transition;
- if an agent returns an incomplete artifact, route back to the same ownership boundary instead of moving forward;
- if approval is rejected, return control to the Project Manager path;
- if shared state is inconsistent, stop execution until state is reconciled;
- if release-readiness returns NOT READY, route back through the appropriate corrective path rather than forcing completion.

> 🇺🇦 Failure handling побудований на stop/resume discipline, а не на прихованому continue.

# Security Considerations

- must enforce role separation strictly;
- must prevent unauthorized agent execution paths;
- must preserve approval checkpoints for high-risk actions;
- must not allow runtime shortcuts around security, data, or review gates;
- must maintain traceability for every routing decision;
- must ensure no agent receives broader authority through orchestration than canon permits.

> 🇺🇦 Головна security-функція оркестратора — не дати агентам вийти за межі ролей і approvals.

# Dependencies

- `docs/reference/ai-agent-routing.md`
- `docs/reference/ai-state-management.md`
- `docs/reference/ai-collaboration-protocol.md`
- `docs/reference/ai-engineer-roles.md`
- `docs/runtime/agent-runner.md`
- `docs/runtime/context-loader.md`
- `docs/runtime/repository-analyzer.md`
- `docs/runtime/artifact-engine.md`
- `docs/runtime/human-approval.md`

> 🇺🇦 Залежить від routing/state/collaboration canon і всіх основних runtime-компонентів.

# Related Documents

- `docs/runtime/runtime-overview.md`
- `docs/runtime/agent-runner.md`
- `docs/runtime/artifact-engine.md`
- `docs/runtime/human-approval.md`

> 🇺🇦 Найближчі суміжні документи для реальної orchestration-реалізації.

# Result

The Runtime Orchestrator becomes the canonical coordination core that guarantees deterministic engineering execution across all AI Engineering Agents.

> 🇺🇦 Після цього документа оркестратор має чітку межу: керувати процесом, але не замінювати самі ролі.
