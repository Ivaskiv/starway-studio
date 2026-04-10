import type { ReactNode } from 'react'
import type { DailyCycleEntry } from '@/features/daily-cycle/types/daily.types'
import type { MicroTask as MicroTaskItem } from '@/features/microTask/types/types'
import { CheckCircle2, ListTodo, MoonStar, Sparkles, SunMedium, X } from 'lucide-react'

type AnswerItem = {
  id: string
  question: string
  answer: string
}

const QUESTION_LABELS: Record<string, string> = {
  identity: 'Хто я сьогодні?',
  qualities: 'Яка я?',
  goals: 'Мої 10 цілей на рік',
  focus: 'На яку одну ціль я фокусуюсь сьогодні?',
  state: 'Який мій стан сьогодні?',
  worthy: 'Чому я гідна мати все це прямо зараз?',
  energy_in: 'Що мене сьогодні наповнило енергією?',
  energy_out: 'Де я сьогодні злила енергію чи втратила стан?',
  program: 'Яка програма або переконання активувалась сьогодні?',
  power_source: 'З якої точки я діяла сьогодні: сили чи страху?',
  win: 'Яка моя головна перемога сьогодні?',
}

type CycleDayReportModalProps = {
  dateKey: string
  entry: DailyCycleEntry | null
  morningAnswers: AnswerItem[]
  eveningAnswers: AnswerItem[]
  tasks: MicroTaskItem[]
  onClose: () => void
}

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey
  return new Date(year, month - 1, day).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getQuestionLabel(question: string) {
  return QUESTION_LABELS[question] ?? question.replace(/_/g, ' ')
}

function getTaskStatusLabel(task: MicroTaskItem) {
  const status = (task.status ?? 'PENDING').toLowerCase()
  if (status === 'completed' || Boolean(task.completedAt)) return 'Виконано'
  if (status === 'skipped') return 'Пропущено'
  if (status === 'expired') return 'Прострочено'
  return 'Активно'
}

function AnswerSection({
  title,
  icon,
  answers,
  emptyText,
}: {
  title: string
  icon: ReactNode
  answers: AnswerItem[]
  emptyText: string
}) {
  return (
    <section className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <span className="text-[rgb(var(--accent-soft-rgb))]">{icon}</span>
        {title}
      </div>
      {answers.length === 0 ? (
        <p className="text-sm leading-6 text-[var(--text-muted)]">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {answers.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">
                {getQuestionLabel(item.question)}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{item.answer}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function CycleDayReportModal({
  dateKey,
  entry,
  morningAnswers,
  eveningAnswers,
  tasks,
  onClose,
}: CycleDayReportModalProps) {
  const analysis = typeof entry?.aiAnalysis === 'string' && entry.aiAnalysis.trim().length > 0
    ? entry.aiAnalysis.trim()
    : null
  const completedTasksCount = tasks.filter((task) => {
    const status = (task.status ?? 'PENDING').toLowerCase()
    return status === 'completed' || Boolean(task.completedAt)
  }).length
  const skippedTasksCount = tasks.filter((task) => (task.status ?? 'PENDING').toLowerCase() === 'skipped').length
  const hasMorning = morningAnswers.length > 0
  const hasEvening = eveningAnswers.length > 0
  const hasAnyProgress = hasMorning || hasEvening || tasks.length > 0
  const analysisFallback = !hasAnyProgress
    ? 'Пропущено все. Цей день не був заповнений, тому AI-аналіз ще не сформовано.'
    : entry?.status === 'SKIPPED'
      ? 'Пропущено частково. День був завершений не повністю, тому замість AI-аналізу збережено історію відповідей і задач.'
      : `День ще не завершено. Зараз збережено ${completedTasksCount} виконаних мікрозавдань${skippedTasksCount > 0 ? ` і ${skippedTasksCount} пропущених` : ''}. AI-аналіз з’явиться після повного завершення дня.`

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(4,8,18,0.76)] p-4">
      <div className="relative max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(18,32,60,0.96),rgba(8,12,22,0.98))] shadow-[0_28px_80px_rgba(0,0,0,0.4)]">
        <div className="flex items-start justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
              Історія дня
            </p>
            <h3 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{formatDateLabel(dateKey)}</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Перегляд відповідей, мікрозавдань і AI-аналізу цього дня.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            aria-label="Закрити звіт дня"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(88vh-96px)] space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <AnswerSection
              title="Ранкова сесія"
              icon={<SunMedium className="h-4 w-4" />}
              answers={morningAnswers}
              emptyText="Ранкові відповіді для цього дня не збережені."
            />
            <AnswerSection
              title="Вечірня сесія"
              icon={<MoonStar className="h-4 w-4" />}
              answers={eveningAnswers}
              emptyText="Вечірні відповіді для цього дня не збережені."
            />
          </div>

          <section className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <span className="text-[rgb(var(--accent-soft-rgb))]"><ListTodo className="h-4 w-4" /></span>
              Мікрозавдання
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm leading-6 text-[var(--text-muted)]">Для цього дня не знайдено збережених мікрозавдань.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{task.title}</p>
                      <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                        {getTaskStatusLabel(task)}
                      </span>
                    </div>
                    {task.description ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{task.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-[rgba(92,136,255,0.16)] bg-[linear-gradient(180deg,rgba(28,52,102,0.34),rgba(13,20,36,0.92))] p-5 shadow-[0_16px_38px_rgba(8,14,28,0.28)]">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <span className="text-[rgb(var(--accent-soft-rgb))]"><Sparkles className="h-4 w-4" /></span>
              AI-аналіз дня
            </div>
            {analysis ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--accent-soft-rgb))]">
                  Premium insight
                </p>
                <p className="mt-3 text-[15px] leading-7 text-[var(--text-primary)]">{analysis}</p>
              </>
            ) : (
              <p className="text-sm leading-6 text-[var(--text-muted)]">{analysisFallback}</p>
            )}
          </section>

          {entry?.status ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <CheckCircle2 className="h-4 w-4 text-[rgb(var(--accent-soft-rgb))]" />
              Статус дня: {entry.status}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
