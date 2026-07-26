# Document

Foundation Consistency Review

> 🇺🇦 Канонічний документ у межах нормалізованого STEP-набору.

# Purpose

Defines a canonical foundation layer for the Starway / ABSystem architecture.

> 🇺🇦 Коротко фіксує, навіщо існує цей документ.

# Scope

Covers business truth, canonical definitions, and cross-document ownership at the foundation layer.

> 🇺🇦 Окреслює межі документа без зміни його змісту.

# Audience

Business architects, product owners, AI systems architects, and senior engineers.

> 🇺🇦 Показує, кому цей документ насамперед потрібен.

# Dependencies

- `docs/foundation/01-company.md`
- `docs/foundation/02-products.md`
- `docs/foundation/03-funnel.md`
- `docs/foundation/04-user-lifecycle.md`
- `docs/foundation/05-business-events.md`
- `docs/foundation/06-ai-agents.md`
- `docs/foundation/07-ai-workflows.md`
- `docs/foundation/08-glossary.md`
- `docs/foundation/09-business-rules.md`
- `docs/foundation/10-system-map.md`

> 🇺🇦 Перелік канонічних документів, від яких залежить цей текст.

# Related Documents

- `docs/reference/platform-reference-architecture.md`
- `docs/reviews/architecture-audit-v1.md`

> 🇺🇦 Суміжні канонічні документи для швидкої навігації.

---

## Purpose

Architectural consistency must be verified before implementation because implementation will otherwise harden ambiguity into systems, workflows, permissions, automations, and customer-facing behavior.

The Foundation is intended to be the canonical business architecture of Starway / ABSystem.

That architecture is usable only if:

- every concept has exactly one owner;
- every dependent document references the canonical owner instead of redefining it;
- terminology remains stable across the set;
- dependency direction remains acyclic and explicit;
- no lower document silently contradicts a higher or peer canonical document.

This review does not redesign the architecture.

It verifies whether the completed Foundation is internally and mutually consistent enough to serve as the basis for implementation.

## Ownership Review

### Overall Assessment

The Foundation is largely structured around singular ownership boundaries, and most major domains do have one intended canonical owner.

However, several ownership conflicts and ambiguities remain.

### Verified Singular Ownership

- Company identity and principles:
  - Canonical owner: `docs/foundation/01-company.md`
- Product catalog, subscriptions, and product ownership:
  - Canonical owner: `docs/foundation/02-products.md`
- Customer progression through the business:
  - Canonical owner: `docs/foundation/03-funnel.md`
- Current user business state and access implications:
  - Canonical owner: `docs/foundation/04-user-lifecycle.md`
- Immutable business facts:
  - Canonical owner: `docs/foundation/05-business-events.md`
- AI business capabilities:
  - Canonical owner: `docs/foundation/06-ai-agents.md`
- AI orchestration:
  - Canonical owner: `docs/foundation/07-ai-workflows.md`
- Terminology:
  - Canonical owner: `docs/foundation/08-glossary.md`
- Global invariants:
  - Canonical owner: `docs/foundation/09-business-rules.md`
- Architectural navigation and dependency index:
  - Canonical owner: `docs/foundation/10-system-map.md`

### Duplicate Ownership Findings

#### Finding OR-001 — Business Events ownership is duplicated

- Source documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/05-business-events.md`
- Conflicting concept:
  - Ownership of Business Events
- Explanation:
  - `02-products.md` states that “Products own business events” and includes a dedicated `# Business Events` section with ownership rules and examples.
  - `05-business-events.md` is the canonical owner of Business Events as a business concept set.
  - Products should be related to events, but the meaning and canonical definition of events should not be owned by the product document.
- Recommended canonical owner:
  - `docs/foundation/05-business-events.md`

#### Finding OR-002 — Lifecycle ownership is ambiguous in the product document

