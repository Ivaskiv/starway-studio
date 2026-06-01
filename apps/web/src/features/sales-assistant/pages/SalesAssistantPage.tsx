import { AiProviderMonitor } from '@/features/sales-assistant/components/AiProvider'
import DnaGenerationPanel from '@/features/sales-assistant/components/DnaGenerationPanel'
import { HistoryPanel } from '@/features/sales-assistant/components/History'
import { PreviewRenderer } from '@/features/sales-assistant/components/PreviewRenderer'
import { COST_ESTIMATE, DEFAULT_MODEL_STATE } from '@/features/sales-assistant/config/contentStudio.config'
import { useDnaGenerationHistory } from '@/features/sales-assistant/hooks/useDnaGenerationHistory'
import { resolveFreeFirstProvider, resolveUiModelName } from '@/features/sales-assistant/utils/salesAssistant.helpers'
import { buildTokenMetrics } from '@/features/sales-assistant/utils/tokenMetrics'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { buildAiUsageEstimate, resolveAiMaxOutputTokens } from '@ai/providers/pricing'
import type { GenerationResult, ModelProvider } from '@ai/types/salesAssistant.types'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useLayoutContext } from '@/layout/MainLayout'
import type { ContentTypeKey } from '@/features/sales-assistant/types/output.types'

type ModelKey = ModelProvider
type ResultsByModel = Partial<Record<ModelKey, GenerationResult>>
type StepKey = 0 | 1 | 2 | 3

const OUTPUTS: Array<'reels' | 'warmup'> = ['reels', 'warmup']
const RESULTS: ResultsByModel = {}
const FREE_USAGE: Record<ModelKey, number> = { gpt: 0, claude: 0, gemini: 0 }
const OUTPUT_BY_TYPE: Partial<Record<ContentTypeKey, string>> = {}
const STEPPER = [
  { n: 1 as const, label: 'ВВІД' },
  { n: 2 as const, label: 'AI ПОЗИЦІЯ' },
  { n: 3 as const, label: 'ГЕНЕРАЦІЯ' },
  { n: 4 as const, label: 'ВИХІДНИЙ ДВИЖОК' },
]

