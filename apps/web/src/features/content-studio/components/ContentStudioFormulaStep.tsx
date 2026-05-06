import { useState } from 'react'

import { InfoHint } from '@/ui'

import type { ContentStudioFunnelInsight } from '../types/contentStudio.types'

type FormulaCard = {
  key: string
  badge: string
  badgeClass: string
  title: string
  description: string
  bullets: readonly { key: string; text: string }[]
  footer: string
  note?: string
  accentClass: string
}

type Props = {
  sectionTitleClass: string
  formulaType: string
  setFormulaType: (value: string) => void
  funnelInsight: ContentStudioFunnelInsight | null
  formulaCards: ReadonlyArray<FormulaCard>
}

export default function ContentStudioFormulaStep(props: Props) {
  const { sectionTitleClass, formulaType, setFormulaType, funnelInsight, formulaCards } = props
  const [isFunnelOpen, setIsFunnelOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] p-4">
        <div className="flex items-center gap-2">
          <p className={sectionTitleClass}>Формула</p>
          <InfoHint
            label="Формула"
            description="Формула визначає, як саме буде побудований текст: через біль, через бажання, через трансформацію або через раціональний продаж."
            instruction="Обирай PAS/AIDA/BAB/4P/STACK під конкретне завдання. Для холодної аудиторії часто заходить AIDA або PAS, для прогріву — BAB або 4P, для сильного міксу — STACK."
          />
        </div>
        {funnelInsight ? (
          <div className="mt-3 rounded-[20px] border border-[rgba(var(--accent-rgb),0.12)] bg-[rgba(255,255,255,0.03)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>Funnel metrics</span>
                <InfoHint label="Funnel metrics" description="Чесне порівняння реальної конверсії з ідеальною для кожного кроку." instruction="Дивись на real conversion, ideal conversion, sample size і пояснення. Якщо вибірка мала, сигнал нестабільний." />
              </div>
              <button
                type="button"
                onClick={() => setIsFunnelOpen((value) => !value)}
                className="rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.08)] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--accent-soft-rgb))] transition-colors hover:border-[rgba(var(--accent-rgb),0.24)] hover:bg-[rgba(var(--accent-rgb),0.12)]"
              >
                {isFunnelOpen ? 'Закрити' : 'Відкрити'}
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{funnelInsight.summary}</p>
            {isFunnelOpen ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
                  Реальна конверсія = що є в даних. Ідеал = робочий орієнтир за UX і best-practice. Різниця показує, де найкращий запас росту.
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {funnelInsight.steps.map((step) => {
                    const diffLabel =
                      step.differencePoints === null
                        ? 'немає даних'
                        : step.differencePoints === 0
                          ? '0 п.п. від ідеалу'
                          : step.differencePoints > 0
                            ? `+${step.differencePoints} п.п.`
                            : `${step.differencePoints} п.п.`

                    return (
                      <div
                        key={step.step}
                        className={[
                          'rounded-[18px] border px-4 py-4',
                          step.step === funnelInsight.weakestStableStep
                            ? 'border-[rgba(var(--accent-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.08)] shadow-[0_18px_34px_rgba(0,0,0,0.22)]'
                            : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                              {step.fromLabel} → {step.toLabel}
                            </p>
                            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{step.realConversion}</p>
                          </div>
                          <span
                            className={[
                              'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                              step.isStable
                                ? 'border-[rgba(94,234,212,0.22)] bg-[rgba(94,234,212,0.08)] text-[rgb(94,234,212)]'
                                : 'border-[rgba(255,171,89,0.22)] bg-[rgba(255,171,89,0.08)] text-[rgb(255,171,89)]',
                            ].join(' ')}
                          >
                            {step.isStable ? 'стабільно' : 'мала вибірка'}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                            Ідеал: {step.idealConversion}
                          </span>
                          <span className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--accent-soft-rgb))]">
                            Реально: {step.realUsers} користувачів
                          </span>
                          <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                            Дельта: {diffLabel}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{step.explanation}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {step.arguments.map((argument) => (
                            <span key={argument} className="rounded-full border border-[rgba(var(--accent-rgb),0.12)] bg-[rgba(var(--accent-rgb),0.06)] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--accent-soft-rgb))]">
                              {argument}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid items-stretch gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3">
        {formulaCards.map((card) => {
          const footerPercentMatch = card.footer.match(/(\d+)%/)
          const footerPercent = footerPercentMatch?.[1] ?? null

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setFormulaType(card.key)}
              className={[
                'relative flex h-full flex-col rounded-[20px] border px-4 py-4 text-left transition-all duration-200',
                formulaType === card.key
                  ? 'z-10 border-[rgba(96,121,255,0.72)] bg-[rgba(15,20,38,0.96)] shadow-[0_0_0_1px_rgba(96,121,255,0.18),0_18px_36px_rgba(44,72,180,0.14)]'
                  : 'border-[rgba(96,121,255,0.24)] bg-[rgba(12,18,34,0.86)] hover:border-[rgba(96,121,255,0.46)]',
              ].join(' ')}
            >
              {formulaType === card.key ? <span className="absolute left-4 right-4 top-0 h-[2px] rounded-full bg-[rgba(96,121,255,0.92)] shadow-[0_0_12px_rgba(96,121,255,0.45)]" /> : null}
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${card.badgeClass}`}>{card.badge}</span>
                {formulaType === card.key ? <span className="text-xs font-semibold text-white">✓</span> : null}
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{card.title}</p>
              <p className={formulaType === card.key ? 'mt-2 text-xs leading-5 text-[rgba(255,255,255,0.82)]' : 'mt-2 text-xs leading-5 text-[rgba(255,255,255,0.62)]'}>{card.description}</p>
              <div className="mt-3 flex-1 space-y-2.5">
                {card.bullets.map((bullet) => (
                  <div key={`${card.key}-${bullet.key}-${bullet.text}`} className="flex items-start gap-2.5">
                    <span className="min-w-[14px] pt-[1px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--accent-soft-rgb))]">{bullet.key}</span>
                    <p className={formulaType === card.key ? 'text-xs leading-5 text-[rgba(255,255,255,0.88)]' : 'text-xs leading-5 text-[rgba(255,255,255,0.78)]'}>
                      {bullet.text}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <p className={`text-[11px] font-semibold ${card.accentClass}`}>{card.footer}</p>
                <InfoHint
                  label="Що означає %"
                  description="Відсоток показує, наскільки цей варіант сильніший за базовий текст у вибірці."
                  instruction={
                    footerPercent
                      ? `${footerPercent}% тут означає орієнтовне підсилення відносно базового тексту для цього конкретного варіанту. Якщо це критичне значення у твоєму наборі, система підсвічує його як найсильніший орієнтир серед доступних карток.`
                      : 'Це число показує орієнтовне підсилення відносно базового тексту для цього варіанту. Якщо значення високе, це сильніший орієнтир для вибору саме цієї картки.'
                  }
                />
              </div>
              {card.note ? <p className={formulaType === card.key ? 'mt-1 text-[11px] text-[rgba(255,255,255,0.55)]' : 'mt-1 text-[11px] text-[rgba(255,255,255,0.5)]'}>{card.note}</p> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
