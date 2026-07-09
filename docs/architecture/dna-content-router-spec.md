# DNA Content Router Spec

Date: 2026-07-09  
Project: `starway-studio`  
Mode: audit-only, no runtime code changes

## Goal

Design an `Architecture Context Router` layer that reads the existing DNA profile sources and routes them into reusable output surfaces:

- content scenarios
- production tasks
- landing code/config
- Telegram / MiniApp flow config

This spec is based only on current repo facts. It does not add implementation.

## 1. Existing DNA Sources

### 1.1 `promptCompiler.ts` is the current DNA-to-prompt assembler

Current role:

- reads the active profile contract
- loads lexicon by `profileKey`
- loads active `CampaignMemory`
- compiles a provider-specific prompt for generation

Evidence:

- `backend/src/modules/ai-assistant/promptCompiler.ts:10-16`
  `AiBehaviorProfile` shape currently used by compiler: `key`, `systemAnchor`, `supportedProtocols`, `supportedOutputs`
- `backend/src/modules/ai-assistant/promptCompiler.ts:32-49`
  `compilePrompt()` loads `prisma.lexicon.findMany(...)` and `prisma.campaignMemory.findFirst(...)`
- `backend/src/modules/ai-assistant/promptCompiler.ts:51-75`
  `Lexicon.REQUIRED` and `Lexicon.FORBIDDEN` are injected into the final prompt together with campaign memory fields

What it currently generates:

- prompt text for AI generation, not landing code and not Telegram flows directly

Current product usage:

- sales-assistant / AI content generation path

Evidence:

- `backend/src/modules/sales-assistant/sales-assistant.service.ts:169-210`
  legacy generation path resolves profile and builds prompt data for content generation
- `backend/src/modules/sales-assistant/sales-assistant.service.ts:442-477`
  `generateContent()` switches between legacy and DNA orchestration for content generation

### 1.2 `UserAiWorkspace` is the current profile container / activation switch

Current role:

- binds a user to an active DNA profile
- stores allowed models and token budget
- stores generated artifacts through `SalesAssistantGeneration`

Evidence:

- `packages/db/prisma/schema.prisma:2138-2149`
  `UserAiWorkspace` fields: `userId`, `isActive`, `allowedModels`, `maxTokensPerMonth`, `usedTokensThisMonth`, `activeProfileId`
- `packages/db/prisma/schema.prisma:2181-2195`
  `SalesAssistantGeneration` stores generated artifact results by `workspaceId`
- `backend/src/modules/sales-assistant/sales-assistant.service.ts:156-167`
  `getWorkspace()` selects `activeProfile` and workspace limits from `userAiWorkspace`
- `backend/src/core/dna/storage/dna.storage.ts:10-25`
  DNA artifacts persist into `SalesAssistantGeneration` only when `workspaceId` is present

What it currently generates:

- nothing directly; it is a runtime ownership / persistence context

### 1.3 `AiBehaviorProfile` + `Lexicon` are the closest thing to reusable DNA schema today

Current role:

- define profile identity, supported protocols, supported outputs
- define required / forbidden vocabulary by profile

Evidence:

- `packages/db/prisma/schema.prisma:2152-2166`
  `AiBehaviorProfile` fields: `key`, `name`, `description`, `systemAnchor`, `cascadeOrder`, `supportedOutputs`, `supportedProtocols`
- `packages/db/prisma/schema.prisma:2198-2213`
  `LexType` and `Lexicon` model define `REQUIRED` / `FORBIDDEN` words by `profileKey`
- `backend/src/modules/ai-assistant/promptCompiler.ts:64-75`
  `supportedProtocols` and `supportedOutputs` are already used as router-like constraints

### 1.4 `CampaignMemory` is part of the effective DNA context today

Current role:

- adds launch context, audience temperature, objections, resistance

Evidence:

- `packages/db/prisma/schema.prisma:2215-2227`
  `CampaignMemory` fields: `launchContext`, `audienceTemp`, `objections`, `resistance`, `isActive`
- `backend/src/modules/ai-assistant/promptCompiler.ts:46-62`
  these fields are appended into the prompt context

This means the practical DNA input is already wider than `Lexicon` alone.

## 2. Existing DNA-to-output patterns

### 2.1 Reference pattern: `abTest.results.ts` already does "segment -> personalized scenario"

This is the strongest in-repo example of the router pattern the new layer should generalize.

Pattern:

1. classify the user into a segment
2. map that segment to a content definition
3. transform definition into output blocks
4. render those blocks in the delivery surface

Evidence:

- `backend/src/products/ab-system/content/abTest.results.ts:69-102`
  `AbTestResultDefinition` is a structured scenario contract with `msg1`, `msg2_*`, `dojim*`, CTA fields, and `blocks`
