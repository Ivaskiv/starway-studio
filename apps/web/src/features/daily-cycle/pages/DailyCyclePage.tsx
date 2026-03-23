import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'

const MORNING_QUESTIONS = [
  {
    id: 'identity',
    label: 'Хто я сьогодні?',
    hint: 'Опиши себе як нову версію — з позиції сили. Наприклад: я топ-експерт, я власниця бренду...',
    placeholder: 'Я — ...',
    type: 'text' as const,
  },
  {
    id: 'qualities',
    label: 'Яка я?',
    hint: 'Наприклад: сильна, смілива, любляча, рішуча...',
    placeholder: 'Я — ...',
    type: 'text' as const,
  },
  {
    id: 'goals',
    label: 'Мої 10 цілей на рік',
    hint: 'Пропиши щодня наново — ніби вони вже реальність. Не дивись що писала вчора.',
    placeholder: '1. Я маю...\n2. Я живу...\n3. Я отримую...',
    type: 'textarea' as const,
  },
  {
    id: 'focus',
    label: 'На яку одну ціль я фокусуюсь сьогодні?',
    hint: 'Те, що хочеш просунути зараз.',
    placeholder: 'Я — ...',
    type: 'text' as const,
  },
  {
    id: 'state',
    label: 'Який мій стан сьогодні?',
    hint: 'Опиши свій стан прямо зараз. Якщо не ресурсний — обери новий: впевненість, рішучість, легкість.',
    placeholder: 'Я відчуваю: ...',
    type: 'text' as const,
  },
  {
    id: 'worthy',
    label: 'Чому я гідна мати все це прямо зараз?',
    hint: 'Одна сильна відповідь із позиції самоцінності.',
    placeholder: 'Я — ...',
    type: 'text' as const,
  },
]

const EVENING_QUESTIONS = [
  {
    id: 'energy_in',
    label: 'Що мене сьогодні наповнило енергією?',
    hint: 'Люди, дії, ситуації, стани.',
    placeholder: 'Мене сьогодні наповнило: ...',
    type: 'text' as const,
  },
  {
    id: 'energy_out',
    label: 'Де я сьогодні злила енергію чи втратила стан?',
    hint: 'Тригер, сумнів, ситуація, реакція.',
    placeholder: 'Я сьогодні злила енергію в: ...',
    type: 'text' as const,
  },
  {
    id: 'program',
    label: 'Яка програма або переконання активувалась сьогодні?',
    hint: 'Наприклад: страх, "мені не вийде", "я не заслуговую"...',
    placeholder: 'У мене сьогодні активувалась програма: ...',
    type: 'text' as const,
  },
  {
    id: 'power_source',
    label: 'З якої точки я діяла сьогодні: сили чи страху?',
    hint: 'Чесна відповідь. Що керувало тобою?',
    placeholder: 'Мною сьогодні керувала/керував: ...',
    type: 'text' as const,
  },
  {
    id: 'win',
    label: 'Яка моя головна перемога сьогодні?',
    hint: 'Дія, стан, рішення — будь-який успіх.',
    placeholder: 'Сьогодні я: ...',
    type: 'text' as const,
  },
]

const MORNING_AFFIRMATION =
  'Моє бачення — мій вибір. Моя сила — в мені. Я вже йду своїм шляхом.'
const EVENING_AFFIRMATION =
  'Я вдячна цьому дню. Я стала сильнішою. Я обираю рухатися далі — до себе справжньої.'

