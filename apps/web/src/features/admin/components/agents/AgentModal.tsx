import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { BaseModal } from '@/features/modals/BaseModal'
import {
  useCreatePromptVersionMutation,
  useGetPromptVersionsQuery,
  useRunRuntimeAgentTestMutation,
  useRunCompatibilityCheckMutation,
} from '@/features/admin/services/admin.api'
import { Badge, Button, Textarea } from '@/ui'

import type { AgentCardDef } from './agentControlCenter.types'
import {
  isAgentPromptDraftModified,
  resolveAgentPromptLoadState,
} from './agentPromptDraft'

interface Props {
  agent: AgentCardDef
  canEdit: boolean
  onClose: () => void
}

type ModalTab = 'prompt' | 'analyze' | 'test'

export function AgentModal({ agent, canEdit, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ModalTab>('prompt')
  const [draftContent, setDraftContent] = useState('')
  const [initialContent, setInitialContent] = useState<string | null>(null)
  const [savedVersion, setSavedVersion] = useState<number | null>(null)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState('Покажи, як цей агент відповість на типовий запит.')
  const [testResult, setTestResult] = useState<string | null>(null)
  const { data: promptsData, isLoading, error } = useGetPromptVersionsQuery({ name: agent.promptId })
  const [createPromptVersion, { isLoading: isSaving }] = useCreatePromptVersionMutation()
  const [runCompatibilityCheck, { isLoading: isAnalyzing }] = useRunCompatibilityCheckMutation()
  const [runRuntimeAgentTest, { isLoading: isTesting }] = useRunRuntimeAgentTestMutation()

  const prompts = promptsData?.prompts ?? []
  const activePrompt = useMemo(
    () => prompts.find((prompt) => prompt.isActive) ?? prompts[0] ?? null,
    [prompts],
  )

  useEffect(() => {
    if (isLoading) return

    const content = activePrompt?.content ?? ''
    setDraftContent(content)
    setInitialContent(content)
    setSavedVersion(activePrompt?.version ?? null)
    setAnalysisResult(null)
    setTestResult(null)
    setActiveTab('prompt')
  }, [activePrompt?.id, agent.key, isLoading])

  const currentContent = draftContent.trim()
  const isModified = isAgentPromptDraftModified(initialContent, draftContent)
  const promptLoadState = resolveAgentPromptLoadState({
    promptId: agent.promptId,
    isLoading,
    error,
    prompt: activePrompt,
  })

  const handleClose = () => {
    if (isModified && !window.confirm('Закрити редактор і втратити незбережені зміни?')) {
      return
    }
    onClose()
  }

  const handleAnalyze = async () => {
    if (!currentContent) return

    try {
      const result = await runCompatibilityCheck({
        type: 'compatibility_check',
        item: {
          id: agent.key,
          promptId: agent.promptId,
          name: agent.name,
          kind: 'agentPrompt',
          content: currentContent,
        },
        relatedItems: agent.sourceFiles.map((sourceFile) => ({
          id: sourceFile,
          name: sourceFile.split('/').pop() ?? sourceFile,
          dependency: 'sourceFile',
        })),
        checkRules: [
          'Tone of Voice: direct, adult, no exclamation marks, Ukrainian',
          'Agent prompt keeps role boundaries and does not invent unsupported actions',
          'Prompt preserves one clear outcome per interaction step',
        ],
      }).unwrap()

      const checks = result.checks.map((check) => `• ${check.title}: ${check.body}`).join('\n')
      const warnings = result.warnings.length ? `\n\nПопередження:\n${result.warnings.map((warning) => `• ${warning}`).join('\n')}` : ''
      setAnalysisResult(`${result.summary}\n\n${result.recommendation}${checks ? `\n\nПеревірки:\n${checks}` : ''}${warnings}`)
      setActiveTab('analyze')
    } catch {
      toast.error('Не вдалося виконати AI-аналіз')
    }
  }

  const handleSave = async () => {
    if (!canEdit || !currentContent || !isModified) return

    try {
      const result = await createPromptVersion({
        name: agent.promptId,
        content: draftContent,
        isActive: true,
      }).unwrap()
      setDraftContent(result.prompt.content)
      setInitialContent(result.prompt.content)
      setSavedVersion(result.prompt.version)
      toast.success('Активну версію промпта збережено')
    } catch {
      toast.error('Не вдалося зберегти версію промпта')
    }
  }

  const handleTest = async () => {
    const message = testMessage.trim()
    if (!message) return

    try {
      const result = await runRuntimeAgentTest({
        key: agent.key,
        message,
      }).unwrap()
      setTestResult(JSON.stringify(result.result, null, 2))
      setActiveTab('test')
    } catch {
      toast.error('Не вдалося виконати targeted test')
    }
  }

  return (
    <BaseModal
      isOpen
      onClose={handleClose}
      panelClassName="w-full max-w-4xl rounded-[28px] border border-[var(--border)] bg-[var(--bg-secondary)] p-0 shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
    >
      <div className="dashboard-liquid-edge--top border-b border-[var(--border)] px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
              {agent.isSystem ? 'Системний агент' : 'Агент коуча'}
            </p>
            <h3 className="mt-2 text-[1.45rem] font-semibold text-[var(--text-primary)]">
              {agent.icon} {agent.name}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{agent.desc}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Role: {agent.capability} · Runtime: {agent.runtimeAgentId}
            </p>
          </div>
          <Button type="button" variant="ghost" color="muted" onClick={handleClose}>
            ЗАКРИТИ
          </Button>
        </div>
      </div>

      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {agent.sourceFiles.map((file) => (
            <Badge key={file} variant="info" size="sm">
              {file.split('/').pop()}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-5 border-b border-[var(--border)] px-5 pt-4">
        {[
          { id: 'prompt', label: 'ПРОМПТ' },
          { id: 'analyze', label: 'AI-АНАЛІЗ' },
          { id: 'test', label: 'ТЕСТ' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as ModalTab)}
            className={[
              'border-b-2 px-4 py-2 text-[12.5px] font-bold transition-colors',
              activeTab === tab.id
                ? 'border-[rgb(var(--accent-soft-rgb))] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-5">
        {activeTab === 'prompt' ? (
          <>
            {promptLoadState.status === 'loading' ? (
              <div className="text-sm text-[var(--text-muted)]">Завантажуємо активну версію...</div>
            ) : promptLoadState.status === 'error' || promptLoadState.status === 'missing' ? (
              <div className="rounded-[20px] border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] p-4 text-sm leading-6 text-[rgb(252,165,165)]">
                {promptLoadState.message}
              </div>
            ) : (
              <>
                <div className="text-[11px] text-[var(--text-muted)]">
                  {activePrompt ? (
                    <>
                      {promptLoadState.message}
                      {' · '}Активна версія:{' '}
                      <span className="font-semibold text-[var(--text-secondary)]">v{savedVersion ?? activePrompt.version}</span>
                    </>
                  ) : 'Активний промпт і filesystem fallback не знайдені.'}
                </div>

                <Textarea
                  label="Content"
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  size="lg"
                  className="bg-[var(--card)] font-mono"
                  rows={18}
                  disabled={!canEdit}
                  helperText={isModified ? 'Є незбережені зміни.' : 'Змін немає.'}
                />
              </>
            )}

            {agent.isSystem ? (
              <div className="rounded-[20px] border border-[rgba(96,165,250,0.22)] bg-[rgba(96,165,250,0.08)] p-4 text-sm leading-6 text-[rgb(147,197,253)]">
                Системний агент впливає на реальну поведінку продакшн-сценаріїв. Перед збереженням запускай AI-аналіз.
              </div>
            ) : null}
          </>
        ) : activeTab === 'analyze' ? (
          <>
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              Перевірка виконується через існуючий compatibility endpoint з правилами для agent prompt.
            </p>
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-7 text-[var(--text-primary)]">
              <pre className="whitespace-pre-wrap break-words">{analysisResult ?? 'Запусти аналіз для поточної версії промпта.'}</pre>
            </div>
          </>
        ) : (
          <>
            <Textarea
              label="Тестовий запит"
              value={testMessage}
              onChange={(event) => setTestMessage(event.target.value)}
              size="lg"
              className="bg-[var(--card)]"
              rows={5}
              helperText="Тест виконує реальний canonical gateway runtime для вибраного агента."
            />
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-7 text-[var(--text-primary)]">
              <pre className="whitespace-pre-wrap break-words">{testResult ?? 'Запусти targeted test для поточного агента.'}</pre>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--border)] px-5 py-4">
        <Button
          type="button"
          variant="outline"
          color="muted"
          loading={isAnalyzing}
          disabled={!currentContent}
          onClick={() => void handleAnalyze()}
        >
          АНАЛІЗУВАТИ
        </Button>
        <Button
          type="button"
          variant="outline"
          color="muted"
          loading={isTesting}
          disabled={!testMessage.trim()}
          onClick={() => void handleTest()}
        >
          ТЕСТУВАТИ
        </Button>
        <div className="flex-1" />
        {canEdit ? (
          <Button
            type="button"
            variant="solid"
            color="accent"
            loading={isSaving}
            disabled={!currentContent || !isModified || isLoading || Boolean(error)}
            onClick={() => void handleSave()}
          >
            ЗБЕРЕГТИ ВЕРСІЮ
          </Button>
        ) : null}
      </div>
    </BaseModal>
  )
}
