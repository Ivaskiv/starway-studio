# Document

Repository Analyzer

# Purpose

Define the canonical runtime component that discovers repository structure, implementation ownership, dependencies, and affected surfaces for engineering tasks.

> 🇺🇦 Описує компонент, який перетворює репозиторій на runtime-видиму карту модулів, залежностей і реального ownership.

# Responsibilities

- implement repository discovery as required by STEP 44, 45, 46, 47, and 48;
- identify affected files, modules, packages, services, and prompts;
- reconstruct dependency and call relationships relevant to the active task;
- classify discovered implementation paths as canonical, active, duplicate, legacy, or dead where applicable;
- support architecture and impact analysis for the active agent.

> 🇺🇦 Analyzer відповідає за “repository reality”, без якої agent не має права діяти впевнено.

# Inputs

- active task scope;
- active agent role;
- canonical owner documents;
- prior repository map or cached analysis;
- explicit requests for dependency, impact, or implementation evidence.

> 🇺🇦 На вхід отримує scope, роль і питання, на які треба відповісти по репозиторію.

# Outputs

- repository map scoped to the task;
- affected files and modules;
- dependency graph or boundary map;
- ownership classification of the active implementation path;
- architecture-impact hints for the current runtime step.

> 🇺🇦 На виході дає реальні файли та залежності, а не здогадки про структуру системи.

# Lifecycle

1. Receive scoped analysis request from the Context Loader, Agent Runner, or Runtime Orchestrator.
2. Discover relevant repository surfaces.
3. Resolve ownership boundaries using canonical repository and module rules.
4. Trace dependencies and implementation relationships.
5. Classify the active path.
6. Return analyzed repository evidence for the active step.

> 🇺🇦 Analyzer працює як on-demand discovery engine, а не як повний безконтрольний scan усього repo.

# Rules

- analyze only the scope relevant to the task;
- identify real runtime owners before change or review;
- do not assume the first matching file is canonical;
- preserve repository blueprint and module-boundary semantics in analysis output;
- prefer bounded dependency graphs over full-repo scans;
- keep architecture-impact analysis tied to the active task and role.

> 🇺🇦 Основне правило — дати достатньо evidence, але не потонути в шумі всього monorepo.

# Failure Handling

- if the repository path cannot be resolved to a canonical owner, escalate the ambiguity;
- if multiple active paths appear to own the same behavior, surface a duplication conflict;
- if analysis depends on stale cache, force refresh;
- if runtime ownership and canonical ownership conflict, flag architecture drift rather than hiding it;
- if discovery cannot be completed safely within scope, block downstream execution.

> 🇺🇦 Невизначений ownership — це причина зупинити flow, а не просто “вибрати щось схоже”.

# Security Considerations

- must respect least-context principles when exposing repository evidence;
- must not broaden file access beyond the active task boundary unnecessarily;
- must preserve separation between canonical documentation and implementation evidence;
- must keep repository classification and analysis traceable;
- must not leak unrelated sensitive repository details into downstream prompts.

> 🇺🇦 Analyzer теж підпадає під least-privilege, навіть якщо працює лише з кодовою базою.

# Dependencies

- `docs/engineering/01-repository-blueprint.md`
- `docs/engineering/02-module-blueprint.md`
- `docs/reference/ai-context-loading.md`
- `docs/reference/ai-coding-constitution.md`
- `docs/runtime/context-loader.md`
- `docs/runtime/agent-runner.md`

> 🇺🇦 Спирається на canonical repository/module rules і взаємодіє з loader/runner.

# Related Documents

- `docs/runtime/context-loader.md`
- `docs/runtime/runtime-orchestrator.md`
- `docs/runtime/artifact-engine.md`

> 🇺🇦 Суміжні runtime-компоненти, які споживають repository analysis.

# Result

The Repository Analyzer becomes the canonical runtime source for repository discovery, dependency analysis, and implementation-boundary evidence.

> 🇺🇦 Після цього документа repository analysis стає окремою системною функцією runtime.
