import { CheckCircle2, ChevronLeft, ChevronRight, PencilLine, RefreshCcw, Sparkles, X } from 'lucide-react'

import { Button, InfoHint } from '@/ui'

import { MetricBadgeHint } from './ContentStudioStepPrimitives'

type HookScoreContext = {
  blended: number
  categoryScore: number
  problemScore: number
  formatScore: number
  destinationScore: number
  goalScore: number
  typeScore: number
  sourceLabel: string
}

type ResearchHookOption = {
  key: string
  eyebrow: string
  title: string
  body: string
  footer: string
}

type Props = {
  sectionTitleClass: string
  textareaClass: string
  campaignContextSample: string
  reflection: string
  setReflection: (value: string) => void
  contextHookVariants: string[]
  activeContextHookIndex: number
  canResetHookLimit: boolean
  handleResetContextHookLimit: () => void
  canRestorePreviousContext: boolean
  handleRestorePreviousContext: () => void
  handleSelectContextHookVariant: (index: number) => void
  handlePrevContextHookVariant: () => void
  handleGenerateContextHook: () => void
  handleNextContextHookVariant: () => void
  selectedHookType: string
  selectedHookLabel: string
  setSelectedHookType: (value: string) => void
  researchUpdatedLabel: string
  researchSourceLabel: string
  hookScoreContext: HookScoreContext
  hasResearchMeta: boolean
  isFallback: boolean
  isResearchStale: boolean
  researchHookOptions: ReadonlyArray<ResearchHookOption>
}

