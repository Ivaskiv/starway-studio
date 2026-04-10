import { ChevronLeft, ChevronRight, Sparkles, UploadCloud, X } from 'lucide-react'

import { InfoHint } from '@/ui'

import {
  CM_SECTION_TITLE_CLASS,
  CTA_DESTINATION_OPTIONS,
  CTA_ROUTING_OPTIONS,
  CTA_TYPE_OPTIONS,
  FORMAT_OPTIONS,
  SECTION_EYEBROW_CLASS,
} from '../config/contentStudio.config'
import { formatContentStudioWeakestStep } from '../utils/contentStudio.strategy'
import type { ContentStudioAIStrategy, ContentStudioInputs, ContentStudioStrategyDecision } from '../types/contentStudio.types'
import { FormatChecklist } from './ContentStudioStepPrimitives'

type Props = {
  itemsCount: number
  aiStrategy: ContentStudioAIStrategy | null
  strategyDecision: ContentStudioStrategyDecision
  strategyApplied: boolean
  launchPotential: { views: string; dm: string; trial: string }
  contextHookVariants: string[]
  canResetHookLimit: boolean
  reflection: string
  selectedFormats: string[]
  inputs: ContentStudioInputs
  ctaType: string
  ctaDestination: string[]
  ctaRoutingMode: string
  summary: { total: number }
  audioReadyCount: number
  reelsReadyCount: number
  activeContextHookIndex: number
  onLaunchSales: () => void
  onOpenScripts: () => void
  onOpenStrategy: () => void
  onConfirmStrategy: () => void
  onEditStrategy: () => void
  onRejectStrategy: () => void
  onResetHookLimit: () => void
  onReflectionChange: (value: string) => void
  onSelectHookVariant: (index: number) => void
  onPrevHookVariant: () => void
  onGenerateHook: () => void
  onNextHookVariant: () => void
  onToggleFormat: (value: string) => void
}

