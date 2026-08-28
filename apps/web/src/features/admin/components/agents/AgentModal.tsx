import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

import { BaseModal } from '@/features/modals/BaseModal'
import {
  useActivatePromptVersionMutation,
  useGetAgentQuery,
  useGetPromptVersionsQuery,
  useCreatePromptVersionMutation,
  useRunRuntimeAgentRegressionTestMutation,
  useRunRuntimeAgentTestMutation,
  useRunCompatibilityCheckMutation,
} from '@/features/admin/services/admin.api'
import { Badge, Button, Textarea } from '@/ui'

import type { AgentCardDef } from './agentControlCenter.types'
import {
  buildAgentEditorTrace,
  createEmptyAgentEditorSnapshot,
  loadAgentEditorSnapshot,
} from './agentEditorState'
import {
  isAgentPromptDraftModified,
  resolveAgentPromptLoadState,
} from './agentPromptDraft'
import {
  canRunAgentDraftTest,
  canRunAgentRegressionTest,
  canSaveAgentPromptVersion,
  resolveAgentDraftTestStatus,
  resolveAgentRegressionStatus,
} from './agentDraftTestState'

interface Props {
  agent: AgentCardDef
  canEdit: boolean
  onClose: () => void
}

type ModalTab = 'prompt' | 'analyze' | 'test'

type AgentEditorInitRecord = {
  agentKey: string
  promptId: string
  promptContent: string | null
  source: 'db' | 'filesystem' | null
  version: number | null
  editablePrompt: boolean
}

export function buildAgentPromptResponseSignature(
  agentKey: string,
  agentDetails: AgentEditorInitRecord | null | undefined,
): string | null {
  if (!agentDetails || agentDetails.agentKey !== agentKey) {
    return null
  }

  const promptContent = typeof agentDetails.promptContent === 'string' ? agentDetails.promptContent : ''
  if (!agentDetails.editablePrompt || !promptContent.trim()) {
    return null
  }

  return [
    agentKey,
    agentDetails.promptId,
    agentDetails.source ?? 'null',
    agentDetails.version ?? 'null',
    promptContent,
  ].join('::')
}

export function shouldInitializeAgentEditor(input: {
  agentKey: string
  agentDetails: AgentEditorInitRecord | null | undefined
  initializedSignature: string | null
  isPromptLoading: boolean
}): boolean {
  if (input.isPromptLoading) {
    return false
  }

  const nextSignature = buildAgentPromptResponseSignature(input.agentKey, input.agentDetails)
  if (!nextSignature) {
    return false
  }

  return nextSignature !== input.initializedSignature
}

