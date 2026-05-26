import { useMemo, useState } from 'react'
import type { GenerationResult, ModelProvider } from '@ai/types/salesAssistant.types'
import type { ContentKey } from '@/features/sales-assistant/utils/salesAssistant.helpers'
import type { DnaHistoryEntry } from '@/features/sales-assistant/hooks/useDnaGenerationHistory'
import { OutputCardRouter } from '@/features/sales-assistant/components/output-cards/OutputCardRouter'
import type { AnyOutputCard, ContentTypeKey } from '@/features/sales-assistant/types/output.types'
import { CONTENT_TYPES } from '@/features/sales-assistant/config/contentStudio.config'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import {
  Bookmark,
  Download,
  Eye,
  Lock,
  Pencil,
  Rocket,
  Send,
} from 'lucide-react'
import toast from 'react-hot-toast'

type ResultsByModel = Partial<Record<ModelProvider, GenerationResult>>
type ModelState = Record<ModelProvider, boolean>
type ProviderError = { status: number; code: string; message: string; isFatal: boolean }

type TabKey = 'strategic' | ContentTypeKey
const CONTENT_TYPE_UA_LABELS: Record<ContentTypeKey, string> = {
  blog: 'Блог',
  landing: 'Лендінг',
  storytelling: 'Сторітелінг',
  telegram_msg: 'Повідомлення Telegram',
  reels: 'Reels',
  stories: 'Stories',
  warmup: 'Прогрів',
  webinar: 'Вебінар',
  audit: 'Аудит',
  post: 'Пост',
  email: 'Email',
  sales: 'Продажі',
}

