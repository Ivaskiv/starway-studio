export type AgentAnalysisState = 'passed' | 'failed' | 'idle'
export type AgentDraftTestStatus = 'passed' | 'failed' | 'idle'
export type AgentRegressionStatus = 'passed' | 'failed' | 'idle'

export function canRunAgentDraftTest(input: {
  analysisState: AgentAnalysisState
  promptLoaded: boolean
  draftContent: string
}): boolean {
  return (
    input.analysisState === 'passed' &&
    input.promptLoaded &&
    input.draftContent.trim().length > 0
  )
}

export function resolveAgentDraftTestStatus(input: {
  status: AgentDraftTestStatus
  draftContent: string
  testedDraftContent: string | null
}): AgentDraftTestStatus {
  if (
    input.status === 'idle' ||
    !input.testedDraftContent ||
    input.testedDraftContent !== input.draftContent
  ) {
    return 'idle'
  }

  return input.status
}

export function canRunAgentRegressionTest(input: {
  promptLoaded: boolean
  draftContent: string
  testStatus: AgentDraftTestStatus
  runtimeRegistered: boolean
}): boolean {
  return (
    input.runtimeRegistered &&
    input.promptLoaded &&
    input.draftContent.trim().length > 0 &&
    input.testStatus === 'passed'
  )
}

export function resolveAgentRegressionStatus(input: {
  status: AgentRegressionStatus
  draftContent: string
  regressedDraftContent: string | null
}): AgentRegressionStatus {
  if (
    input.status === 'idle' ||
    !input.regressedDraftContent ||
    input.regressedDraftContent !== input.draftContent
  ) {
    return 'idle'
  }

  return input.status
}

export function canSaveAgentPromptVersion(input: {
  draftContent: string
  isModified: boolean
  isPromptLoading: boolean
  hasError: boolean
  requiresAnalysis: boolean
  hasAnalysisResult: boolean
  analysisState: AgentAnalysisState
  testStatus: AgentDraftTestStatus
  regressionStatus: AgentRegressionStatus
  requiresRegression: boolean
}): boolean {
  if (!input.draftContent.trim()) return false
  if (!input.isModified) return false
  if (input.isPromptLoading) return false
  if (input.hasError) return false
  if (input.analysisState !== 'passed') return false
  if (input.testStatus !== 'passed') return false
  if (input.requiresRegression && input.regressionStatus !== 'passed') return false
  if (input.requiresAnalysis && !input.hasAnalysisResult) return false
  return true
}
