# Executive Summary

This audit covers 130 documentation files under `/docs` (`.md`, `.json`, `.html`, `.txt`) and classifies each document by purpose, domain and lifecycle status without changing the existing repository structure.

The documentation system already contains a strong canonical core in `docs/architecture/`, `docs/client/`, and `docs/dev-skills/`, but it is diluted by transitional mirrors, duplicated product/methodology descriptions, outdated QA instructions, and several weakly connected documents that are easy to miss.

Most serious risks:
- Canonical platform knowledge is duplicated across `docs/architecture/`, `docs/platform/`, and `docs/automation/`.
- Product, pricing, FOCUS, and ABSystem messaging are repeated in multiple agent-facing documents without one declared business-owned truth source.
- Several test and temporary documents remain in active documentation zones even though they describe outdated behavior.
- Discovery/navigation is inconsistent: some important files exist, but are not strongly linked from the visible hub structure.

Status distribution:
- ACTIVE: 66
- DUPLICATE: 8
- OBSOLETE: 2
- ARCHIVE: 14
- UNKNOWN: 40

# Documentation Inventory

## `docs/README.md`
- Purpose: Top-level documentation index and navigation hub.
- Domain: Documentation root
- Status: ACTIVE

## `docs/agents/ai-assistant-bot/00-SURGICAL-SYSTEM-UPDATE.md`
- Purpose: Document about "# Surgical Guardrails Update".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-assistant-bot/10-TEST-QUESTIONS.md`
- Purpose: Document about "# 10 Test Questions".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-assistant-bot/ABSystem-Methodology.md`
- Purpose: Assistant-bot variant of ABSystem methodology guidance.
- Domain: AI agent definitions
- Status: DUPLICATE

## `docs/agents/ai-assistant-bot/ANALYSIS-strict-guardrails.md`
- Purpose: Document about "# Analysis: Strict Guardrails".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-assistant-bot/FAQs-Common-Objections.md`
- Purpose: Document about "# Часті Питання і Заперечення".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-assistant-bot/FOCUS-Overview.md`
- Purpose: Assistant-bot variant of FOCUS product overview.
- Domain: AI agent definitions
- Status: DUPLICATE

## `docs/agents/ai-assistant-bot/Pricing-and-Packages.md`
- Purpose: Document about "# Ціни і Пакети STARWAY Studio".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-assistant-bot/README.md`
- Purpose: Document about "# AI Assistant Bot Knowledge".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-content/README.md`
- Purpose: Document about "# AI Content".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-content/SKILL-creative-ads.md`
- Purpose: Document about "# SKILL: Creative Ads — Відео та Рілси ABSystem".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-content/SKILL-output-engine.md`
- Purpose: Document about "# SKILL: output-engine".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-content/dna-content-generator-offer.md`
- Purpose: Document about "# SYSTEM PROMPT OVERRIDE: DNA-Based Premium Content & Offer Architect".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-mentor/README.md`
- Purpose: Document about "# AI Mentor".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-mentor/SKILL__AI_AGENT__CLAUDE_ARCHITECTURE.md`
- Purpose: Document about "# SKILL: AI Agent Architecture — Claude as Funnel Manager".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-mentor/SKILL__MANAGER_BOT__USER_GUIDE.md`
- Purpose: Document about "# SKILL: Manager Bot — User Guide для коуча".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-mentor/comeback-flows.md`
- Purpose: Document about "# COMEBACK FLOWS".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-mentor/focus-course-materials.md`
- Purpose: Document about "# FOCUS Offer FAQ".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-mentor/methodology-absystem.md`
- Purpose: Document about "# TOV Mentor Examples".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-seller/README-pack.md`
- Purpose: Packed duplicate of AI seller documentation.
- Domain: AI agent definitions
- Status: DUPLICATE

