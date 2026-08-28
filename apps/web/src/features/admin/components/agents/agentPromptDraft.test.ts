import { describe, expect, it } from 'vitest'

import {
  isAgentPromptDraftModified,
  resolveAgentPromptDraftContent,
  resolveAgentPromptLoadState,
} from './agentPromptDraft'

describe('agent prompt editor state', () => {
  it('distinguishes loading, API error, no prompt, DB and filesystem fallback states', () => {
    expect(resolveAgentPromptLoadState({ promptId: 'content-agent-prompt', isLoading: true, prompt: null })).toEqual({ status: 'loading' })
    expect(resolveAgentPromptLoadState({
      promptId: 'content-agent-prompt',
      isLoading: false,
      error: { status: 502, data: { detail: 'filesystem read failed' } },
      prompt: null,
    })).toEqual({
      status: 'error',
      message: 'Не вдалося завантажити промпт "content-agent-prompt": filesystem read failed',
    })
    expect(resolveAgentPromptLoadState({
      promptId: 'content-agent-prompt',
      isLoading: false,
      prompt: null,
    })).toEqual({
      status: 'missing',
      message: 'Промпт "content-agent-prompt" не знайдено ні в active DB version, ні у filesystem fallback.',
    })
    expect(resolveAgentPromptLoadState({
      promptId: 'content-agent-prompt',
      isLoading: false,
      prompt: {
        editablePrompt: false,
        reason: 'Agent uses runtime-only supporting docs.',
        promptContent: null,
        content: null,
        version: null,
        source: null,
      },
    })).toEqual({
      status: 'uneditable',
      message: 'Agent uses runtime-only supporting docs.',
    })
    expect(resolveAgentPromptLoadState({
      promptId: 'content-agent-prompt',
      isLoading: false,
      prompt: { editablePrompt: true, promptContent: 'DB prompt', content: 'DB prompt', version: 4, source: 'db' },
    })).toEqual({
      status: 'loaded',
      source: 'db',
      version: 4,
      message: 'Завантажено з active DB version.',
    })
    expect(resolveAgentPromptLoadState({
      promptId: 'content-agent-prompt',
      isLoading: false,
      prompt: { editablePrompt: true, promptContent: 'Filesystem prompt', content: 'Filesystem prompt', version: 0, source: 'filesystem' },
    })).toEqual({
      status: 'loaded',
      source: 'filesystem',
      version: 0,
      message: 'Завантажено з filesystem fallback.',
    })
  })

  it('treats the canonical content-agent prompt as a populated editable loaded state', () => {
    const state = resolveAgentPromptLoadState({
      promptId: 'content-agent-prompt',
      isLoading: false,
      prompt: {
        editablePrompt: true,
        promptContent: 'You are the Starway Telegram AI assistant.',
        content: 'You are the Starway Telegram AI assistant.',
        version: 0,
        source: 'filesystem',
      },
    })

    expect(state).toEqual({
      status: 'loaded',
      source: 'filesystem',
      version: 0,
      message: 'Завантажено з filesystem fallback.',
    })
    expect(state.status === 'loaded' ? state.version : null).toBe(0)
  })

  it('marks a draft modified only after content differs from the loaded snapshot', () => {
    expect(isAgentPromptDraftModified(null, '')).toBe(false)
    expect(isAgentPromptDraftModified('active prompt', 'active prompt')).toBe(false)
    expect(isAgentPromptDraftModified('active prompt', 'updated prompt')).toBe(true)
  })

  it('initializes the editor draft from non-empty editable prompt content only', () => {
    expect(resolveAgentPromptDraftContent(null)).toBe('')
    expect(resolveAgentPromptDraftContent({
      editablePrompt: false,
      promptContent: 'hidden',
      content: 'hidden',
      version: null,
      source: null,
    })).toBe('')
    expect(resolveAgentPromptDraftContent({
      editablePrompt: true,
      promptContent: 'AI seller prompt',
      content: 'AI seller prompt',
      version: 0,
      source: 'filesystem',
    })).toBe('AI seller prompt')
  })

  it('prefers promptContent over legacy content when initializing draft and loaded state', () => {
    expect(resolveAgentPromptLoadState({
      promptId: 'mentor-agent-prompt',
      isLoading: false,
      prompt: {
        editablePrompt: true,
        promptContent: 'Canonical mentor prompt',
        content: '',
        version: 0,
        source: 'filesystem',
      },
    })).toEqual({
      status: 'loaded',
      source: 'filesystem',
      version: 0,
      message: 'Завантажено з filesystem fallback.',
    })

    expect(resolveAgentPromptDraftContent({
      editablePrompt: true,
      promptContent: 'Canonical mentor prompt',
      content: '',
      version: 0,
      source: 'filesystem',
    })).toBe('Canonical mentor prompt')
  })
})