export default function DailyCyclePage() {
  const navigate = useNavigate()
  const { data: trial } = useGetTrialStatusQuery()
  const hasAccess = (trial?.isActive ?? false) || (trial?.isPaid ?? false)
  const now = new Date()
  const hour = now.getHours()

  const sessionFromUrl = new URLSearchParams(window.location.search).get('session')
  const defaultSession = sessionFromUrl === 'evening'
    ? 'evening'
    : sessionFromUrl === 'morning'
      ? 'morning'
      : hour >= 21
        ? 'evening'
        : 'morning'

  const [session, setSession] = useState<'morning' | 'evening'>(defaultSession)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const questions = session === 'morning' ? MORNING_QUESTIONS : EVENING_QUESTIONS
  const affirmation = session === 'morning' ? MORNING_AFFIRMATION : EVENING_AFFIRMATION
  const currentQ = questions[step]
  const isLastStep = step === questions.length - 1
  const progress = Math.round((step / questions.length) * 100)

  if (!hasAccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="bg-[var(--accent-bg,var(--bg-secondary))] p-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
              ЩОДЕННИЙ ЦИКЛ
            </p>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Зафіксуй свій стан дня
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Доступно з активним тріалом або підпискою.
            </p>
          </div>
          <div className="p-4 space-y-3">
            <button
              type="button"
              className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:brightness-110"
              onClick={() => navigate('/dashboard/ai-mentor')}
            >
              ▶ Розпочати 7 днів безкоштовно
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-5">
          <div className="overflow-hidden rounded-2xl border border-[var(--color-success)] bg-[var(--color-success-bg)]">
            <div className="p-5 text-center">
              <span className="text-4xl">
                {session === 'morning' ? '🌞' : '🌙'}
              </span>
              <h2 className="mt-3 text-xl font-bold text-[var(--text-primary)]">
                {session === 'morning'
                  ? 'Ранкова сесія завершена!'
                  : 'Вечірня рефлексія завершена!'}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                AI Асистент аналізує твої відповіді та формує мікрозавдання
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.06)] p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
              {session === 'morning' ? '🌀 Мотивація на ранок' : '🌟 Афірмація на вечір'}
            </p>
            <p className="text-sm italic leading-relaxed text-[var(--text-secondary)]">
              "{affirmation}"
            </p>
          </div>

          {session === 'morning' && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                Що далі?
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                AI сформує мікрозавдання на день.
                Перевір їх у модулі AI Ментора.
                Ввечері о 21:00 — вечірня рефлексія.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:brightness-110"
              onClick={() => navigate('/dashboard/ai-mentor')}
            >
              AI Ментор →
            </button>
            <button
              type="button"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)]"
              onClick={() => navigate('/dashboard')}
            >
              Кабінет
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleNext = async () => {
    if (!answers[currentQ.id]?.trim()) return

    if (isLastStep) {
      setIsSubmitting(true)
      try {
        const token = localStorage.getItem('starway_access_token') ?? ''
        const todayResponse = await fetch('/api/daily/today', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!todayResponse.ok) {
          throw new Error('DAILY_ENTRY_RESOLVE_FAILED')
        }

        const todayEntry = await todayResponse.json() as { id: string }
        const serializedAnswers = questions.map(question => ({
          question: question.label,
          answer: answers[question.id] ?? '',
        }))

        const submitResponse = await fetch('/api/daily/entry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: todayEntry.id,
            state: 'NEUTRAL',
            choice: 'PENDING',
            dayFact: answers[currentQ.id] ?? '',
            answers: serializedAnswers,
            date: new Date().toISOString(),
          }),
        })

        if (!submitResponse.ok) {
          throw new Error('DAILY_ENTRY_SUBMIT_FAILED')
        }

        setSubmitted(true)
      } catch (e) {
        console.error('[DailyCycle] submit failed:', e)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    setStep(s => s + 1)
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)]"
        >
          ← Кабінет
        </button>
        <div className="flex gap-2">
          {(['morning', 'evening'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSession(s)
                setStep(0)
                setAnswers({})
              }}
              className={[
                'rounded-xl px-3 py-1.5 text-xs font-medium transition-all',
                session === s
                  ? 'border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.15)] text-[var(--accent)]'
                  : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--glass-bg)]',
              ].join(' ')}
            >
              {s === 'morning' ? '🌞 Ранок' : '🌙 Вечір'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="bg-[var(--accent-bg,var(--bg-secondary))] p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
              {session === 'morning' ? 'РАНКОВІ ПИТАННЯ' : 'ВЕЧІРНЯ РЕФЛЕКСІЯ'}
              {' · '}
              {step + 1}/{questions.length}
            </p>
            <span className="text-[10px] text-[var(--text-muted)]">
              День {trial?.currentDay ?? 1}
            </span>
          </div>
          <div className="h-1 rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {step + 1}. {currentQ.label}
            </p>
            {currentQ.hint && (
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                {currentQ.hint}
              </p>
            )}
          </div>

          {currentQ.type === 'textarea' ? (
            <textarea
              rows={6}
              value={answers[currentQ.id] ?? ''}
              onChange={e => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))}
              placeholder={currentQ.placeholder}
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-primary,var(--bg-secondary))] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder-[var(--text-muted)] focus:border-[var(--accent)]"
            />
          ) : (
            <input
              type="text"
              value={answers[currentQ.id] ?? ''}
              onChange={e => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))}
              placeholder={currentQ.placeholder}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary,var(--bg-secondary))] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder-[var(--text-muted)] focus:border-[var(--accent)]"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  void handleNext()
                }
              }}
            />
          )}

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)]"
              >
                ← Назад
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void handleNext()
              }}
              disabled={!answers[currentQ.id]?.trim() || isSubmitting}
              className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              {isLastStep
                ? isSubmitting ? 'Зберігаємо...' : 'Завершити ✓'
                : 'Далі →'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {questions.map((_, i) => (
          <div
            key={i}
            className={[
              'h-1.5 flex-1 rounded-full transition-all',
              i < step
                ? 'bg-[var(--color-success)]'
                : i === step
                  ? 'bg-[var(--accent)]'
                  : 'bg-[var(--border)]',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  )
}
