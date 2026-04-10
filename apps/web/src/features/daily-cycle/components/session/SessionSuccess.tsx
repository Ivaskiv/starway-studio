import { Loader2, CheckCircle2 } from 'lucide-react'

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
  analysisChecklist?: Array<{
    label: string
    done: boolean
  }>
  analysisText?: string | null
}

export function SessionSuccess({
  session,
  loadingTasks = false,
  tasksReady = true,
  allowContinueWhileLoading = false,
  embedded = false,
  onGoToTasks,
  onFinishDay,
  stage = 'saved',
  analysisChecklist,
  analysisText,
}: SessionSuccessProps) {
  const isMorning = session === 'morning'
  const isAnalysisStage = session === 'evening' && stage === 'analysis'
  const title = isMorning
    ? 'Ранкова сесія збережено!'
    : isAnalysisStage
      ? 'Аналіз дня готовий!'
      : 'Вечірню сесію збережено!'
  const subtitle = isMorning
    ? 'Аналізуємо відповіді та формуємо твої завдання...'
    : isAnalysisStage
      ? 'Перевір короткий чекплан і підтвердь завершення дня.'
      : 'Формуємо підсумок дня і закриваємо цикл.'

  const card = (
    <div className="mx-auto w-full max-w-2xl rounded-[28px] border border-white/10 bg-[rgba(7,10,21,0.92)] p-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] text-[rgb(var(--accent-soft-rgb))]">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/65">{subtitle}</p>

      {isMorning ? (
        <div className="mt-5 space-y-3">
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
      ) : isAnalysisStage ? (
        <div className="mt-5 space-y-2 text-left">
          {analysisText ? (
            <div className="mx-auto max-w-xl rounded-2xl border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm leading-relaxed text-white/80">
              {analysisText}
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              Формуємо підсумок дня. Зараз покажемо короткий чекплан, а аналіз з’явиться одразу після збереження.
            </div>
          )}
          <div className="mx-auto max-w-xl space-y-2">
            {(analysisChecklist ?? []).map(item => (
              <div key={item.label} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                {item.done ? (
                  <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/15 text-emerald-300">
                    ✓
                  </span>
                ) : (
                  <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm border border-white/20 bg-transparent text-white/40">
                    □
                  </span>
                )}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="pt-2">
            <Button onClick={onFinishDay} size="lg" variant="solid">
              ГОТОВО
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
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