- Source documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`
- Conflicting concept:
  - Ownership of “lifecycle”
- Explanation:
  - `02-products.md` says it is the only source of truth for “lifecycle”.
  - The actual canonical owner of User Lifecycle is `04-user-lifecycle.md`.
  - `02-products.md` legitimately owns Product Lifecycle, but the current wording is too broad and creates cross-document ambiguity.
- Recommended canonical owner:
  - Product Lifecycle: `docs/foundation/02-products.md`
  - User Lifecycle: `docs/foundation/04-user-lifecycle.md`

### Missing Ownership Findings

#### Finding OR-003 — No explicit ownership gap for core business domains

- Assessment:
  - No major core concept in the current foundation is completely ownerless.
- Note:
  - Some ownership is ambiguous rather than missing.

### Circular Ownership Findings

#### Finding OR-004 — No circular ownership detected

- Assessment:
  - Ownership boundaries are mostly singular and do not form circular ownership loops.
- Note:
  - Reference overlap exists, but ownership overlap is limited to the findings above.

## Cross Reference Review

### Overall Assessment

Cross references are generally strong and explicit.

Most documents correctly state what they are not, and they reference the expected canonical owners.

The main consistency problems come from local redefinition, outdated terminology, and copied high-level flow content that diverges from later canonical documents.

### Duplicated Definitions

#### Finding CR-001 — Company-level ecosystem flow duplicates and diverges from product and funnel canon

- Source documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/02-products.md`
  - `docs/foundation/03-funnel.md`
- Conflicting concept:
  - Canonical ecosystem / progression flow
- Explanation:
  - `01-company.md` contains `# Product Ecosystem` with an `Ecosystem Flow` of:
    - Instagram
    - Telegram
    - Entry Test
    - FOCUS
    - ABSystem AI
    - Course
    - Personal Program
  - This differs from the later canonical business progression in `02-products.md` and `03-funnel.md`:
    - Instagram
    - Telegram
    - Entry Test
    - Entry Recommendation
    - FOCUS Membership
    - ABSystem Platform
    - Premium Services
    - Renewal
    - Advocate
  - The company document should remain high-level, but its current concrete flow duplicates and conflicts with later canonical definitions.
- Recommended canonical owner:
  - Product ecosystem relationships: `docs/foundation/02-products.md`
  - Canonical progression: `docs/foundation/03-funnel.md`

#### Finding CR-002 — Business Events are partially redefined in the product document

- Source documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/05-business-events.md`
- Conflicting concept:
  - Event meaning and event classification
- Explanation:
  - `02-products.md` includes event rules and examples that go beyond product reference and into event-definition territory.
  - This weakens the single source of truth established by `05-business-events.md`.
- Recommended canonical owner:
  - `docs/foundation/05-business-events.md`

### Copied Content / Shadow Canon

#### Finding CR-003 — “Customer Journey” in the company document shadows the funnel and lifecycle layers

- Source documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
- Conflicting concept:
  - Canonical customer progression and state narrative
- Explanation:
  - `01-company.md` includes a concrete numbered customer journey.
  - That content is high-value context, but it partially overlaps with the actual canonical owners of progression and state.
  - The wording “Starway has one canonical customer lifecycle” is especially risky because “lifecycle” is canonically owned by `04-user-lifecycle.md`, not by the company document.
- Recommended canonical owner:
  - Progression: `docs/foundation/03-funnel.md`
  - State model: `docs/foundation/04-user-lifecycle.md`

### Inconsistent Terminology in Cross References

#### Finding CR-004 — Early foundation terminology is not fully aligned with glossary canon

- Source documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/02-products.md`
  - `docs/foundation/08-glossary.md`
- Conflicting concept:
  - Canonical product names
- Explanation:
  - `01-company.md` uses `FOCUS` and `ABSystem AI`.
  - Later canonical documents and the glossary standardize on `FOCUS Membership` and `ABSystem Platform`.
  - This creates a two-generation vocabulary inside the active foundation.
