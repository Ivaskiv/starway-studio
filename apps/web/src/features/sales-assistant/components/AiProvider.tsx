import type {
  GenerationResult,
  ModelProvider,
} from '@ai/types/salesAssistant.types'
import type { TokenMetrics } from '@/features/sales-assistant/utils/tokenMetrics'
import { HelpCircle } from 'lucide-react'
import {
  buildRoutingPath,
  formatUsd,
  resolvePanelFormula,
  resolveUiModelNameByKey,
  type ContentKey,
  type ProtocolKey,
} from '@/features/sales-assistant/utils/salesAssistant.helpers'
import {
  AI_ASSISTANT_TABS,
  AI_PROVIDER_LINKS,
  CONTENT_TYPES,
  COST_ESTIMATE,
  FREE_TOKEN_LIMITS,
  GENERATION_MODES,
} from '@/features/sales-assistant/config/contentStudio.config'
import type { DnaGenerationMode } from '@/features/sales-assistant/hooks/useDnaGenerationHistory'

type ModelKey = ModelProvider
type ValidationState = 'clean' | 'warning'
type ResultsByModel = Partial<Record<ModelKey, GenerationResult>>

interface AiProviderProps {
  selectedProtocol: ProtocolKey
  outputCount: number
  outputLimit: number
  results: ResultsByModel
  freeUsage: Record<ModelKey, number>
  selectedProvider: ModelProvider
  selectedProviderIsFreePath: boolean
  validationState: ValidationState
  generationEstimate: {
    model: string
    totalTokens: number
    estimatedCostUsd: number
  }
  latestUsage?: GenerationResult['usage']
  usedProvider?: string
  generationMode: DnaGenerationMode
  currentProtocolLabel?: string
  outputs?: ContentKey[]
  tone?: string
  onSetGenerationMode?: (mode: DnaGenerationMode) => void
  onToggleOutput?: (key: ContentKey) => void
  onSetTone?: (tone: string) => void
  tokenMetrics: TokenMetrics
}