## `docs/agents/ai-seller/README.md`
- Purpose: Document about "# AI Seller".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-seller/ai-seller-rules.md`
- Purpose: Document about "# AI Seller Rules".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-seller/ai-seller-system-prompt.md`
- Purpose: Document about "# AI Seller System Prompt — Starway Studio".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-seller/cold-leads.md`
- Purpose: Document about "# COLD LEADS ENGINE".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-seller/hot-leads.md`
- Purpose: Document about "# HOT LEADS ENGINE".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-seller/objections.md`
- Purpose: Document about "# OBJECTIONS ENGINE".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-seller/warm-leads.md`
- Purpose: Document about "# WARM LEADS ENGINE".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-strategist/README.md`
- Purpose: Document about "# AI Strategist".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-strategist/business-model-full.md`
- Purpose: Document about "# 0006 Business Model".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-strategist/competitor-analysis.md`
- Purpose: Document about "# Product Ownership Map".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-strategist/customer-avatar-deep.md`
- Purpose: Document about "# 0007 Customer Avatar".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/ai-strategist/offer-methodology.md`
- Purpose: Document about "# SKILL: $100M Offer Builder × AB Methodology".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/shared/AWARENESS-FUNNEL-METHODOLOGY.md`
- Purpose: Document about "# SKILL: Контент-машина ABSystem".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/shared/CLIENT-DNA-METHODOLOGY.md`
- Purpose: Document about "# CLIENT DNA METHODOLOGY".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/shared/OPERATING-RULES.md`
- Purpose: Document about "# OPERATING RULES".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/agents/shared/STARWAY-DNA-LEXICON.md`
- Purpose: Document about "# STARWAY DNA Lexicon".
- Domain: AI agent definitions
- Status: UNKNOWN

## `docs/architecture/ARCHITECTURE_INTEGRATION_MAP.md`
- Purpose: Document about "# ARCHITECTURE INTEGRATION MAP".
- Domain: Platform architecture
- Status: UNKNOWN

## `docs/architecture/PROMPT_REGISTRY.md`
- Purpose: Document about "# PROMPT REGISTRY".
- Domain: Platform architecture
- Status: UNKNOWN

## `docs/architecture/README.md`
- Purpose: Canonical architecture hub and reading order for technical system docs.
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/ai-agent-governance.md`
- Purpose: Document about "# AI Agent Governance".
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/ai-orchestration.md`
- Purpose: Document about "# AI Orchestration".
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/booking-architecture.md`
- Purpose: Document about "# Booking Architecture".
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/callback-map.md`
- Purpose: Document about "# Callback Map".
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/canonical-entry-flow.md`
- Purpose: Document about "# Canonical Entry Flow".
- Domain: Platform architecture
- Status: UNKNOWN

