import { beforeAll, describe, expect, it } from 'vitest'

let buildAgentPromptResponseSignature: typeof import('./AgentModal').buildAgentPromptResponseSignature
let shouldInitializeAgentEditor: typeof import('./AgentModal').shouldInitializeAgentEditor

beforeAll(async () => {
  const storage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  }

  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  })

  ;({ buildAgentPromptResponseSignature, shouldInitializeAgentEditor } = await import('./AgentModal'))
})

describe('AgentModal prompt initialization', () => {
  it('initializes when API response changes from empty to canonical promptContent', () => {
    expect(shouldInitializeAgentEditor({
      agentKey: 'content',
      agentDetails: undefined,
      initializedSignature: null,
      isPromptLoading: true,
    })).toBe(false)

    expect(shouldInitializeAgentEditor({
      agentKey: 'content',
      agentDetails: {
        agentKey: 'content',
        promptId: 'content-agent-prompt',
        promptContent: 'ABC',
        source: 'filesystem',
        version: 0,
        editablePrompt: true,
      },
      initializedSignature: null,
      isPromptLoading: false,
    })).toBe(true)
  })

  it('does not reinitialize after user edits when the canonical response signature is unchanged', () => {
    const initializedSignature = buildAgentPromptResponseSignature('sales', {
      agentKey: 'sales',
      promptId: 'sales-agent-prompt',
      promptContent: 'ABC',
      source: 'filesystem',
      version: 0,
      editablePrompt: true,
    })

    expect(shouldInitializeAgentEditor({
      agentKey: 'sales',
      agentDetails: {
        agentKey: 'sales',
        promptId: 'sales-agent-prompt',
        promptContent: 'ABC',
        source: 'filesystem',
        version: 0,
        editablePrompt: true,
      },
      initializedSignature,
      isPromptLoading: false,
    })).toBe(false)
  })

  it('switching agents changes the prompt signature and requires a new initialization', () => {
    const salesSignature = buildAgentPromptResponseSignature('sales', {
      agentKey: 'sales',
      promptId: 'sales-agent-prompt',
      promptContent: 'Sales prompt',
      source: 'filesystem',
      version: 0,
      editablePrompt: true,
    })

    expect(shouldInitializeAgentEditor({
      agentKey: 'content',
      agentDetails: {
        agentKey: 'content',
        promptId: 'content-agent-prompt',
        promptContent: 'Content prompt',
        source: 'filesystem',
        version: 0,
        editablePrompt: true,
      },
      initializedSignature: salesSignature,
      isPromptLoading: false,
    })).toBe(true)
  })

  it('reopening the modal with the same persisted prompt can initialize again after reset', () => {
    expect(shouldInitializeAgentEditor({
      agentKey: 'sales',
      agentDetails: {
        agentKey: 'sales',
        promptId: 'sales-agent-prompt',
        promptContent: 'Persisted prompt',
        source: 'db',
        version: 4,
        editablePrompt: true,
      },
      initializedSignature: null,
      isPromptLoading: false,
    })).toBe(true)
  })
})
