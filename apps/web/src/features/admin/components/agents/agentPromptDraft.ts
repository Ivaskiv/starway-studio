export type AgentPromptSource = 'db' | 'filesystem'

export type AgentPromptRecord = {
  content: string
  version: number
  source: AgentPromptSource
}

export type AgentPromptLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'missing'; message: string }
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

export function isAgentPromptDraftModified(
  initialContent: string | null,
  draftContent: string,
): boolean {
  return initialContent !== null && draftContent !== initialContent
}
