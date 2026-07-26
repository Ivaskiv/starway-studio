# Document

Module Blueprint

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

- `docs/engineering/01-repository-blueprint.md`
- `docs/reference/platform-reference-architecture.md`
- `docs/reference/ai-coding-constitution.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/engineering/01-repository-blueprint.md`
- `docs/engineering/07-testing-blueprint.md`
- `docs/reference/ai-coding-constitution.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The Module Blueprint exists to define the canonical structure, ownership model, and dependency rules for every module in the Starway / ABSystem repository.

It answers one question:

How must a module be structured so that its responsibility, public surface, internal boundaries, lifecycle, and dependencies remain deterministic?

This document is the canonical engineering reference for module design.

It does not define:

- implementation details;
- framework-specific patterns;
- code style;
- file-level syntax;
- testing tooling.

Instead, it defines the architectural contract every module must follow.

## Module Principles

1. One module = one responsibility.
   A module must exist because it owns one coherent responsibility.

2. One module = one owner.
   A module must have one explicit ownership boundary.

3. Public surface is intentional.
   Every module must expose only what external consumers are allowed to use.

4. Internal structure is protected.
   A module’s internal composition must remain replaceable without changing its public contract.

5. Dependencies must be explicit.
   A module may depend only on allowed upstream layers and canonical shared contracts.

6. No hidden ownership.
   A module must not partially own the same responsibility as another module.

7. Stable boundaries over convenience.
   It is better to add a small adapter or explicit contract than to let consumers reach into internals.

8. Architecture first.
   Module shape must reinforce the canonical repository, service, and domain boundaries already defined elsewhere.

## Standard Module Structure

Every canonical module should be reasoned about as having the following logical structure:

1. Module boundary.
   The module itself as the owned responsibility boundary.

2. Public API.
   The explicit external surface that other modules are allowed to depend on.

3. Internal implementation.
   The private logic, composition, and helper structure required to fulfill the module’s responsibility.

4. Contracts.
   The internal or exported abstractions that define how the module communicates with consumers or collaborators.

5. Tests.
   Verification scoped to the module’s owned behavior and boundary promises.

6. Documentation.
   Module-level explanation where the responsibility is non-obvious or operationally important.

The standard structure is logical rather than file-prescriptive.
The exact folder shape may vary by layer, but these boundary concepts must remain intact.

## Public vs Internal API

### Public API

The public API is the only surface external consumers may rely on.

Public API rules:

1. It must be explicit.
2. It must be stable relative to the module’s responsibility.
3. It must expose only what belongs to the module’s owned capability.
4. It must not leak internal helpers, temporary workarounds, or implementation-only structures.
5. It must be the only approved entry point into the module from outside the module boundary.

### Internal API

The internal API includes all implementation details used only inside the module.

Internal API rules:

1. Internal structures may change freely as long as the public contract remains valid.
2. Internal helpers do not create new ownership boundaries.
3. Internal logic must not be imported directly by external consumers.
4. Internal organization must support clarity, not create shadow modules.

### Boundary Rule

If another module needs direct access to an internal structure, one of two things is true:

1. the public API is incomplete and must be redesigned; or
2. the responsibility actually belongs somewhere else.

## Responsibilities

Every module must define one and only one primary responsibility.

Examples of valid module responsibility types include:

- one business capability;
- one integration boundary;
- one UI surface concern;
- one workflow coordination concern;
- one shared reusable domain capability.

Responsibilities a single module must not mix casually:

- business rules and repository tooling;
- user interface concerns and backend orchestration ownership;
- shared reusable logic and application-local adaptation;
- external integration handling and unrelated business lifecycle ownership;
- public contract ownership and cross-cutting internal utility dumping.

Responsibility rule:

If a module requires unrelated reasons to change, it likely owns more than one responsibility and must be split.

## Dependency Rules

1. A module may depend only on:
   - canonical upstream layers;
   - approved shared contracts;
   - explicit integration boundaries where architecturally allowed.

2. A module must not depend on another module’s internals.

3. Modules in the same layer may collaborate only through explicit allowed boundaries.

4. A module must not create reverse dependencies against the architectural direction of the repository.

5. A higher-level module may compose lower-level capabilities, but a lower-level module must not depend on higher-level orchestration meaning.

6. Shared modules must not import application-local or backend-local internals unless explicitly designed as layer-specific adapters.

7. Testing, scripts, and tooling must not become hidden production dependencies.

8. Generated artifacts must never become canonical module dependencies.

## Module Lifecycle

Every module has a lifecycle:

1. Proposed.
   A responsibility is identified, but the module boundary is not yet canonical.

2. Introduced.
   The module is created with one explicit responsibility and owner.

3. Active.
   The module is in normal use and its public boundary is relied upon.

4. Extended.
   The module grows within the same responsibility boundary without changing ownership.

5. Split.
   The module is decomposed because it has accumulated more than one responsibility or ownership path.

6. Deprecated.
   The module remains for compatibility but is no longer the preferred canonical boundary.

7. Removed.
   The module is fully replaced or retired after dependents have been migrated.

Lifecycle rules:

1. A module may move from Active to Extended only if responsibility remains singular.
2. A module must move toward Split if ownership or reasons-to-change diverge.
3. Deprecation requires a clear replacement path.
4. Removal is allowed only after dependency migration is complete.

## Extension Rules

1. Extend a module only when the new capability belongs to the same owned responsibility.

2. If the extension introduces a second owner, create a new module instead.

3. If the extension introduces a second public audience with different stability needs, create a new boundary or adapter.

4. If the extension requires new dependency directions that violate architecture rules, do not extend the module.

5. If a module starts to act as both coordinator and executor for unrelated concerns, split the responsibilities.

6. Shared modules may be extended only for stable shared needs, not for one-off convenience.

## Testing Boundaries

Testing must reinforce the module boundary rather than bypass it.

Testing rules:

1. A module must be testable through its owned responsibility.

2. Tests should primarily validate the public contract and owned behavior of the module.

3. Internal implementation details may be tested when necessary, but such tests must not redefine the public module contract.

4. Cross-module behavior belongs to integration or end-to-end validation, not to module-boundary tests alone.

5. A module’s tests must not require reaching into unrelated module internals.

6. Test structure must preserve the rule that a module owns one responsibility and one boundary.

## Naming Conventions

1. Module names must communicate responsibility, not temporary implementation detail.

2. A module name should answer:
   - what it owns;
   - why it exists;
   - who should use it.

3. Module names must avoid vague, overloaded labels such as:
   - common;
   - misc;
   - helpers;
   - utils;
   when those names hide multiple unrelated responsibilities.

4. Public-facing module names should remain stable when internal implementation changes.

5. Module naming should align with:
   - repository blueprint;
   - service boundaries;
   - shared package domains;
   - canonical business concepts where applicable.

## Anti-patterns

The following are canonical module anti-patterns:

1. Hidden multi-responsibility modules.
   A module appears coherent but actually owns several unrelated reasons to change.

2. Internal API leakage.
   External consumers import internal structures because the public boundary is weak or bypassed.

3. Utility dumping.
   A module becomes a catch-all storage place for unrelated helpers.

4. Cross-boundary reach-through.
   Consumers bypass public contracts to import implementation details directly.

5. Circular module dependencies.
   Two modules depend on each other’s behavior or internals to function.

6. Shared-in-name-only modules.
   A so-called shared module is actually specific to one app or one backend path.

7. Orchestration confusion.
   A module mixes execution, coordination, integration, and business ownership without a clear primary responsibility.

8. Accidental public contracts.
   Internal structures become de facto public because they are referenced externally.

9. Lifecycle neglect.
   Deprecated or split-required modules continue growing without ownership correction.

## Governance

1. Every new module must declare one owner and one primary responsibility before it is considered canonical.

2. A module may not be introduced if an existing module already owns the same responsibility.

3. Any change to a module’s public boundary must be reviewed as an architectural boundary change, not just a local edit.

4. Any module that begins to accumulate multiple reasons to change must be reviewed for splitting.

5. Cross-module imports that bypass public boundaries are architectural violations.

6. Shared module creation requires proof of stable reuse and stable ownership.

7. Module deprecation requires:
   - replacement identification;
   - migration path;
   - dependency review.

8. This document is the canonical source of truth for module-level structure, ownership, and dependency behavior across the repository.
