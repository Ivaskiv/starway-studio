import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { BaseModal } from '@/features/modals/BaseModal'
import {
  useCreatePromptVersionMutation,
  useGetPromptVersionsQuery,
  useRunCompatibilityCheckMutation,
} from '@/features/admin/services/admin.api'
import { Badge, Button, Textarea } from '@/ui'

import type { AgentCardDef } from './agentControlCenter.types'

interface Props {
  agent: AgentCardDef
  canEdit: boolean
  onClose: () => void
}

type ModalTab = 'prompt' | 'analyze'

export function AgentModal({ agent, canEdit, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ModalTab>('prompt')
  const [draftContent, setDraftContent] = useState('')
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const { data: promptsData, isLoading } = useGetPromptVersionsQuery({ name: agent.promptId })
  const [createPromptVersion, { isLoading: isSaving }] = useCreatePromptVersionMutation()
  const [runCompatibilityCheck, { isLoading: isAnalyzing }] = useRunCompatibilityCheckMutation()

  const prompts = promptsData?.prompts ?? []
  const activePrompt = useMemo(
    () => prompts.find((prompt) => prompt.isActive) ?? prompts[0] ?? null,
    [prompts],
  )

  useEffect(() => {
    setDraftContent(activePrompt?.content ?? '')
    setAnalysisResult(null)
    setActiveTab('prompt')
  }, [activePrompt?.id, agent.key])

  const currentContent = draftContent.trim()

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
    if (!canEdit || !currentContent) return

    try {
      await createPromptVersion({
        name: agent.promptId,
        content: draftContent,
        isActive: false,
      }).unwrap()
      toast.success('Нову версію промпта збережено')
    } catch {
      toast.error('Не вдалося зберегти версію промпта')
    }
  }

  return (
    <BaseModal
      isOpen
      onClose={onClose}
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
          </div>
          <Button type="button" variant="ghost" color="muted" onClick={onClose}>
            Закрити
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
          { id: 'prompt', label: 'Промпт' },
          { id: 'analyze', label: 'AI-аналіз' },
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
            {activePrompt ? (
              <div className="text-[11px] text-[var(--text-muted)]">
                Активна версія: <span className="font-semibold text-[var(--text-secondary)]">v{activePrompt.version}</span>
                {' · '}
                {new Date(activePrompt.createdAt).toLocaleDateString('uk-UA')}
              </div>
            ) : null}

            <Textarea
              label="Content"
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              size="lg"
              className="bg-[var(--card)] font-mono"
              rows={18}
              disabled={!canEdit && !activePrompt}
              helperText={isLoading ? 'Завантажуємо активну версію…' : 'Редагування створює нову версію, не переписує поточну.'}
            />

            {agent.isSystem ? (
              <div className="rounded-[20px] border border-[rgba(96,165,250,0.22)] bg-[rgba(96,165,250,0.08)] p-4 text-sm leading-6 text-[rgb(147,197,253)]">
                Системний агент впливає на реальну поведінку продакшн-сценаріїв. Перед збереженням запускай AI-аналіз.
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              Перевірка виконується через існуючий compatibility endpoint з правилами для agent prompt.
            </p>
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-7 text-[var(--text-primary)]">
              <pre className="whitespace-pre-wrap break-words">{analysisResult ?? 'Запусти аналіз для поточної версії промпта.'}</pre>
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
          Запустити аналіз
        </Button>
        <div className="flex-1" />
        {canEdit ? (
          <Button
            type="button"
            variant="solid"
            color="accent"
            loading={isSaving}
            disabled={!currentContent}
            onClick={() => void handleSave()}
          >
            Зберегти версію
          </Button>
        ) : null}
      </div>
    </BaseModal>
  )
}
