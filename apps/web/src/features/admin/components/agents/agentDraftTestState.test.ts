import { describe, expect, it } from 'vitest'

import {
  canRunAgentDraftTest,
  canRunAgentRegressionTest,
  canSaveAgentPromptVersion,
  resolveAgentDraftTestStatus,
  resolveAgentRegressionStatus,
} from './agentDraftTestState'

describe('agent draft test gate', () => {
  it('blocks draft test until analysis passed', () => {
    expect(canRunAgentDraftTest({
      analysisState: 'idle',
      promptLoaded: true,
      draftContent: 'draft prompt',
    })).toBe(false)
  })

  it('keeps TEST PASS only for the exact tested draft', () => {
    expect(resolveAgentDraftTestStatus({
      status: 'passed',
      draftContent: 'draft prompt',
      testedDraftContent: 'draft prompt',
    })).toBe('passed')

    expect(resolveAgentDraftTestStatus({
      status: 'passed',
      draftContent: 'changed draft prompt',
      testedDraftContent: 'draft prompt',
    })).toBe('idle')
  })

  it('unlocks save only after analysis PASS and TEST PASS', () => {
    expect(canSaveAgentPromptVersion({
      draftContent: 'draft prompt',
      isModified: true,
      isPromptLoading: false,
      hasError: false,
      requiresAnalysis: true,
      hasAnalysisResult: true,
      analysisState: 'passed',
      testStatus: 'passed',
      regressionStatus: 'passed',
      requiresRegression: true,
    })).toBe(true)
  })

  it('blocks save when TEST failed or became stale after draft change', () => {
    expect(canSaveAgentPromptVersion({
      draftContent: 'draft prompt',
      isModified: true,
      isPromptLoading: false,
      hasError: false,
      requiresAnalysis: true,
      hasAnalysisResult: true,
      analysisState: 'passed',
      testStatus: 'failed',
      regressionStatus: 'passed',
      requiresRegression: true,
    })).toBe(false)

    expect(canSaveAgentPromptVersion({
      draftContent: 'changed draft prompt',
      isModified: true,
      isPromptLoading: false,
      hasError: false,
      requiresAnalysis: true,
      hasAnalysisResult: true,
      analysisState: 'passed',
      testStatus: resolveAgentDraftTestStatus({
        status: 'passed',
        draftContent: 'changed draft prompt',
        testedDraftContent: 'draft prompt',
      }),
      regressionStatus: 'idle',
      requiresRegression: true,
    })).toBe(false)
  })

  it('requires regression PASS before save for live runtime agents', () => {
    expect(canRunAgentRegressionTest({
      promptLoaded: true,
      draftContent: 'draft prompt',
      testStatus: 'passed',
      runtimeRegistered: true,
    })).toBe(true)

    expect(resolveAgentRegressionStatus({
      status: 'passed',
      draftContent: 'changed draft prompt',
      regressedDraftContent: 'draft prompt',
    })).toBe('idle')

    expect(canSaveAgentPromptVersion({
      draftContent: 'draft prompt',
      isModified: true,
      isPromptLoading: false,
      hasError: false,
      requiresAnalysis: true,
      hasAnalysisResult: true,
      analysisState: 'passed',
      testStatus: 'passed',
      regressionStatus: 'failed',
      requiresRegression: true,
    })).toBe(false)
  })
})