export function AgentModal({ agent, canEdit, onClose }: Props) {
  const initializedPromptSignatureRef = useRef<string | null>(null)
  const [activeTab, setActiveTab] = useState<ModalTab>('prompt')
  const [draftContent, setDraftContent] = useState('')
  const [initialContent, setInitialContent] = useState<string | null>(null)
  const [savedVersion, setSavedVersion] = useState<number | null>(null)
  const [savedVersionId, setSavedVersionId] = useState<string | null>(null)
  const [activatingVersionId, setActivatingVersionId] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [analysisState, setAnalysisState] = useState<'passed' | 'failed' | 'idle'>('idle')
  const [testMessage, setTestMessage] = useState('Покажи, як цей агент відповість на типовий запит.')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testRunId, setTestRunId] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<'passed' | 'failed' | 'idle'>('idle')
  const [testedDraftContent, setTestedDraftContent] = useState<string | null>(null)
  const [regressionResult, setRegressionResult] = useState<string | null>(null)
  const [regressionRunId, setRegressionRunId] = useState<string | null>(null)
  const [regressionStatus, setRegressionStatus] = useState<'passed' | 'failed' | 'idle'>('idle')
  const [regressedDraftContent, setRegressedDraftContent] = useState<string | null>(null)
  const {
    currentData: agentDetails,
    isFetching,
    isLoading,
    error,
    refetch: refetchAgentDetails,
  } = useGetAgentQuery(
    { key: agent.key },
    { refetchOnMountOrArgChange: true },
  )
  const { data: promptVersionsData } = useGetPromptVersionsQuery(
    { name: agent.promptId },
    { skip: !agent.promptId },
  )
  const [createPromptVersion, { isLoading: isSaving }] = useCreatePromptVersionMutation()
  const [activatePromptVersion, { isLoading: isActivating }] = useActivatePromptVersionMutation()
  const [runCompatibilityCheck, { isLoading: isAnalyzing }] = useRunCompatibilityCheckMutation()
  const [runRuntimeAgentTest, { isLoading: isTesting }] = useRunRuntimeAgentTestMutation()
  const [runRuntimeAgentRegressionTest, { isLoading: isRunningRegression }] = useRunRuntimeAgentRegressionTestMutation()
  const isPromptLoading = isLoading || (isFetching && !agentDetails)
  const promptVersions = promptVersionsData?.prompts ?? []
  const activePromptVersion = promptVersions.find((item) => item.isActive) ?? null
  const requiresRegression = agentDetails?.runtimeRegistered === true

  useEffect(() => {
    initializedPromptSignatureRef.current = null
    const emptyState = createEmptyAgentEditorSnapshot(agent.key)
    setDraftContent(emptyState.draftContent)
    setInitialContent(emptyState.initialContent)
    setSavedVersion(emptyState.savedVersion)
    setSavedVersionId(null)
    setActivatingVersionId(null)
    setAnalysisResult(null)
    setAnalysisState('idle')
    setTestResult(null)
    setTestRunId(null)
    setTestStatus('idle')
    setTestedDraftContent(null)
    setRegressionResult(null)
    setRegressionRunId(null)
    setRegressionStatus('idle')
    setRegressedDraftContent(null)
    setActiveTab('prompt')
  }, [agent.key])

  useEffect(() => {
    if (!shouldInitializeAgentEditor({
      agentKey: agent.key,
      agentDetails,
      initializedSignature: initializedPromptSignatureRef.current,
      isPromptLoading,
    })) {
      return
    }

    const nextState = loadAgentEditorSnapshot(agent.key, agentDetails ?? null)
    initializedPromptSignatureRef.current = buildAgentPromptResponseSignature(agent.key, agentDetails)
    setDraftContent(nextState.draftContent)
    setInitialContent(nextState.initialContent)
    setSavedVersion(nextState.savedVersion)
    setAnalysisResult(null)
    setAnalysisState('idle')
    setTestResult(null)
    setTestRunId(null)
    setTestStatus('idle')
    setTestedDraftContent(null)
    setRegressionResult(null)
    setRegressionRunId(null)
    setRegressionStatus('idle')
    setRegressedDraftContent(null)
    setActiveTab('prompt')
  }, [
    agent.key,
    agentDetails?.promptContent,
    agentDetails?.promptId,
    agentDetails?.source,
    agentDetails?.version,
    isPromptLoading,
  ])

  useEffect(() => {
    setSavedVersionId(activePromptVersion?.id ?? null)
  }, [activePromptVersion?.id, agent.key])

  useEffect(() => {
    if (!import.meta.env.DEV || isPromptLoading) {
      return
    }

    const textareaContent =
      document.querySelector<HTMLTextAreaElement>('[data-agent-prompt-content="true"]')?.value ?? ''
    const apiPromptContent = agentDetails?.promptContent ?? null

    console.info('[AGENT_EDITOR_TRACE]', buildAgentEditorTrace({
      agentKey: agent.key,
      responseContent: apiPromptContent,
      draftContent,
      textareaContent,
    }))

    if (
      agentDetails?.editablePrompt &&
      (apiPromptContent?.length ?? 0) > 0 &&
      textareaContent.length === 0
    ) {
      console.error('AGENT_PROMPT_BINDING_BROKEN', {
        agentKey: agent.key,
        apiLength: apiPromptContent?.length ?? 0,
        draftLength: draftContent.length,
        textareaLength: textareaContent.length,
      })
    }
  }, [agent.key, agentDetails?.editablePrompt, agentDetails?.promptContent, draftContent, isPromptLoading])

  const currentContent = draftContent.trim()
  const isModified = isAgentPromptDraftModified(initialContent, draftContent)
  const promptLoadState = resolveAgentPromptLoadState({
    promptId: agent.promptId,
    isLoading: isPromptLoading,
    error,
    prompt: agentDetails ?? null,
  })
  const effectiveTestStatus = resolveAgentDraftTestStatus({
    status: testStatus,
    draftContent,
    testedDraftContent,
  })
  const effectiveRegressionStatus = resolveAgentRegressionStatus({
    status: regressionStatus,
    draftContent,
    regressedDraftContent,
  })
  const canRunTest = canRunAgentDraftTest({
    analysisState,
    promptLoaded: promptLoadState.status === 'loaded',
    draftContent,
  })
  const canRunRegression = canRunAgentRegressionTest({
    promptLoaded: promptLoadState.status === 'loaded',
    draftContent,
    testStatus: effectiveTestStatus,
    runtimeRegistered: requiresRegression,
  })
  const canSave = canSaveAgentPromptVersion({
    draftContent,
    isModified,
    isPromptLoading: isLoading,
    hasError: Boolean(error),
    requiresAnalysis: agent.isSystem,
    hasAnalysisResult: Boolean(analysisResult),
    analysisState,
    testStatus: effectiveTestStatus,
    regressionStatus: effectiveRegressionStatus,
    requiresRegression,
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
      setAnalysisState('passed')
      setTestResult(null)
      setTestRunId(null)
      setTestStatus('idle')
      setTestedDraftContent(null)
      setRegressionResult(null)
      setRegressionRunId(null)
      setRegressionStatus('idle')
      setRegressedDraftContent(null)
      setActiveTab('analyze')
    } catch {
      setAnalysisState('failed')
      setTestResult(null)
      setTestRunId(null)
      setTestStatus('idle')
      setTestedDraftContent(null)
      setRegressionResult(null)
      setRegressionRunId(null)
      setRegressionStatus('idle')
      setRegressedDraftContent(null)
      toast.error('Не вдалося виконати AI-аналіз')
    }
  }

  const handleSave = async () => {
    if (!canEdit || !currentContent || !isModified || promptLoadState.status !== 'loaded') return

    if (agent.isSystem && !analysisResult) {
      toast.error('Перед збереженням системного агента запусти AI-аналіз')
      setActiveTab('analyze')
      return
    }

    try {
      const result = await createPromptVersion({
        name: agent.promptId,
        content: draftContent,
        isActive: false,
        agentKey: agent.key,
        promptId: agent.promptId,
        validationState: promptLoadState.status === 'loaded' ? 'passed' : 'failed',
        analysisState,
        testState: effectiveTestStatus,
        regressionState: effectiveRegressionStatus,
        testRunId,
        regressionRunId,
      }).unwrap()
      setDraftContent(result.prompt.content)
      setInitialContent(result.prompt.content)
      setSavedVersion(result.prompt.version)
      setSavedVersionId(result.prompt.id)
      setAnalysisState('idle')
      setTestResult(null)
      setTestRunId(null)
      setTestStatus('idle')
      setTestedDraftContent(null)
      setRegressionResult(null)
      setRegressionRunId(null)
      setRegressionStatus('idle')
      setRegressedDraftContent(null)
      toast.success('Нову версію промпта збережено. Активація виконується окремо.')
    } catch {
      toast.error('Не вдалося зберегти версію промпта')
    }
  }

  const handleActivate = async (promptVersionId: string) => {
    try {
      setActivatingVersionId(promptVersionId)
      await activatePromptVersion(promptVersionId).unwrap()
      await refetchAgentDetails()
      setSavedVersionId(promptVersionId)
      toast.success('Активну версію оновлено')
    } catch {
      toast.error('Не вдалося активувати версію промпта')
    } finally {
      setActivatingVersionId(null)
    }
  }

  const handleTest = async () => {
    const message = testMessage.trim()
    if (!message) return

    try {
      const result = await runRuntimeAgentTest({
        key: agent.key,
        promptContent: draftContent,
        testInput: {
          message,
          messageType: null,
        },
      }).unwrap()
      setTestResult(JSON.stringify(result.output, null, 2))
      setTestRunId(result.testRunId)
      setTestStatus(result.passed ? 'passed' : 'failed')
      setTestedDraftContent(draftContent)
      setRegressionResult(null)
      setRegressionRunId(null)
      setRegressionStatus('idle')
      setRegressedDraftContent(null)
      setActiveTab('test')
    } catch (runtimeError) {
      const detail =
        typeof runtimeError === 'object' &&
        runtimeError &&
        'data' in runtimeError &&
        Array.isArray((runtimeError as { data?: { errors?: unknown } }).data?.errors)
          ? (runtimeError as { data?: { errors?: string[] } }).data?.errors?.join('\n')
          : null
      setTestResult(detail ?? 'Draft runtime test failed.')
      setTestRunId(null)
      setTestStatus('failed')
      setTestedDraftContent(draftContent)
      setRegressionResult(null)
      setRegressionRunId(null)
      setRegressionStatus('idle')
      setRegressedDraftContent(null)
      toast.error('Не вдалося виконати targeted test')
    }
  }

  const handleRegression = async () => {
    try {
      const result = await runRuntimeAgentRegressionTest({
        key: agent.key,
        promptContent: draftContent,
      }).unwrap()
      setRegressionResult(result.cases.map((item) => `${item.passed ? 'PASS' : 'FAIL'} ${item.id}${item.error ? ` — ${item.error}` : ''}`).join('\n'))
      setRegressionRunId(result.regressionRunId)
      setRegressionStatus(result.passed ? 'passed' : 'failed')
      setRegressedDraftContent(draftContent)
      setActiveTab('test')
    } catch (runtimeError) {
      const detail =
        typeof runtimeError === 'object' &&
        runtimeError &&
        'data' in runtimeError &&
        Array.isArray((runtimeError as { data?: { cases?: unknown } }).data?.cases)
          ? ((runtimeError as { data?: { cases?: Array<{ id: string; error?: string }> } }).data?.cases ?? [])
              .map((item) => `FAIL ${item.id}${item.error ? ` — ${item.error}` : ''}`)
              .join('\n')
          : 'Regression safety check failed.'
      setRegressionResult(detail)
      setRegressionRunId(null)
      setRegressionStatus('failed')
      setRegressedDraftContent(draftContent)
      toast.error('Не вдалося виконати regression safety test')
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
            ) : promptLoadState.status === 'error' || promptLoadState.status === 'missing' || promptLoadState.status === 'uneditable' ? (
              <div className="rounded-[20px] border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] p-4 text-sm leading-6 text-[rgb(252,165,165)]">
                {promptLoadState.message}
              </div>
            ) : (
              <>
                <div className="text-[11px] text-[var(--text-muted)]">
                  {agentDetails ? (
                    <>
                      {promptLoadState.message}
                      {' · '}Активна версія:{' '}
                      <span className="font-semibold text-[var(--text-secondary)]">v{activePromptVersion?.version ?? savedVersion ?? agentDetails?.version}</span>
                    </>
                  ) : 'Активний промпт і filesystem fallback не знайдені.'}
                </div>

                <Textarea
                  label="Content"
                  data-agent-prompt-content="true"
                  value={draftContent}
                  onChange={(event) => {
                    setDraftContent(event.target.value)
                    setAnalysisResult(null)
                    setAnalysisState('idle')
                    setTestResult(null)
                    setTestRunId(null)
                    setTestStatus('idle')
                    setTestedDraftContent(null)
                    setRegressionResult(null)
                    setRegressionRunId(null)
                    setRegressionStatus('idle')
                    setRegressedDraftContent(null)
                  }}
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
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Версії
                  </p>
                  <div className="mt-3 space-y-2">
                    {promptVersions.map((version) => {
                      const canActivate = canEdit && !version.isActive
                      return (
                        <div
                          key={version.id}
                          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-3 py-2 text-sm"
                        >
                          <span className="font-semibold text-[var(--text-primary)]">v{version.version}</span>
                          <span className="text-[var(--text-muted)]">
                            {version.isActive ? 'Активна' : version.id === savedVersionId ? 'Збережений драфт' : 'Історія'}
                          </span>
                          <span className="text-[var(--text-muted)]">{version.source}</span>
                          <div className="flex-1" />
                          {canActivate ? (
                            <Button
                              type="button"
                              variant="outline"
                              color="muted"
                              loading={isActivating && activatingVersionId === version.id}
                              onClick={() => void handleActivate(version.id)}
                            >
                              АКТИВУВАТИ
                            </Button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <Textarea
                  label="Тестовий запит"
                  value={testMessage}
              onChange={(event) => setTestMessage(event.target.value)}
              size="lg"
              className="bg-[var(--card)]"
              rows={5}
              helperText="Тест виконує реальний canonical gateway runtime для вибраного агента."
            />
            <div className="rounded-[16px] border border-[rgba(250,204,21,0.18)] bg-[rgba(250,204,21,0.08)] px-4 py-3 text-xs leading-6 text-[rgb(253,224,71)]">
              Draft test виконує реальний runtime для поточного драфта без save/activate. Active version у production не змінюється.
            </div>
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-7 text-[var(--text-primary)]">
              <pre className="whitespace-pre-wrap break-words">{testResult ?? 'Запусти targeted test для поточного агента.'}</pre>
            </div>
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-7 text-[var(--text-primary)]">
              <pre className="whitespace-pre-wrap break-words">{regressionResult ?? 'Після TEST PASS запусти regression safety для поточного драфта.'}</pre>
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
          disabled={!testMessage.trim() || !canRunTest}
          onClick={() => void handleTest()}
        >
          ТЕСТУВАТИ
        </Button>
        <Button
          type="button"
          variant="outline"
          color="muted"
          loading={isRunningRegression}
          disabled={!canRunRegression}
          onClick={() => void handleRegression()}
        >
          REGRESSION CHECK
        </Button>
        <div className="flex-1" />
        {canEdit ? (
          <Button
            type="button"
            variant="solid"
            color="accent"
            loading={isSaving}
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            ЗБЕРЕГТИ ВЕРСІЮ
          </Button>
        ) : null}
      </div>
    </BaseModal>
  )
}
