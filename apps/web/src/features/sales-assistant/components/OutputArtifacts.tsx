import { OutputSection } from '@/features/sales-assistant/components/OutputSection'
import type { ContentKey, ModelState } from '@/features/sales-assistant/utils/salesAssistant.helpers'
import type { GenerationResult, ModelProvider } from '@ai/types/salesAssistant.types'
import type { ContentTypeKey } from '@/features/sales-assistant/types/output.types'

type ResultsByModel = Partial<Record<ModelProvider, GenerationResult>>
type ValidationState = 'clean' | 'warning'
type ProviderError = {
  status: number
  code: string
  message: string
  isFatal: boolean
}

type Props = {
  isBusy: boolean
  activeStrategy: string
  activeTone: string
  latestResult: GenerationResult | null
  editableContent: string
  compareVersion: unknown
  models: ModelState
  outputs: ContentKey[]
  preFilledFormula: string
  providerErrors: Partial<Record<ModelProvider, ProviderError>>
  results: ResultsByModel
  onCopy: (content?: string) => void
  onExport: (content?: string) => void
  onSetEditableContent: (value: string) => void
  onSetPreFilledFormula: (value: string) => void
  onToggleModel: (model: ModelProvider) => void
  resolveProviderErrorMessage: (error: ProviderError) => string
  validationState: ValidationState
  outputsByType: Partial<Record<ContentTypeKey, string>>
  reelsEngine: {
    isAvailable: boolean
    progress: number | null
    etaSeconds: number | null
    queueSize: number | null
  }
  generationJobs: Array<{
    id: string
    contentType: string
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'
    attempt: number
    maxAttempts: number
    error?: string
    degraded?: boolean
    blockedPremium?: boolean
    paused?: boolean
  }>
  providerStatuses: Array<{
    provider: 'claude' | 'gpt' | 'gemini'
    available: boolean
    status: string
    message?: string
  }>
  debugMode: boolean
}

export function StrategicOutput({
  isBusy,
  activeStrategy,
  activeTone,
  latestResult,
  editableContent,
  compareVersion,
  models,
  outputs,
  preFilledFormula,
  providerErrors,
  results,
  onCopy,
  onExport,
  onSetEditableContent,
  onSetPreFilledFormula,
  onToggleModel,
  resolveProviderErrorMessage,
  outputsByType,
  reelsEngine,
  generationJobs,
  providerStatuses,
  debugMode,
}: Props) {
  return (
    <div className="dna-step">
      <p className="dna-step__sub">Стратегічний вивід з урахуванням усіх налаштувань STARWAY DNA.</p>

      <OutputSection
        activeStrategy={activeStrategy}
        activeTone={activeTone}
        compareVersion={compareVersion as never}
        editableContent={editableContent}
        handleCopy={onCopy}
        handleExport={onExport}
        isLoading={isBusy}
        latestResult={latestResult}
        models={models}
        outputs={outputs}
        preFilledFormula={preFilledFormula}
        providerErrors={providerErrors}
        resolveProviderErrorMessage={resolveProviderErrorMessage}
        results={results}
        outputsByType={outputsByType}
        reelsEngine={reelsEngine}
        generationJobs={generationJobs}
        providerStatuses={providerStatuses}
        debugMode={debugMode}
        setEditableContent={onSetEditableContent}
        setPreFilledFormula={onSetPreFilledFormula}
        toggleModel={onToggleModel}
      />
    </div>
  )
}