## `docs/architecture/dna-content-router-spec.md`
- Purpose: Document about "# DNA Content Router Spec".
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/event-stream-contract.md`
- Purpose: Document about "# Event Stream Contract".
- Domain: Platform architecture
- Status: UNKNOWN

## `docs/architecture/lifecycle-map.md`
- Purpose: Document about "# Lifecycle Map".
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/notification-routing.md`
- Purpose: Document about "# Notification Routing".
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/platform-control-center.md`
- Purpose: Canonical control-center document for platform topology and document ownership.
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/reliability-architecture.md`
- Purpose: Document about "# Reliability Architecture".
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/subscription-architecture.md`
- Purpose: Document about "# Subscription Architecture".
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/telegram-architecture.md`
- Purpose: Document about "# Telegram Architecture".
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/user-creation-map.md`
- Purpose: Document about "# User Creation Map".
- Domain: Platform architecture
- Status: ACTIVE

## `docs/architecture/user-timeline.md`
- Purpose: Document about "# User Timeline".
- Domain: Platform architecture
- Status: UNKNOWN

## `docs/archive/README.md`
- Purpose: Document about "# Archive".
- Domain: Archive / historical
- Status: ARCHIVE

## `docs/archive/starway-bot-tests.postman_collection.json`
- Purpose: Document containing "{".
- Domain: Archive / historical
- Status: ARCHIVE

## `docs/archive/tov-mentor-examples.md`
- Purpose: Document about "# TOV Mentor Examples".
- Domain: Archive / historical
- Status: ARCHIVE

## `docs/archive/tree.md`
- Purpose: Document containing "/Users/viravira/Documents/starway-studio".
- Domain: Archive / historical
- Status: ARCHIVE

## `docs/archive/user-legacy-drop-runbook-2026-05-23.md`
- Purpose: Document about "# User Legacy Drop Runbook".
- Domain: Archive / historical
- Status: ARCHIVE

## `docs/archive/user-state-consolidation-audit-2026-05-23.md`
- Purpose: Document about "# User State Consolidation Audit (Safe, Non-Breaking)".
- Domain: Archive / historical
- Status: ARCHIVE

## `docs/audit/ab-test-evidence-only-handoff.md`
- Purpose: Document about "# AB Test Evidence-Only Handoff".
- Domain: Audit and governance
- Status: ACTIVE

## `docs/audit/ab-test-landing-review.md`
- Purpose: Document about "# AB Test Landing Review".
- Domain: Audit and governance
- Status: ACTIVE

## `docs/audit/content-engine-single-source-of-truth-adr.md`
- Purpose: Document about "# ADR — Content Engine Single Source of Truth Audit".
- Domain: Audit and governance
- Status: ACTIVE

## `docs/audit/dev-environment-cleanup.md`
- Purpose: Document about "# Dev Environment Cleanup — Starway Studio".
- Domain: Audit and governance
- Status: ACTIVE

## `docs/audit/dojim-engine-consolidation.md`
- Purpose: Document about "# Dojim Engine Consolidation Audit".
- Domain: Audit and governance
- Status: ACTIVE

## `docs/audit/full-funnel-execution-trace.md`
- Purpose: Document about "# Full Funnel Execution Trace".
- Domain: Audit and governance
- Status: ACTIVE

## `docs/audit/prisma-disconnect-forensic.md`
- Purpose: Document about "# Prisma Disconnect Forensic Audit".
- Domain: Audit and governance
- Status: ACTIVE

## `docs/audit/prisma-supabase-compliance-audit.md`
- Purpose: Document about "# Prisma + Supabase + Render Compliance Audit".
- Domain: Audit and governance
- Status: ACTIVE

## `docs/audit/result-delivery-trace.md`
- Purpose: Document about "# Result Delivery Trace".
- Domain: Audit and governance
- Status: ACTIVE

## `docs/audit/senior-architecture-review.md`
- Purpose: Document about "# Senior Architecture Review".
- Domain: Audit and governance
- Status: ACTIVE

## `docs/audit/single-source-of-truth-audit.md`
- Purpose: Document about "# Single Source of Truth Audit — Starway Studio".
- Domain: Audit and governance
- Status: ACTIVE

## `docs/automation/callback-map.md`
- Purpose: Legacy mirror of callback map.
- Domain: Automation architecture (transitional layer)
- Status: DUPLICATE

## `docs/automation/lifecycle-map.md`
- Purpose: Legacy mirror of lifecycle map.
- Domain: Automation architecture (transitional layer)
- Status: DUPLICATE

## `docs/automation/telegram-architecture.md`
- Purpose: Legacy mirror of Telegram architecture.
- Domain: Automation architecture (transitional layer)
- Status: DUPLICATE

## `docs/client/business/product-ownership-map.md`
- Purpose: Document about "# Product Ownership & Boundaries Map".
- Domain: Client/business operations
- Status: ACTIVE

## `docs/client/onboarding/bot-setup-form.html`
- Purpose: Document containing "<!DOCTYPE html>".
- Domain: Client/business operations
- Status: ACTIVE

## `docs/client/onboarding/client-questionnaire-template.md`
- Purpose: Document about "# Бізнес".
- Domain: Client/business operations
- Status: ACTIVE

## `docs/client/onboarding/discovery-call-checklist.md`
- Purpose: Document about "# Discovery Call Checklist".
- Domain: Client/business operations
- Status: ACTIVE

## `docs/client/onboarding/onboarding-process.md`
- Purpose: Document about "# Onboarding Process".
- Domain: Client/business operations
- Status: ACTIVE

## `docs/client/onboarding/site-setup-form.html`
- Purpose: Document containing "<!DOCTYPE html>".
- Domain: Client/business operations
- Status: UNKNOWN

## `docs/client/ops/INSTRUCTION-pulse-setup.md`
- Purpose: Document about "# ІНСТРУКЦІЯ: Пульт пульта — Сайт + Telegram-бот для коуча".
- Domain: Client/business operations
- Status: ACTIVE

## `docs/client/ops/INSTRUCTION-saas-update.md`
- Purpose: Document about "# ІНСТРУКЦІЯ: Як оновлювати SaaS ABSystem".
- Domain: Client/business operations
- Status: ACTIVE

## `docs/client/svoia-nadya/SKILL-coach.md`
- Purpose: Document about "# SKILL: СВОЯ — AI-асистент коуча  КОУЧА".
- Domain: Client/business operations
- Status: UNKNOWN

## `docs/client/svoia-nadya/SKILL-weekly-content-os.md`
- Purpose: Document about "# SKILL: Weekly Content Operating System".
- Domain: Client/business operations
- Status: UNKNOWN

## `docs/dev-skills/MASTER-SKILLS.md`
- Purpose: Document about "# Master Skills — Starway Studio".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/README.md`
- Purpose: Document about "# docs/dev-skills".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/SKILL-bot-copy.md`
- Purpose: Document about "# SKILL: Bot Copy — тон і стиль повідомлень бота".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/SKILL-user-creation-governance.md`
- Purpose: Document about "# User Creation Governance".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/SKILL__FUNNEL_AUTOPILOT__ARCHITECT.md`
- Purpose: Document about "# SKILL: Funnel Autopilot — Architecture for Engineers".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/architecture/SKILL-ai-agent-governance.md`
- Purpose: Document about "# SKILL: AI Agent Governance".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/archive/SKILL-ab-test-results.md`
- Purpose: Document about "# SKILL: Вхідний Тест — 5 Результатів і Логіка Бота".
- Domain: Engineering execution skills
- Status: ARCHIVE

## `docs/dev-skills/archive/SKILL-ai-positions.md`
- Purpose: Document about "# SKILL: AI Positions (Archived Redirect)".
- Domain: Engineering execution skills
- Status: ARCHIVE

## `docs/dev-skills/archive/SKILL-master-bot.md`
- Purpose: Document about "# SKILL: Master Coach Bot STARWAY".
- Domain: Engineering execution skills
- Status: ARCHIVE

## `docs/dev-skills/archive/SKILL-must-ban.md`
- Purpose: Document about "# SKILL: MUST/BAN (Archived Redirect)".
- Domain: Engineering execution skills
- Status: ARCHIVE

## `docs/dev-skills/archive/SKILL-stack.md`
- Purpose: Document about "# SKILL: stack".
- Domain: Engineering execution skills
- Status: ARCHIVE

## `docs/dev-skills/archive/SKILL-telegram-channel.md`
- Purpose: Document about "# SKILL: Telegram-Канал ФОКУС by Надя".
- Domain: Engineering execution skills
- Status: ARCHIVE

## `docs/dev-skills/archive/SKILL-ux-copy.md`
- Purpose: Document about "# SKILL: UX-копі для Telegram-бота ABSystem".
- Domain: Engineering execution skills
- Status: ARCHIVE

## `docs/dev-skills/archive/skill-conten.md`
- Purpose: Document about "# SKILL: Контент-машина ABSystem".
- Domain: Engineering execution skills
- Status: ARCHIVE

## `docs/dev-skills/business/SKILL-business-automation.md`
- Purpose: Document about "# SKILL: ABSystem — Повна AI-Автоматизація Бізнесу".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/content/SKILL-instagram-ai-content-automation.md`
- Purpose: Document about "# SKILL: Instagram AI Content Automation".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/developers/SKILL-ai-tools-stack.md`
- Purpose: Document about "# SKILL: AI Tools Stack STARWAY".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/developers/SKILL-auth-webapp.md`
- Purpose: Document about "# SKILL: Авторизація + Telegram WebApp routing".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/developers/SKILL-developer.md`
- Purpose: Document about "## Стек та репозиторій".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/developers/env-architecture.md`
- Purpose: Document about "# Env Architecture".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/orchestration/SKILL-funnel.md`
- Purpose: Document about "# SKILL: funnel".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/orchestration/SKILL-orchestrator.md`
- Purpose: Document about "# SKILL: orchestrator".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/orchestration/SKILL-zoom-booking-orchestration.md`
- Purpose: Document about "# SKILL: Zoom Booking Orchestration".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/payments/SKILL-focus-funnel-fix.md`
- Purpose: Document about "# SKILL: ФОКУС Funnel Fix — Starway Studio".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/payments/SKILL-wayforpay.md`
- Purpose: Document about "# SKILL: WayForPay Integration".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/reliability/SKILL-notification-routing.md`
- Purpose: Document about "# SKILL: Notification Routing".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/reliability/SKILL-scheduler-reliability.md`
- Purpose: Document about "# SKILL: Scheduler Reliability".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/reliability/SKILL-webhook-cors-payload.md`
- Purpose: Document about "# SKILL: Webhook CORS + Payload Parsing".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/reports/SKILL-pdf-reports.md`
- Purpose: Document about "# SKILL: PDF-Звіти ABSystem".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/telegram/SKILL-bot-channel-setup.md`
- Purpose: Document about "## Коли використовувати".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/telegram/SKILL-telegram.md`
- Purpose: Document about "# SKILL: telegram".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/testing/SKILL-ab-test.md`
- Purpose: Document about "# SKILL: AB TEST".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/testing/SKILL-flow-completeness-auditor.md`
- Purpose: Document about "# SKILL: FLOW COMPLETENESS & UX GAP AUDITOR".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/dev-skills/testing/SKILL-product-specification-auditor.md`
- Purpose: Document about "# SKILL: Product Specification Auditor".
- Domain: Engineering execution skills
- Status: ACTIVE