- Recommended canonical owner:
  - `docs/foundation/08-glossary.md` for terminology
  - `docs/foundation/02-products.md` for product naming

### Broken Dependency Signals

#### Finding CR-005 — No broken file references detected

- Assessment:
  - The current foundation uses valid internal file references.
- Note:
  - The issue is semantic inconsistency, not missing links.

## Dependency Review

### Overall Assessment

The document set is broadly acyclic in ownership and in intended architectural direction.

However, one dependency representation is conceptually inconsistent and should be treated as a review finding.

### Acyclic Dependency Validation

- `01-company.md` is the top-level business anchor.
- `02-products.md` depends on company.
- `03-funnel.md` depends on company and products.
- `04-user-lifecycle.md` depends on company, products, and funnel.
- `05-business-events.md` depends on products, funnel, and lifecycle.
- `06-ai-agents.md` depends on products, lifecycle, and business events.
- `07-ai-workflows.md` depends on funnel, lifecycle, business events, and agents.
- `08-glossary.md` references all major canonicals for terminology stability.
- `09-business-rules.md` governs the full set.
- `10-system-map.md` indexes the whole architecture.

No true circular dependency was found in document ownership.

### Dependency Finding

#### Finding DR-001 — System Map layer order conflicts with Business Rules governance meaning

- Source documents:
  - `docs/foundation/09-business-rules.md`
  - `docs/foundation/10-system-map.md`
- Conflicting concept:
  - Position of Business Rules in the dependency chain
- Explanation:
  - `09-business-rules.md` states that Business Rules govern all lower layers.
  - `10-system-map.md` places Business Rules below AI Workflows in the main chain:
    - Company → Products → Funnel → User Lifecycle → Business Events → AI Agents → AI Workflows → Business Rules → Implementation
  - This is navigationally understandable, but architecturally ambiguous because governance is shown after the governed layers.
- Recommended canonical owner:
  - Governing meaning: `docs/foundation/09-business-rules.md`
  - Layer navigation representation: `docs/foundation/10-system-map.md`

## Terminology Review

### Overall Assessment

The glossary is structurally strong and provides a clear canonical vocabulary.

Most later documents align to it.

The main terminology inconsistency comes from earlier documents preserving older names and phrases that conflict with the newer canonical vocabulary.

### Verified Terminology Consistency

- `Product`, `Funnel`, `User Lifecycle`, `Business Event`, `AI Agent`, and `AI Workflow` are consistently differentiated.
- `Premium Services` is consistently treated as a relationship layer rather than a standalone single product in later documents.
- `Renewal` and `Advocate` are treated as funnel/lifecycle outcomes rather than products in later documents.

### Terminology Findings

#### Finding TR-001 — `FOCUS` vs `FOCUS Membership`

- Source documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/02-products.md`
  - `docs/foundation/08-glossary.md`
- Conflicting concept:
  - Canonical product name
- Explanation:
  - The company document uses `FOCUS`.
  - The product and glossary canon use `FOCUS Membership`.
- Recommended canonical owner:
  - `docs/foundation/08-glossary.md`

#### Finding TR-002 — `ABSystem AI` vs `ABSystem Platform`

- Source documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/02-products.md`
  - `docs/foundation/08-glossary.md`
- Conflicting concept:
  - Canonical product name
- Explanation:
  - The company document uses `ABSystem AI`.
  - The later canonical product name is `ABSystem Platform`.
  - The glossary also marks `ABSystem AI` as deprecated terminology.
- Recommended canonical owner:
  - `docs/foundation/08-glossary.md`

#### Finding TR-003 — “Customer lifecycle” is used where “Funnel” or “User Lifecycle” should be distinguished

