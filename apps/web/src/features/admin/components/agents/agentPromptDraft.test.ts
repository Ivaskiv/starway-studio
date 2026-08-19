import { describe, expect, it } from 'vitest'

import {
  isAgentPromptDraftModified,
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
      prompt: { content: 'DB prompt', version: 4, source: 'db' },
    })).toEqual({
      status: 'loaded',
      source: 'db',
      version: 4,
      message: 'Завантажено з active DB version.',
    })
    expect(resolveAgentPromptLoadState({
      promptId: 'content-agent-prompt',
      isLoading: false,
      prompt: { content: 'Filesystem prompt', version: 0, source: 'filesystem' },
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
})
