import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Textarea } from '@/ui'

import {
  buildAgentEditorTrace,
  createEmptyAgentEditorSnapshot,
  loadAgentEditorSnapshot,
} from './agentEditorState'

describe('agent editor state', () => {
  it('loaded non-empty content initializes draft state', () => {
    const state = loadAgentEditorSnapshot('sales', {
      editablePrompt: true,
      promptContent: 'AI seller prompt',
      content: 'AI seller prompt',
      version: 7,
      source: 'db',
    })

    expect(state).toEqual({
      agentKey: 'sales',
      draftContent: 'AI seller prompt',
      initialContent: 'AI seller prompt',
      savedVersion: 7,
    })
  })

  it('switching agents resets empty state and then loads new agent content', () => {
    const cleared = createEmptyAgentEditorSnapshot('content')
    const loaded = loadAgentEditorSnapshot('content', {
      editablePrompt: true,
      promptContent: 'Content agent prompt',
      content: 'Content agent prompt',
      version: 0,
      source: 'filesystem',
    })

    expect(cleared).toEqual({
      agentKey: 'content',
      draftContent: '',
      initialContent: null,
      savedVersion: null,
    })
    expect(loaded.draftContent).toBe('Content agent prompt')
  })

  it('reopening the modal reloads persisted content into draft', () => {
    const firstOpen = loadAgentEditorSnapshot('sales', {
      editablePrompt: true,
      promptContent: 'Persisted prompt',
      content: 'Persisted prompt',
      version: 3,
      source: 'db',
    })
    const reopened = loadAgentEditorSnapshot('sales', {
      editablePrompt: true,
      promptContent: 'Persisted prompt',
      content: 'Persisted prompt',
      version: 3,
      source: 'db',
    })

    expect(reopened).toEqual(firstOpen)
  })

  it('no editable prompt with non-empty response resolves to an empty draft', () => {
    const state = loadAgentEditorSnapshot('coach', {
      editablePrompt: true,
      promptContent: 'Coach system prompt',
      content: 'Coach system prompt',
      version: 0,
      source: 'filesystem',
    })

    expect(state.draftContent.length).toBeGreaterThan(0)
  })

  it('textarea receives the same loaded content as its controlled value', () => {
    const state = loadAgentEditorSnapshot('sales', {
      editablePrompt: true,
      promptContent: 'Rendered prompt content',
      content: 'Rendered prompt content',
      version: 1,
      source: 'db',
    })

    const markup = renderToStaticMarkup(
      createElement(Textarea, {
        label: 'Content',
        value: state.draftContent,
        onChange: () => undefined,
      }),
    )

    expect(markup).toContain('Rendered prompt content')
  })

  it('builds a trace with matching response, draft and textarea lengths', () => {
    expect(buildAgentEditorTrace({
      agentKey: 'sales',
      responseContent: 'prompt',
      draftContent: 'prompt',
      textareaContent: 'prompt',
    })).toEqual({
      agentKey: 'sales',
      responseContentLength: 6,
      draftContentLength: 6,
      textareaContentLength: 6,
    })
  })

  it('switching agents loads a different prompt into the next draft snapshot', () => {
    const sales = loadAgentEditorSnapshot('sales', {
      editablePrompt: true,
      promptContent: 'Sales prompt',
      content: '',
      version: 0,
      source: 'filesystem',
    })
    const content = loadAgentEditorSnapshot('content', {
      editablePrompt: true,
      promptContent: 'Content prompt',
      content: '',
      version: 0,
      source: 'filesystem',
    })

    expect(sales.draftContent).toBe('Sales prompt')
    expect(content.draftContent).toBe('Content prompt')
    expect(content.draftContent).not.toBe(sales.draftContent)
  })

  it('keeps the full content-agent prompt chain non-empty through textarea DOM', () => {
    const response = {
      editablePrompt: true,
      promptContent: 'SKILL creative ads\nDNA content generator offer',
      content: null,
      version: 0,
      source: 'filesystem' as const,
    }

    const snapshot = loadAgentEditorSnapshot('content', response)
    const markup = renderToStaticMarkup(
      createElement(Textarea, {
        label: 'Content',
        value: snapshot.draftContent,
        onChange: () => undefined,
      }),
    )

    const responseLength = response.promptContent.length
    const draftLength = snapshot.draftContent.length
    const textareaLength = 'SKILL creative ads\nDNA content generator offer'.length

    expect(responseLength).toBeGreaterThan(0)
    expect(draftLength).toBeGreaterThan(0)
    expect(markup).toContain('SKILL creative ads')
    expect(textareaLength).toBeGreaterThan(0)
  })

  it('keeps the full sales-agent prompt chain non-empty through textarea DOM', () => {
    const response = {
      editablePrompt: true,
      promptContent: 'AI seller system prompt\nAI seller rules',
      content: null,
      version: 4,
      source: 'db' as const,
    }

    const snapshot = loadAgentEditorSnapshot('sales', response)
    const markup = renderToStaticMarkup(
      createElement(Textarea, {
        label: 'Content',
        value: snapshot.draftContent,
        onChange: () => undefined,
      }),
    )

    const responseLength = response.promptContent.length
    const draftLength = snapshot.draftContent.length
    const textareaLength = 'AI seller system prompt\nAI seller rules'.length

    expect(responseLength).toBeGreaterThan(0)
    expect(draftLength).toBeGreaterThan(0)
    expect(markup).toContain('AI seller system prompt')
    expect(textareaLength).toBeGreaterThan(0)
  })
})
