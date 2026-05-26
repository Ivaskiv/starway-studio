import { AiProviderMonitor } from '@/features/sales-assistant/components/AiProvider'
import { AiPositionSection } from '@/features/sales-assistant/components/AiPositionSection'
import { StrategicCards } from '@/features/sales-assistant/components/ArtifactCards'
import DnaGenerationPanel from '@/features/sales-assistant/components/DnaGenerationPanel'
import { GenerationStepSection } from '@/features/sales-assistant/components/GenerationStepSection'
import { HistoryPanel } from '@/features/sales-assistant/components/History'
import { InputEngineSection } from '@/features/sales-assistant/components/InputEngineSection'
import { LexiconPanel } from '@/features/sales-assistant/components/LexiconPanel'
import { StrategicOutput } from '@/features/sales-assistant/components/OutputArtifacts'
import { PreviewRenderer } from '@/features/sales-assistant/components/PreviewRenderer'
import { SpecializedAgentsSection, type AgentKey } from '@/features/sales-assistant/components/SpecializedAgentsSection'
import {
  AI_ASSISTANT_TONE_PRESETS,
  CONTENT_TYPES,
  COST_ESTIMATE,
  DEFAULT_LEX,
  DEFAULT_MODEL_STATE,
  FREE_TOKEN_LIMITS,
  GENERATION_MODES,
  PROTOCOLS,
} from '@/features/sales-assistant/config/contentStudio.config'
import {
  useDnaGenerationHistory,
  type DnaGenerationMode,
} from '@/features/sales-assistant/hooks/useDnaGenerationHistory'
import { type InputStatus, useAudioInput } from '@/features/sales-assistant/hooks/useAudioInput'
import { useStrategicGeneration } from '@/features/sales-assistant/hooks/useStrategicGeneration'
import {
  useAddLexiconMutation,
  useDeleteLexiconMutation,
  useGenerateContentMutation,
  useGenerateWithAgentsMutation,
  useGetLexiconQuery,
} from '@/features/sales-assistant/store/aiAssistant.api'
import {
  computeTruthScore,
  resolveContentType,
  resolveFreeFirstProvider,
  resolveUiModelName,
  type ContentKey,
  type ModelState,
} from '@/features/sales-assistant/utils/salesAssistant.helpers'
import { buildTokenMetrics } from '@/features/sales-assistant/utils/tokenMetrics'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import {
  buildAiUsageEstimate,
  resolveAiMaxOutputTokens,
} from '@ai/providers/pricing'
import type {
  GenerationResult,
  ModelGenerationResult,
  ModelProvider,
} from '@ai/types/salesAssistant.types'
import { ChevronRight, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useLayoutContext } from '@/layout/MainLayout'
import type { ContentTypeKey } from '@/features/sales-assistant/types/output.types'

// ─── types ───────────────────────────────────────────────────────────────────
type ModelKey = ModelProvider
type ResultsByModel = Partial<Record<ModelKey, GenerationResult>>
type ValidationState = 'clean' | 'warning'
type ProviderError = {
  status: number
  code: string
  message: string
  isFatal: boolean
}
type GenerationJobUi = {
  id: string
  contentType: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'
  attempt: number
  maxAttempts: number
  error?: string
  failureClass?:
    | 'BALANCE_EXHAUSTED'
    | 'RATE_LIMIT'
    | 'INVALID_API_KEY'
    | 'TEMPORARY_UNAVAILABLE'
    | 'TIMEOUT'
    | 'FEATURE_NOT_SUPPORTED'
    | 'PROVIDER_DOWN'
  provider?: 'claude' | 'gpt' | 'gemini'
  fallbackProvider?: 'claude' | 'gpt' | 'gemini'
  degraded?: boolean
  blockedPremium?: boolean
  paused?: boolean
}
type ProviderStatusUi = {
  provider: 'claude' | 'gpt' | 'gemini'
  available: boolean
  status:
    | 'ok'
    | 'degraded'
    | 'ACTIVE'
    | 'DEGRADED'
    | 'RATE_LIMITED'
    | 'OUT_OF_CREDITS'
    | 'UNAVAILABLE'
    | 'DISABLED'
    | 'BALANCE_EXHAUSTED'
    | 'RATE_LIMIT'
    | 'INVALID_API_KEY'
    | 'TEMPORARY_UNAVAILABLE'
    | 'TIMEOUT'
    | 'FEATURE_NOT_SUPPORTED'
    | 'PROVIDER_DOWN'
  message?: string
}

// ─── constants ───────────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  'Парсинг контексту',
  'Аналіз болю',
  'Стратегія та структура',
  'Генерація контенту',
  'Підготовка виводу',
] as const
const PIPELINE_LIVE_STATES = [
  'Парсинг контексту — Очищення аудіо-транскрипту від розмовного сміття',
  'Мапінг болю — Зіставлення слів з матрицею болей ринку',
  'Пошук тригерів — Виявлення маркерів лексикону автора',
  'Побудова структури — Формування семантичного каркасу',
  'Генерація результатів — Паралельний рендеринг карток',
] as const
const INPUT_STATUS_COPY: Record<InputStatus, string> = {
  idle: 'Готово до вводу',
  recording: 'Йде голосова диктовка...',
  transcribing: 'Транскрибую аудіо...',
  parsing: 'Аналізую сенси...',
  autofilled: 'Поля автоматично заповнені',
  error: 'Не вдалося обробити аудіо',
}

const PROTOCOL_ICONS: Record<string, string> = {
  SYSTEM: 'S',
  AUTHOR: 'A',
  PSYCH: 'P',
}

const MAX_CONTENT_TYPES = CONTENT_TYPES.length
const AGENT_TO_CONTENT_TYPE_MAP: Record<AgentKey, string> = {
  voice: 'blog',
  cta: 'telegram',
  landing: 'landing',
  reels: 'reels',
  storytelling: 'post',
  warmup: 'warmup',
}
const PROTOCOL_TO_AGENTS_PROTOCOL: Record<
  (typeof PROTOCOLS)[number]['key'],
  'raw_truth' | 'architect' | 'psychology'
