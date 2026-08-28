import { describe, expect, it } from 'vitest'

import { validateLiveAgentActivationGate, validatePromptSaveGate } from '../../../../../src/modules/admin/prompts/lifecycle.service.js'

describe('prompt lifecycle gates', () => {
  it('blocks empty prompt save', () => {
    expect(validatePromptSaveGate({
      name: 'sales-agent-prompt',
      content: '',
      agentKey: 'sales',
      promptId: 'sales-agent-prompt',
      validationState: 'passed',
      analysisState: 'passed',
    })).toEqual({ ok: false, code: 'content_required' })
  })

  it('blocks save when analysis failed', () => {
    expect(validatePromptSaveGate({
      name: 'sales-agent-prompt',
      content: 'updated prompt',
      agentKey: 'sales',
      promptId: 'sales-agent-prompt',
      validationState: 'passed',
      analysisState: 'failed',
      testState: 'passed',
      regressionState: 'passed',
      draftTestEvidenceVerified: true,
      regressionEvidenceVerified: true,
    })).toEqual({ ok: false, code: 'analysis_failed' })
  })

  it('blocks live-agent save when regression did not pass', () => {
    expect(validatePromptSaveGate({
      name: 'sales-agent-prompt',
      content: 'updated prompt',
      agentKey: 'sales',
      promptId: 'sales-agent-prompt',
      validationState: 'passed',
      analysisState: 'passed',
      testState: 'passed',
      regressionState: 'failed',
      draftTestEvidenceVerified: true,
      regressionEvidenceVerified: false,
    })).toEqual({ ok: false, code: 'regression_failed' })
  })

  it('allows save when analysis, test, regression, and evidence passed for a live agent prompt', () => {
    expect(validatePromptSaveGate({
      name: 'sales-agent-prompt',
      content: 'updated prompt',
      agentKey: 'sales',
      promptId: 'sales-agent-prompt',
      validationState: 'passed',
      analysisState: 'passed',
      testState: 'passed',
      regressionState: 'passed',
      draftTestEvidenceVerified: true,
      regressionEvidenceVerified: true,
    })).toEqual({ ok: true })
  })

  it('blocks live activation when runtime/provider policy are missing', () => {
    expect(validateLiveAgentActivationGate({
      runtimeRegistered: false,
      providerPolicy: null,
    })).toEqual({ ok: false, code: 'runtime_registration_missing' })
  })

  it('blocks activation when saved prompt version lacks passed verification evidence', () => {
    expect(validateLiveAgentActivationGate({
      runtimeRegistered: true,
      providerPolicy: 'openai',
      verification: null,
    })).toEqual({ ok: false, code: 'prompt_verification_missing' })
  })
})