export default function SalesAssistantPage() {
  const { collapsed, setCollapsed } = useLayoutContext()
  const prevCollapsedRef = useRef(collapsed)

  useEffect(() => {
    setCollapsed(true)
    return () => setCollapsed(prevCollapsedRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { history, winningFormulas, painPatterns } = useDnaGenerationHistory()
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null)

  const { appState: sessionStatus } = useSessionOrchestrator()
  useGetTrialStatusQuery(undefined, { skip: sessionStatus !== 'authenticated' })

  const [previewTabIndex, setPreviewTabIndex] = useState(0)
  const [previewPage, setPreviewPage] = useState(0)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile' | 'doc'>('desktop')
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
  const [isTabletViewport, setIsTabletViewport] = useState(false)
  const [activeStep, setActiveStep] = useState<StepKey>(0)

  useEffect(() => {
    const sync = () => {
      const tablet = window.innerWidth <= 1200
      setIsTabletViewport(tablet)
      setIsRightPanelOpen(!tablet)
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const selectedProvider = resolveFreeFirstProvider({
    mode: 'BALANCED',
    models: DEFAULT_MODEL_STATE,
    outputCount: OUTPUTS.length,
    freeUsage: FREE_USAGE,
  })
  const selectedProviderNeeds = COST_ESTIMATE[selectedProvider].tokensPerOutput * Math.max(1, OUTPUTS.length)
  const selectedProviderIsFreePath = Math.max(0, 1_000_000 - FREE_USAGE[selectedProvider]) >= selectedProviderNeeds

  const generationEstimate = useMemo(() => {
    const model = resolveUiModelName(selectedProvider, 'SYSTEM')
    return {
      provider: selectedProvider,
      model,
      ...buildAiUsageEstimate({
        model,
        promptText: `Protocol: SYSTEM\nOutputs: ${OUTPUTS.join(', ')}`,
        userText: '',
        maxOutputTokens: resolveAiMaxOutputTokens('reels'),
      }),
    }
  }, [selectedProvider])

  const latestResult = useMemo(() => {
    const entries = Object.values(RESULTS)
    return entries.length > 0 ? entries[entries.length - 1] : null
  }, [])

  const tokenMetrics = useMemo(
    () =>
      buildTokenMetrics({
        latestResult,
        provider: selectedProvider,
        fallbackModel: generationEstimate.model,
        estimatedInputTokens: generationEstimate.inputTokens,
        estimatedOutputTokens: generationEstimate.outputTokens,
        sessionResults: RESULTS,
      }),
    [generationEstimate.inputTokens, generationEstimate.model, generationEstimate.outputTokens, latestResult, selectedProvider],
  )

  return (
    <div className="dna-ctrl-wrapper ai-dna-console">
      <div className="ai-dna-frame">
        <div className="dna-topbar">
          <div className="dna-topbar__brand">
            <Sparkles size={15} className="dna-topbar__icon" />
            <div className="dna-topbar__headings">
              <div className="dna-topbar__title">Пульт керування</div>
              <div className="dna-topbar__sub">ДНК STARWAY</div>
            </div>
          </div>
        </div>

        <div className="dna-ctrl-layout">
          <div className={`dna-ctrl-layout__top ${isRightPanelOpen ? 'is-right-open' : 'is-right-collapsed'}`}>
            <main className="dna-center-work">
              <div className="dna-stepper">
                {STEPPER.map((step, idx) => (
                  <Fragment key={step.n}>
                    <button
                      type="button"
                      className={`dna-stepper__step ${activeStep === step.n - 1 ? 'is-active' : ''}`}
                      onClick={() => setActiveStep((step.n - 1) as StepKey)}
                    >
                      <span className="dna-stepper__num">{step.n}</span>
                      <span className="dna-stepper__label">{step.label}</span>
                    </button>
                    {idx < STEPPER.length - 1 && <ChevronRight size={13} className="dna-stepper__sep" />}
                  </Fragment>
                ))}
              </div>

              <DnaGenerationPanel
                activeStep={activeStep}
                statusMeta={{
                  model: generationEstimate.model,
                  estimatedTokens: generationEstimate.totalTokens,
                  estimatedCost: generationEstimate.estimatedCostUsd,
                  actual: latestResult?.usage ? `${latestResult.usage.totalTokens ?? 0} tok` : 'pending',
                  validation: 'clean',
                  routingPath: 'openai -> anthropic -> gemini',
                  outputCount: OUTPUTS.length,
                  state: 'Очікує',
                  timeLabel: '—',
                  updateLabel: 'Автооновлення',
                }}
                previewSlot={(
                  <PreviewRenderer
                    outputs={OUTPUTS}
                    typedPayload={OUTPUT_BY_TYPE[OUTPUTS[previewTabIndex] as ContentTypeKey]}
                    previewTabIndex={previewTabIndex}
                    previewPage={previewPage}
                    previewDevice={previewDevice}
                    onSetPreviewTabIndex={setPreviewTabIndex}
                    onPrevPage={() => setPreviewPage((p) => Math.max(0, p - 1))}
                    onNextPage={() => setPreviewPage((p) => Math.min(Math.max(0, OUTPUTS.length - 1), p + 1))}
                    onSetPreviewDevice={setPreviewDevice}
                  />
                )}
              />
            </main>

            {isTabletViewport && (
              <button
                type="button"
                className={`dna-right-panel-toggle ${isRightPanelOpen ? 'is-open' : ''}`}
                aria-label={isRightPanelOpen ? 'Згорнути праву панель' : 'Розгорнути праву панель'}
                onClick={() => setIsRightPanelOpen((prev) => !prev)}
              >
                {isRightPanelOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            )}

            {isTabletViewport && isRightPanelOpen && (
              <button
                type="button"
                aria-label="Закрити праву панель"
                className="dna-right-panel-backdrop"
                onClick={() => setIsRightPanelOpen(false)}
              />
            )}

            <aside className={`dna-right-panel ${isRightPanelOpen ? 'is-open' : 'is-collapsed'} ${isTabletViewport ? 'is-mobile-drawer' : ''}`}>
              <div className="dna-right-section">
                <AiProviderMonitor
                  freeUsage={FREE_USAGE}
                  generationEstimate={generationEstimate}
                  generationMode="BALANCED"
                  latestUsage={latestResult?.usage}
                  outputCount={OUTPUTS.length}
                  outputLimit={resolveAiMaxOutputTokens('reels')}
                  results={RESULTS}
                  selectedProvider={selectedProvider}
                  selectedProviderIsFreePath={selectedProviderIsFreePath}
                  selectedProtocol="SYSTEM"
                  tokenMetrics={tokenMetrics}
                  usedProvider={latestResult?.modelUsed}
                  validationState="clean"
                />
              </div>
            </aside>
          </div>

          <section className="dna-history-insights" aria-label="Історія">
            <div className="dna-history-insights__header">
              <h3>Історія</h3>
              <p>Аналітика формул та патернів болю з минулих генерацій</p>
            </div>
            <HistoryPanel
              compareVersionId={compareVersionId}
              history={history}
              painPatterns={painPatterns}
              setCompareVersionId={setCompareVersionId}
              winningFormulas={winningFormulas}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
