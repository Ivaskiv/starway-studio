import type { AgentPromptRecord } from './agentPromptDraft'
import { resolveAgentPromptDraftContent } from './agentPromptDraft'

export interface AgentEditorSnapshot {
  agentKey: string
  draftContent: string
  initialContent: string | null
  savedVersion: number | null
}

export interface AgentEditorTrace {
  agentKey: string
  responseContentLength: number
  draftContentLength: number
  textareaContentLength: number
}

export function createEmptyAgentEditorSnapshot(agentKey: string): AgentEditorSnapshot {
  return {
    agentKey,
    draftContent: '',
    initialContent: null,
    savedVersion: null,
  }
}

export function loadAgentEditorSnapshot(
  agentKey: string,
  prompt: AgentPromptRecord | null,
): AgentEditorSnapshot {
  const content = resolveAgentPromptDraftContent(prompt)

  return {
    agentKey,
    draftContent: content,
    initialContent: content,
    savedVersion: prompt?.version ?? null,
  }
}

export function buildAgentEditorTrace(input: {
  agentKey: string
  responseContent: string | null
  draftContent: string
  textareaContent: string
}): AgentEditorTrace {
  return {
    agentKey: input.agentKey,
    responseContentLength: typeof input.responseContent === 'string' ? input.responseContent.length : 0,
    draftContentLength: input.draftContent.length,
    textareaContentLength: input.textareaContent.length,
  }
}
