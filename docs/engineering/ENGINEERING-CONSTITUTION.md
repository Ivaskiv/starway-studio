# STARWAY ENGINEERING CONSTITUTION

Status: ACTIVE

Version: 1.0

This document is the single canonical engineering constitution
for the entire Starway repository.

Every engineering task MUST comply with this document.

Any modification of this Constitution requires an explicit
engineering decision and must include rationale.

Do not modify this document during normal feature development.

If any STEP, prompt, or local instruction conflicts with this Constitution, this Constitution has higher priority.

## RULE 1 — PRODUCT FIRST

- Purpose: Ensure engineering serves the product, not code volume.
- Requirements: Every change must improve a real user outcome or remove a real user blocker.
- Expected behaviour: If a change has no visible product value, do not prioritize it.

## RULE 2 — SURGICAL CHANGES

- Purpose: Minimize risk and preserve working architecture.
- Requirements: Prefer the smallest possible change, reuse existing modules, and extend the current implementation instead of rewriting it.
- Expected behaviour: Fix the problem with the narrowest safe diff.

## RULE 3 — NO PARALLEL IMPLEMENTATIONS

- Purpose: Prevent duplicate engines, runtimes, transports, flows, and UX paths.
- Requirements: Do not introduce a second implementation for an existing responsibility. If duplicates already exist, merge toward one owner.
- Expected behaviour: New work strengthens the existing path instead of creating a competing one.

## RULE 4 — CANONICAL PATH

- Purpose: Keep each feature on exactly one execution path.
- Requirements: Where multiple paths exist, continue simplifying until one canonical implementation remains.
- Expected behaviour: Every entrypoint converges into the same business logic.

## RULE 5 — REMOVE ROOT CAUSES

- Purpose: Eliminate the class of defect, not just the first symptom.
- Requirements: When analysis reveals duplicated logic, duplicated execution, or multiple root causes, fix the real source of failure.
- Expected behaviour: A completed fix reduces the chance of the same defect appearing elsewhere.

## RULE 6 — EVOLUTION INSTEAD OF REPLACEMENT

- Purpose: Improve the product without fragmenting it into versions.
- Requirements: Upgrade existing assistants, agents, and flows. Do not create V2 products or duplicate product lines unless explicitly approved.
- Expected behaviour: The current product becomes smarter without splitting into parallel products.

## RULE 7 — AI IS AN ENHANCEMENT

- Purpose: Preserve business continuity when AI is unavailable.
- Requirements: Core functionality must degrade gracefully through smaller AI, deterministic flows, or information cards. Business-critical flows must not depend on one LLM call.
- Expected behaviour: AI failures reduce quality, not product availability.

## RULE 8 — MEMORY FIRST

- Purpose: Use known context before asking the user to repeat it.
- Requirements: Reuse history, profile, subscription, goals, progress, lifecycle, and prior conversations before generating follow-up questions.
- Expected behaviour: Responses feel continuous and context-aware rather than repetitive.

## RULE 9 — EXPERIENCE FIRST

- Purpose: Keep architecture work subordinate to user value.
- Requirements: Optimize architecture only when it improves the current feature or reliability of the current experience.
- Expected behaviour: The assistant becomes more personal, useful, proactive, or intelligent.

## RULE 10 — CONVERSATION FIRST

- Purpose: Preserve one continuous assistant experience.
- Requirements: Menus and buttons must continue the conversation instead of replacing it. Responses should include recognition, context, guidance, and one recommended next action when relevant.
- Expected behaviour: UI controls feel like conversational continuations, not disconnected screens.

## RULE 11 — ONE ASSISTANT

- Purpose: Hide internal complexity behind one coherent user-facing assistant.
- Requirements: Internal role switching may exist, but the user must experience one continuous assistant and one conversation history.
- Expected behaviour: Delegation stays internal; the conversation stays unified.

## RULE 12 — PRODUCTION QUALITY

- Purpose: Make every completed STEP shippable.
- Requirements: A STEP must end with working code, manual verification, typecheck, available tests, and regression protection. If something cannot be verified, report `PARTIAL` or `REQUIRES_FIXES`, not `PASS`.
- Expected behaviour: Completion claims are backed by evidence.

## RULE 13 — CONTINUOUS OPTIMIZATION

- Purpose: Leave touched code slightly better without drifting into unrelated cleanup.
- Requirements: Remove dead code, reduce duplication, simplify logic, and improve observability only where directly related to the current change. See RULES 16–18 for touched-file requirements.
- Expected behaviour: Related code gets cleaner as part of the actual feature or fix.

## RULE 14 — USER PERCEIVES THE CHANGE

- Purpose: Keep internal work tied to user-visible improvement.
- Requirements: Before implementing anything, ask whether a real user will notice the improvement. If not, do not prioritize it.
- Expected behaviour: Internal changes exist to improve intelligence, helpfulness, reliability, or delight.

## RULE 15 — FULL PLATFORM SYNCHRONIZATION

- Purpose: Keep Starway as one product across all interfaces.
- Requirements: When modifying one layer, assess impact on Telegram Bot, Mini App, Website, Backend, Workers, Prisma, AI Runtime, AI Agents, Payments, Scheduler, Notifications, Shared Contracts, Shared Types, and Shared APIs.
- Expected behaviour: Business rules stay consistent across Telegram, Mini App, Website, background jobs, and scheduled flows.

