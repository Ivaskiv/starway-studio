# Document

Repository Blueprint

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

- `docs/reference/platform-reference-architecture.md`
- `docs/reference/ai-coding-constitution.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/engineering/02-module-blueprint.md`
- `docs/reference/platform-reference-architecture.md`
- `docs/reference/ai-coding-constitution.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

The Repository Blueprint exists to define the canonical structure of the Starway / ABSystem monorepo.

It answers one question:

How must the repository be organized so that every folder, module, shared package, and application has deterministic ownership and architectural boundaries?

This document is the canonical engineering structure reference.

It does not define:

- code style;
- implementation details;
- framework-specific patterns;
- runtime configuration details;
- file contents.

Instead, it defines repository-level architecture so contributors know where each type of responsibility belongs before adding or changing code.

## Repository Principles

1. One folder = one responsibility.
   Every top-level and major sub-level folder must own one coherent purpose.

2. Business-first structure.
   Repository structure must reflect canonical business, AI, and technical architecture rather than convenience-only grouping.

3. Deterministic placement.
   A new module, package, or document must have one obvious canonical home.

4. Shared logic is explicit.
   Anything reused across applications or services must live in a shared package with clear ownership.

5. Application boundaries are real.
   Applications may consume shared capabilities, but must not absorb ownership that belongs to shared or backend domains.

6. No shadow architecture.
   Folder layout must not create parallel business rules, lifecycle logic, integration logic, or duplicate service boundaries.

7. Documentation follows architecture.
   Repository documentation must map to canonical architecture, engineering, operational, and product ownership boundaries.

8. Growth without chaos.
   The repository must support new products, services, and AI capabilities without creating duplicate top-level structures.

## Monorepo Structure

The canonical top-level monorepo structure is:

- `apps/`
  - user-facing application entry points
- `backend/`
  - server-side business execution and service orchestration implementation boundary
- `packages/`
  - shared reusable packages consumed by applications and backend
- `docs/`
  - canonical documentation system
- `scripts/`
  - repository-level automation and maintenance entry points
- `e2e/`
  - end-to-end validation boundary
- `public/`
  - static delivery assets
- `logs/`
  - local operational output boundary
- `test-results/`
  - generated validation artifacts

Supporting environment folders such as `.github/`, `.vscode/`, `.vercel/`, `.claude/`, and similar repository tooling folders are operational support structures, not product or business ownership domains.

## Layer Rules

The repository must mirror the canonical architecture layers:

1. Documentation layer.
   Owned by `docs/`, which defines the canonical business, AI, technical, and engineering truth.

2. Shared capability layer.
   Owned by `packages/`, which contains reusable cross-application and cross-service capabilities with clear scope.

3. Application layer.
   Owned by `apps/`, which contains interaction surfaces and user-facing entry points.

4. Backend execution layer.
   Owned by `backend/`, which contains server-side realization of business capabilities, integrations, events, orchestration, and continuity handling.

5. Validation layer.
   Owned by `e2e/`, test artifacts, and repository-level verification structures.

6. Operational support layer.
   Owned by `scripts/`, `logs/`, and related operational folders for repository maintenance and execution support.

No layer may redefine ownership already assigned to another layer.

## Module Placement Rules

1. User-facing interaction modules belong in `apps/`.
   If the responsibility is tied to a specific product surface, client flow, or direct user interaction, it belongs in the relevant application.

2. Business execution modules belong in `backend/`.
   If the responsibility owns business-state execution, workflow coordination, continuity handling, event publication or consumption, or integration-driven business actions, it belongs in backend ownership boundaries.

3. Shared reusable modules belong in `packages/`.
   If the same logic, types, domain abstractions, or utilities are used across multiple apps or services, they belong in a shared package.

4. Canonical documentation belongs in `docs/`.
   If the artifact defines business, architecture, engineering, operational, AI, or product truth, it belongs in the documentation system, not beside implementation by default.

5. Repository automation belongs in `scripts/`.
   If the responsibility is repository-wide automation, scaffolding, maintenance, setup, or tooling support, it belongs in repository scripts.

6. Product assets belong in `public/` only when they are static delivery artifacts.
   Static assets must not become a shadow code or configuration system.

7. Validation flows belong in `e2e/` when they represent end-to-end system verification.

8. Generated output must not become a source-of-truth module.
   Folders such as `dist/`, `logs/`, `tmp/`, `test-results/`, and similar generated areas are output boundaries, not ownership domains.

## Dependency Rules

1. `docs/` depends on canonical architecture decisions, not on implementation details.

2. `packages/` may be consumed by both `apps/` and `backend/`.

3. `apps/` may depend on `packages/`, but must not depend directly on backend internal implementation modules.

4. `backend/` may depend on `packages/`, but shared packages must not become thin mirrors of backend internals.

5. `apps/` must never depend on one another directly for core ownership.

6. Shared packages must not depend on application-specific UI or backend-specific runtime details unless a package is explicitly scoped to that layer and named accordingly.

7. `e2e/` may observe applications and backend behavior, but must not become a shadow business-logic layer.

8. `scripts/` may coordinate repository tasks, but must not own business behavior that belongs in backend or shared packages.

9. Generated folders must never be imported as canonical sources.

10. Dependency direction must remain:

`docs/` defines truth

↓

`packages/` define shared reusable capabilities

↓

`apps/` and `backend/` realize those capabilities in their own boundaries

↓

`e2e/` and operational support observe and validate the result

## Shared Packages

The canonical shared package boundary is `packages/`.

Current shared packages include:

- `packages/shared/`
  - common shared logic and cross-cutting reusable definitions
- `packages/db/`
  - shared database-facing package boundary
- `packages/ai/`
  - shared AI-related package boundary

Shared package rules:

1. A shared package must exist because more than one application or service needs the capability.

2. A shared package must have one coherent ownership domain.

3. Shared packages must not become generic dumping grounds for unrelated helpers.

4. If a package belongs only to one app or one backend module in practice, it should not be elevated into `packages/` unless there is a stable shared reason.

5. Shared package boundaries must remain explicit:
   - domain-sharing;
   - data-sharing;
   - AI-sharing;
   - infrastructure-sharing only when architecturally justified.

## Apps

The canonical application boundary is `apps/`.

Current application folders include:

- `apps/web/`
  - web and miniapp-facing user interaction surface
- `apps/bot/`
  - bot-facing application boundary

Application rules:

1. Every app must own one interaction surface or delivery surface.

2. Applications may compose shared packages and backend contracts, but must not redefine lifecycle, product hierarchy, or business rules locally.

3. Application-specific modules stay inside the app boundary unless proven reusable.

4. Apps must remain thin relative to canonical business ownership:
   - presentation;
   - user interaction flow;
   - client-side composition;
   - app-local adaptation.

5. Business truth and system-wide workflow ownership must remain outside `apps/`.

## Naming Conventions

1. Top-level folders use short, domain-oriented names:
   - `apps`
   - `backend`
   - `packages`
   - `docs`
   - `scripts`

2. Package and app names must communicate responsibility, not implementation mechanism.

3. Folder names must prefer business or architecture meaning over temporary project slang.

4. Shared package names must identify the shared domain they own.

5. Generated or output folders must be clearly distinguishable from source folders.

6. Repository names must avoid ambiguous duplicates such as two folders that appear to own the same product, workflow, or lifecycle concept.

## Folder Standards

1. Every top-level folder must have one clearly understood ownership domain.

2. Major source folders should group by responsibility before grouping by convenience.

3. Subfolders should reflect bounded contexts, modules, features, services, or layers consistently inside their parent boundary.

4. Source folders and generated folders must stay visibly separate.

5. Temporary runtime output belongs in explicitly non-canonical folders such as `tmp`, `logs`, `dist`, or `test-results`.

6. Documentation folders must reflect canonical ownership groupings such as:
   - foundation;
   - architecture;
   - technical;
   - engineering;
   - reference;
   - archive;
   - audit.

7. A folder should not mix:
   - shared reusable logic;
   - app-local code;
   - backend-only code;
   - generated output;
   - architecture documentation.

## Import Rules

1. Imports must follow ownership direction.

2. Application code may import:
   - app-local modules;
   - shared packages;
   - explicit external contracts.

3. Backend code may import:
   - backend-local modules;
   - shared packages;
   - explicit external contracts.

4. Shared packages must not import from app-local or backend-local feature folders unless the package is intentionally scoped as an adapter and clearly named for that role.

5. Cross-app imports are forbidden as a default architectural pattern.

6. Imports from generated folders are forbidden.

7. Imports must not bypass canonical ownership just because a path is technically reachable.

8. Architectural layering is more important than local convenience.

## Architecture Boundaries

1. `docs/` owns canonical architecture truth.

2. `packages/` own reusable cross-boundary capabilities.

3. `apps/` own user interaction surfaces.

4. `backend/` owns server-side business execution.

5. `scripts/` own repository automation, not product behavior.

6. `e2e/` owns end-to-end verification, not feature logic.

7. `public/` owns static asset delivery, not business logic.

8. Operational output folders own no canonical source-of-truth behavior.

9. No folder may create a second ownership path for:
   - lifecycle truth;
   - subscription truth;
   - business events;
   - workflow orchestration;
   - AI authority;
   - product access rules.

10. Repository structure must remain aligned with the canonical documents in:
   - `docs/foundation/`
   - `docs/architecture/`
   - `docs/technical/`
   - `docs/reference/`

## Governance

1. Adding a new top-level folder requires explicit architectural justification.

2. Adding a new shared package requires proof of stable cross-boundary reuse.

3. Moving a module requires preserving the canonical ownership model rather than only reducing short-term duplication.

4. Repository structure changes must not violate:
   - application boundaries;
   - backend ownership;
   - shared package isolation;
   - documentation canon.

5. If two folders appear to own the same responsibility, the structure must be corrected so ownership becomes singular and explicit.

6. Generated output must remain disposable and must never become canonical repository truth.

7. Future contributors must use this blueprint before introducing:
   - new apps;
   - new packages;
   - new backend module trees;
   - new documentation domains;
   - new repository automation zones.

8. This document is the canonical source of truth for repository structure and deterministic ownership at the engineering layer.