export function AiProviderMonitor(params: AiProviderProps) {
  const controlCenterInfo =
    AI_ASSISTANT_TABS.find((item) => item.id === 'control-center')?.info ?? ''
  const providerMetrics = [
    { providerKey: 'openai', modelKey: 'gpt' as const },
    { providerKey: 'anthropic', modelKey: 'claude' as const },
    { providerKey: 'google', modelKey: 'gemini' as const },
  ]
  const totalCostEstimate = providerMetrics.reduce(
    (acc, item) => {
      const costPerProvider =
        ((COST_ESTIMATE[item.modelKey].tokensPerOutput *
          Math.max(1, params.outputCount)) /
          1000) *
        COST_ESTIMATE[item.modelKey].costPer1k
      return {
        min: acc.min + costPerProvider * 0.8,
        max: acc.max + costPerProvider * 1.2,
      }
    },
    { min: 0, max: 0 }
  )

  return (
    <section className="ai-provider-monitor" data-section="provider-monitor">
      <header className="ai-provider-monitor__header">
        <div className="ai-provider-monitor__headline">
          <h3 className="ai-sidebar-label-heading">AI Провайдери</h3>
          <div className="group relative">
            <HelpCircle
              size={14}
              className="cursor-help opacity-60 hover:opacity-100 transition-opacity"
            />
            <div className="ai-floating-tooltip absolute bottom-full left-0 mb-2 w-72 p-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg text-[10px] normal-case tracking-normal text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl">
              {controlCenterInfo}
            </div>
          </div>
        </div>
        <p className="ai-provider-monitor__subtitle">Автоматичний моніторинг</p>
      </header>


      <div className="ai-provider-monitor__list">
        {AI_PROVIDER_LINKS.map(({ key, provider, links }) => {
          const metricTarget = providerMetrics.find(
            (item) => item.providerKey === key
          )
          const modelKey = metricTarget?.modelKey ?? 'gpt'
          const panelFormula = resolvePanelFormula({
            modelKey,
            outputCount: params.outputCount,
            outputLimit: params.outputLimit,
            result: params.results[modelKey],
          })
          const freeLeft = Math.max(
            0,
            FREE_TOKEN_LIMITS[modelKey] - params.freeUsage[modelKey]
          )
          const isFree = freeLeft >= panelFormula.limit
          return (
            <details key={key} className="ai-provider-details" data-provider={key}>
              <summary className="ai-provider-details__summary">
                <span className="ai-provider-details__name">{provider}</span>
                <span className="ai-provider-details__arrow">›</span>
              </summary>
              <div className="ai-provider-details__meta">
                <span>
                  {resolveUiModelNameByKey(modelKey, params.selectedProtocol)}
                </span>
                <span>
                  {panelFormula.actualCost === null
                    ? formatUsd(panelFormula.estimatedCost)
                    : formatUsd(panelFormula.actualCost)}
                </span>
                <span>
                  ~{panelFormula.used}/{panelFormula.limit} tok
                </span>
                <span>left {panelFormula.left}</span>
                <span>free {freeLeft}</span>
                <span>{isFree ? 'FREE' : 'PAID'}</span>
              </div>
              <div className="ai-provider-details__links">
                {links.map(({ label, url, description }) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ai-provider-link"
                  >
                    <span className="ai-provider-link__label">{label}</span>
                    <span className="ai-provider-link__desc">{description}</span>
                    <span className="ai-provider-link__arrow">↗</span>
                  </a>
                ))}
              </div>
            </details>
          )
        })}
      </div>
      <div className="ai-usage-module">
        <div className="ai-usage-module__head">AI Usage</div>
        <div className={`ai-usage-ring ${params.tokenMetrics.usagePercent >= 90 ? 'is-critical' : params.tokenMetrics.usagePercent >= 80 ? 'is-warning' : params.tokenMetrics.usagePercent >= 65 ? 'is-high' : 'is-safe'}`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="ai-usage-ring__track" cx="60" cy="60" r="52" />
            <circle
              className="ai-usage-ring__progress"
              cx="60"
              cy="60"
              r="52"
              strokeDasharray={326.73}
              strokeDashoffset={326.73 - (326.73 * params.tokenMetrics.usagePercent) / 100}
            />
          </svg>
          <div className="ai-usage-ring__label">
            <strong>{params.tokenMetrics.usagePercent}%</strong>
            <span>контекст</span>
          </div>
        </div>
        <div className="ai-usage-lines">
          <div>Контекстне вікно {params.tokenMetrics.isEstimated ? '(Оцінка)' : ''}</div>
          <div>{params.tokenMetrics.totalTokens.toLocaleString()} / {params.tokenMetrics.contextWindow.toLocaleString()} токенів</div>
          <div>Залишок: {params.tokenMetrics.remainingContext.toLocaleString()}</div>
          <div>Ввід: {params.tokenMetrics.inputTokens.toLocaleString()} · Вивід: {params.tokenMetrics.outputTokens.toLocaleString()}</div>
          <div>Сесія: {params.tokenMetrics.sessionTotalTokens.toLocaleString()} · Модель: {params.tokenMetrics.modelName}</div>
        </div>
      </div>
      <footer className="ai-provider-monitor__footer">
        <div className="ai-provider-monitor__runtime">
          <div>
            <span className="ai-assistant-routing-grid__label">Model</span>
            <p>{params.latestUsage?.model ?? params.generationEstimate.model}</p>
          </div>
          <div>
            <span className="ai-assistant-routing-grid__label">Estimated</span>
            <p>
              {params.generationEstimate.totalTokens} tok ·{' '}
              {formatUsd(params.generationEstimate.estimatedCostUsd)}
            </p>
          </div>
          <div>
            <span className="ai-assistant-routing-grid__label">Actual</span>
            <p>
              {params.latestUsage
                ? `${params.latestUsage.totalTokens} tok · ${formatUsd(
                    params.latestUsage.actualCostUsd ??
                      params.latestUsage.estimatedCostUsd
                  )}`
                : 'pending'}
            </p>
          </div>
          <div>
            <span className="ai-assistant-routing-grid__label">Validation</span>
            <p>{params.validationState === 'clean' ? 'clean' : 'warning'}</p>
          </div>
          <div className="ai-provider-monitor__runtime-path">
            <span className="ai-assistant-routing-grid__label">Routing Path</span>
            <p>{buildRoutingPath(params.generationMode, params.usedProvider)}</p>
          </div>
        </div>
        <div className="ai-provider-monitor__total">
          <span>ЗАГАЛОМ</span>
          <span>
            ~${totalCostEstimate.min.toFixed(3)}-${totalCostEstimate.max.toFixed(3)}
          </span>
        </div>
        <div className="ai-provider-monitor__route">
          route: {params.selectedProvider.toUpperCase()} ·{' '}
          {params.selectedProviderIsFreePath ? 'FREE FIRST' : 'PAID'}
        </div>
      </footer>
    </section>
  )
}
