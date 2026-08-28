export type AgentPromptSource = 'db' | 'filesystem'

export type AgentPromptRecord = {
  editablePrompt: boolean
  reason?: string
  promptContent?: string | null
  content: string | null
  version: number | null
  source: AgentPromptSource | null
}

export type AgentPromptLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'missing'; message: string }
  | { status: 'uneditable'; message: string }
  | { status: 'loaded'; source: AgentPromptSource; version: number; message: string }

function resolvePromptLoadErrorMessage(promptId: string, error: unknown): string {
  if (error && typeof error === 'object') {
    const record = error as {
      data?: { error?: unknown; detail?: unknown; message?: unknown }
      error?: unknown
      status?: unknown
    }
    const detail =
      typeof record.data?.detail === 'string'
        ? record.data.detail
        : typeof record.data?.message === 'string'
          ? record.data.message
          : typeof record.data?.error === 'string'
            ? record.data.error
            : typeof record.error === 'string'
              ? record.error
              : null

    if (detail) {
      return `Не вдалося завантажити промпт "${promptId}": ${detail}`
    }
  }

  return `Не вдалося завантажити промпт "${promptId}".`
}

export function resolveAgentPromptLoadState(input: {
  promptId: string
  isLoading: boolean
  error?: unknown
  prompt: AgentPromptRecord | null
}): AgentPromptLoadState {
  if (input.isLoading) return { status: 'loading' }
  if (input.error) {
    return {
      status: 'error',
      message: resolvePromptLoadErrorMessage(input.promptId, input.error),
    }
  }
  if (!input.prompt) {
    return {
      status: 'missing',
      message: `Промпт "${input.promptId}" не знайдено ні в active DB version, ні у filesystem fallback.`,
    }
  }
  if (!input.prompt.editablePrompt) {
    return {
      status: 'uneditable',
      message: input.prompt.reason ?? `Для "${input.promptId}" немає editable system prompt.`,
    }
  }
  const resolvedContent =
    input.prompt.promptContent
    ?? input.prompt.content
    ?? ''

  if (!resolvedContent.trim() || input.prompt.source === null || input.prompt.version === null) {
    return {
      status: 'missing',
      message: `Canonical prompt resolver для "${input.promptId}" повернув порожній content.`,
    }
  }
  return {
    status: 'loaded',
    source: input.prompt.source,
    version: input.prompt.version,
    message:
      input.prompt.source === 'db'
        ? 'Завантажено з active DB version.'
        : 'Завантажено з filesystem fallback.',
  }
}

export function resolveAgentPromptDraftContent(
  prompt: AgentPromptRecord | null,
): string {
  if (!prompt?.editablePrompt) {
    return ''
  }

  return prompt.promptContent ?? prompt.content ?? ''
}

export function isAgentPromptDraftModified(
  initialContent: string | null,
  draftContent: string,
): boolean {
  return initialContent !== null && draftContent !== initialContent
}