## `docs/platform/README.md`
- Purpose: Legacy platform overview retained as migration bridge to architecture docs.
- Domain: Platform architecture (transitional layer)
- Status: DUPLICATE

## `docs/platform/ai-orchestration.md`
- Purpose: Legacy mirror of AI orchestration architecture.
- Domain: Platform architecture (transitional layer)
- Status: DUPLICATE

## `docs/prompt.md`
- Purpose: Master prompt and prompt registry overview for platform agents.
- Domain: Documentation root
- Status: ACTIVE

## `docs/routes.md`
- Purpose: Route inventory and URL mapping reference.
- Domain: Documentation root
- Status: ACTIVE

## `docs/temporary-overrides.md`
- Purpose: Temporary operational overrides and non-permanent rules.
- Domain: Documentation root
- Status: ACTIVE

## `docs/test-instructions/README.md`
- Purpose: Document about "# Temporary Testing Area".
- Domain: QA and manual verification
- Status: ACTIVE

## `docs/test-instructions/ai-mentor-test.md`
- Purpose: Document about "# AI Mentor Test".
- Domain: QA and manual verification
- Status: ACTIVE

## `docs/test-instructions/ai-seller-test.md`
- Purpose: Document about "# AI Seller Test".
- Domain: QA and manual verification
- Status: ACTIVE