## RULE 16 — MANDATORY LOCAL OPTIMIZATION AUDIT

- Purpose: Remove confirmed redundancy inside the actual implementation scope.
- Requirements: Before completing any STEP, audit every modified file for local duplicate logic, duplicate queries, dead code, unreachable branches, unused symbols, redundant async patterns, unnecessary allocations, repeated mapping/parsing/serialization, unnecessary DB round-trips, and confirmed N+1 patterns.
- Expected behaviour: Touched files are locally optimized without introducing new abstractions, behavior changes, or repository-wide refactors.

## RULE 17 — LEAVE MODIFIED FILES CLEANER

- Purpose: Prevent touched files from accumulating residue.
- Requirements: If the touched scope contains dead code, obsolete helpers, unused variables, duplicated logic, redundant branches, or unreachable code, remove it before `PASS`.
- Expected behaviour: Every modified file leaves the repository cleaner than it was.

## RULE 18 — ZERO NEW TECHNICAL DEBT

- Purpose: Stop temporary implementation debt from becoming permanent.
- Requirements: Do not leave hidden TODOs, FIXMEs, duplicate implementations, compatibility layers, or transitional logic. Remove them before `PASS` or document them explicitly when removal is impossible in the current STEP.
- Expected behaviour: New code does not smuggle in undocumented debt.

## RULE 19 — CANON BEFORE CODE

- Purpose: Anchor engineering decisions in the canonical documentation instead of local guesswork.
- Requirements: Read the owning canonical documents before changing architecture-sensitive code. If documentation and implementation diverge, treat the canon as the source of truth until an explicit governance change is approved.
- Expected behaviour: Engineers validate assumptions against the canon before editing code.

## RULE 20 — SCOPE BEFORE CHANGE

- Purpose: Keep every task inside one intentional change set.
- Requirements: Define the exact user action, failure, or objective before editing. Do not silently expand into adjacent improvements, migrations, or redesigns.
- Expected behaviour: Each STEP has one clear objective and one bounded implementation scope.

## RULE 21 — EVIDENCE BEFORE FIX

- Purpose: Prevent speculative changes.
- Requirements: Prove the failing behavior, identify the exact root cause, and fix that cause instead of adding guess-based guards or cosmetic patches.
- Expected behaviour: Bug fixes are driven by evidence, not intuition.

## RULE 22 — RESPECT OWNERSHIP BOUNDARIES

- Purpose: Preserve one owner for each responsibility.
- Requirements: Business objects, modules, services, workflows, prompts, and agents must keep singular ownership. Reuse the canonical owner instead of embedding duplicate rules elsewhere.
- Expected behaviour: Responsibilities stay explicit, and internals do not leak across boundaries.

## RULE 23 — PROTECT CONTRACTS AND DATA TRUTH

- Purpose: Preserve stable contracts and one source of truth.
- Requirements: Do not invent new business states, duplicate persistence ownership, or change shared contracts casually. API, DTO, schema, and lifecycle changes require explicit justification and synchronized updates under RULE 15.
- Expected behaviour: Data truth stays singular and externally consumed contracts stay deliberate.

## RULE 24 — VERIFICATION BEFORE PASS

- Purpose: Make `PASS` a proof statement, not an opinion.
- Requirements: Validate changes at the correct level for the risk: unit, integration, workflow, AI, contract, regression, acceptance, or manual QA. Use the repository-supported runtime when version-sensitive validation matters.
- Expected behaviour: `PASS` is returned only when the claimed verification actually ran and passed.

## RULE 25 — RESPECT EXECUTION MODE

- Purpose: Prevent accidental violations of task boundaries.
- Requirements: If a STEP is read-only, no-code-change, no-commit, or otherwise restricted, obey that mode exactly. Do not modify code, schedules, configuration, deployment, or history when the mode forbids it.
- Expected behaviour: Operational constraints are treated as hard boundaries, not suggestions.

## RULE 26 — NO HIDDEN REFACTORING

- Purpose: Keep cleanup honest.
- Requirements: Do not present architecture changes, contract changes, ownership changes, or workflow changes as harmless cleanup. If a refactor changes externally relevant behavior, treat it as a real product or architecture change.
- Expected behaviour: Cleanup remains surgical, explicit, and reviewable.

## RULE 27 — FAIL FAST

- Purpose: Keep `PRODUCT-E2E` steps controlled, small, and low-risk.
- Requirements: Execute `PRODUCT-E2E` scenarios strictly in order. When the first blocking defect appears, stop, fix only that root cause, run regression, re-run the failed step, and stop once it passes. Do not continue to later user actions in the same STEP.
- Expected behaviour: One blocking failure equals one `PRODUCT-E2E` step, and each code change is traceable to one failed user action.

--------------------------------
CONSTITUTION CHANGE POLICY
--------------------------------

New rules may only be added when:

- an actual engineering problem exposed a missing principle;
- the new rule does not duplicate an existing rule;
- the rule is expected to remain useful long-term.

Do not add rules for one-off situations.

Version History

v1.0

- RULE 1–27 consolidated
- Single canonical source established
- FAIL FAST introduced
- PRODUCT-E2E workflow established
- Local Optimization Audit integrated
- Production-first workflow finalized
