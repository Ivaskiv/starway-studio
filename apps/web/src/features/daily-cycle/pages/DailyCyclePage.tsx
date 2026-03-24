import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  useGetTelegramLinkUrlQuery,
  useGetTelegramStatusQuery,
} from '@/features/auth/services/auth.api'
import {
  useGetTodayEntryQuery,
  useSubmitDailyCycleMutation,
} from '@/features/daily-cycle/services/daily.api'
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

type DailyCycleFlowProps = {
  embedded?: boolean
  initialSession?: 'morning' | 'evening'
  onClose?: () => void
  onComplete?: () => void
}

export function DailyCycleFlow({
  embedded = false,
  initialSession,
  onClose,
  onComplete,
}: DailyCycleFlowProps) {
  const navigate = useNavigate()
  const { data: trial } = useGetTrialStatusQuery()
  const hasAccess = (trial?.isActive ?? false) || (trial?.isPaid ?? false)
  const now = new Date()
  const hour = now.getHours()

  const sessionFromUrl = new URLSearchParams(window.location.search).get('session')
  const defaultSession = initialSession
    ?? (sessionFromUrl === 'evening'
      ? 'evening'
      : sessionFromUrl === 'morning'
        ? 'morning'
        : hour >= 21
          ? 'evening'
          : 'morning')

  const [session, setSession] = useState<'morning' | 'evening'>(defaultSession)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const lastSyncedSessionRef = useRef<'morning' | 'evening' | null>(null)
  const { data: telegramStatus } = useGetTelegramStatusQuery(undefined, {
    skip: embedded,
  })
  const { data: telegramLinkData, isFetching: isTelegramLinkLoading } = useGetTelegramLinkUrlQuery(undefined, {
    skip: embedded,
  })
  const {
    data: todayEntry,
    refetch: refetchTodayEntry,
  } = useGetTodayEntryQuery(undefined, {
    skip: !hasAccess,
    pollingInterval: embedded ? 15000 : 10000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })
  const [submitDailyCycle] = useSubmitDailyCycleMutation()

  const questions = session === 'morning' ? MORNING_QUESTIONS : EVENING_QUESTIONS
  const affirmation = session === 'morning' ? MORNING_AFFIRMATION : EVENING_AFFIRMATION
  const currentQ = questions[step]
  const isLastStep = step === questions.length - 1
  const progress = Math.round((step / questions.length) * 100)
  const normalizedContent = useMemo(() => {
    const rawContent = todayEntry?.content
    return rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
      ? rawContent as Record<string, unknown>
      : null
  }, [todayEntry?.content])
  const hasMorningSession = Boolean(
    normalizedContent?.morning
    && typeof normalizedContent.morning === 'object'
    && !Array.isArray(normalizedContent.morning),
  )
  const hasEveningSession = Boolean(
    normalizedContent?.evening
    && typeof normalizedContent.evening === 'object'
    && !Array.isArray(normalizedContent.evening),
  )
  const sessionAlreadyCompleted = session === 'morning' ? hasMorningSession : hasEveningSession
  const shellClassName = embedded
    ? 'space-y-4'
    : 'mx-auto max-w-xl space-y-4 p-4'

  useEffect(() => {
    setSubmitted(sessionAlreadyCompleted)

    if (sessionAlreadyCompleted) {
      setAnswers({})
      setStep(0)
      lastSyncedSessionRef.current = session
      return
    }

    if (lastSyncedSessionRef.current !== session) {
      setAnswers({})
      setStep(0)
      lastSyncedSessionRef.current = session
    }
  }, [session, sessionAlreadyCompleted])

  if (!hasAccess) {
    return (
      <div className={embedded ? 'p-4' : 'flex min-h-[60vh] flex-col items-center justify-center p-6'}>
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="bg-[var(--accent-bg,var(--bg-secondary))] p-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))]">
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
              className="hero-cta-primary w-full py-3 text-sm font-medium"
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
      <div className={embedded ? 'p-4' : 'flex min-h-[60vh] flex-col items-center justify-center p-6'}>
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
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))]">
              {session === 'morning' ? '🌀 Мотивація на ранок' : '🌟 Афірмація на вечір'}
            </p>
            <p className="text-sm italic leading-relaxed text-[var(--text-secondary)]">
              "{affirmation}"
            </p>
          </div>

          {session === 'morning' && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))]">
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
              className="hero-cta-primary flex-1 py-3 text-sm font-medium"
              onClick={() => {
                if (embedded) {
                  onComplete?.()
                  return
                }
                navigate('/dashboard/ai-mentor')
              }}
            >
              {embedded ? 'Готово' : 'AI Ментор →'}
            </button>
            <button
              type="button"
              className="hero-cta-secondary px-4 py-3 text-sm"
              onClick={() => {
                if (embedded) {
                  onClose?.()
                  return
                }
                navigate('/dashboard')
              }}
            >
              {embedded ? 'Закрити' : 'Кабінет'}
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
        await submitDailyCycle({
          session,
          answers,
          date: new Date().toISOString(),
        }).unwrap()

        await refetchTodayEntry()
        setSubmitted(true)
        onComplete?.()
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
    <div className={shellClassName}>
      <div className="flex items-center gap-3">
        {!embedded && (
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="hero-cta-secondary px-3 py-1.5 text-xs"
          >
            ← Кабінет
          </button>
        )}
        {embedded && (
          <button
            type="button"
            onClick={() => onClose?.()}
            className="hero-cta-secondary px-3 py-1.5 text-xs"
          >
            Закрити ✕
          </button>
        )}
        <div className="flex gap-2">
          {(['morning', 'evening'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSession(s)
                setStep(0)
                setAnswers({})
                setSubmitted(false)
              }}
              className={[
                'rounded-xl px-3 py-1.5 text-xs font-semibold tracking-[0.04em] transition-all',
                session === s
                  ? 'border border-[rgba(var(--accent-soft-rgb),0.58)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.16),rgba(var(--accent-rgb),0.08))] text-[rgb(var(--accent-soft-rgb))] shadow-[0_0_18px_rgba(var(--accent-soft-rgb),0.14),inset_0_1px_0_rgba(255,255,255,0.08)]'
                  : 'border border-[rgba(var(--accent-rgb),0.26)] bg-[rgba(var(--accent-rgb),0.05)] text-[var(--text-secondary)] hover:border-[rgba(var(--accent-soft-rgb),0.34)] hover:bg-[rgba(var(--accent-rgb),0.12)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {s === 'morning' ? '🌞 Ранок' : '🌙 Вечір'}
            </button>
          ))}
        </div>
        {!embedded && (
          telegramLinkData?.url ? (
            <a
              href={telegramLinkData.url}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex"
            >
              <button
                type="button"
                className="hero-cta-secondary border-[rgba(var(--accent-soft-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.06)] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--accent-soft-rgb))]"
              >
                {telegramStatus?.botActive ? 'Відповідати в Telegram' : 'Підключити Telegram'}
              </button>
            </a>
          ) : (
            <button
              type="button"
              disabled={isTelegramLinkLoading}
              className="hero-cta-secondary ml-auto border-[rgba(var(--accent-soft-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.04)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] opacity-75"
            >
              Telegram...
            </button>
          )
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.08),rgba(255,255,255,0.015))] p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))] [text-shadow:0_0_16px_rgba(var(--accent-soft-rgb),0.18)]">
              {session === 'morning' ? 'РАНКОВІ ПИТАННЯ' : 'ВЕЧІРНЯ РЕФЛЕКСІЯ'}
              {' · '}
              {step + 1}/{questions.length}
            </p>
            <span className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.06)] px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
              День {trial?.currentDay ?? 1}
            </span>
          </div>
          <div className="h-1 rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[rgb(var(--accent-soft-rgb))] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {step + 1}. {currentQ.label}
            </p>
            {currentQ.id === 'identity' ? (
              <div className="mt-1 space-y-1">
                <p className="text-xs leading-relaxed text-[rgb(var(--accent-soft-rgb))]">
                  Опиши себе як нову версію — з позиції сили.
                </p>
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                  Наприклад: я топ-експерт, я власниця бренду...
                </p>
              </div>
            ) : currentQ.hint ? (
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                {currentQ.hint}
              </p>
            ) : null}
          </div>

          {currentQ.type === 'textarea' ? (
            <textarea
              rows={6}
              value={answers[currentQ.id] ?? ''}
              onChange={e => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))}
              placeholder={currentQ.placeholder}
              className="ios-input min-h-[152px] w-full resize-none px-4 py-3 text-sm placeholder-[var(--text-muted)]"
            />
          ) : (
            <input
              type="text"
              value={answers[currentQ.id] ?? ''}
              onChange={e => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))}
              placeholder={currentQ.placeholder}
              className="ios-input w-full px-4 py-3 text-sm placeholder-[var(--text-muted)]"
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
              className="hero-cta-secondary px-4 py-2.5 text-sm"
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
              className="hero-cta-primary flex-1 py-2.5 text-sm font-medium disabled:opacity-70 disabled:text-white/85"
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
                  ? 'bg-[rgb(var(--accent-soft-rgb))]'
                  : 'bg-[var(--border)]',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  )
}

export default function DailyCyclePage() {
  return <DailyCycleFlow />
}
