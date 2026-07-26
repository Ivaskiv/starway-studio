# Document

Agent Runner

# Purpose

Define the canonical runtime component that executes one AI Engineering Agent safely and consistently within the active task lifecycle.

> 🇺🇦 Описує компонент, який запускає окремого AI agent у межах уже визначеного runtime flow.

# Responsibilities

- load the correct runtime prompt for the active agent;
- receive validated context from the Context Loader;
- receive repository evidence from the Repository Analyzer where required;
- execute one bounded agent run;
- validate that the output matches the agent’s role and artifact expectations;
- hand the result to the Artifact Engine and execution state.

> 🇺🇦 Agent Runner запускає агента, але не вирішує маршрутизацію за нього.

# Inputs

- active agent role;
- runtime prompt identifier;
- approved execution state;
- scoped canonical context;
- scoped repository evidence;
- prior artifacts required for the current step;
- approval status where relevant.

> 🇺🇦 На вхід отримує роль, prompt, контекст, стан і потрібні артефакти.

# Outputs

- one agent execution result;
- one owned engineering artifact;
- validation status of the produced output;
- updated section of shared execution state;
- escalation or failure signal if execution is invalid.

> 🇺🇦 На виході має бути один валідований результат і один артефакт, прив’язаний до ролі.

# Lifecycle

1. Receive the active agent instruction from the Runtime Orchestrator.
2. Resolve the agent’s runtime prompt through the Prompt Registry.
3. Load required context through the Context Loader.
4. Load repository evidence through the Repository Analyzer if needed.
5. Validate prerequisites against the shared execution state.
6. Execute the bounded agent run.
7. Validate the output against artifact and role rules.
8. Send the artifact to the Artifact Engine.
9. Update the owned task-state section and return control to the Runtime Orchestrator.

> 🇺🇦 Життєвий цикл Agent Runner гарантує, що жоден агент не стартує “з порожніми руками”.

# Rules

- each execution run must correspond to exactly one active agent role;
- an agent may use only its own runtime prompt;
- an agent may consume only the context categories canonically allowed for that role;
- output must match the expected artifact type for the role;
- no repository modification may occur from a non-writing role;
- no approval-bound action may execute without a valid approval state;
- the runner must not blend multiple agent roles into one execution.

> 🇺🇦 Runner утримує чистоту ролей і не допускає змішування planning/review/implementation у одному run.

# Failure Handling

- if the runtime prompt cannot be resolved, stop before execution;
- if required context is incomplete, request context expansion or block execution;
- if state prerequisites are missing, fail validation and return control to the orchestrator;
- if the agent output violates the expected artifact shape or role boundary, reject the run;
- if repository evidence and prompt assumptions conflict, surface the mismatch and stop;
- if execution is interrupted by human action, preserve state and exit cleanly.

> 🇺🇦 Помилки runner мають завершуватися контрольовано, а не “успішним” шумом у наступний етап.

# Security Considerations

- must enforce role-based prompt isolation;
- must prevent an agent from reading or writing beyond allowed scope;
- must not pass broader context than the role requires;
- must preserve approval constraints on high-risk execution;
- must keep execution attributable to one agent role and one task state;
- must prevent unauthorized repository mutation from non-implementation roles.

> 🇺🇦 Security runner-а — це насамперед принцип least-context і least-authority для кожного agent run.

# Dependencies

- `docs/reference/ai-engineer-roles.md`
- `docs/reference/ai-context-loading.md`
- `docs/reference/ai-state-management.md`
- `docs/reference/ai-collaboration-protocol.md`
- `docs/runtime/prompt-registry.md`
- `docs/runtime/context-loader.md`
- `docs/runtime/repository-analyzer.md`
- `docs/runtime/artifact-engine.md`

> 🇺🇦 Залежить від prompt/context/repository/artifact components і canonical role rules.

# Related Documents

- `docs/runtime/runtime-orchestrator.md`
- `docs/runtime/prompt-registry.md`
- `docs/runtime/context-loader.md`
- `docs/runtime/artifact-engine.md`

> 🇺🇦 Суміжні runtime-компоненти для повного agent execution path.

# Result

The Agent Runner becomes the canonical execution shell that runs each AI Engineering Agent with the correct prompt, context, validation, and artifact discipline.

> 🇺🇦 Після цього документа agent execution має чіткий, повторюваний і безпечний runtime shell.