## `docs/test-instructions/coach-schedule-test.md`
- Purpose: Document about "# Coach Schedule Test".
- Domain: QA and manual verification
- Status: ACTIVE

## `docs/test-instructions/smoke-tests.md`
- Purpose: Smoke-test checklist that references older public routes.
- Domain: QA and manual verification
- Status: OBSOLETE

## `docs/test-instructions/zoom-booking-test.md`
- Purpose: Manual test notes for an older Zoom booking flow.
- Domain: QA and manual verification
- Status: OBSOLETE

## `docs/user-creation-runbook.md`
- Purpose: Operational runbook for creating or recovering users.
- Domain: Documentation root
- Status: ACTIVE

# Duplicate Report

- Canonical file: `docs/architecture/platform-control-center.md`
  Duplicate file: `docs/platform/README.md`
  Duplication reason: Platform governance and documentation topology are described twice; the platform file is explicitly a migration-era bridge.

- Canonical file: `docs/architecture/ai-orchestration.md`
  Duplicate file: `docs/platform/ai-orchestration.md`
  Duplication reason: AI orchestration is mirrored across architecture and legacy platform sections.

- Canonical file: `docs/architecture/telegram-architecture.md`
  Duplicate file: `docs/automation/telegram-architecture.md`
  Duplication reason: Telegram architecture appears in both canonical and transitional automation locations.