- `backend/src/products/ab-system/content/abTest.results.ts:561-579`
  `AB_TEST_RESULTS_BASE` is normalized into `AB_TEST_RESULTS`, and `result.blocks = buildAbTestResultBlocks(...)`
- `backend/src/products/ab-system/content/abTest.results.ts:581-610`
  `buildAbTestResultBlocks()` converts segment result content into delivery blocks
- `backend/src/products/ab-system/content/abTest.results.ts:648-651`
  `getAbTestResultDefinition(resultKey)` returns the scenario for the detected segment
- `backend/src/products/ab-system/telegram/abTest.views.ts:750-844`
  `dispatchAbTestResultSequence()` reads `resultDef.blocks` and turns them into Telegram sends

Why this matters:

- this is already a real "DNA/diagnosis -> scenario -> channel output" chain
- the future router should generalize this pattern instead of inventing a separate competing one

### 2.2 `TEST_DRIVE_V2` is a second scenario surface pattern

Evidence:

- `backend/src/products/ab-system/content/abTest.results.ts:105-117`
  `TestDriveResultSurface` / `TestDriveFollowupSurface` define structured delivery surfaces
- `backend/src/products/ab-system/content/abTest.results.ts:667-745`
  `resolveTestDriveVersion()`, `getTestDriveResultSurface()`, `getTestDriveInsideSurface()` map state into structured surfaces with `bodyLines`, `blocks`, `buttons`

Important note:

- these helpers are valid structural references for router output shape
- but as of the current audit they are not the primary production result-delivery path; `dispatchAbTestResultSequence()` still consumes `AbTestResultDefinition.blocks`

### 2.3 Followups are already a scenario expansion layer

Evidence:

- `backend/src/products/ab-system/content/abTest.followups.ts:22-27`
  `FollowupCopy` shape: `title`, `body`, `cta`, `blocks`
- `backend/src/products/ab-system/content/abTest.followups.ts:53-72`
  `AbTestFollowupTimerId` enumerates timed scenario outputs
- `backend/src/products/ab-system/content/abTest.followups.ts:80-125`
  text and media blocks are normalized/interpolated before delivery
- `backend/src/products/ab-system/content/abTest.followups.ts:131-260`
  per-segment followup copies already exist as structured content, not raw send calls

This is a good reference for `contentScenario.followups`.

## 3. Output matrix

| Output type | Generator exists now? | Where exactly |
|---|---|---|
| Content scenarios | Yes | `backend/src/products/ab-system/content/abTest.results.ts:69-102`, `:561-610`, `:648-745`; `backend/src/products/ab-system/content/abTest.followups.ts:22-27`, `:53-72`, `:131-260` |
| Production tasks | Partial, but not as a first-class router output | Static task-like lists exist in `apps/web/src/features/ai-funnel-landing/services/landing.content.ts:55-67` (`builderSteps`) and operating instructions index exists in `docs/dev-skills/MASTER-SKILLS.md:1-58`; no reusable backend generator currently emits `productionTasks` as a typed artifact |
| Landing code / landing config | Partial | Static landing content/config exists in `apps/web/src/features/landings/focus/content/focus.content.ts:2-240`, `apps/web/src/features/ab-test-landing/config/landing.config.ts:1-104`, `apps/web/src/features/ai-funnel-landing/services/landing.content.ts:3-67`; `apps/web/src/features/landing/components/CreateLandingForm.tsx:20-74` creates landing entities through API, but does not generate code/config from DNA |
| Telegram MiniApp / bot logic | Partial: config-driven content + hardcoded handlers | Config-driven flow contracts exist in `backend/src/core/flow-builder/flowTemplates.ts:3-33`, `backend/src/core/flow-builder/flowBuilder.ts:12-101`; real AB result delivery is partly config-driven via `abTest.results.ts` blocks but rendered imperatively in `backend/src/products/ab-system/telegram/abTest.views.ts:750-930`; MiniApp UI is mostly hardcoded view-model composition in `apps/web/src/features/social/hooks/useMiniAppViewModel.ts:50-97` and `apps/web/src/features/social/pages/MiniAppPage.tsx:34-245` |

## 4. Current architecture reading

### 4.1 There is already a product-agnostic DNA core

Evidence:

- `backend/src/core/dna/contracts/dna.contracts.ts:22-155`
  generic concepts already exist: `DnaRuntimeChannel`, `DnaPipelineInput`, `DnaArtifact`, `DnaPipelineRoute`, `DnaPipelineRunRequest`, `DnaPipelineRunResult`
- `backend/src/core/dna/orchestrator/dna.orchestrator.ts:7-38`
  generic `runPipeline(request)` orchestrates routing and execution