interface OutputSectionProps {
  outputs: ContentKey[]
  activeStrategy: string
  activeTone: string
  models: ModelState
  results: ResultsByModel
  isLoading: boolean
  providerErrors: Partial<Record<ModelProvider, ProviderError>>
  resolveProviderErrorMessage: (error: ProviderError) => string
  latestResult: GenerationResult | null
  editableContent: string
  setEditableContent: (value: string) => void
  preFilledFormula: string
  setPreFilledFormula: (value: string) => void
  compareVersion: DnaHistoryEntry | null
  toggleModel: (model: ModelProvider) => void
  handleCopy: (content?: string) => void
  handleExport: (content?: string) => void
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

const CTA_RE = /\b(купити|реєструйся|перейди|натисни|залиш)\b/gi
const TRIGGER_RE = /\b(страх|біль|сором|тривога|застрягла|тупняк|критик|тригер)\b/gi

export function OutputSection(props: OutputSectionProps) {
  const { data: trial } = useGetTrialStatusQuery()
  const isPremium = Boolean(trial?.isPaid)
  const contentTypes = props.outputs as ContentTypeKey[]
  const [tab, setTab] = useState<TabKey>('strategic')
  const [exportOpen, setExportOpen] = useState(false)
  const contentTypeLabels = useMemo(
    () => Object.fromEntries(CONTENT_TYPES.map((item) => [item.key, item.label])) as Partial<Record<ContentTypeKey, string>>,
    []
  )

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'strategic', label: 'Стратегічний вивід' },
    ...contentTypes.map((type) => ({ key: type, label: CONTENT_TYPE_UA_LABELS[type] ?? contentTypeLabels[type] ?? type })),
  ]
  const reelsEtaLabel = props.reelsEngine.etaSeconds == null
    ? null
    : `${Math.floor(props.reelsEngine.etaSeconds / 60)
      .toString()
      .padStart(2, '0')}:${Math.floor(props.reelsEngine.etaSeconds % 60)
      .toString()
      .padStart(2, '0')}`
  const successful = Object.values(props.results).filter((r) => !!r?.content).length
  const successfulByType = Object.values(props.outputsByType).filter((text) => Boolean(text?.trim())).length
  const activeResult = props.latestResult ?? Object.values(props.results).find((r) => !!r?.content) ?? null
  const activeText = activeResult?.content ?? props.preFilledFormula

  const meta = useMemo(() => {
    const words = activeText.trim().split(/\s+/).filter(Boolean).length
    const hooks = (activeText.match(/(^|\n)\s*[-•]\s+/g) ?? []).length
    const ctaPoints = (activeText.match(CTA_RE) ?? []).length
    const triggers = (activeText.match(TRIGGER_RE) ?? []).length
    const conversion = ctaPoints >= 4 && triggers >= 4 ? 'High' : ctaPoints >= 2 ? 'Medium' : 'Low'
    return { words, hooks, ctaPoints, triggers, conversion }
  }, [activeText])

  const toCard = (contentType: ContentTypeKey): AnyOutputCard => {
    const typeText = props.outputsByType[contentType] ?? activeText
    const parsed = (() => {
      try { return JSON.parse(typeText) as Record<string, unknown> } catch { return { body: typeText } }
    })()
    return {
      contentType,
      model: activeResult?.modelUsed ?? 'gpt',
      status: activeResult ? 'ready' : props.isLoading ? 'generating' : 'pending',
      wordCount: meta.words,
      generatedAt: activeResult?.createdAt,
      ...parsed,
    } as AnyOutputCard
  }

  const renderContentTypes = () => {
    const count = contentTypes.length
    const cls = count <= 1 ? 'oe-grid-1' : count <= 4 ? `oe-grid-${count}` : 'oe-grid-auto'
    return (
      <div className={`oe-grid ${cls}`}>
        {contentTypes.map((type) => (
          <OutputCardRouter key={type} contentType={type} card={toCard(type)} onCopy={props.handleCopy} />
        ))}
      </div>
    )
  }
  const failedJobs = props.generationJobs.filter((job) => job.status === 'failed')
  const degradedJobs = props.generationJobs.filter((job) => job.degraded)
  const blockedJobs = props.generationJobs.filter((job) => job.blockedPremium)
  const hasAnyContent = successfulByType > 0

  const selectedTabText = contentTypes.includes(tab as ContentTypeKey)
    ? (props.outputsByType[tab as ContentTypeKey] ?? JSON.stringify(toCard(tab as ContentTypeKey), null, 2))
    : activeText

  const allText = contentTypes.map((type) => `# ${type}\n${props.outputsByType[type] ?? JSON.stringify(toCard(type), null, 2)}`).join('\n\n')

  console.log('[DNA][debug][render][output_section]', {
    outputs: contentTypes,
    outputsByTypeKeys: Object.keys(props.outputsByType),
    resultsKeys: Object.keys(props.results),
    successful,
    activeResultModel: activeResult?.modelUsed ?? null,
    activeResultHasContent: Boolean(activeResult?.content),
    activeTextLength: activeText?.length ?? 0,
  })

  const requirePremium = (feature: string) => {
    if (isPremium) return true
    toast.error(`Доступно в Преміум: ${feature}`)
    return false
  }

  const handleExportAction = async (action: string) => {
    setExportOpen(false)
    if (action === 'copy_all') return props.handleCopy(allText)
    if (action === 'export_selected') return props.handleCopy(selectedTabText)
    if (action === 'export_all_zip') return props.handleExport(allText)
    if (action === 'pdf') {
      if (!requirePremium('PDF експорт')) return
      return props.handleExport(allText)
    }
    if (action === 'docx') {
      if (!requirePremium('DOCX експорт')) return
      return props.handleExport(allText)
    }
    if (action === 'tg_push') {
      if (!requirePremium('Публікація в Telegram')) return
      await fetch('/api/v1/telegram/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: selectedTabText, tab }) })
      toast.success('Відправлено в Telegram')
      return
    }
    if (action === 'save_template') {
      await fetch('/api/v1/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: activeText, settings: { tab, contentTypes } }) })
      toast.success('Збережено як шаблон')
    }
  }

  return (
    <section className="ai-output-engine">
      <header className="oe-header">
        <div className="oe-header__title">РЕЗУЛЬТАТ: УСПІШНО ЗГЕНЕРОВАНО ТИПІВ КОНТЕНТУ — {successfulByType || successful}</div>
      </header>

      <div className="oe-workbench">
        <main className="oe-stage">
          <div className="oe-panel">
            <nav className="oe-tabs" aria-label="Output tabs">
              {tabs.map((item) => (
                <button key={item.key} type="button" title={item.key === 'strategic' ? 'Єдине стратегічне ядро, на базі якого AI генерує всі вибрані типи контенту.' : undefined} className={`oe-tab ${item.key === 'strategic' ? 'oe-tab--strategic' : ''} ${tab === item.key ? 'is-active' : ''}`} onClick={() => setTab(item.key)}>
                  {item.label}
                </button>
              ))}
            </nav>
            <p className="oe-tab-hint">Базова AI-стратегія для всіх форматів контенту.</p>
            {tab === 'strategic' && (
              <div className="oe-strategic">
                <span className="oe-strategic__legend">Стратегічний вивід</span>
                <div className="oe-summary-5">
                  <div>Позиція<br />{props.activeStrategy || activeResult?.protocol || 'SYSTEM'}</div>
                  <div>Ціль<br />Конверсія</div>
                  <div>Тон<br />{props.activeTone || '—'}</div>
                  <div>Модель<br />{activeResult?.modelUsed ?? 'gpt'}</div>
                  <div>Типи<br />{contentTypes.join(', ') || 'post'}</div>
                </div>
                <div className="oe-secondary-block">
                  <h4>Банери</h4>
                  <button type="button" className="oe-btn oe-btn--blue">Згенерувати банери</button>
                  <p>Другорядний шар. Не є типом контенту.</p>
                  <div className="oe-banner-grid">
                    {[1, 2, 3].map((n) => <div key={n} className="oe-banner-card">{String(n).padStart(2, '0')}<p>промпт</p><div className="oe-banner-ph">плейсхолдер</div><button type="button" className="oe-btn">Згенерувати зображення</button></div>)}
                  </div>
                </div>
                {props.reelsEngine.isAvailable ? (
                  <div className="oe-secondary-block">
                    <h4>Reels-рушій</h4>
                    <div className="oe-analytics">
                      {props.reelsEngine.queueSize != null ? <span>Черга: {props.reelsEngine.queueSize}</span> : null}
                      {props.reelsEngine.progress != null ? <span>Прогрес рендеру: {props.reelsEngine.progress}%</span> : null}
                      {reelsEtaLabel ? <span>ETA: {reelsEtaLabel}</span> : null}
                    </div>
                    <button type="button" className="oe-btn">Відкрити Reels-рушій</button>
                  </div>
                ) : null}
              </div>
            )}

            {contentTypes.includes(tab as ContentTypeKey) && hasAnyContent ? renderContentTypes() : null}
            {contentTypes.includes(tab as ContentTypeKey) && !hasAnyContent && !props.isLoading ? (
              <div className="oe-empty-state">
                Немає валідних outputs для рендеру. Перевір parsing/errors нижче.
              </div>
            ) : null}
            {failedJobs.length > 0 ? (
              <div className="oe-error-cards">
                {failedJobs.map((job) => (
                  <article key={job.id} className="oe-error-card">
                    <h4>Job failed: {job.contentType}</h4>
                    <p>{job.error ?? 'Unknown error'}</p>
                    <small>retry {job.attempt}/{job.maxAttempts}</small>
                  </article>
                ))}
              </div>
            ) : null}
            {degradedJobs.length > 0 ? (
              <div className="oe-error-cards">
                {degradedJobs.map((job) => (
                  <article key={`degraded-${job.id}`} className="oe-error-card">
                    <h4>Degraded output: {job.contentType}</h4>
                    <p>Fallback provider used. Session continues with partial degradation.</p>
                  </article>
                ))}
              </div>
            ) : null}
            {blockedJobs.length > 0 ? (
              <div className="oe-error-cards">
                {blockedJobs.map((job) => (
                  <article key={`blocked-${job.id}`} className="oe-error-card">
                    <h4>Blocked premium output: {job.contentType}</h4>
                    <p>Feature not supported on free tier provider.</p>
                  </article>
                ))}
              </div>
            ) : null}
            {props.debugMode ? (
              <details className="oe-debug-panel">
                <summary>Debug mode</summary>
                <pre>{JSON.stringify({
                  outputs: contentTypes,
                  outputsByTypeKeys: Object.keys(props.outputsByType),
                  providerStatuses: props.providerStatuses,
                  jobs: props.generationJobs.map((job) => ({
                    id: job.id,
                    type: job.contentType,
                    status: job.status,
                    attempt: job.attempt,
                    error: job.error ?? null,
                  })),
                }, null, 2)}</pre>
              </details>
            ) : null}

          </div>
        </main>

        <aside className="oe-rail oe-rail--right">
          <button type="button" className="oe-icon-btn" aria-label="Попередній перегляд">
            <Eye size={16} />
            <span className="oe-icon-tip">Перегляд</span>
          </button>
          <div className="oe-export-wrap">
            <button type="button" className="oe-icon-btn" onClick={() => setExportOpen((prev) => !prev)} aria-label="Експорт">
              <Download size={16} />
              <span className="oe-icon-tip">Експорт</span>
            </button>
            {exportOpen ? (
              <div className="oe-export-menu">
                <button type="button" onClick={() => void handleExportAction('export_all_zip')}>Експорт усього (ZIP)</button>
                <button type="button" onClick={() => void handleExportAction('export_selected')}>Експорт поточного</button>
                <button type="button" onClick={() => void handleExportAction('pdf')}>PDF {!isPremium ? '· Преміум' : ''}</button>
                <button type="button" onClick={() => void handleExportAction('docx')}>DOCX {!isPremium ? '· Преміум' : ''}</button>
                <button type="button" onClick={() => void handleExportAction('tg_push')}>Публікація в Telegram {!isPremium ? '· Преміум' : ''}</button>
                <button type="button" onClick={() => void handleExportAction('copy_all')}>Скопіювати все</button>
                <button type="button" onClick={() => void handleExportAction('save_template')}>Зберегти як шаблон</button>
              </div>
            ) : null}
          </div>
          <button type="button" className="oe-icon-btn" aria-label="Редагувати налаштування">
            <Pencil size={16} />
            <span className="oe-icon-tip">Редагувати налаштування</span>
          </button>
          <button type="button" className="oe-icon-btn oe-icon-btn--accent" aria-label="Згенерувати нову версію">
            <Rocket size={16} />
            <span className="oe-icon-tip">Згенерувати нову версію</span>
          </button>
          <button type="button" className="oe-icon-btn" onClick={() => void handleExportAction('save_template')} aria-label="Зберегти як шаблон">
            <Bookmark size={16} />
            <span className="oe-icon-tip">Зберегти як шаблон</span>
          </button>
          <button type="button" className="oe-icon-btn" onClick={() => void handleExportAction('tg_push')} aria-label="Створити публікацію в TG">
            <Send size={16} />
            <span className="oe-icon-tip">Створити публікацію в TG{!isPremium ? ' · Преміум' : ''}</span>
          </button>
          {!isPremium ? <span className="oe-lock"><Lock size={12} /></span> : null}
        </aside>
      </div>

      <div className="oe-analytics-strip" role="status" aria-live="polite">
        <div className="oe-analytics-row">
          <div className="oe-analytics-item"><span className="oe-analytics-key">AI Позиція</span><span className="oe-analytics-val">{props.activeStrategy || activeResult?.protocol || 'SYSTEM'}</span></div>
          <div className="oe-analytics-item"><span className="oe-analytics-key">Тон</span><span className="oe-analytics-val">{props.activeTone || '—'}</span></div>
          <div className="oe-analytics-item"><span className="oe-analytics-key">Режим рушія</span><span className="oe-analytics-val">АКТИВНИЙ</span></div>
          <div className="oe-analytics-item"><span className="oe-analytics-key">Джерело вводу</span><span className="oe-analytics-val">ТЕКСТ</span></div>
          <div className="oe-analytics-item"><span className="oe-analytics-key">Вартість токенів</span><span className="oe-analytics-val">{activeResult?.usage?.totalTokens ?? 0}</span></div>
          <div className="oe-analytics-item"><span className="oe-analytics-key">Стан обробки</span><span className="oe-analytics-val">{activeResult ? 'ЗАВЕРШЕНО' : 'ОЧІКУВАННЯ'}</span></div>
        </div>
        <div className="oe-analytics-row">
          <div className="oe-analytics-item"><span className="oe-analytics-key">Слів</span><span className="oe-analytics-val">{meta.words}</span></div>
          <div className="oe-analytics-item"><span className="oe-analytics-key">Хуків</span><span className="oe-analytics-val">{meta.hooks}</span></div>
          <div className="oe-analytics-item"><span className="oe-analytics-key">CTA-точок</span><span className="oe-analytics-val">{meta.ctaPoints}</span></div>
          <div className="oe-analytics-item"><span className="oe-analytics-key">Емоційних тригерів</span><span className="oe-analytics-val">{meta.triggers}</span></div>
          <div className="oe-analytics-item"><span className="oe-analytics-key">Прогноз конверсії</span><span className={`oe-analytics-val oe-analytics-val--conversion oe-analytics-val--${meta.conversion.toLowerCase()}`}>{meta.conversion.toUpperCase()}</span></div>
        </div>
      </div>

    </section>
  )
}