- Canonical file: `docs/architecture/lifecycle-map.md`
  Duplicate file: `docs/automation/lifecycle-map.md`
  Duplication reason: Lifecycle mapping is duplicated in the automation transition layer.

- Canonical file: `docs/architecture/callback-map.md`
  Duplicate file: `docs/automation/callback-map.md`
  Duplication reason: Callback taxonomy is duplicated in the automation transition layer.

- Canonical file: `docs/prompt.md`
  Duplicate file: `docs/architecture/PROMPT_REGISTRY.md`
  Duplication reason: Prompt registry ownership is split between a root prompt registry and an architecture-scoped registry.

- Canonical file: `docs/agents/ai-seller/README.md`
  Duplicate file: `docs/agents/ai-seller/README-pack.md`
  Duplication reason: The seller package README repeats the seller definition in another file.

- Canonical file: `docs/agents/ai-mentor/methodology-absystem.md`
  Duplicate file: `docs/agents/ai-assistant-bot/ABSystem-Methodology.md`
  Duplication reason: ABSystem methodology is described in multiple agent-specific variants.

- Canonical file: `docs/agents/ai-mentor/focus-course-materials.md`
  Duplicate file: `docs/agents/ai-assistant-bot/FOCUS-Overview.md`
  Duplication reason: FOCUS product description and learning material are repeated across agent packages.

- Canonical file: `docs/architecture/user-creation-map.md`
  Duplicate file: `docs/user-creation-runbook.md`
  Duplication reason: User creation is split between architecture and operational runbook views without an explicit SSOT relationship.

# Single Source Of Truth Violations

- Concept: Platform architecture and governance
  Sources: `docs/architecture/platform-control-center.md`, `docs/platform/README.md`
  Recommended canonical file: `docs/architecture/platform-control-center.md`

- Concept: AI orchestration
  Sources: `docs/architecture/ai-orchestration.md`, `docs/platform/ai-orchestration.md`
  Recommended canonical file: `docs/architecture/ai-orchestration.md`

- Concept: Telegram architecture
  Sources: `docs/architecture/telegram-architecture.md`, `docs/automation/telegram-architecture.md`
  Recommended canonical file: `docs/architecture/telegram-architecture.md`

- Concept: Lifecycle map
  Sources: `docs/architecture/lifecycle-map.md`, `docs/automation/lifecycle-map.md`
  Recommended canonical file: `docs/architecture/lifecycle-map.md`

- Concept: Callback map
  Sources: `docs/architecture/callback-map.md`, `docs/automation/callback-map.md`
  Recommended canonical file: `docs/architecture/callback-map.md`

- Concept: Prompt registry
  Sources: `docs/prompt.md`, `docs/architecture/PROMPT_REGISTRY.md`
  Recommended canonical file: `docs/prompt.md`

- Concept: ABSystem methodology
  Sources: `docs/agents/ai-mentor/methodology-absystem.md`, `docs/agents/ai-assistant-bot/ABSystem-Methodology.md`
  Recommended canonical file: `docs/agents/ai-mentor/methodology-absystem.md`