- `backend/src/core/dna/pipelines/dna.pipeline.ts:13-94`
  generic execution lifecycle already exists: `PLAN -> EXECUTE -> VALIDATE -> FORMAT -> STORE -> QUEUE -> DISTRIBUTE`
- `backend/src/core/dna/runtime/dna.prompt-registry.ts:13-77`
  prompt builders already branch by artifact family: sales-assistant, mentor, content-studio

### 4.2 But the current DNA core still lives inside backend and still targets content artifacts first

Evidence:

- `backend/src/core/dna/runtime/dna.adapters.ts:5-25`
  the current adapter is from `SalesAssistantGenerateBody` into `DnaPipelineRunRequest`
- `backend/src/core/dna/storage/dna.storage.ts:15-24`
  persistence writes only into `SalesAssistantGeneration`
- `backend/src/modules/sales-assistant/sales-assistant.service.ts:448-477`
  DNA orchestration is currently entered from the sales-assistant service

Conclusion:

- the conceptual core is already reusable
- the current wiring is still backend-local and sales-assistant-centric

## 5. Recommendation: (b) standalone package

### Recommendation

Choose **(б) a new standalone package**, e.g. `packages/router/`, with thin adapters in backend and frontend.

### Why not (a) backend product service

If the router is placed under `backend/src/products/`, it will inherit product-local assumptions too early:

- current best reference pattern lives in `products/ab-system/*`
- the stated target is broader than Starway and broader than a single bot funnel
- MiniApp, landing, and production-task outputs should be consumable outside a Telegram/backend runtime

### Why (b) is the better fit

1. The stated target is multi-SaaS, not Starway-only.
2. Existing `core/dna/contracts` are already product-agnostic in naming and shape:
   `backend/src/core/dna/contracts/dna.contracts.ts:22-155`
3. Existing router-like logic already separates route, pipeline, artifact, telemetry:
   `backend/src/core/dna/orchestrator/dna.orchestrator.ts:7-38`
4. Landing and MiniApp consumers live outside backend:
   `apps/web/src/features/landings/focus/content/focus.content.ts:2-240`
   `apps/web/src/features/social/pages/MiniAppPage.tsx:34-245`

### Practical architecture consequence

Best target split:

- `packages/router/`
  pure contracts + source normalization + output mapping rules
- backend adapters
  read Prisma-backed DNA sources and invoke router
- frontend adapters
  consume router-produced landing / MiniApp config

This avoids binding the router to Telegram runtime, Prisma, or a single product tree.

## 6. Minimal contract proposal

This section proposes **types only**, intentionally minimal, and grounded in existing shapes.

```ts
interface DnaProfile {
  userId: string
  workspaceId?: string | null
  activeProfileKey: string
  allowedModels: string[]
  supportedOutputs: string[]
  supportedProtocols: Record<string, string>
  lexicon: {
    required: string[]
    forbidden: string[]
  }
  campaignMemory?: {
    launchContext: string
    audienceTemp: string
    objections: string
    resistance: string
  } | null
}

interface RouterOutput {
  contentScenario: {
    title?: string
    bodyLines?: string[]
    blocks?: unknown[]
    followups?: Record<string, {
      title: string
      body: string
      cta?: string
      blocks?: unknown[]
    }>
  }
  productionTasks: string[]
  landingCode?: {
    hero?: {
      eyebrow: string
      title: string
      subtitle: string
      bullets: string[]
    }
    problemCards?: Array<{ title: string; text: string }>
    programSteps?: Array<{ day: string; title: string; result: string }>
    planTiers?: Array<{ id: string; name: string; oldPrice: string; price: string; features: string[] }>
    builderSteps?: string[]
  }
  telegramFlowConfig: {
    id: string
    title: string
    body: readonly string[]
    buttons: readonly unknown[][]
    blocks: readonly Array<{
      type: string
      tone: 'soft' | 'behavioral' | 'focused' | 'strategic' | 'continuation'
      priority: number
      title?: string
      body?: readonly string[]
    }>
  }
}
```

## 7. Field justification

### `DnaProfile`

- `userId`, `workspaceId`
  from `backend/src/core/dna/contracts/dna.contracts.ts:24-30`
  because current DNA runtime already routes with `DnaRuntimeUserContext`
- `activeProfileKey`
  from `packages/db/prisma/schema.prisma:2146-2147`, `:2153-2158`
  because workspace activation is mediated through `activeProfileId` and profile `key`
- `allowedModels`
  from `packages/db/prisma/schema.prisma:2142-2145`
  because router should know execution constraints, not only creative intent
- `supportedOutputs`, `supportedProtocols`
  from `packages/db/prisma/schema.prisma:2159-2161` and `backend/src/modules/ai-assistant/promptCompiler.ts:64-68`
  because they are already the closest existing output-routing contract
