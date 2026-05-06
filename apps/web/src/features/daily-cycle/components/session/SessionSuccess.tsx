import { CheckCircle2, Loader2 } from 'lucide-react'

import type { DayAnalysis } from '@/features/daily-cycle/types/daily.types'
import { Button } from '@/ui'

interface SessionSuccessProps {
  session: 'morning' | 'evening'
  loadingTasks?: boolean
  tasksReady?: boolean
  allowContinueWhileLoading?: boolean
  embedded?: boolean
  onGoToTasks: () => void
  onFinishDay: () => void
  stage?: 'saved' | 'analysis'
  analysis?: DayAnalysis | null
}

const levelLabel = {
  high: 'Висока',
  medium: 'Середній',
  low: 'Мінімальний',
} as const

const levelTrackClass = {
  high: 'w-[85%] bg-[#639922]',
  medium: 'w-[55%] bg-[#EF9F27]',
  low: 'w-[30%] bg-[#E24B4A]',
} as const

export function SessionSuccess({
  session,
  loadingTasks = false,
  tasksReady = true,
  allowContinueWhileLoading = false,
  embedded = false,
  onGoToTasks,
  onFinishDay,
  stage = 'saved',
  analysis,
}: SessionSuccessProps) {
  const isMorning = session === 'morning'
  const isAnalysisStage = session === 'evening' && stage === 'analysis'
  const title = isMorning
    ? 'Ранкова сесія збережена'
    : isAnalysisStage
      ? 'Підсумок дня готовий'
      : 'Вечірню сесію збережено'
  const subtitle = isMorning
    ? 'Аналізуємо відповіді та формуємо твої завдання.'
    : isAnalysisStage
      ? 'Переглянь короткий підсумок і підтвердь завершення дня.'
      : 'Підсумок дня збережено. Можна завершувати цикл.'

  const card = (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(7,10,21,0.92)] text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] text-[rgb(var(--accent-soft-rgb))]">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">{subtitle}</p>
      </div>

      {isMorning ? (
        <div className="px-5 py-5">
          <div className="space-y-3">
            {loadingTasks ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                Аналізуємо відповіді та формуємо завдання...
              </div>
            ) : null}
            {(tasksReady || allowContinueWhileLoading) ? (
              <div>
                <Button onClick={onGoToTasks} size="lg" variant="solid">
                  {tasksReady ? 'Твої завдання готові →' : 'Перейти до мікрозавдань →'}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : isAnalysisStage && analysis ? (
        <div className="text-left">
          <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
            {([
              ['energy_level', 'Сила дня'],
              ['focus_level', 'Фокус'],
              ['drain_level', 'Злив енергії'],
            ] as const).map(([key, label]) => (
              <div key={key} className="p-4">
                <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/45">{label}</div>
                <div className="mb-2 h-1 rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${levelTrackClass[analysis[key]]}`} />
                </div>
                <div className="text-sm font-medium text-white">{levelLabel[analysis[key]]}</div>
              </div>
            ))}
          </div>

          <div className="divide-y divide-white/10">
            <section className="p-4">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">Головний інсайт</div>
              <p className="text-sm leading-relaxed text-white/85">{analysis.main_insight}</p>
            </section>

            <section className="p-4">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">Що спрацювало</div>
              <div className="flex flex-wrap gap-2">
                {analysis.what_worked.map(item => (
                  <span key={item} className="rounded-full bg-[#1D3A27] px-3 py-1 text-xs font-medium text-[#9FE870]">
                    {item}
                  </span>
                ))}
              </div>
            </section>

            <section className="p-4">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">Активна програма</div>
              <div className="border-l-2 border-[#EF9F27] pl-3">
                <div className="mb-1 text-sm font-medium text-white">«{analysis.active_pattern.title}»</div>
                <div className="text-xs leading-relaxed text-white/65">{analysis.active_pattern.description}</div>
              </div>
            </section>

            <section className="p-4">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">Де злила енергію</div>
              <p className="mb-2 text-sm leading-relaxed text-white/85">{analysis.energy_drain_summary}</p>
              <div className="flex flex-wrap gap-2">
                {analysis.drain_chips.map(item => (
                  <span key={item} className="rounded-full bg-[#3E2A1C] px-3 py-1 text-xs font-medium text-[#F4C37D]">
                    {item}
                  </span>
                ))}
              </div>
            </section>

            <section className="p-4">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">Вектор на завтра</div>
              <div className="flex flex-col gap-2">
                {analysis.tomorrow.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-lg bg-white/5 p-3">
                    <span className="mt-0.5 min-w-[16px] text-[11px] font-medium text-white/45">{index + 1}</span>
                    <span className="text-sm leading-relaxed text-white/85">{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="flex justify-center border-t border-white/10 px-5 py-5">
            <Button onClick={onFinishDay} size="lg" variant="solid">
              ГОТОВО
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-5">
          <Button onClick={onFinishDay} size="lg" variant="solid">
            Завершити день
          </Button>
        </div>
      )}
    </div>
  )

  if (embedded) return card

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-6">
      {card}
    </div>
  )
}

export default SessionSuccess