- Concept: FOCUS product knowledge
  Sources: `docs/agents/ai-mentor/focus-course-materials.md`, `docs/agents/ai-assistant-bot/FOCUS-Overview.md`
  Recommended canonical file: `docs/agents/ai-mentor/focus-course-materials.md`

- Concept: User creation process
  Sources: `docs/architecture/user-creation-map.md`, `docs/user-creation-runbook.md`
  Recommended canonical file: `docs/architecture/user-creation-map.md`

- Concept: Pricing and offers
  Sources: `Multiple agent docs under docs/agents/* and client collateral under docs/client/*`
  Recommended canonical file: No single canonical file exists today; the future canonical location should be a business-owned doc under docs/client/business/

# Obsolete Documents

- `docs/test-instructions/zoom-booking-test.md`: References a legacy Zoom booking path and older manual flow assumptions.
- `docs/test-instructions/smoke-tests.md`: Checks older public miniapp and coach scheduling routes that no longer match the current funnel.
- `docs/platform/ai-orchestration.md`: Superseded by the canonical architecture copy and adds no distinct ownership value.
- `docs/automation/telegram-architecture.md`: Superseded by canonical Telegram architecture in docs/architecture/.
- `docs/automation/lifecycle-map.md`: Superseded by canonical lifecycle map in docs/architecture/.
- `docs/automation/callback-map.md`: Superseded by canonical callback map in docs/architecture/.

# Orphan Documents

These documents are not strongly integrated into the visible navigation structure, are weakly referenced, or are easy to miss despite containing non-trivial knowledge:

- `docs/agents/ai-mentor/SKILL__AI_AGENT__CLAUDE_ARCHITECTURE.md`
- `docs/agents/ai-mentor/SKILL__MANAGER_BOT__USER_GUIDE.md`
- `docs/architecture/ARCHITECTURE_INTEGRATION_MAP.md`
- `docs/architecture/PROMPT_REGISTRY.md`
- `docs/architecture/canonical-entry-flow.md`
- `docs/architecture/event-stream-contract.md`
- `docs/architecture/user-timeline.md`
- `docs/archive/starway-bot-tests.postman_collection.json`
- `docs/client/onboarding/site-setup-form.html`
- `docs/client/svoia-nadya/SKILL-coach.md`
- `docs/client/svoia-nadya/SKILL-weekly-content-os.md`

Primary orphan patterns:
- Important architecture side-docs exist, but are not clearly anchored from the main architecture reading order.
- Several agent and client skill documents are buried inside deep folders without a local index or owner map.
- Archive/testing artifacts remain in the docs tree without clear discovery boundaries beyond the folder name.

# Missing Documentation

- A glossary that defines core business and product terms such as FOCUS, ABSystem, lifecycle states, modules, bots, and funnels.
- A documentation manifest that records owner, status, last review date, and canonicality for each major document set.
- A single business-owned pricing and offer document used as the source for all agent/product collateral.
- A documentation ownership matrix mapping folders to accountable people or teams.
- A contribution and review policy explaining when a document becomes ACTIVE, ARCHIVE, DUPLICATE, or OBSOLETE.
- A top-level dependency map that links major runtime subsystems to their documentation sources.
- A canonical AI-agent registry tying runtime agents, prompts, skills, and bot-facing documents together.
- A local README inside `docs/client/` that explains how business, onboarding, ops, and coach material fit together.
- An archive policy describing when one-off audits and temporary runbooks must move out of active zones.
- A company/product overview document in the business area that explains the full platform at a non-technical level.

# Quality Scores

- Structure: 6/10
- Consistency: 5/10
- Naming: 6/10
- Navigation: 4/10
- Duplication: 3/10
- Maintainability: 5/10
- AI-readiness: 7/10

Rationale: the documentation has a meaningful top-level taxonomy and many detailed technical artifacts, but navigation, canonical ownership, and duplication control are still too weak for a stable SSOT-based system.

# Critical Risks