> = {
  SYSTEM: 'raw_truth',
  AUTHOR: 'architect',
  PSYCH: 'psychology',
}
const TONE_TO_AGENT_TONE: Record<string, 'clear' | 'warm' | 'expert' | 'bold'> = {
  'Чітко': 'clear',
  'Тепло': 'warm',
  'Експертно': 'expert',
  'Сміливо': 'bold',
}
const GENERATION_MODE_TO_AGENT_MODE: Record<DnaGenerationMode, 'FAST' | 'BALANCED' | 'DEEP'> = {
  FAST: 'FAST',
  BALANCED: 'BALANCED',
  PREMIUM: 'DEEP',
}
const DEBUG_MODE =
  typeof window !== 'undefined' &&
  (window.localStorage.getItem('dna-debug-mode') === '1' ||
    new URLSearchParams(window.location.search).get('dna_debug') === '1')

function normalizeAgentContentType(contentType?: string, fallbackAgent?: AgentKey): ContentTypeKey | null {
  if (contentType === 'telegram') return 'telegram_msg'
  if (contentType === 'story') return 'stories'
  if (contentType === 'cta' || contentType === 'banner') return null
  if (contentType === 'blog' || contentType === 'reels' || contentType === 'landing' || contentType === 'warmup' || contentType === 'email') {
    return contentType
  }
  if (fallbackAgent) {
    const mapped = AGENT_TO_CONTENT_TYPE_MAP[fallbackAgent]
    if (mapped === 'telegram') return 'telegram_msg'
    if (mapped === 'post') return 'stories'
    return mapped as ContentTypeKey
  }
  return null
}

// ─── error helper ────────────────────────────────────────────────────────────
function resolveProviderErrorMessage(error: ProviderError): string {
  const lower = error.message.toLowerCase()
  if (lower.includes('credit balance') || lower.includes('credit_balance_too_low'))
    return 'Баланс токенів вичерпано. Поповни рахунок у кабінеті провайдера.'
  if (error.code === 'QUOTA_EXCEEDED')
    return 'Денний ліміт вичерпано. Спробуй Gemini — він безкоштовний.'
  if (error.code === 'RATE_LIMITED')
    return 'Забагато запитів. Зачекай 60 сек та спробуй знову.'
  if (error.status === 401 || error.code === 'INVALID_PROVIDER_KEY')
    return 'API ключ недійсний або відсутній. Перевір налаштування.'
  if (error.status === 403 || error.code === 'PROVIDER_FORBIDDEN')
    return 'Доступ заблоковано. AI Workspace не ініціалізовано.'
  if (error.status === 503 || error.status === 529)
    return 'Провайдер перевантажений. Спробуй через 2–3 хвилини.'
  if (error.code === 'ALL_PROVIDERS_DOWN')
    return 'Всі провайдери недоступні. Перевір API ключі та баланс.'
  return error.message || 'AI тимчасово недоступний. Спробуй пізніше.'
}

