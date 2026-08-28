import { findAdminPromptCatalogEntryByAgentKey, findAdminPromptCatalogEntriesByPromptId, type AdminPromptCatalogEntry } from './read.service.js'

export type PromptSaveAnalysisState = 'passed' | 'failed' | 'idle'
export type PromptSaveValidationState = 'passed' | 'failed' | 'idle'
export type PromptSaveRuntimeState = 'passed' | 'failed' | 'idle'

export interface PromptVerificationEvidence {
  promptHash: string
  validationState: 'passed'
  analysisState: 'passed'
  testState: 'passed'
  regressionState: 'passed'
  testRunId: string
  regressionRunId: string
}

export interface PromptSaveGateInput {
  name: string
  content: string
  agentKey?: string | null
  promptId?: string | null
  analysisState?: PromptSaveAnalysisState | null
  validationState?: PromptSaveValidationState | null
  testState?: PromptSaveRuntimeState | null
  regressionState?: PromptSaveRuntimeState | null
  draftTestEvidenceVerified?: boolean
  regressionEvidenceVerified?: boolean
}

export interface PromptSaveGateResult {
  ok: boolean
  code?:
    | 'name_required'
    | 'content_required'
    | 'agent_key_required'
    | 'agent_key_invalid'
    | 'prompt_id_invalid'
    | 'validation_failed'
    | 'analysis_failed'
    | 'draft_test_failed'
    | 'regression_failed'
    | 'draft_test_evidence_missing'
    | 'regression_evidence_missing'
}

export interface PromptActivationGateResult {
  ok: boolean
  code?:
    | 'runtime_registration_missing'
    | 'provider_policy_missing'
    | 'prompt_verification_missing'
    | 'validation_failed'
    | 'analysis_failed'
    | 'draft_test_failed'
    | 'regression_failed'
}

function resolveCatalogEntry(input: PromptSaveGateInput): AdminPromptCatalogEntry | null {
  if (input.agentKey) {
    return findAdminPromptCatalogEntryByAgentKey(input.agentKey) ?? null
  }

  const matches = findAdminPromptCatalogEntriesByPromptId(input.name)
  return matches.length === 1 ? matches[0] ?? null : null
}

export function validatePromptSaveGate(input: PromptSaveGateInput): PromptSaveGateResult {
  if (!input.name.trim()) return { ok: false, code: 'name_required' }
  if (!input.content.trim()) return { ok: false, code: 'content_required' }

  const catalogEntry = resolveCatalogEntry(input)
  if (!catalogEntry) {
    return { ok: true }
  }

  if (!input.agentKey?.trim()) return { ok: false, code: 'agent_key_required' }
  if (catalogEntry.agentKey !== input.agentKey) return { ok: false, code: 'agent_key_invalid' }

  const promptId = input.promptId?.trim() || input.name
  if (catalogEntry.promptId !== promptId) return { ok: false, code: 'prompt_id_invalid' }
  if (input.validationState !== 'passed') return { ok: false, code: 'validation_failed' }
  if (input.analysisState !== 'passed') return { ok: false, code: 'analysis_failed' }
  if (catalogEntry.capabilityType === 'LIVE_AGENT') {
    if (input.testState !== 'passed') return { ok: false, code: 'draft_test_failed' }
    if (input.regressionState !== 'passed') return { ok: false, code: 'regression_failed' }
    if (!input.draftTestEvidenceVerified) return { ok: false, code: 'draft_test_evidence_missing' }
    if (!input.regressionEvidenceVerified) return { ok: false, code: 'regression_evidence_missing' }
  }

  return { ok: true }
}

export function validateLiveAgentActivationGate(params: {
  runtimeRegistered: boolean
  providerPolicy: string | null
  verification?: PromptVerificationEvidence | null
}): PromptActivationGateResult {
  if (!params.runtimeRegistered) {
    return { ok: false, code: 'runtime_registration_missing' }
  }

  if (!params.providerPolicy) {
    return { ok: false, code: 'provider_policy_missing' }
  }

  if (!params.verification) {
    return { ok: false, code: 'prompt_verification_missing' }
  }

  if (params.verification.validationState !== 'passed') {
    return { ok: false, code: 'validation_failed' }
  }

  if (params.verification.analysisState !== 'passed') {
    return { ok: false, code: 'analysis_failed' }
  }

  if (params.verification.testState !== 'passed') {
    return { ok: false, code: 'draft_test_failed' }
  }

  if (params.verification.regressionState !== 'passed') {
    return { ok: false, code: 'regression_failed' }
  }

  if (
    !params.verification.promptHash.trim() ||
    !params.verification.testRunId.trim() ||
    !params.verification.regressionRunId.trim()
  ) {
    return { ok: false, code: 'prompt_verification_missing' }
  }

  return { ok: true }
}
