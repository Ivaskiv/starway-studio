# Document

Prompt Registry

# Purpose

Define the canonical runtime component that stores, resolves, versions, and loads runtime prompts for AI Engineering Agents.

> 🇺🇦 Описує реєстр prompt-ів, який відповідає за їх пошук, сумісність і завантаження в runtime.

# Responsibilities

- provide canonical storage references for runtime prompts;
- resolve the correct prompt for each agent role;
- preserve prompt version and ownership integrity;
- support compatibility checks between roles and prompts;
- ensure prompt loading follows canonical runtime rules rather than local ad hoc selection.

> 🇺🇦 Registry гарантує, що агент завжди запускається з правильним canonical prompt.

# Inputs

- active agent role;
- requested runtime action;
- canonical prompt ownership mapping;
- prompt version metadata;
- compatibility constraints from canonical architecture and constitutions.

> 🇺🇦 На вхід отримує роль, тип дії та canonical mapping між ролями і prompt-ами.

# Outputs

- resolved prompt reference;
- prompt version identity;
- compatibility status;
- prompt loading failure or conflict signal when applicable.

> 🇺🇦 На виході має бути точний prompt, а не приблизний “найближчий” текст.

# Lifecycle

1. Receive prompt lookup request from the Agent Runner.
2. Resolve the owning prompt for the active role.
3. Validate prompt compatibility with the active runtime stage.
4. Return the prompt reference and version metadata.
5. Surface conflicts, absence, or deprecation if the request cannot be satisfied safely.

> 🇺🇦 Реєстр працює як deterministic resolver, а не як вільний каталог prompt-ів.

# Rules

- each runtime role must map to one canonical runtime prompt;
- deprecated or non-canonical prompts must not be selected silently;
- prompt loading must prefer canonical prompt ownership over convenience;
- version identity must remain explicit;
- prompt resolution must remain role-safe and architecture-safe;
- registry must not allow prompt substitution that weakens constitutions or ownership rules.

> 🇺🇦 Тут фіксується, що prompt selection — це governance decision, а не довільний runtime choice.

# Failure Handling

- if the requested prompt is missing, block execution;
- if multiple prompts appear to own the same runtime role, surface a canonical conflict;
- if the prompt version is incompatible with the runtime stage, reject the run;
- if the registry encounters deprecated prompt ownership without a canonical replacement, stop and escalate;
- if prompt metadata is incomplete, do not guess.

> 🇺🇦 Невизначеність у prompt ownership зупиняє run, а не лікується припущенням.

# Security Considerations

- must ensure only canonical prompts are runnable for protected roles;
- must preserve prompt-role isolation;
- must prevent unauthorized substitution of prompts that would widen authority;
- must keep prompt selection auditable and attributable;
- must respect the AI Coding Constitution and master system prompt precedence.

> 🇺🇦 Security registry — це захист від несанкціонованого або “випадкового” prompt drift.

# Dependencies

- `prompts/master-system-prompt.md`
- `prompts/task-planning-prompt.md`
- `prompts/implementation-prompt.md`
- `prompts/code-review-prompt.md`
- `prompts/bug-investigation-prompt.md`
- `prompts/refactoring-prompt.md`
- `prompts/release-readiness-prompt.md`
- `docs/reference/ai-engineer-roles.md`
- `docs/reference/ai-coding-constitution.md`

> 🇺🇦 Залежить від усього canonical prompt stack і role mapping.

# Related Documents

- `docs/runtime/agent-runner.md`
- `docs/runtime/context-loader.md`
- `docs/runtime/runtime-overview.md`

> 🇺🇦 Найближчі компоненти, які використовують prompt registry у runtime.

# Result

The Prompt Registry becomes the canonical runtime source for prompt resolution, version awareness, and role-safe prompt loading.

> 🇺🇦 Після цього документа prompt loading стає контрольованим, детермінованим і audit-friendly.