// ─── component ───────────────────────────────────────────────────────────────
export default function SalesAssistantPage() {
  // ── sidebar auto-collapse ─────────────────────────────────────────────────
  const { collapsed, setCollapsed } = useLayoutContext()
  const prevCollapsedRef = useRef(collapsed)
  useEffect(() => {
    setCollapsed(true)
    return () => {
      setCollapsed(prevCollapsedRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── history & session ─────────────────────────────────────────────────────
  const { history, addEntry, winningFormulas, painPatterns } = useDnaGenerationHistory()
  const { appState: sessionStatus } = useSessionOrchestrator()
  const shouldSkipProtectedQueries = sessionStatus !== 'authenticated'
  const { data: trialStatus } = useGetTrialStatusQuery(undefined, { skip: shouldSkipProtectedQueries })
  const isPremiumAccess = Boolean(trialStatus?.isPaid)

  // ── API mutations ─────────────────────────────────────────────────────────
  const [generateContent, { isLoading }] = useGenerateContentMutation()
  const [generateWithAgents] = useGenerateWithAgentsMutation()
  const { data: lexItems = DEFAULT_LEX, isLoading: isLexLoading } =
    useGetLexiconQuery(undefined, { skip: shouldSkipProtectedQueries })
  const [addLex, { isLoading: isAddingLex }] = useAddLexiconMutation()
  const [deleteLex, { isLoading: isDeletingLex }] = useDeleteLexiconMutation()

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedProtocol, setSelectedProtocol] =
    useState<(typeof PROTOCOLS)[number]['key']>('SYSTEM')
  const [outputs, setOutputs] = useState<ContentKey[]>(['reels', 'warmup'])
  const [tone, setTone] = useState('Чітко')
  const [generationMode, setGenerationMode] = useState<DnaGenerationMode>('BALANCED')
  const [pain, setPain] = useState('')
  const [goal, setGoal] = useState('')
  const [customTask, setCustomTask] = useState('')
  const [models, setModels] = useState<ModelState>(DEFAULT_MODEL_STATE)

  const [activePreset, setActivePreset] = useState<'noise' | 'stuck' | 'battle' | 'tactic' | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<AgentKey[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)

  // ── results & errors ──────────────────────────────────────────────────────
  const [results, setResults] = useState<ResultsByModel>({})
  const [outputsByType, setOutputsByType] = useState<Partial<Record<ContentTypeKey, string>>>({})
  const [providerErrors, setProviderErrors] = useState<Partial<Record<ModelProvider, ProviderError>>>({})
  const [generationJobs, setGenerationJobs] = useState<GenerationJobUi[]>([])
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusUi[]>([])
  const [providerModalOpen, setProviderModalOpen] = useState(false)
  const [providerModalReason, setProviderModalReason] = useState<'all_down' | 'feature_blocked' | null>(null)
  const [providerModalMessage, setProviderModalMessage] = useState<string | null>(null)
  const [providerModalUpgradeCta, setProviderModalUpgradeCta] = useState<string | null>(null)
  const [providerModalFallback, setProviderModalFallback] = useState<string | null>(null)
  const [editableContent, setEditableContent] = useState('')
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null)
  const [preFilledFormula, setPreFilledFormula] = useState(
    '// Сформулюйте ваш запит або дочекайтесь генерації...\n// Модель використає встановлені параметри ДНК.'
  )

  // ── token usage ───────────────────────────────────────────────────────────
  const [freeUsage, setFreeUsage] = useState<Record<ModelKey, number>>({ gpt: 0, claude: 0, gemini: 0 })
  const isGeneratingRef = useRef(false)
  const lastGenerateAtRef = useRef(0)
  const activeRequestRef = useRef<{ abort: () => void } | null>(null)
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false)
  const [previewTabIndex, setPreviewTabIndex] = useState(0)
  const [previewPage, setPreviewPage] = useState(0)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile' | 'doc'>('desktop')
  const [pipelineStageIndex, setPipelineStageIndex] = useState(0)
  const [queueProgress, setQueueProgress] = useState<Record<string, number>>({})
  const [strategicCoreSnapshot, setStrategicCoreSnapshot] = useState<{
    userContext: string
    userRequest: string
  } | null>(null)
  const {
    audioFile,
    inputMethod,
    inputStatus,
    audioDurationSec,
    audioProcessingMs,
    audioTranscript,
    dictationField,
    audioInputRef,
    setInputMethod,
    startDictation,
    stopDictation,
    handleAudioFileChange,
    resetAudio,
  } = useAudioInput({
    setPain,
    setGoal,
    setCustomTask,
  })

  // ── persist free usage ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('dna-starway-free-usage')
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<Record<ModelKey, number>>
      setFreeUsage({ gpt: parsed.gpt ?? 0, claude: parsed.claude ?? 0, gemini: parsed.gemini ?? 0 })
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('dna-starway-free-usage', JSON.stringify(freeUsage))
  }, [freeUsage])

  // ── derived values ────────────────────────────────────────────────────────
  const primaryOutput = outputs[0] ?? 'sales'
  const reelsEngineState = useMemo(() => {
    const globalFlag = (globalThis as { __STARWAY_FEATURE_FLAGS__?: Record<string, unknown> }).__STARWAY_FEATURE_FLAGS__
    const envFlag = import.meta.env.VITE_REELS_ENGINE_AVAILABLE === 'true'
    const flagEnabled = envFlag || globalFlag?.realRenderPipeline === true || globalFlag?.reelsEngineAvailable === true
    return {
      isAvailable: Boolean(flagEnabled),
      progress: null as number | null,
      etaSeconds: null as number | null,
      queueSize: null as number | null,
    }
  }, [])
  const selectedContentType = resolveContentType(primaryOutput)
  const outputLimit = resolveAiMaxOutputTokens(selectedContentType)

  const selectedProvider = resolveFreeFirstProvider({
    mode: generationMode,
    models,
    outputCount: outputs.length,
    freeUsage,
  })

  const selectedProviderFreeLeft = Math.max(
    0,
    FREE_TOKEN_LIMITS[selectedProvider] - freeUsage[selectedProvider]
  )
  const selectedProviderNeeds =
    COST_ESTIMATE[selectedProvider].tokensPerOutput * Math.max(1, outputs.length)
  const selectedProviderIsFreePath = selectedProviderFreeLeft >= selectedProviderNeeds

  const generationEstimate = useMemo(() => {
    const model = resolveUiModelName(selectedProvider, selectedProtocol)
    const promptText = [
      `Protocol: ${selectedProtocol}`,
      `Outputs: ${outputs.join(', ')}`,
      `Tone: ${tone}`,
      `Lexicon items: ${lexItems.length}`,
    ].join('\n')
    const userText = [pain, goal, customTask].filter((s) => s.trim().length > 0).join('\n')
    return {
      provider: selectedProvider,
      model,
      ...buildAiUsageEstimate({
        model,
        promptText,
        userText,
        maxOutputTokens: resolveAiMaxOutputTokens(selectedContentType),
      }),
    }
  }, [customTask, goal, lexItems.length, outputs, pain, selectedContentType, generationMode, selectedProtocol, selectedProvider, tone])

  const latestResult = useMemo(() => {
    const entries = Object.values(results)
    return entries.length > 0 ? entries[entries.length - 1] : null
  }, [results])

  const compareVersion = useMemo(
    () => history.find((e) => e.id === compareVersionId) ?? null,
    [compareVersionId, history]
  )

  const validationState: ValidationState = latestResult?.validationWarning ? 'warning' : 'clean'
  const unifiedTokenMetrics = useMemo(
    () => buildTokenMetrics({
      latestResult,
      provider: selectedProvider,
      fallbackModel: generationEstimate.model,
      estimatedInputTokens: generationEstimate.inputTokens,
      estimatedOutputTokens: generationEstimate.outputTokens,
      sessionResults: results,
    }),
    [generationEstimate.inputTokens, generationEstimate.model, generationEstimate.outputTokens, latestResult, results, selectedProvider]
  )

  const canGenerate =
    Object.values(models).some(Boolean) &&
    !isLoading &&
    !isGeneratingLocal &&
    !isGeneratingRef.current

  useEffect(() => {
    if (!(isLoading || isGeneratingLocal)) return
    const interval = window.setInterval(() => {
      setPipelineStageIndex((prev) => (prev + 1) % PIPELINE_LIVE_STATES.length)
      setQueueProgress((prev) => {
        const next: Record<string, number> = { ...prev }
        outputs.forEach((type, index) => {
          const base = next[type] ?? Math.max(6, index * 8)
          next[type] = Math.min(96, base + 8)
        })
        return next
      })
    }, 1400)
    return () => window.clearInterval(interval)
  }, [isGeneratingLocal, isLoading, outputs])

  useEffect(() => {
    if (!latestResult) return
    setQueueProgress((prev) => {
      const next = { ...prev }
      outputs.forEach((type) => {
        next[type] = 100
      })
      return next
    })
  }, [latestResult, outputs])

  useEffect(() => () => {
    stopDictation()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleToggleOutput = (contentKey: ContentKey) => {
    setOutputs((current) => {
      if (current.includes(contentKey)) {
        const next = current.filter((k) => k !== contentKey)
        return next.length > 0 ? next : current
      }
      if (current.length >= MAX_CONTENT_TYPES) {
        toast.error(`Максимум ${MAX_CONTENT_TYPES} типів контенту`)
        return current
      }
      return [...current, contentKey]
    })
  }

  const toggleModel = (model: ModelKey) => {
    setModels((current) => {
      const enabledCount = Object.values(current).filter(Boolean).length
      if (current[model] && enabledCount === 1) return current
      return { ...current, [model]: !current[model] }
    })
  }

  const handleGenerate = async () => {
    if (!canGenerate) return
    const missing: string[] = []
    if (!pain || pain.trim().length < 10) {
      missing.push('Що реально болить аудиторії (Крок 1)')
    }
    if (!goal || goal.trim().length < 10) {
      missing.push('До якої дії ведемо (Крок 1)')
    }
    if (outputs.length === 0) {
      missing.push('Тип контенту (Крок 3)')
    }
    if (missing.length > 0) {
      setValidationError(`Заповніть обов'язкові ДНК-маркери:\n• ${missing.join('\n• ')}`)
      return
    }
    setValidationError(null)
    const now = Date.now()
    if (isGeneratingRef.current || now - lastGenerateAtRef.current < 900) return

    isGeneratingRef.current = true
    activeRequestRef.current?.abort()
    setIsGeneratingLocal(true)
    lastGenerateAtRef.current = now
    setProviderErrors({})

    try {
      console.log('[DNA][debug][generate][start]', {
        selectedAgents,
        activePreset,
        outputs,
        selectedProtocol,
      })
      const enabledModels = (Object.keys(models) as ModelProvider[]).filter((key) => models[key])
      const useNewAgentsFlow = selectedAgents.length > 0
      const mappedOutputs = useNewAgentsFlow
        ? selectedAgents.map((agent) => AGENT_TO_CONTENT_TYPE_MAP[agent])
        : outputs
      const primaryMappedType = mappedOutputs[0] ?? selectedContentType
      const userRequest = [pain, goal, customTask, tone ? `Тон: ${tone}` : ''].filter(Boolean).join('\n')
      const userContext = [
        pain ? `БІЛЬ: ${pain}` : '',
        goal ? `ЦІЛЬ: ${goal}` : '',
        tone ? `ТОН: ${tone}` : '',
        `ПРОТОКОЛ: ${selectedProtocol}`,
        `ФОРМАТИ: ${mappedOutputs.join(', ')}`,
      ].filter(Boolean).join('\n')
      const payload = {
        contentType: primaryMappedType,
        providers: enabledModels,
        enabledModels,
        selectedProtocol,
        selectedOutputs: mappedOutputs,
        userContext,
        userRequest,
      }
      console.log('[DNA][debug][generate][payload_built]', {
        useNewAgentsFlow,
        mappedOutputs,
        primaryMappedType,
        payload,
      })
      setStrategicCoreSnapshot({ userContext, userRequest })

      if (useNewAgentsFlow) {
        console.log('[DNA][frontend] Using NEW agents flow')
        const agentsResponse = await generateWithAgents({
          selectedAgents,
          selectedPreset: activePreset,
          audiencePain: pain,
          targetAction: goal || customTask,
          product: customTask,
          additionalNotes: userContext,
          protocol: PROTOCOL_TO_AGENTS_PROTOCOL[selectedProtocol],
          tone: TONE_TO_AGENT_TONE[tone] ?? 'clear',
          generationMode: GENERATION_MODE_TO_AGENT_MODE[generationMode],
          accessTier: isPremiumAccess ? 'premium' : 'free',
        }).unwrap()
        console.log('[DNA][debug][agents][response_raw]', agentsResponse)

        if (!agentsResponse.success) {
          throw new Error(agentsResponse.error || 'Agents flow failed')
        }

        console.log('[DNA][frontend] Results:', agentsResponse.results)
        const fulfilledResults = agentsResponse.results.filter(
          (item) => item.status === 'fulfilled' && item.result
        )
        setGenerationJobs(agentsResponse.generationJobs ?? [])
        setProviderStatuses(agentsResponse.providerStatuses ?? [])
        if (agentsResponse.gatingDecision && !agentsResponse.gatingDecision.allowed) {
          setProviderModalReason(
            agentsResponse.gatingDecision.reason === 'feature_blocked' ? 'feature_blocked' : 'all_down'
          )
          setProviderModalMessage(agentsResponse.gatingDecision.message ?? null)
          setProviderModalUpgradeCta(agentsResponse.gatingDecision.upgradeCta ?? null)
          setProviderModalFallback(agentsResponse.gatingDecision.fallbackOption ?? null)
          setProviderModalOpen(true)
        }
        const degradedJobs = (agentsResponse.generationJobs ?? []).filter((job) => job.degraded)
        if (degradedJobs.length > 0) {
          toast(`Soft warning: fallback provider used for ${degradedJobs.length} job(s).`)
        }
        const blockedJobs = (agentsResponse.generationJobs ?? []).filter((job) => job.blockedPremium)
        if (blockedJobs.length > 0) {
          setProviderModalReason('feature_blocked')
          setProviderModalOpen(true)
        }
        const allDown =
          (agentsResponse.providerStatuses ?? []).length > 0 &&
          (agentsResponse.providerStatuses ?? []).every((status) => !status.available)
        if (allDown) {
          setProviderModalReason('all_down')
          setProviderModalOpen(true)
        }
        const failedJobs = (agentsResponse.generationJobs ?? []).filter((job) => job.status === 'failed')
        if (failedJobs.length > 0) {
          toast.error(`Частина генерації впала: ${failedJobs.length} job(s)`)
        }
        console.log('[DNA][debug][agents][normalized]', {
          total: agentsResponse.results.length,
          fulfilled: fulfilledResults.length,
          rejected: agentsResponse.results.filter((item) => item.status === 'rejected').length,
          fulfilledShapes: fulfilledResults.map((item) => ({
            agent: item.agent,
            model: item.model,
            contentType: item.contentType ?? null,
            outputType: (item as { outputType?: string }).outputType ?? null,
            type: (item as { type?: string }).type ?? null,
            resultType: typeof item.result,
            resultLength: item.result?.length ?? 0,
          })),
        })
        if (fulfilledResults.length === 0 && blockedJobs.length > 0) {
          return
        }
        if (fulfilledResults.length === 0) {
          throw new Error('Жоден агент не повернув результат')
        }

        const byTypeUpdates: Partial<Record<ContentTypeKey, string>> = {}
        const generatedTypes = new Set<ContentTypeKey>()
        for (const agentResult of fulfilledResults) {
          const backendType =
            agentResult.contentType ??
            (agentResult as { outputType?: string }).outputType ??
            (agentResult as { type?: string }).type
          const mappedType = normalizeAgentContentType(backendType, agentResult.agent)
          if (!mappedType) continue
          byTypeUpdates[mappedType] = agentResult.result ?? ''
          generatedTypes.add(mappedType)
        }
        if (generatedTypes.size > 0) {
          setOutputs(Array.from(generatedTypes))
        }

        setOutputsByType((current) => ({ ...current, ...byTypeUpdates }))
        console.log('[DNA][debug][agents][output_save]', {
          byTypeUpdates,
          resultTypeKeys: fulfilledResults.map((item) => ({
            agent: item.agent,
            contentType: item.contentType ?? null,
            outputType: (item as { outputType?: string }).outputType ?? null,
            type: (item as { type?: string }).type ?? null,
          })),
          currentOutputsState: outputs,
        })
        const firstContent = fulfilledResults[0]?.result ?? ''
        setEditableContent(firstContent)
        setProviderErrors({})

        setResults((current) => {
          const next = { ...current }
          for (const agentResult of fulfilledResults) {
            next[`${agentResult.model}` as ModelProvider] = {
              id: `${Date.now()}-${agentResult.agent}`,
              content: agentResult.result ?? '',
              modelUsed: agentResult.model,
              contentType: primaryMappedType as GenerationResult['contentType'],
              protocol: selectedProtocol,
              tokensUsed: 0,
              createdAt: new Date().toISOString(),
            }
          }
          return next
        })
        console.log('[DNA][debug][agents][results_save]', {
          resultsKeysWillBeByModel: fulfilledResults.map((item) => item.model),
        })

        addEntry({
          id: `${Date.now()}`,
          createdAt: new Date().toISOString(),
          mode: generationMode,
          protocol: selectedProtocol,
          format: primaryMappedType,
          pain,
          goal,
          content: firstContent,
          truthScore: 0,
          validationState: 'clean',
          model: fulfilledResults[0]?.model ?? 'unknown',
          provider: fulfilledResults[0]?.model ?? 'unknown',
        })

        return
      }

      const request = generateContent(payload)
      activeRequestRef.current = request
      const result = await request.unwrap()
      console.log('[DNA][debug][legacy][response_raw]', {
        modelUsed: result.modelUsed,
        contentType: result.contentType,
        hasContent: Boolean(result.content),
        contentLength: result.content?.length ?? 0,
        multiModelCount: result.multiModelResults?.length ?? 0,
      })

      if (result.multiModelResults && result.multiModelResults.length > 0) {
        const newResults: ResultsByModel = {}
        const newErrors: Partial<Record<ModelProvider, ProviderError>> = {}
        for (const mr of result.multiModelResults as ModelGenerationResult[]) {
          if (mr.content !== null) {
            newResults[mr.modelKey] = {
              id: result.id,
              content: mr.content,
              modelUsed: mr.modelKey,
              contentType: result.contentType,
              protocol: result.protocol,
              tokensUsed: mr.usage?.totalTokens ?? 0,
              usage: mr.usage ?? undefined,
              createdAt: result.createdAt,
              validationWarning: result.validationWarning,
            }
            setFreeUsage((current) => ({
              ...current,
              [mr.modelKey]: current[mr.modelKey] + (mr.usage?.outputTokens ?? 0),
            }))
          } else if (mr.error !== null) {
            newErrors[mr.modelKey] = mr.error
          }
        }
        setResults((current) => ({ ...current, ...newResults }))
        setProviderErrors(newErrors)
        console.log('[DNA][debug][legacy][normalized_multi]', {
          newResultKeys: Object.keys(newResults),
          errorKeys: Object.keys(newErrors),
          outputsTarget: primaryOutput,
        })
        const firstSuccess = result.multiModelResults.find(
          (mr: ModelGenerationResult) => mr.content !== null
        )
        if (firstSuccess?.content) {
          setEditableContent(firstSuccess.content)
          setOutputsByType((current) => ({
            ...current,
            [primaryOutput]: firstSuccess.content ?? '',
          }))
        }
      } else {
        setResults((current) => ({ ...current, [result.modelUsed]: result }))
        setEditableContent(result.content ?? '')
        setOutputsByType((current) => ({
          ...current,
          [primaryOutput]: result.content ?? '',
        }))
        setFreeUsage((current) => ({
          ...current,
          [result.modelUsed]:
            current[result.modelUsed] +
            (result.usage?.outputTokens ??
              COST_ESTIMATE[result.modelUsed].tokensPerOutput * Math.max(1, outputs.length)),
        }))
        console.log('[DNA][debug][legacy][normalized_single]', {
          model: result.modelUsed,
          outputTarget: primaryOutput,
        })
      }

      addEntry({
        id: result.id ?? `${Date.now()}`,
        createdAt: result.createdAt,
        mode: generationMode,
        protocol: selectedProtocol,
        format: selectedContentType,
        pain,
        goal,
        content: result.content,
        truthScore: computeTruthScore(result),
        validationState: result.validationWarning ? 'warning' : 'clean',
        model: result.usage?.model ?? 'unknown',
        provider: result.usage?.provider ?? result.modelUsed,
      })
    } catch (error) {
      console.error('[DNA][frontend] generation failed', error)
      const enabledModels = (Object.keys(models) as ModelProvider[]).filter((k) => models[k])
      const fallbackErrors: Partial<Record<ModelProvider, ProviderError>> = {}
      for (const key of enabledModels) {
        fallbackErrors[key] = {
          status: 503,
          code: 'REQUEST_FAILED',
          message: "Запит не вдався. Перевір з'єднання та спробуй знову.",
          isFatal: false,
        }
      }
      setProviderErrors(fallbackErrors)
      setProviderModalReason('all_down')
      setProviderModalOpen(true)
      setGenerationJobs((current) =>
        current.map((job) =>
          job.status === 'processing' || job.status === 'retrying'
            ? {
                ...job,
                status: 'failed',
                error: 'Generation request failed before completion',
                paused: true,
              }
            : job
        )
      )
      console.error('[DNA][debug][generate][failed_shape]', {
        selectedAgents,
        outputs,
        selectedProtocol,
        fallbackErrors,
      })
    } finally {
      activeRequestRef.current = null
      isGeneratingRef.current = false
      setIsGeneratingLocal(false)
    }
  }

  const handleClear = () => {
    setPain('')
    setGoal('')
    setCustomTask('')
    setActivePreset(null)
    setInputMethod('manual')
    resetAudio()
    stopDictation()
    setStrategicCoreSnapshot(null)
    setResults({})
    setOutputsByType({})
    setProviderErrors({})
    setGenerationJobs([])
    setProviderStatuses([])
    setProviderModalOpen(false)
    setProviderModalReason(null)
    setProviderModalMessage(null)
    setProviderModalUpgradeCta(null)
    setProviderModalFallback(null)
    setValidationError(null)
  }

  const handleCopy = (content?: string) => {
    if (!content) return
    void navigator.clipboard.writeText(content)
  }

  const handleExport = (content?: string) => {
    if (!content || typeof window === 'undefined') return
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `dna-starway-${Date.now()}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleLexAdd = (word: string, type: 'REQUIRED' | 'FORBIDDEN') => {
    void addLex({ word, type })
  }

  const handleLexDelete = (id: string) => {
    void deleteLex(id)
  }

  const setDefaultProvider = (provider: ModelProvider) => {
    setModels({ gpt: false, claude: false, gemini: false, [provider]: true })
  }

  const applyPreset = (presetType: 'noise' | 'stuck' | 'battle' | 'tactic') => {
    if (presetType === 'noise') {
      setPain('Експерти втомилися жити в шумі, постійно пиляти тонни безглуздого контенту, який ніхто не купує.')
      setGoal('Закритий клуб Focus. Щопонеділкові живі Zoom-розбори, випалювання ілюзій, повернення до живих фактів.')
      setTone('Сміливо')
      setCustomTask('HIGH pressure, FOMO, provocative hooks, aggressive CTA, emotional escalation.')
    } else if (presetType === 'stuck') {
      setPain('Люди роками ходять по колу, купують чергові курси про мотивацію, але залишаються в тій самій точці.')
      setGoal('ABSystem Life — повна автоматизована екосистема, яка веде за руку і не дає злитися.')
      setTone('Тепло')
      setCustomTask('LOW pressure, deep empathy, coaching tone, reflective questions, supportive language.')
    } else if (presetType === 'battle') {
      setPain('Аудиторія втратила драйв, застрягла у рутині й перестала відчувати виклик та азарт у діях.')
      setGoal('Повернути competitive mode: челенджі, ранги, швидкі перемоги та вихід у топ за результатами.')
      setTone('Експертно')
      setCustomTask('MEDIUM pressure, competition triggers, leadership framing, XP/rankings logic, challenge energy, urgent action.')
    } else {
      setPain('У команді забагато хаосу та емоцій, через що важливі задачі не доводяться до результату.')
      setGoal('Перейти у execution mode: чіткий план, пріоритети, дедлайни, вимірювані кроки.')
      setTone('Чітко')
      setCustomTask('ZERO emotional pressure, structured logic, dry execution, step-by-step outputs, deadlines, prioritization.')
    }
    setActivePreset(presetType)
  }

  const isBusy = isLoading || isGeneratingLocal
  const engineLabel = generationMode === 'FAST' ? 'Gemini' : generationMode === 'BALANCED' ? 'GPT' : 'Claude'
  const { generateStrategicFromCore } = useStrategicGeneration({
    generateContent,
    models,
    selectedProtocol,
    strategicCoreSnapshot,
    isBusy,
    setOutputs,
    setIsGeneratingLocal,
    setResults,
    setProviderErrors,
    setOutputsByType,
  })

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="dna-ctrl-wrapper ai-dna-console">
      <div className="ai-dna-frame">

        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <div className="dna-topbar">
          <div className="dna-topbar__brand">
            <Sparkles size={15} className="dna-topbar__icon" />
            <div className="dna-topbar__headings">
              <div className="dna-topbar__title">Пульт керування</div>
              <div className="dna-topbar__sub">ДНК STARWAY</div>
            </div>
          </div>
        </div>

        {/* ── 3-column layout ───────────────────────────────────────────── */}
        <div className="dna-ctrl-layout">

          {/* ════════════════ LEFT COLUMN ════════════════ */}
          <aside className="dna-left-ctrl">

            {/* 1. AI POSITION */}
            <div className="dna-ctrl-section">
              <div className="dna-ctrl-section__header">
                <span className="dna-ctrl-label">AI-СТРАТЕГІЯ</span>
              </div>
              <div className="dna-protocol-list">
                {PROTOCOLS.map((item, idx) => {
                  const isActive = selectedProtocol === item.key
                  return (
                    <label key={item.key} className={`dna-protocol-row ${isActive ? 'is-active' : ''}`}>
                      <div className="dna-protocol-row__body">
                        <div className="dna-protocol-row__name-row">
                          <span className="dna-protocol-row__name">{item.label}</span>
                        </div>
                        <div className="dna-protocol-row__desc">{item.desc}</div>
                      </div>
                      <input
                        type="radio"
                        name="dna-protocol"
                        checked={isActive}
                        onChange={() => setSelectedProtocol(item.key)}
                        className="dna-radio"
                      />
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="dna-divider" />

            {/* 6. ЛЕКСИКОН ДНК */}
            <div className="dna-ctrl-section--no-pad">
              <LexiconPanel
                isLoading={isLexLoading || isAddingLex || isDeletingLex}
                items={lexItems}
                onAdd={handleLexAdd}
                onDelete={handleLexDelete}
              />
            </div>

            <div className="dna-divider" />

            {/* 7. AI ПРОВАЙДЕРИ */}
            <div className="dna-ctrl-section--no-pad">
              <AiProviderMonitor
                freeUsage={freeUsage}
                generationEstimate={generationEstimate}
                generationMode={generationMode}
                latestUsage={latestResult?.usage}
                outputCount={outputs.length}
                outputLimit={outputLimit}
                results={results}
                selectedProvider={selectedProvider}
                selectedProviderIsFreePath={selectedProviderIsFreePath}
                selectedProtocol={selectedProtocol}
                tokenMetrics={unifiedTokenMetrics}
                usedProvider={latestResult?.modelUsed}
                validationState={validationState}
              />
            </div>

          </aside>

          {/* ════════════════ CENTER — 4-step workflow ════════════════ */}
          <main className="dna-center-work">

            {/* Stepper */}
            <div className="dna-stepper">
              {([
                { n: 1, label: 'ВВІД' },
                { n: 2, label: 'AI ПОЗИЦІЯ' },
                { n: 3, label: 'ГЕНЕРАЦІЯ' },
                { n: 4, label: 'ВИХІДНИЙ ДВИЖОК' },
              ] as const).map((step, idx, arr) => (
                <Fragment key={step.n}>
                  <div className={`dna-stepper__step ${latestResult ? 'is-done' : step.n === 1 ? 'is-active' : ''}`}>
                    <span className="dna-stepper__num">{step.n}</span>
                    <span className="dna-stepper__label">{step.label}</span>
                  </div>
                  {idx < arr.length - 1 && (
                    <ChevronRight size={13} className="dna-stepper__sep" />
                  )}
                </Fragment>
              ))}
            </div>

            <DnaGenerationPanel />

            <InputEngineSection
              inputMethod={inputMethod}
              inputStatus={inputStatus}
              activePreset={activePreset}
              audioFile={audioFile}
              audioDurationSec={audioDurationSec}
              audioProcessingMs={audioProcessingMs}
              audioTranscript={audioTranscript}
              inputStatusCopy={INPUT_STATUS_COPY}
              dictationField={dictationField}
              pain={pain}
              goal={goal}
              customTask={customTask}
              audioInputRef={audioInputRef}
              onClear={handleClear}
              onSetInputMethod={setInputMethod}
              onStartDictation={startDictation}
              onApplyPreset={applyPreset}
              onAudioFileChange={(e) => void handleAudioFileChange(e)}
              onResetAudio={resetAudio}
              onPainChange={(value) => {
                setPain(value)
                setActivePreset(null)
              }}
              onGoalChange={(value) => {
                setGoal(value)
                setActivePreset(null)
              }}
              onCustomTaskChange={(value) => {
                setCustomTask(value)
                setActivePreset(null)
              }}
            />

            <SpecializedAgentsSection
              selectedAgents={selectedAgents}
              onAgentsChange={setSelectedAgents}
            />

            <AiPositionSection
              protocols={PROTOCOLS}
              protocolIcons={PROTOCOL_ICONS}
              selectedProtocol={selectedProtocol}
              onSelectProtocol={(key) => setSelectedProtocol(key as (typeof PROTOCOLS)[number]['key'])}
            />

            <GenerationStepSection
              selectedProviderLabel={resolveUiModelName(selectedProvider, selectedProtocol)}
              generationMode={generationMode}
              generationModeNote={GENERATION_MODES.find((m) => m.key === generationMode)?.note ?? ''}
              strategicCoreReady={Boolean(strategicCoreSnapshot)}
              outputs={outputs}
              isPremiumAccess={isPremiumAccess}
              contentTypes={CONTENT_TYPES}
              pipelineStages={PIPELINE_STAGES}
              isBusy={isBusy}
              hasResult={Boolean(latestResult)}
              canGenerate={canGenerate}
              validationError={validationError}
              tone={tone}
              toneOptions={AI_ASSISTANT_TONE_PRESETS.map((item) => item.label)}
              generationModeKey={generationMode}
              generationModes={GENERATION_MODES.map((mode) => ({ key: mode.key, label: mode.label, provider: mode.provider }))}
              onLockedType={() => toast.error('Доступно в Premium')}
              onLockedPremium={() => toast.error('Доступно в Premium')}
              onSetTone={setTone}
              onSetGenerationMode={setGenerationMode}
              onToggleOutput={handleToggleOutput}
              onGenerateFromCore={(key) => void generateStrategicFromCore(key)}
              onGenerate={() => void handleGenerate()}
            />

            <StrategicOutput
              isBusy={isBusy}
              activeStrategy={selectedProtocol}
              activeTone={tone}
              latestResult={latestResult}
              editableContent={editableContent}
              compareVersion={compareVersion}
              models={models}
              outputs={outputs}
              preFilledFormula={preFilledFormula}
              providerErrors={providerErrors}
              resolveProviderErrorMessage={resolveProviderErrorMessage}
              results={results}
              validationState={validationState}
              outputsByType={outputsByType}
              onCopy={handleCopy}
              onExport={handleExport}
              onSetEditableContent={setEditableContent}
              onSetPreFilledFormula={setPreFilledFormula}
              onToggleModel={toggleModel}
              reelsEngine={reelsEngineState}
              generationJobs={generationJobs}
              providerStatuses={providerStatuses}
              debugMode={DEBUG_MODE}
            />

          </main>

          {/* ════════════════ RIGHT COLUMN ════════════════ */}
          <aside className="dna-right-panel">

            <PreviewRenderer
              outputs={outputs}
              typedPayload={outputsByType[outputs[previewTabIndex] as ContentTypeKey]}
              previewTabIndex={previewTabIndex}
              previewPage={previewPage}
              previewDevice={previewDevice}
              onSetPreviewTabIndex={setPreviewTabIndex}
              onPrevPage={() => setPreviewPage((p) => Math.max(0, p - 1))}
              onNextPage={() => setPreviewPage((p) => Math.min(Math.max(0, outputs.length - 1), p + 1))}
              onSetPreviewDevice={setPreviewDevice}
            />

            <div className="dna-right-section">
              <h4 className="dna-right-label">PIPELINE VISIBILITY</h4>
              <div className="dna-pipeline-live">
                {PIPELINE_LIVE_STATES.map((state, idx) => (
                  <div key={state} className={`dna-pipeline-live__row ${isBusy && idx === pipelineStageIndex ? 'is-active' : (!isBusy && latestResult) ? 'is-done' : ''}`}>
                    <span>{!isBusy && latestResult ? 'Готово' : isBusy && idx === pipelineStageIndex ? 'В роботі' : 'Очікує'}</span>
                    <span>{state}</span>
                  </div>
                ))}
              </div>
            </div>

            <StrategicCards
              outputs={outputs}
              queueProgress={queueProgress}
              isBusy={isBusy}
              hasResult={Boolean(latestResult)}
              hasRealReelsEngine={reelsEngineState.isAvailable}
            />

            <div className="dna-right-section">
              <h4 className="dna-right-label">СТАТИСТИКА СЕСІЇ</h4>
              <div className="dna-stat-grid dna-stat-grid--two-col">
                <div className="dna-stat">
                  <span className="dna-stat__val">{generationEstimate.totalTokens.toLocaleString()}</span>
                  <span className="dna-stat__key">Токени</span>
                </div>
                <div className="dna-stat">
                  <span className="dna-stat__val">${generationEstimate.estimatedCostUsd.toFixed(4)}</span>
                  <span className="dna-stat__key">Вартість</span>
                </div>
                <div className="dna-stat">
                  <span className="dna-stat__val">{outputs.length}</span>
                  <span className="dna-stat__key">Типів</span>
                </div>
                <div className="dna-stat">
                  <span className="dna-stat__val">{engineLabel}</span>
                  <span className="dna-stat__key">Модель</span>
                </div>
                <div className="dna-stat dna-stat--icon"><span className="dna-stat__val">Типи: {outputs.length}</span><span className="dna-stat__key">Типи</span></div>
                <div className="dna-stat dna-stat--icon"><span className="dna-stat__val">{isBusy ? 'Активно' : 'Очікує'}</span><span className="dna-stat__key">Стан</span></div>
                <div className="dna-stat dna-stat--icon"><span className="dna-stat__val">{latestResult ? 'Завершено' : '—'}</span><span className="dna-stat__key">Час</span></div>
                <div className="dna-stat dna-stat--icon"><span className="dna-stat__val">Автооновлення</span><span className="dna-stat__key">Оновлення</span></div>
              </div>
              <button
                type="button"
                className="dna-tg-publish-btn"
                onClick={() => {
                  if (!isPremiumAccess) {
                    toast.error('Доступно в Premium')
                    return
                  }
                  toast.success('Telegram publish queued')
                }}
              >
                Створити публікацію в TG {!isPremiumAccess ? ' ПРЕМІУМ' : ''}
              </button>
            </div>

            <div className="dna-right-section">
              <HistoryPanel
                compareVersionId={compareVersionId}
                history={history}
                painPatterns={painPatterns}
                setCompareVersionId={setCompareVersionId}
                winningFormulas={winningFormulas}
              />
            </div>

          </aside>

        </div>
        {providerModalOpen ? (
          <div className="dna-provider-modal">
            <div className="dna-provider-modal__card">
              <h4>Provider Status</h4>
              <p>
                {providerModalReason === 'feature_blocked'
                  ? 'Деякі jobs заблоковані: feature не підтримується на поточному free-tier провайдері.'
                  : 'Провайдери недоступні або деградовані. Сесія збережена, jobs поставлено на паузу.'}
              </p>
              {providerModalMessage ? <p>{providerModalMessage}</p> : null}
              <ul>
                {providerStatuses.map((status) => (
                  <li key={status.provider}>
                    {status.provider}: {status.status} {status.available ? '(available)' : '(unavailable)'}
                  </li>
                ))}
              </ul>
              <p>Free tier limitations: частина advanced features може бути недоступна без paid provider.</p>
              {providerModalUpgradeCta ? <p>Upgrade: {providerModalUpgradeCta}</p> : null}
              {providerModalFallback ? <p>Fallback: {providerModalFallback}</p> : null}
              <div className="dna-provider-modal__actions">
                <button type="button" onClick={() => setDefaultProvider('gpt')}>Set GPT default</button>
                <button type="button" onClick={() => setDefaultProvider('claude')}>Set Claude default</button>
                <button type="button" onClick={() => setDefaultProvider('gemini')}>Set Gemini default</button>
                <button type="button" onClick={() => void handleGenerate()}>Retry generation</button>
                <button type="button" onClick={() => setProviderModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
