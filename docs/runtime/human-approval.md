# Document

Human Approval

# Purpose

Define the canonical runtime component that manages approval checkpoints, interruption, rejection, restart, and escalation within the AI Engineering Runtime.

> 🇺🇦 Описує компонент, який відповідає за human-in-the-loop контроль у runtime.

# Responsibilities

- implement approval checkpoints required by canonical risk rules;
- pause runtime execution when approval is required;
- record approval, rejection, cancellation, reprioritization, or scope redefinition;
- resume or reroute execution after a human decision;
- preserve traceability of all human interventions.

> 🇺🇦 Human Approval не замінює оркестратор, а вводить контрольований людський gate у потрібних точках.

# Inputs

- active task state;
- risk classification;
- approval requirement from planning, implementation, refactoring, or release stages;
- artifact submitted for approval;
- human decision or interruption signal.

> 🇺🇦 На вхід отримує стан, ризик, артефакт і реальне людське рішення.

# Outputs

- approval granted state;
- approval rejected state;
- task cancelled state;
- reprioritized or rescoped task state;
- escalation outcome;
- resume authorization for the Runtime Orchestrator.

> 🇺🇦 На виході дає формальний статус, який визначає чи може runtime рухатися далі.

# Lifecycle

1. Receive approval request from the Runtime Orchestrator.
2. Validate that an approval checkpoint is actually required.
3. Present the current task state and relevant artifact for decision.
4. Record the human decision.
5. Update shared execution state.
6. Return resume, reroute, or stop instruction to the Runtime Orchestrator.

> 🇺🇦 Життєвий цикл цього компонента зводить усі людські втручання до явних runtime-подій.

# Rules

- approval checkpoints must be explicit, never implicit;
- high-risk or approval-bound actions must not continue without a positive approval state;
- human rejection overrides AI progression;
- human interruption may happen at any stage and must be recorded in task state;
- resumptions must continue through canonical routing, not through ad hoc shortcuts;
- approval decisions must remain attached to the relevant task, artifact, and lifecycle moment.

> 🇺🇦 Правила гарантують, що human approval не губиться між агентами і не перетворюється на неявну домовленість.

# Failure Handling

- if approval is required but no decision is available, keep execution paused;
- if approval metadata is inconsistent with task state, block resumption;
- if human scope change invalidates the current plan, route back to Task Planning;
- if rejection occurs after implementation, route back through the canonical corrective path;
- if approval records are missing for a critical step, treat execution as not authorized.

> 🇺🇦 Будь-яка невизначеність у human approval означає stop, а не “напевно можна далі”.

# Security Considerations

- must preserve the highest authority of human intervention;
- must ensure approval checkpoints cannot be bypassed by AI roles;
- must keep approval decisions auditable and attributable;
- must prevent unauthorized state changes that impersonate human approval;
- must preserve least-authority rules for the information shown at approval checkpoints.

> 🇺🇦 Security тут базується на незаперечності людського рішення і неможливості його підмінити.

# Dependencies

- `docs/reference/ai-agent-routing.md`
- `docs/reference/ai-state-management.md`
- `docs/reference/ai-coding-constitution.md`
- `docs/runtime/runtime-orchestrator.md`
- `docs/runtime/artifact-engine.md`

> 🇺🇦 Залежить від routing/state/constitution canon і інтегрується з orchestrator та artifact engine.

# Related Documents

- `docs/runtime/runtime-overview.md`
- `docs/runtime/runtime-orchestrator.md`
- `docs/runtime/artifact-engine.md`

> 🇺🇦 Суміжні runtime-компоненти для approval-aware execution.

# Result

The Human Approval component becomes the canonical runtime gate that enforces human authority over risk, scope, release, and interruption boundaries.

> 🇺🇦 Після цього документа людське втручання стає формалізованою частиною runtime, а не зовнішнім винятком.