export default function ContentStudioHookStep(props: Props) {
  const {
    sectionTitleClass,
    textareaClass,
    campaignContextSample,
    reflection,
    setReflection,
    contextHookVariants,
    activeContextHookIndex,
    canResetHookLimit,
    handleResetContextHookLimit,
    canRestorePreviousContext,
    handleRestorePreviousContext,
    handleSelectContextHookVariant,
    handlePrevContextHookVariant,
    handleGenerateContextHook,
    handleNextContextHookVariant,
    selectedHookType,
    selectedHookLabel,
    setSelectedHookType,
    researchUpdatedLabel,
    researchSourceLabel,
    hookScoreContext,
    hasResearchMeta,
    isFallback,
    isResearchStale,
    researchHookOptions,
  } = props

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-[24px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>Контекст для hook</p>
              <InfoHint label="Контекст для hook" description="Що сьогодні важливе? Який стан? Що хочеш сказати своїй аудиторії." instruction="Сюди вносимо живий вектор дня. Звідси система збирає hook і напрям усіх форматів." />
            </div>
            <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">Що сьогодні важливе? Який стан? Що хочеш сказати своїй аудиторії.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>Генерацій hook: {contextHookVariants.length}/5</span>
            {canRestorePreviousContext ? (
              <button type="button" onClick={handleRestorePreviousContext} className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.1)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.18)] hover:text-[var(--text-primary)]">
                <RefreshCcw className="h-3.5 w-3.5" />
                Повернути попередній контекст
              </button>
            ) : null}
            {canResetHookLimit ? (
              <button type="button" onClick={handleResetContextHookLimit} className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.1)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.18)] hover:text-[var(--text-primary)]">
                <X className="h-3.5 w-3.5" />
                Скинути генерацію
              </button>
            ) : null}
          </div>
        </div>

        <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} onKeyDown={(event) => event.stopPropagation()} placeholder={campaignContextSample} className={`min-h-[138px] ${textareaClass}`} />

        {contextHookVariants.length >= 4 ? (
          <div className="flex justify-center gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <button
                key={`hook-dot-step-${index}`}
                type="button"
                onClick={() => handleSelectContextHookVariant(index)}
                disabled={!contextHookVariants[index]}
                aria-label={`Вибрати варіант hook ${index + 1}`}
                title={`Вибрати варіант hook ${index + 1}`}
                className={[
                  'h-2.5 w-2.5 rounded-full transition-opacity',
                  index === activeContextHookIndex ? 'bg-[rgb(var(--accent-soft-rgb))]' : contextHookVariants[index] ? 'bg-[rgba(255,255,255,0.35)]' : 'bg-[rgba(255,255,255,0.12)]',
                  !contextHookVariants[index] ? 'cursor-not-allowed opacity-35' : '',
                ].join(' ')}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {contextHookVariants.length > 0 ? (
            <Button type="button" onClick={handlePrevContextHookVariant} disabled={activeContextHookIndex === 0} aria-label="Попередній варіант hook" title="Попередній варіант hook" className="dashboard-liquid-card--soft inline-flex items-center justify-center rounded-[16px] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : null}
          <button type="button" onClick={handleGenerateContextHook} disabled={contextHookVariants.length >= 5} className="btn-liquid-dashboard--ice inline-flex items-center gap-2 rounded-[16px] px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55">
            <Sparkles className="h-4 w-4" />
            {contextHookVariants.length >= 5 ? 'Ліміт hook досягнуто' : 'Згенерувати hook'}
          </button>
          {contextHookVariants.length > 1 ? (
            <Button type="button" onClick={handleNextContextHookVariant} disabled={activeContextHookIndex >= contextHookVariants.length - 1} aria-label="Наступний варіант hook" title="Наступний варіант hook" className="dashboard-liquid-card--soft inline-flex items-center justify-center rounded-[16px] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45">
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : null}
          <span className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2.5 py-1 text-[rgb(var(--accent-soft-rgb))]">
            {selectedHookLabel}
          </span>
        </div>
      </div>

      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Це не оцінка успіху, а наскільки hook підходить до твого поточного контексту. Система перераховує варіанти з урахуванням контексту, дії, маршруту, форматів і аналітики з попередніх кроків.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>Дані актуальні на: {researchUpdatedLabel}</span>
              <span>Джерело: {researchSourceLabel}</span>
              <MetricBadgeHint
                value={`Fit score: ${hookScoreContext.blended}%`}
                label="Fit score"
                description="Показує, наскільки hook підходить саме до твого поточного контексту."
                instruction={`Просто для розуміння: ${hookScoreContext.blended}% означає, що цей hook добре збігається з контекстом, дією, маршрутом, форматами і аналітикою. 100% = дуже точний збіг, менше = більше простору для правки.`}
                className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2 py-1"
              />
              <InfoHint
                label="Як рахується?"
                description="Це не оцінка успіху, а наскільки цей hook підходить до твого поточного контексту. Fit score збирається з історії кроків, аналітики та поточної дії."
                instruction={`Пояснення простою мовою: ${hookScoreContext.categoryScore}% бере аналітика по категоріях, ${hookScoreContext.problemScore}% бере топ-проблеми, ${hookScoreContext.formatScore}% враховує формати, ${hookScoreContext.destinationScore}% враховує маршрут, ${hookScoreContext.typeScore}% враховує тип дії, ${hookScoreContext.goalScore}% враховує ціль. Джерело категорії: ${hookScoreContext.sourceLabel}.`}
              />
              {!hasResearchMeta ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">Стартовий шаблон</span> : null}
              {isFallback ? <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-cyan-100">Тимчасовий fallback</span> : null}
              {isResearchStale ? <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-amber-200">Дані скоро застаріють</span> : null}
              <span>Автооновлення: 1-го числа кожного місяця</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className={sectionTitleClass}>Кут входу</p>
            <InfoHint label="Кут входу" description="Зафіксуй основний кут входу до підключення API і дослідження." instruction="Тип входу в першу секунду має бути визначений до генерації текстів і Reels." />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[rgba(var(--accent-rgb),0.12)] bg-[rgba(var(--accent-rgb),0.06)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <span>Обраний hook перейде в наступні кроки як поточний кут</span>
          <span className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2.5 py-1 text-[rgb(var(--accent-soft-rgb))]">
            {selectedHookLabel}
          </span>
        </div>
      </div>

      <div className="grid gap-2.5 min-[480px]:grid-cols-2">
        {researchHookOptions.map((option) => {
          const isActive = selectedHookType === option.key
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setSelectedHookType(option.key)}
              aria-pressed={isActive}
              className={[
                'relative rounded-[18px] border px-4 py-3.5 text-left transition-all duration-300 motion-safe:transform-gpu',
                isActive
                  ? 'z-10 animate-hook-pop border-[rgba(96,121,255,0.72)] bg-[rgba(15,20,38,0.96)] scale-[1.01] shadow-[0_0_0_1px_rgba(96,121,255,0.18),0_18px_36px_rgba(44,72,180,0.14)]'
                  : 'border-[rgba(96,121,255,0.24)] bg-[rgba(12,18,34,0.86)] opacity-86 hover:-translate-y-0.5 hover:border-[rgba(96,121,255,0.46)] hover:opacity-100',
              ].join(' ')}
            >
              {isActive ? <span className="absolute left-4 right-4 top-0 h-[2px] rounded-full bg-[rgba(96,121,255,0.92)] shadow-[0_0_12px_rgba(96,121,255,0.45)]" /> : null}
              {isActive ? (
                <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(94,234,212,0.28)] bg-[rgba(94,234,212,0.12)] text-[rgb(94,234,212)] shadow-[0_10px_24px_rgba(44,72,180,0.12)]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              ) : null}
              <p className="text-[11px] uppercase tracking-[0.14em] text-[rgb(var(--accent-soft-rgb))]">{option.eyebrow}</p>
              <div className="mt-2 flex items-start justify-between gap-3 pr-10">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{option.title}</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{option.body}</p>
              <MetricBadgeHint
                value={option.footer}
                label={`${option.eyebrow} metric`}
                description="Зелений рядок показує орієнтир сили hook: одне число описує очікуване підсилення поведінки, а fit score показує, наскільки цей hook збігається з поточним контекстом."
                instruction="Ліве число в цьому рядку — це прогнозований ефект самого hook-шаблону, наприклад CTR boost або Watch time. Праве число fit — це збіг з твоїм контекстом, дією, маршрутом, форматом, формулою і аналітикою. Тут усе зведено в один робочий орієнтир."
                className="mt-2.5"
              />
            </button>
          )
        })}
      </div>

      <div>
        <p className={sectionTitleClass}>Кут входу в першу секунду</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Спочатку зафіксуй тип хука, через який зайдеш у Reels, а вже потім підключай API та дослідження.
        </p>
      </div>
    </div>
  )
}
