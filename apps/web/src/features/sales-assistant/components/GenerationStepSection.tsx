import { ContentTypesSection } from '@/features/sales-assistant/components/ContentTypesSection'
import { PipelineStatus } from '@/features/sales-assistant/components/PipelineStatus'
import type { ContentKey } from '@/features/sales-assistant/utils/salesAssistant.helpers'
import type { DnaGenerationMode } from '@/features/sales-assistant/hooks/useDnaGenerationHistory'
import { Lock, Settings, Sparkles, Zap } from 'lucide-react'

type ContentTypeItem = {
  key: ContentKey
  label: string
}

type Props = {
  selectedProviderLabel: string
  generationMode: string
  generationModeNote: string
  strategicCoreReady: boolean
  outputs: ContentKey[]
  isPremiumAccess: boolean
  contentTypes: readonly ContentTypeItem[]
  pipelineStages: readonly string[]
  isBusy: boolean
  hasResult: boolean
  canGenerate: boolean
  validationError: string | null
  tone: string
  toneOptions: readonly string[]
  generationModeKey: DnaGenerationMode
  generationModes: ReadonlyArray<{ key: DnaGenerationMode; label: string; provider: string }>
  onLockedType: () => void
  onLockedPremium: () => void
  onSetTone: (tone: string) => void
  onSetGenerationMode: (mode: DnaGenerationMode) => void
  onToggleOutput: (key: ContentKey) => void
  onGenerateFromCore: (key: ContentKey) => void
  onGenerate: () => void
}

export function GenerationStepSection(props: Props) {
  const {
    selectedProviderLabel,
    generationMode,
    generationModeNote,
    strategicCoreReady,
    outputs,
    isPremiumAccess,
    contentTypes,
    pipelineStages,
    isBusy,
    hasResult,
    canGenerate,
    validationError,
    tone,
    toneOptions,
    generationModeKey,
    generationModes,
    onLockedType,
    onLockedPremium,
    onSetTone,
    onSetGenerationMode,
    onToggleOutput,
    onGenerateFromCore,
    onGenerate,
  } = props

  return (
    <div className="dna-step">
      <div className="dna-step__header">
        <h3 className="dna-step__title">КРОК 3. ГЕНЕРАЦІЯ КОНТЕНТУ</h3>
      </div>
      <p className="dna-step__sub">Модель: {selectedProviderLabel} ({generationMode}) — {generationModeNote}</p>

      <ContentTypesSection
        strategicCoreReady={strategicCoreReady}
        outputs={outputs}
        isPremiumAccess={isPremiumAccess}
        contentTypes={contentTypes}
        onLockedType={onLockedType}
        onToggleOutput={onToggleOutput}
        onGenerateFromCore={onGenerateFromCore}
      />

      <div className="dna-gen-controls">
        <div className="dna-gen-controls__group">
          <span className="dna-gen-controls__label">СТИЛЬ КОМУНІКАЦІЇ</span>
          <div className="dna-gen-controls__segmented">
            {toneOptions.map((item) => (
              <button
                key={item}
                type="button"
                className={`dna-gen-segment dna-btn-inline-content ${tone === item ? 'is-active' : ''}`}
                onClick={() => onSetTone(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="dna-gen-controls__group">
          <span className="dna-gen-controls__label">РЕЖИМ ШІ</span>
          <div className="dna-gen-controls__segmented">
            {generationModes.map((mode) => {
              const locked = mode.key === 'PREMIUM' && !isPremiumAccess
              const icon = mode.key === 'FAST' ? <Zap size={12} /> : mode.key === 'BALANCED' ? <Settings size={12} /> : <Sparkles size={12} />
              return (
                <button
                  key={mode.key}
                  type="button"
                  className={`dna-gen-segment dna-gen-segment--mode dna-btn-inline-content ${generationModeKey === mode.key ? 'is-active' : ''}`}
                  onClick={() => {
                    if (locked) return onLockedPremium()
                    onSetGenerationMode(mode.key)
                  }}
                >
                  {icon}
                  <span>{mode.key} / {mode.provider.toUpperCase()}</span>
                  {locked ? <Lock size={11} /> : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <PipelineStatus
        pipelineStages={pipelineStages}
        isBusy={isBusy}
        hasResult={hasResult}
        canGenerate={canGenerate}
        validationError={validationError}
        onGenerate={onGenerate}
      />
    </div>
  )
}