export function ContentStudioOverview(props: Props) {
  const {
    itemsCount,
    aiStrategy,
    strategyDecision,
    strategyApplied,
    launchPotential,
    contextHookVariants,
    canResetHookLimit,
    reflection,
    selectedFormats,
    inputs,
    ctaType,
    ctaDestination,
    ctaRoutingMode,
    summary,
    audioReadyCount,
    reelsReadyCount,
    activeContextHookIndex,
    onLaunchSales,
    onOpenScripts,
    onOpenStrategy,
    onConfirmStrategy,
    onEditStrategy,
    onRejectStrategy,
    onResetHookLimit,
    onReflectionChange,
    onSelectHookVariant,
    onPrevHookVariant,
    onGenerateHook,
    onNextHookVariant,
    onToggleFormat,
  } = props
  return (
    <div className="space-y-5 px-6 py-6">
      <div className="rounded-[26px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.03)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className={SECTION_EYEBROW_CLASS}>AI пропонує стратегію</p>
              {strategyApplied ? (
                <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                  AI Strategy Applied
                </span>
              ) : aiStrategy?.trackingDisconnected ? (
                <span className="rounded-full border border-[rgba(255,122,89,0.24)] bg-[rgba(255,122,89,0.1)] px-2.5 py-1 text-[11px] font-semibold text-[rgb(255,160,130)]">
                  Tracking disconnected
                </span>
              ) : strategyDecision === 'manual' ? (
                <span className="rounded-full border border-[rgba(var(--accent-rgb),0.2)] bg-[rgba(var(--accent-rgb),0.08)] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--accent-soft-rgb))]">
                  Ручний режим
                </span>
              ) : strategyDecision === 'rejected' ? (
                <span className="rounded-full border border-[rgba(255,122,89,0.22)] bg-[rgba(255,122,89,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[rgb(255,160,130)]">
                  Fallback: Reels
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-[1.8rem] font-semibold leading-tight text-[var(--text-primary)]">
              {aiStrategy ? aiStrategy.coreProblem : 'Стратегія ще не визначена'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {aiStrategy
                ? aiStrategy.trackingDisconnected
                  ? `Де ламається: ${formatContentStudioWeakestStep(aiStrategy.weakestStep)} · конверсія ${aiStrategy.conversion}% · джерело ${aiStrategy.worstSource ?? 'невідомо'} · конверсія джерела ${aiStrategy.sourceConversion ?? 0}%.`
                  : `Де ламається: ${formatContentStudioWeakestStep(aiStrategy.weakestStep)} · конверсія ${aiStrategy.conversion}% · вибірка ${aiStrategy.sampleSize}.`
                : 'Система ще не знайшла вузький bottleneck, тому потрібна ручна перевірка або fallback до Reels.'}
            </p>

            {aiStrategy ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Suggested formats</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {aiStrategy.suggestedFormats.map((format) => (
                      <span key={format} className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--accent-soft-rgb))]">
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Чому саме так</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{aiStrategy.formatReasoning}</p>
                </div>
                <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Що робити</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{aiStrategy.actions[0] ?? aiStrategy.contentFocus}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-[340px]">
            {aiStrategy ? (
              <>
                <button type="button" onClick={onConfirmStrategy} className="btn-liquid-dashboard btn-liquid-dashboard--primary inline-flex items-center justify-center gap-2 rounded-[18px] px-5 py-3 text-sm font-semibold">
                  <Sparkles className="h-4 w-4" />
                  Підтвердити AI стратегію
                </button>
                <button type="button" onClick={onEditStrategy} className="dashboard-liquid-card--soft rounded-[18px] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">
                  Редагувати вручну
                </button>
                <button type="button" onClick={onRejectStrategy} className="rounded-[18px] border border-[rgba(255,122,89,0.22)] bg-[rgba(255,122,89,0.08)] px-5 py-3 text-sm font-semibold text-[rgb(255,160,130)]">
                  Відхилити і взяти Reels
                </button>
              </>
            ) : (
              <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                Зараз немає чіткої стратегії. Після уточнення контексту система покаже next best move.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border border-[rgba(var(--accent-rgb),0.14)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.12)_0%,rgba(255,255,255,0.02)_100%)] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className={SECTION_EYEBROW_CLASS}>Launchpad продажу</p>
            <h3 className="mt-2 text-[1.8rem] font-semibold leading-tight text-[var(--text-primary)]">
              {itemsCount > 0 ? `Тобі згенеровано ${itemsCount} матеріалів` : 'Спочатку збери пакет, потім запускай продаж'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Тут важливий не процес, а результат: згенерувати пакет, підтвердити сильні варіанти і запустити їх у DM → bot → trial → payment.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['👀 Потенціал переглядів', launchPotential.views, 'Оцінка можливого діапазону переглядів пакета.'],
                ['💬 Потенціал DM', launchPotential.dm, 'Орієнтовна кількість діалогів через контент і дію.'],
                ['🎁 Потенціал trial', launchPotential.trial, 'Прогноз переходів у trial після контенту й DM.'],
              ].map(([label, value, desc]) => (
                <div key={label} className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">{label}</p>
                    <InfoHint label={label} description={desc} instruction={desc} />
                  </div>
                  <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 xl:w-[320px]">
            <button type="button" onClick={onLaunchSales} className="btn-liquid-dashboard btn-liquid-dashboard--primary inline-flex items-center justify-center gap-2 rounded-[18px] px-5 py-3.5 text-sm font-semibold">
              <UploadCloud className="h-4 w-4" />🚀 Запустити продаж
            </button>
            <button type="button" onClick={onOpenScripts} className="dashboard-liquid-card--soft rounded-[18px] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">Переглянути пакет</button>
            <button type="button" onClick={onOpenStrategy} className="dashboard-liquid-card--soft rounded-[18px] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">Змінити стратегію</button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className={CM_SECTION_TITLE_CLASS}>Контекст</p>
              <InfoHint label="Контекст" description="Що сьогодні важливе? Який стан? Що хочеш сказати своїй аудиторії." instruction="Цей блок напряму впливає на Hook, Формулу, Reels і Telegram." />
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>Генерацій hook: {contextHookVariants.length}/5</span>
              {canResetHookLimit ? <button type="button" onClick={onResetHookLimit} className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.18)] hover:text-[var(--text-primary)]"><X className="h-3.5 w-3.5" />Скинути генерацію</button> : null}
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Що сьогодні важливе? Який стан? Що хочеш сказати своїй аудиторії.</p>
          <textarea value={reflection} onChange={(event) => onReflectionChange(event.target.value)} onKeyDown={(event) => event.stopPropagation()} placeholder="Що сьогодні важливе? Який стан? Що хочеш сказати своїй аудиторії..." className="mt-3 min-h-[110px] rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-[var(--text-field)]" />
          {contextHookVariants.length >= 4 ? (
            <div className="mt-3 flex justify-center gap-2">
              {Array.from({ length: 5 }, (_, index) => (
                <button key={index} type="button" onClick={() => onSelectHookVariant(index)} disabled={!contextHookVariants[index]} className={['h-2.5 w-2.5 rounded-full transition-opacity', index === activeContextHookIndex ? 'bg-[rgb(var(--accent-soft-rgb))]' : contextHookVariants[index] ? 'bg-[rgba(255,255,255,0.35)]' : 'bg-[rgba(255,255,255,0.12)]'].join(' ')} />
              ))}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {contextHookVariants.length > 0 ? <button type="button" onClick={onPrevHookVariant} disabled={activeContextHookIndex === 0} className="dashboard-liquid-card--soft inline-flex items-center justify-center rounded-[16px] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-45"><ChevronLeft className="h-4 w-4" /></button> : null}
            <button type="button" onClick={onGenerateHook} disabled={contextHookVariants.length >= 5} className="btn-liquid-dashboard--ice inline-flex items-center gap-2 rounded-[16px] px-4 py-2 text-sm font-semibold disabled:opacity-55">
              <Sparkles className="h-4 w-4" />{contextHookVariants.length >= 5 ? 'Ліміт hook досягнуто' : 'Згенерувати hook'}
            </button>
            {contextHookVariants.length > 1 ? <button type="button" onClick={onNextHookVariant} disabled={activeContextHookIndex >= contextHookVariants.length - 1} className="dashboard-liquid-card--soft inline-flex items-center justify-center rounded-[16px] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-45"><ChevronRight className="h-4 w-4" /></button> : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
            <div className="flex items-center gap-2">
              <p className={CM_SECTION_TITLE_CLASS}>Формат</p>
              <InfoHint label="Формат" description="Носії, які ввійдуть у пакет." instruction="Якщо все вимкнути — повернемось до базового Instagram Reels." />
            </div>
            <div className="mt-3"><FormatChecklist selectedFormats={selectedFormats} onToggle={onToggleFormat} options={FORMAT_OPTIONS} /></div>
          </div>
          <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.06)] px-4 py-4">
            <div className="flex items-center gap-2">
              <p className={CM_SECTION_TITLE_CLASS}>СТА і шлях</p>
              <InfoHint label="СТА і шлях" description="Тип CTA, куди ведемо і як ведемо далі." instruction="Це швидкий summary другого кроку." />
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
              <div><p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Тип CTA</p><p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{CTA_TYPE_OPTIONS.find((item) => item.value === ctaType)?.label}</p></div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Куди ведемо</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {ctaDestination.length > 0 ? ctaDestination.map((value) => {
                    const option = CTA_DESTINATION_OPTIONS.find((item) => item.value === value)
                    if (!option) return null
                    return <span key={value} className="inline-flex items-center rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.09)] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--accent-soft-rgb))]">{option.label}</span>
                  }) : <span className="text-sm font-medium text-[var(--text-secondary)]">Не вибрано</span>}
                </div>
              </div>
              <div><p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Як ведемо далі</p><p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{CTA_ROUTING_OPTIONS.find((item) => item.value === ctaRoutingMode)?.label}</p></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">{inputs.cta.slice(0, 4).map((cta) => <span key={cta} className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.09)] px-3 py-1 text-[11px] font-medium text-[rgb(var(--accent-soft-rgb))]">{cta}</span>)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[['1', 'Обери сценарій', 'Контекст, продукт, біль, офер і дію.'], ['2', 'Підтверди пакет', 'Переглянь Reels, Ads, Telegram preview і Podcast.'], ['3', 'Запусти', 'Активуй publish + payload tracking + Telegram sync.']].map(([step, title, description]) => (
          <div key={step} className="rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
            <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] text-xs font-semibold text-[rgb(var(--accent-soft-rgb))]">{step}</span><p className="text-base font-semibold text-[var(--text-primary)]">{title}</p></div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[['Усього', summary.total], ['Сценарії', itemsCount], ['Аудіо', audioReadyCount], ['Reels ready', reelsReadyCount]].map(([label, value]) => (
          <div key={label} className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-3"><p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">{label}</p><p className="mt-2 text-2xl font-medium text-[var(--text-primary)]">{value}</p></div>
        ))}
      </div>
    </div>
  )
}