- Source documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/03-funnel.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/08-glossary.md`
- Conflicting concept:
  - Canonical use of lifecycle terminology
- Explanation:
  - `01-company.md` says “Starway has one canonical customer lifecycle” inside a journey description.
  - The foundation later differentiates Funnel and User Lifecycle as separate canonical constructs.
- Recommended canonical owner:
  - Term meanings: `docs/foundation/08-glossary.md`
  - State model: `docs/foundation/04-user-lifecycle.md`
  - Progression model: `docs/foundation/03-funnel.md`

## Architectural Gaps

### Overall Assessment

The Foundation covers the major intended business layers.

The remaining gaps are not missing whole domains.

They are mostly unresolved edges between already existing canonical documents.

### Gap Findings

#### Finding AG-001 — Lifecycle principles heading is malformed

- Source document:
  - `docs/foundation/04-user-lifecycle.md`
- Gap:
  - The expected lifecycle principles section exists in content, but the heading is malformed as `#№ Lifecycle Principles`.
- Why this matters:
  - It weakens structural consistency and machine-readability inside a canonical document.
- Canonical owner:
  - `docs/foundation/04-user-lifecycle.md`

#### Finding AG-002 — Product document does not cleanly separate Product Lifecycle from User Lifecycle

- Source documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/04-user-lifecycle.md`
- Gap:
  - Ownership boundaries are conceptually defined, but the wording in `02-products.md` does not fully preserve that separation.
- Why this matters:
  - Implementation teams may infer a broader lifecycle authority from the product document than intended.
- Canonical owner:
  - Product lifecycle: `docs/foundation/02-products.md`
  - User lifecycle: `docs/foundation/04-user-lifecycle.md`

#### Finding AG-003 — Company document still contains a concrete legacy progression map

- Source documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/03-funnel.md`
- Gap:
  - The company document retains a concrete staged flow that is no longer fully aligned with the canonical funnel.
- Why this matters:
  - Readers may consume the top-level document first and internalize a non-canonical progression before reaching the later owner documents.
- Canonical owner:
  - `docs/foundation/03-funnel.md`

#### Finding AG-004 — No orphan architectural domain detected

- Assessment:
  - No major business architecture domain appears fully undocumented inside the current foundation scope.

## Architectural Conflicts

### Conflict AC-001 — Business Events ownership conflict

- Source documents:
  - `docs/foundation/02-products.md`
  - `docs/foundation/05-business-events.md`
- Conflicting concept:
  - Who owns Business Events as a canonical concept set
- Explanation:
  - Products may own related business value context, but event definitions themselves are canonically owned by the Business Events document.
  - The current product document wording overreaches into concept ownership.
- Recommended canonical owner:
  - `docs/foundation/05-business-events.md`

### Conflict AC-002 — User Lifecycle terminology conflict

