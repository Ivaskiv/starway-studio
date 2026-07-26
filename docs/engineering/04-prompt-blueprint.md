# Document

Prompt Blueprint

> 🇺🇦 Канонічний документ у межах нормалізованого STEP-набору.

# Purpose

Defines a canonical engineering standard for repository-safe execution and governance.

> 🇺🇦 Коротко фіксує, навіщо існує цей документ.

# Scope

Covers engineering execution standards, repository-safe boundaries, and quality expectations for the owned engineering domain.

> 🇺🇦 Окреслює межі документа без зміни його змісту.

# Audience

AI engineers, senior developers, reviewers, and repository maintainers.

> 🇺🇦 Показує, кому цей документ насамперед потрібен.

# Dependencies

- `docs/engineering/03-ai-agent-blueprint.md`
- `docs/reference/platform-reference-architecture.md`
- `docs/reference/ai-coding-constitution.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/engineering/03-ai-agent-blueprint.md`
- `docs/reference/ai-coding-constitution.md`
- `prompts/master-system-prompt.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The Prompt Blueprint exists to define the canonical architecture for prompts used across the Starway / ABSystem ecosystem.

It answers one question:

How must every prompt be structured so that it remains deterministic, context-aware, architecturally aligned, and resistant to hallucination?

This document is the canonical engineering reference for prompt design.

It does not define:

- provider-specific syntax;
- implementation details;
- runtime orchestration mechanics;
- concrete prompt text examples;
- model-specific tuning.

Instead, it defines the architectural contract every prompt must follow.

## Prompt Principles

1. Architecture-first prompting.
   Every prompt must derive its meaning from canonical business, AI, technical, and engineering documentation rather than inventing local truth.

2. Deterministic intent.
   A prompt must define what outcome is being requested, why it is being requested, and what boundaries apply.

3. Context minimalism.
   A prompt must include all required context, but no uncontrolled context that increases ambiguity or accidental authority.

4. Explicit authority.
   A prompt must never imply permissions, responsibilities, or business authority that are not canonically defined.

5. Traceable reasoning boundaries.
   A prompt must make clear which canonical documents, business rules, states, or capabilities it depends on.

6. Tool-aware but tool-bounded.
   A prompt may enable tool usage only within explicit architectural and governance boundaries.

7. Output determinism.
   A prompt must define the required output shape, ownership expectations, and stopping condition.

8. Hallucination resistance.
   A prompt must prefer explicit references, bounded scope, and canonical truth over broad inference.

## Standard Prompt Structure

Every canonical prompt should be reasoned about as having the following logical structure:

1. Purpose layer.
   Why the prompt exists and what business or engineering outcome it serves.

2. Role layer.
   Which bounded role the agent is acting within.

3. Context layer.
   The canonical business, AI, workflow, user, or engineering context required to act correctly.

4. Task layer.
   The exact objective, scope, and completion expectation.

5. Boundary layer.
   The explicit rules, forbidden actions, approval boundaries, or architectural limits that govern the prompt.

6. Tool layer.
   The allowed classes of tools or data sources, if any.

7. Output layer.
   The expected response format, level of certainty, and completion criteria.

8. Governance layer.
   The rules for truthfulness, escalation, uncertainty handling, and architectural alignment.

The structure is logical, not syntax-specific.
Different prompt classes may realize these layers differently, but no canonical prompt may omit them conceptually.

## System Context Rules

System context defines the highest-priority operational and architectural truth available to the prompt.

System context rules:

1. System context must establish global behavioral boundaries before task-specific instructions.

2. System context must not redefine business truth that belongs to canonical documentation.

3. System context must define:
   - behavioral priorities;
   - truthfulness expectations;
   - safety expectations;
   - escalation expectations;
   - architectural alignment requirements.

4. System context must remain stable enough to create consistent prompt behavior across tasks in the same domain.

5. If system context conflicts with local task wording, canonical system truth prevails unless a more specific authorized override exists.

## Business Context Rules

Business context connects the prompt to canonical business meaning.

Business context rules:

1. Every prompt that affects a business outcome must reference the relevant canonical business architecture.

2. Business context must be injected from owned sources such as:
   - company foundation;
   - product ecosystem;
   - funnel;
   - lifecycle;
   - business events;
   - business rules;
   - business processes.

3. A prompt must not invent business states, products, lifecycle transitions, or permissions locally.

4. If business context is missing for a business-critical action, the prompt must not improvise beyond its authority.

5. Business context must be scoped to what the prompt actually needs, not to the entire business universe by default.

## Memory Injection Rules

Memory injection is the controlled inclusion of prior context into a prompt.

Memory injection rules:

1. Business Data remains the source of truth; memory is supporting context only.

2. Only memory classes canonically available to the acting agent or workflow may be injected.

3. Injected memory must be:
   - relevant;
   - bounded;
   - attributable;
   - refreshable when canonical truth may have changed.

4. Cached or remembered context must not override fresh canonical business data.

5. If memory is stale, partial, contradictory, or unverifiable, the prompt must prefer canonical data retrieval or safe uncertainty handling.

6. Temporary context must not silently become durable business meaning through repeated prompt reuse.

## Tool Invocation Rules

Tool invocation rules define when and how a prompt may cause an agent to use tools.

Tool invocation rules:

1. Tool use must be explicitly allowed by the acting role, capability boundary, and governance boundary.

2. A prompt must not imply tool authority broader than the agent’s canonical authority.

3. Tool usage must be purpose-bound:
   - data retrieval;
   - analysis support;
   - communication support;
   - workflow participation;
   - operational verification;
   only where canonically allowed.

4. If a tool is required to verify unstable or high-risk information, the prompt must prefer verification over assumption.

5. If tool output is incomplete or ambiguous, the prompt must preserve uncertainty rather than fabricate certainty.

6. Tool invocation must remain auditable when it materially affects a business or architectural outcome.

## Output Format Rules

Output format rules define how prompt results must be shaped.

Output format rules:

1. Every prompt must define the expected output boundary:
   - decision;
   - audit;
   - summary;
   - architecture document;
   - operational diagnosis;
   - action result;
   - escalation.

2. Output structure must match the task’s ownership boundary and expected consumer.

3. Output must distinguish clearly between:
   - confirmed facts;
   - derived conclusions;
   - open uncertainty;
   - recommended next actions.

4. Output must not imply completion if the prompt’s success criteria were not actually met.

5. Output format should minimize ambiguity by defining:
   - required sections;
   - scope boundaries;
   - stopping condition.

6. If the task requires one artifact only, the output must not silently expand scope into multiple deliverables.

## Safety Rules

Prompt safety rules govern business-safe and governance-aligned prompt behavior.

Safety rules:

1. A prompt must not authorize actions beyond the actor’s canonical responsibility.

2. A prompt must preserve human approval boundaries for premium, financial, governance, or exception-sensitive actions.

3. A prompt must not create hidden workflow ownership, hidden memory, hidden permissions, or hidden business state changes.

4. A prompt must not encourage confident output when critical context is absent.

5. A prompt must prevent accidental crossing between:
   - business architecture;
   - AI governance;
   - technical execution;
   - operational control.

6. Safety constraints must be stated as architectural boundaries, not as optional advice.

## Hallucination Prevention

Hallucination prevention is a core prompt architecture responsibility.

Hallucination prevention rules:

1. Every prompt must anchor to canonical sources before broad reasoning.

2. Every prompt must prefer explicit scope over open-ended interpretation.

3. Every prompt must separate:
   - what is known;
   - what is inferred;
   - what must be verified;
   - what is unavailable.

4. Prompts must require verification when:
   - information is unstable;
   - business impact is high;
   - architecture ownership is unclear;
   - tool output is needed to avoid assumption.

5. Prompts must not ask for global redesign when the task is bounded unless redesign is the explicit objective.

6. Prompts must define stopping conditions so the agent does not continue inventing adjacent tasks.

7. If canonical documentation and runtime evidence conflict, the prompt must surface the conflict rather than smoothing it over.

## Prompt Versioning

Prompt versioning ensures prompts evolve without losing traceability.

Versioning rules:

1. A prompt definition must be versioned when its authority, context model, output contract, or boundary rules materially change.

2. A prompt revision must preserve the ability to explain:
   - what changed;
   - why it changed;
   - which canonical sources governed the change.

3. Version changes must be reviewed when they affect:
   - business outcomes;
   - AI authority;
   - decision boundaries;
   - tool usage;
   - safety or hallucination controls.

4. Deprecated prompt variants must not remain silently active as shadow behavior.

## Reusable Templates

Reusable templates define canonical prompt classes without hardcoding task-specific content.

Reusable template rules:

1. A reusable template must encode structure, not local business improvisation.

2. A template must declare which layers it expects:
   - system context;
   - business context;
   - memory context;
   - tool boundaries;
   - output contract;
   - governance rules.

3. Templates must be reusable because they model a stable task class, not because they are generic in a vague way.

4. Templates must not become repositories of duplicated business rules that already live in canonical architecture documents.

5. If a template requires different authority or output behavior for a different domain, it should become a distinct template rather than a hidden variant.

## Governance

1. Every prompt must reference canonical architecture relevant to its task boundary.

2. A prompt may not redefine:
   - business truth;
   - lifecycle rules;
   - workflow ownership;
   - AI authority;
   - governance boundaries.

3. A new prompt type may be introduced only if its responsibility cannot be cleanly realized through an existing canonical template or prompt class.

4. Any change to prompt authority, context injection, output contract, or tool behavior is an architectural change, not merely wording refinement.

5. Prompt reviews must confirm:
   - canonical source alignment;
   - hallucination resistance;
   - safety boundary integrity;
   - deterministic output behavior.

6. Prompt structure must remain stable enough for reuse, audit, and future automation.

7. This document is the canonical source of truth for prompt-level architecture across the platform.