- `lexicon.required` / `lexicon.forbidden`
  from `packages/db/prisma/schema.prisma:2198-2213` and `backend/src/modules/ai-assistant/promptCompiler.ts:51-58`
- `campaignMemory`
  from `packages/db/prisma/schema.prisma:2215-2227` and `backend/src/modules/ai-assistant/promptCompiler.ts:60-62`

### `RouterOutput.contentScenario`

Derived from existing content scenario shapes:

- `title`, `bodyLines`
  mirror `TestDriveResultSurface`
  `backend/src/products/ab-system/content/abTest.results.ts:108-117`
- `blocks`
  mirrors `AbTestResultDefinition['blocks']`
  `backend/src/products/ab-system/content/abTest.results.ts:97-102`
- `followups`
  mirrors `FollowupCopy`
  `backend/src/products/ab-system/content/abTest.followups.ts:22-27`

### `RouterOutput.productionTasks`

There is no first-class runtime type for production tasks today.

Closest existing source forms:

- static step list in `apps/web/src/features/ai-funnel-landing/services/landing.content.ts:55-67`
- operational skill/index docs in `docs/dev-skills/MASTER-SKILLS.md:1-58`

Because no stronger typed source exists today, `string[]` is the minimal honest contract.

TODO:

- introduce a dedicated `ProductionTask` type only after a real runtime producer exists

### `RouterOutput.landingCode`

This should be **config**, not raw JSX/TSX source.

Grounding:

- `HeroContent`, `CardItem`, `ProgramStep`, `PlanTier`
  `apps/web/src/features/ai-funnel-landing/types/landing.types.ts:1-27`
- static landing content sources:
  `apps/web/src/features/ai-funnel-landing/services/landing.content.ts:3-67`
  `apps/web/src/features/landings/focus/content/focus.content.ts:2-240`

Reason:

- existing landings are content/config-driven at the data layer, even when rendered by handwritten components

### `RouterOutput.telegramFlowConfig`

Grounding:

- `TelegramFlow`, `TelegramButton`, `TelegramFlowBlock`
  `backend/src/core/flow-builder/flowTemplates.ts:3-33`
- `buildAbTestResultFlow()` demonstrates the desired abstraction shape
  `backend/src/core/flow-builder/flowBuilder.ts:77-101`

Reason:

- router should output a config surface that existing bot runtimes can render
- router should not output new Telegram handlers or direct send calls

## 8. Non-goals and TODOs

### Non-goals

- generating raw `.tsx` / `.ts` files
- writing directly into `products/ab-system/*`
- replacing Telegram handlers
- replacing scheduler timing

### TODOs the repo does not yet answer

1. No shared first-class `ProductionTask` runtime type exists yet.
2. No shared first-class landing AST/schema exists across `focus`, `ab-test-landing`, and `ai-funnel-landing`.
3. `Lexicon` and `UserAiWorkspace` alone do not fully describe persona/campaign context; `CampaignMemory` is currently required in practice.
4. No unified cross-channel router output currently links Telegram scenario blocks and MiniApp screen config in one contract.

## 9. Risks

### 9.1 Direct writes into `ab-system/content/*` are unsafe right now

Do **not** let the future router write directly into:

- `backend/src/products/ab-system/content/abTest.results.ts`
- `backend/src/products/ab-system/content/abTest.followups.ts`
- `backend/src/core/state-machine/flowTimingFoundation.ts`

Reason:

- the AB system result-delivery path is still under stabilization
- dojim offset behavior is still being verified
- mixing generator writes with stabilization work will destroy traceability

Current production-sensitive chain:

- `backend/src/products/ab-system/content/abTest.results.ts:561-610`
- `backend/src/products/ab-system/telegram/abTest.views.ts:750-930`
- `backend/src/products/ab-system/content/abTest.followups.ts:80-125`

### 9.2 Concrete freeze rule

Until:

- STEP 5 result-delivery trace is fully closed
- STEP 3 dojim offsets are confirmed stable in production

the router must treat `backend/src/products/ab-system/content/*` as **read-only reference content**, not as a generation target.

### 9.3 Safe first integration path

Phase 1 should be:

1. read DNA sources
2. produce normalized `RouterOutput`
3. log / preview / persist router output separately
4. let existing products opt into consuming that output

Not:

1. generate router output
2. overwrite stable funnel source files
3. couple router deployment to AB-system production behavior

## 10. Final recommendation

Build the router as **(б) a standalone package** with adapters.

Why:

- matches the stated multi-SaaS goal
- aligns with the already generic `core/dna/*` contracts
- avoids contaminating stable funnel source-of-truth files
- lets Starway consume the router first without making Starway the router's permanent home