- Source documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/08-glossary.md`
- Conflicting concept:
  - Meaning of “lifecycle”
- Explanation:
  - The company document uses lifecycle language for a broad customer journey.
  - The lifecycle document and glossary define User Lifecycle as a specific canonical state model.
- Recommended canonical owner:
  - `docs/foundation/04-user-lifecycle.md`
  - `docs/foundation/08-glossary.md`

### Conflict AC-003 — Product naming conflict

- Source documents:
  - `docs/foundation/01-company.md`
  - `docs/foundation/02-products.md`
  - `docs/foundation/08-glossary.md`
- Conflicting concept:
  - Canonical names of major products
- Explanation:
  - `FOCUS` vs `FOCUS Membership`
  - `ABSystem AI` vs `ABSystem Platform`
- Recommended canonical owner:
  - `docs/foundation/02-products.md`
  - `docs/foundation/08-glossary.md`

### Conflict AC-004 — Business Rules layer ordering ambiguity

- Source documents:
  - `docs/foundation/09-business-rules.md`
  - `docs/foundation/10-system-map.md`
- Conflicting concept:
  - Whether Business Rules are a downstream layer or an overarching governing layer
- Explanation:
  - The rule document defines Business Rules as governing all lower layers.
  - The system map places them after AI Workflows in the main chain.
- Recommended canonical owner:
  - Governing semantics: `docs/foundation/09-business-rules.md`
  - Map visualization: `docs/foundation/10-system-map.md`

## Consistency Matrix

| Document | Ownership | References | Dependencies | Terminology | Completeness | Review Status |
| --- | --- | --- | --- | --- | --- | --- |
| `01-company.md` | Partial issue | Partial issue | Pass | Partial issue | Pass | Review needed |
| `02-products.md` | Partial issue | Partial issue | Pass | Pass | Pass | Review needed |
| `03-funnel.md` | Pass | Pass | Pass | Pass | Pass | Stable |
| `04-user-lifecycle.md` | Pass | Pass | Pass | Pass | Partial issue | Review needed |
| `05-business-events.md` | Pass | Pass | Pass | Pass | Pass | Stable |
| `06-ai-agents.md` | Pass | Pass | Pass | Pass | Pass | Stable |
| `07-ai-workflows.md` | Pass | Pass | Pass | Pass | Pass | Stable |
| `08-glossary.md` | Pass | Pass | Pass | Pass | Pass | Stable |
| `09-business-rules.md` | Pass | Pass | Pass | Pass | Pass | Stable |
| `10-system-map.md` | Pass | Pass | Partial issue | Pass | Pass | Review needed |

### Matrix Interpretation

- `01-company.md`
  - Needs alignment with later canonical naming and progression documents.
- `02-products.md`
  - Needs boundary tightening around Business Events and lifecycle wording.
- `04-user-lifecycle.md`
  - Structurally complete, but contains a malformed heading.
- `10-system-map.md`
  - Structurally strong, but its primary chain should better reflect Business Rules governance semantics.

## Final Assessment

### Strengths

- The Foundation now covers all major intended business architecture layers.
- Ownership boundaries are mostly clear and acyclic.
- Later documents are more internally disciplined than earlier ones.
- The glossary, business rules, and system map create a strong foundation for implementation governance.
- AI Agents and AI Workflows are clearly separated from products, lifecycle, and events.

### Weaknesses

- The earliest foundation document (`01-company.md`) still contains legacy naming and a legacy progression map.
- `02-products.md` partially overreaches into Business Events and uses wording that can be read as overlapping User Lifecycle ownership.
- `04-user-lifecycle.md` contains a structural heading defect.
- `10-system-map.md` has a layer-order representation that is directionally ambiguous relative to the meaning in `09-business-rules.md`.

### Blocking Issues Before Implementation

The Foundation is close to implementation-ready, but the following issues should be corrected before implementation relies on it as strict canon:

1. Resolve Business Events ownership conflict between `02-products.md` and `05-business-events.md`.
2. Resolve lifecycle ownership ambiguity between `02-products.md` and `04-user-lifecycle.md`.
3. Align `01-company.md` terminology and ecosystem flow with `02-products.md`, `03-funnel.md`, and `08-glossary.md`.
4. Correct the malformed lifecycle principles heading in `04-user-lifecycle.md`.
5. Clarify the representation of Business Rules in `10-system-map.md` so governance direction is unambiguous.

### Recommended Corrections

- Treat `05-business-events.md` as the only canonical owner of Business Events definitions and meaning.
- Limit `02-products.md` to product relationships with events, not event ownership semantics.
- Reserve `lifecycle` language in product documentation for Product Lifecycle only, and reserve User Lifecycle canon for `04-user-lifecycle.md`.
- Align all top-level naming to glossary-approved terms:
  - `FOCUS Membership`
  - `ABSystem Platform`
  - `Premium Services`
  - `Entry Recommendation`
  - `Renewal`
  - `Advocate`
- Preserve `10-system-map.md` as the navigation layer, but update its representation so dependency flow and governance flow are not confused.

### Readiness Conclusion

The Foundation is structurally strong and substantially complete.

It is not yet fully consistency-clean.

It should be considered:

- architecturally viable;
- largely acyclic;
- mostly canonical;
- not fully implementation-ready until the listed blocking inconsistencies are corrected.