- Conflicting copies of architecture and orchestration documents can cause contributors or AI agents to update the wrong file.
- Pricing, offer, and product messaging are fragmented across agent-facing documents, which can leak inconsistent commercial claims.
- Obsolete QA instructions can generate false bug reports or invalid acceptance criteria.
- Weakly linked architecture side-docs may silently drift because they are not in the main reading path.
- Prompt governance is split across multiple registries, increasing the chance of runtime and documentation mismatch.
- There is no durable ownership/review system, so any cleanup performed in STEP 2 can regress over time.

# Top 20 Highest Priority Problems

1. docs/platform/README.md duplicates docs/architecture/platform-control-center.md instead of acting as a lightweight pointer.
2. docs/platform/ai-orchestration.md duplicates docs/architecture/ai-orchestration.md.
3. docs/automation/* mirrors core architecture docs instead of staying as compatibility redirects only.
4. There is no single business-owned pricing/offer SSOT.
5. ABSystem methodology exists in multiple variants with no declared canonical file.
6. FOCUS product knowledge is split across assistant-bot and mentor materials.
7. docs/prompt.md and docs/architecture/PROMPT_REGISTRY.md compete for prompt-registry ownership.
8. docs/agents/ai-seller/README-pack.md duplicates docs/agents/ai-seller/README.md.
9. docs/test-instructions/zoom-booking-test.md describes an outdated Zoom booking flow.
10. docs/test-instructions/smoke-tests.md validates outdated public routes.
11. docs/client/ lacks its own navigation README.
12. docs/architecture/ARCHITECTURE_INTEGRATION_MAP.md is not strongly discoverable from the main hub.
13. docs/architecture/canonical-entry-flow.md is easy to miss despite describing an important system concept.
14. docs/architecture/event-stream-contract.md is too isolated for a cross-cutting runtime contract.
15. docs/architecture/user-timeline.md is weakly connected to the main architecture reading path.
16. docs/agents/ai-mentor/SKILL__AI_AGENT__CLAUDE_ARCHITECTURE.md has no strong ownership/navigation trail.
17. docs/agents/ai-mentor/SKILL__MANAGER_BOT__USER_GUIDE.md is disconnected from client ops and onboarding docs.
18. One-off audits are split across docs/audit/ and docs/archive/ without a clear lifecycle rule.
19. Temporary QA and override docs remain in active documentation zones without expiry metadata.
20. There is no docs manifest with owner/status/review cadence to preserve cleanup results after migration.

# Recommended Migration Strategy

1. Freeze canonical truth zones before moving any content.
   Use `docs/architecture/`, `docs/client/`, and `docs/dev-skills/` as the only long-term active roots, and explicitly mark `docs/platform/` and `docs/automation/` as temporary compatibility layers to be collapsed.
2. Resolve mirror duplication first.
   Convert platform/automation duplicate pages into pointer stubs or archive them after preserving canonical links to the architecture originals.
3. Consolidate product, pricing, and methodology truth.
   Choose one canonical business-owned pricing/offer file and one canonical methodology file for ABSystem/FOCUS, then downgrade all variant copies to references or archive material.
4. Separate active documentation from historical and temporary material.
   Move obsolete smoke tests, one-off audits, and raw archive artifacts behind explicit historical boundaries, while retaining discoverability for records that still matter.
5. Add governance metadata.
   For every major document set, define owner, canonical status, review cadence, and allowed duplicate/reference behavior so STEP 2 can migrate safely without reintroducing entropy.
6. Repair navigation after consolidation.
   Ensure every remaining important doc is reachable from a visible hub, especially orphaned architecture side-docs and buried agent/client skill documents.
7. Finish with a manifest-driven cleanup pass.
   After migration, maintain a machine-readable or clearly structured manifest so future prompts can audit drift without re-scanning the entire repository.

This report is intentionally migration-oriented: it identifies what exists, where truth is duplicated, which files are obsolete or weakly connected, and where missing governance must be added in STEP 2.
