# Document

Context Loader

# Purpose

Define the canonical runtime component that implements STEP 52 by loading only the minimum required context for the active AI Engineering Agent.

> 🇺🇦 Описує компонент, який реалізує canonical context-loading strategy і не перевантажує агента зайвим контекстом.

# Responsibilities

- load relevant canonical documentation;
- load the active runtime prompt context;
- load scoped repository context through controlled collaboration with the Repository Analyzer;
- support incremental context expansion when necessary;
- prevent unnecessary full-repository or full-documentation loading;
- validate context completeness before agent execution.

> 🇺🇦 Loader відповідає не лише за завантаження, а й за економію контекстного вікна.

# Inputs

- active agent role;
- active task state;
- routing stage;
- canonical context priority rules;
- approved scope and risk classification;
- repository-analysis requests;
- artifact references needed for the current step.

> 🇺🇦 На вхід отримує роль, стан, scope і правила пріоритету контексту.

# Outputs

- role-scoped canonical document set;
- role-scoped repository context set;
- context completeness status;
- cache re-use or invalidation decision;
- escalation if required context cannot be assembled safely.

> 🇺🇦 На виході має бути не “все підряд”, а рівно достатній контекст для поточної ролі.

# Lifecycle

1. Receive the active role and task stage.
2. Determine required context categories from STEP 52.
3. Load relevant canonical documentation by priority.
4. Load the active runtime prompt context.
5. Request repository-specific evidence from the Repository Analyzer when needed.
6. Reuse valid cached context where allowed.
7. Validate completeness, freshness, and non-duplication.
8. Return the final execution context to the Agent Runner.

> 🇺🇦 Життєвий цикл loader-а побудований навколо minimum viable context, а не around maximum recall.

# Rules

- load only relevant context;
- prefer canonical documentation over repository inference;
- avoid duplicate reads;
- avoid unrelated modules and packages;
- do not load the full repository unless canonically justified;
- invalidate cached context when task, branch, repository state, or architecture changes;
- preserve the context priority order defined in STEP 52.

> 🇺🇦 Це пряме runtime-втілення STEP 52 без зміни його змісту.

# Failure Handling

- if required canonical documents are missing, stop context assembly;
- if repository context cannot be matched to the requested scope, surface the mismatch;
- if cache is stale for a high-risk task, force refresh rather than reuse;
- if context remains incomplete after incremental loading, block execution;
- if context volume exceeds safe bounds, return a scoped-reduction requirement instead of overloading the agent.

> 🇺🇦 Loader має краще сказати “контекст неповний”, ніж передати агенту шум або застарілі дані.

# Security Considerations

- must not expose broader repository or business context than the role requires;
- must respect trust, data, and AI authority boundaries during context selection;
- must prevent hidden escalation through over-broad context injection;
- must ensure sensitive artifacts are loaded only when canonically allowed;
- must keep context-loading decisions traceable for audit and review.

> 🇺🇦 Security тут базується на принципі least-context як формі least-privilege.

# Dependencies

- `docs/reference/ai-context-loading.md`
- `docs/reference/ai-state-management.md`
- `docs/reference/ai-coding-constitution.md`
- `docs/engineering/01-repository-blueprint.md`
- `docs/runtime/repository-analyzer.md`
- `docs/runtime/prompt-registry.md`
- `docs/runtime/agent-runner.md`

> 🇺🇦 Залежить від canonical context rules і repository/runtime support components.

# Related Documents

- `docs/runtime/runtime-orchestrator.md`
- `docs/runtime/agent-runner.md`
- `docs/runtime/repository-analyzer.md`

> 🇺🇦 Суміжні runtime-компоненти для context assembly і execution start.

# Result

The Context Loader becomes the canonical runtime mechanism that gives each agent exactly the context it needs and nothing more.

> 🇺🇦 Після цього документа context loading стає керованим, інкрементальним і економним.
