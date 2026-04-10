import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, CheckCircle2, Flame, ListTodo, Sparkles } from 'lucide-react'
import { ROUTES } from '@/config/routes'
import { useGetMyWeeklyReportQuery } from '@/features/ai-mentor/services/mentor.api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUpdateUserSettingsMutation } from '@/features/auth/services/auth.api'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'

type WeeklyActionState = {
  text: string
  createdAt: string
  completed: boolean
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start || !end) return 'Останній доступний тиждень'
  const from = new Date(start).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  const to = new Date(end).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  return `${from} — ${to}`
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item ?? '').trim()).filter(Boolean)
}

function sanitizeMentorCopy(value: string) {
  return value.replace(/AI Mentor/gi, 'ABsystem').replace(/AI-ментор/gi, 'ABsystem')
}

function getStoredWeeklyAction(user: unknown): WeeklyActionState | null {
  const uiSettings = user && typeof user === 'object' && 'uiSettings' in user
    ? (user as { uiSettings?: unknown }).uiSettings
    : null
  if (!uiSettings || typeof uiSettings !== 'object' || Array.isArray(uiSettings)) return null
  const report = (uiSettings as Record<string, unknown>).weeklyReport
  if (!report || typeof report !== 'object' || Array.isArray(report)) return null
  const nextAction = (report as Record<string, unknown>).nextAction
  if (!nextAction || typeof nextAction !== 'object' || Array.isArray(nextAction)) return null
  const text = typeof (nextAction as Record<string, unknown>).text === 'string'
    ? String((nextAction as Record<string, unknown>).text)
    : ''
  const createdAt = typeof (nextAction as Record<string, unknown>).createdAt === 'string'
    ? String((nextAction as Record<string, unknown>).createdAt)
    : ''
  const completed = (nextAction as Record<string, unknown>).completed === true
  return text.trim() ? { text, createdAt, completed } : null
}

function getCoachOffer(report: NonNullable<ReturnType<typeof useGetMyWeeklyReportQuery>['data']>, isTrialActive: boolean) {
  const analysis = report.analysis && typeof report.analysis === 'object' ? report.analysis : {}
  const upsellReady = analysis && typeof analysis.upsellReady === 'boolean' ? analysis.upsellReady : false
  const recommendedOffer = typeof analysis.recommendedOffer === 'string' ? sanitizeMentorCopy(analysis.recommendedOffer.trim()) : ''
  const upsellReasoning = typeof analysis.upsellReasoning === 'string' ? sanitizeMentorCopy(analysis.upsellReasoning.trim()) : ''
  const emotionalTone = typeof analysis.emotionalTone === 'string' ? analysis.emotionalTone.trim() : ''
  const engagementRhythm = typeof analysis.engagementRhythm === 'string' ? analysis.engagementRhythm.trim() : ''

  if (isTrialActive) {
    return {
      title: 'Що варто зробити далі',
      body: 'Ти вже зібрав достатньо сигналів, щоб не втратити ритм. Якщо хочеш продовжити цей темп без обриву, відкрий продовження доступу до ABsystem.',
      ctaLabel: 'Продовжити доступ до ABsystem',
      href: ROUTES.SUBSCRIPTION,
    }
  }

  if (upsellReady && recommendedOffer) {
    return {
      title: 'Що може підсилити тебе далі',
      body: `${recommendedOffer}. ${upsellReasoning || 'Це виглядає як природне продовження твого поточного темпу, а не як різкий новий старт.'}`,
      ctaLabel: 'Подивитись продукти',
      href: ROUTES.PRODUCTS,
    }
  }

  return {
    title: 'Що варто зробити далі',
    body: `Твій стан зараз виглядає як "${emotionalTone || 'стабільний'}", а ритм — "${engagementRhythm || 'ще формується'}". Не розширюй фокус: краще втримай один зрозумілий крок і доведи його до кінця.`,
    ctaLabel: 'Повернутись у щоденник',
    href: ROUTES.JOURNAL,
  }
}

export default function ProgressPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: report, isLoading, isFetching } = useGetMyWeeklyReportQuery(undefined, { skip: !user?.id })
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !user?.id })
  const [updateUserSettings, { isLoading: isSavingAction }] = useUpdateUserSettingsMutation()
  const [actionInput, setActionInput] = useState('')
  const [isActionEditorOpen, setIsActionEditorOpen] = useState(false)
  const [highlightedSection, setHighlightedSection] = useState<'report' | 'focus' | null>(null)
  const reportRef = useRef<HTMLDivElement | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const savedAction = useMemo(() => getStoredWeeklyAction(user), [user])

  if (isLoading || isFetching) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-5 md:px-6">
        <div className="glass-card border border-[rgba(92,136,255,0.14)] bg-[linear-gradient(180deg,rgba(37,70,144,0.24),rgba(9,16,34,0.92))] p-6">
          <p className="text-sm text-white/70">Формуємо тижневий звіт і збираємо підсумок твого ритму…</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-5 md:px-6">
        <div className="glass-card border border-[rgba(92,136,255,0.14)] bg-[linear-gradient(180deg,rgba(37,70,144,0.24),rgba(9,16,34,0.92))] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">Звіт тижня</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Ще замало даних для повного підсумку</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
            Закрий кілька ранкових або вечірніх сесій, виконай мікрозавдання і повернись сюди. Тоді тут буде не набір нулів, а реальний розбір твого тижня.
          </p>
          <Link to={ROUTES.CYCLE} className="nav-btn-next mt-5 inline-flex">
            Повернутися в цикл
          </Link>
        </div>
      </div>
    )
  }

  const metrics = report.metrics ?? {}
  const topInsights = normalizeList(report.topInsights)
  const growthAreas = normalizeList(report.growthAreas)
  const struggleAreas = normalizeList(report.struggleAreas)
  const analysis = report.analysis && typeof report.analysis === 'object' ? report.analysis : {}
  const retentionFactors = normalizeList(analysis.retentionFactors)
  const coachOffer = getCoachOffer(report, Boolean(trial?.isActive))

  const statCards = [
    { label: 'Бал тижня', value: report.overallScore ?? '—', icon: Sparkles },
    { label: 'Сесій', value: metrics.sessions ?? 0, icon: CheckCircle2 },
    { label: 'Задач виконано', value: `${metrics.tasksDone ?? 0}/${metrics.tasksTotal ?? 0}`, icon: ListTodo },
    { label: 'Streak', value: report.streakDays ?? 0, icon: Flame },
  ]

  const jumpToSection = (section: 'report' | 'focus') => {
    setHighlightedSection(section)
    const target = section === 'report' ? reportRef.current : focusRef.current
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => setHighlightedSection(current => (current === section ? null : current)), 1800)
  }

  const handleSaveTomorrowAction = async () => {
    const text = actionInput.trim()
    if (!text) return

    const uiSettings = user && typeof user === 'object' && 'uiSettings' in user
      ? ((user as { uiSettings?: Record<string, unknown> }).uiSettings ?? {})
      : {}

    const nextAction: WeeklyActionState = {
      text,
      createdAt: new Date().toISOString(),
      completed: false,
    }

    await updateUserSettings({
      settings: {
        ...uiSettings,
        weeklyReport: {
          ...(uiSettings?.weeklyReport && typeof uiSettings.weeklyReport === 'object' ? uiSettings.weeklyReport as Record<string, unknown> : {}),
          nextAction,
        },
      } as never,
    }).unwrap()

    setActionInput('')
    setIsActionEditorOpen(false)
    setHighlightedSection('focus')
    focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => setHighlightedSection(null), 1800)
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-5 md:px-6">
      <div className="space-y-4">
        <section className="glass-card border border-[rgba(92,136,255,0.16)] bg-[linear-gradient(180deg,rgba(42,77,155,0.4),rgba(11,19,37,0.94))] p-6 shadow-[0_28px_80px_rgba(8,15,32,0.38)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">Звіт тижня</p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold text-white">Подивись на свій тиждень без шуму</h1>
              <p className="mt-2 text-sm text-white/62">{formatDateRange(report.weekStart, report.weekEnd)}</p>
              <p className="mt-4 text-base leading-7 text-white/78">{sanitizeMentorCopy(report.summaryText || 'Тиждень уже зібрав достатньо сигналів, щоб побачити сильні місця, прогалини і наступний напрям.')}</p>
            </div>
            <div className="rounded-[22px] border border-[rgba(119,164,255,0.14)] bg-[rgba(255,255,255,0.04)] px-5 py-4 text-right">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/48">Фокус тижня</p>
              <p className="mt-2 max-w-[16rem] text-base font-semibold text-white">{sanitizeMentorCopy(report.nextWeekFocus || 'Повернути тижню один ясний центр ваги.')}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map(card => (
            <div key={card.label} className="glass-card border border-[rgba(92,136,255,0.12)] bg-[rgba(10,18,36,0.88)] p-4 shadow-[0_18px_44px_rgba(8,15,32,0.2)]">
              <div className="flex items-center gap-2 text-[rgb(var(--accent-soft-rgb))]">
                <card.icon className="h-4 w-4" />
                <span className="text-[11px] uppercase tracking-[0.2em]">{card.label}</span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div
            ref={reportRef}
            className={[
              'glass-card border bg-[rgba(10,18,36,0.9)] p-5 shadow-[0_22px_60px_rgba(8,15,32,0.24)] transition-all',
              highlightedSection === 'report'
                ? 'border-[rgba(119,164,255,0.26)] shadow-[0_0_0_1px_rgba(119,164,255,0.12),0_22px_60px_rgba(8,15,32,0.28)]'
                : 'border-[rgba(92,136,255,0.12)]',
            ].join(' ')}
          >
            <div className="flex items-center gap-2 text-[rgb(var(--accent-soft-rgb))]">
              <BarChart3 className="h-4 w-4" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">Що видно по тижню</p>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-white">Сильні сигнали</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {topInsights.length > 0 ? topInsights.map(item => (
                    <span key={item} className="rounded-full border border-emerald-400/14 bg-emerald-400/8 px-3 py-1.5 text-sm text-emerald-200">
                      {sanitizeMentorCopy(item)}
                    </span>
                  )) : <span className="text-sm text-white/55">Поки що сигналів замало.</span>}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-white">Що дало ріст</p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  {growthAreas.length > 0
                    ? `Тиждень найкраще тримався на цих сферах: ${growthAreas.join(', ')}.`
                    : 'Ріст уже є, але він ще не закріпився в окремих сферах достатньо чітко.'}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-white">Слабкі місця тижня</p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  {struggleAreas.length > 0
                    ? `Найбільше просідали: ${struggleAreas.join(', ')}.`
                    : 'Критичних провалів не видно, але ритм ще потребує стабілізації.'}
                </p>
              </div>
            </div>
          </div>

          <div
            ref={focusRef}
            className={[
              'glass-card border bg-[rgba(10,18,36,0.9)] p-5 shadow-[0_22px_60px_rgba(8,15,32,0.24)] transition-all',
              highlightedSection === 'focus'
                ? 'border-[rgba(119,164,255,0.26)] shadow-[0_0_0_1px_rgba(119,164,255,0.12),0_22px_60px_rgba(8,15,32,0.28)]'
                : 'border-[rgba(92,136,255,0.12)]',
            ].join(' ')}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">Погляд ментора</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-white">Що важливо зараз</p>
                <p className="mt-2 text-sm leading-6 text-white/74">
                  {sanitizeMentorCopy(typeof analysis.mainPainThisWeek === 'string' && analysis.mainPainThisWeek.trim()
                    ? analysis.mainPainThisWeek
                    : report.nextWeekFocus || 'Тримай один зрозумілий фокус і не дроби увагу.')}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-white">Що зробити далі</p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => jumpToSection('report')}
                    className="rounded-2xl border border-[rgba(92,136,255,0.12)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-left text-sm text-white/78 transition hover:border-[rgba(119,164,255,0.22)] hover:bg-[rgba(255,255,255,0.04)]"
                  >
                    Подивись слабкі місця тижня
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsActionEditorOpen(true)}
                    className="rounded-2xl border border-[rgba(92,136,255,0.12)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-left text-sm text-white/78 transition hover:border-[rgba(119,164,255,0.22)] hover:bg-[rgba(255,255,255,0.04)]"
                  >
                    Заплануй одну головну дію на завтра
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`${ROUTES.SUBSCRIPTION}?focus=absystem`)}
                    className="rounded-2xl border border-[rgba(92,136,255,0.12)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-left text-sm text-white/78 transition hover:border-[rgba(119,164,255,0.22)] hover:bg-[rgba(255,255,255,0.04)]"
                  >
                    Поверни ABsystem у свій ритм
                  </button>
                </div>
              </div>

              {savedAction ? (
                <div className="rounded-2xl border border-emerald-400/14 bg-emerald-400/8 px-4 py-3">
                  <p className="text-sm font-semibold text-white">Твоя дія на завтра</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">{savedAction.text}</p>
                </div>
              ) : null}

              {retentionFactors.length > 0 ? (
                <div>
                  <p className="text-sm font-semibold text-white">На що ти вже можеш спертися</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">{retentionFactors.join(', ')}.</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {isActionEditorOpen ? (
          <section className="glass-card border border-[rgba(92,136,255,0.14)] bg-[rgba(10,18,36,0.92)] p-5 shadow-[0_22px_60px_rgba(8,15,32,0.24)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">Одна дія на завтра</p>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Запиши один конкретний крок, який справді хочеш виконати завтра. Він збережеться в твоєму профілі й залишиться опорою для наступного входу.
            </p>
            <textarea
              value={actionInput}
              onChange={event => setActionInput(event.target.value)}
              rows={3}
              className="mt-4 w-full rounded-2xl border border-[rgba(92,136,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-[rgba(119,164,255,0.22)]"
              placeholder="Наприклад: о 09:30 закрити ранкову сесію і довести одне мікрозавдання до завершення."
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSaveTomorrowAction()}
                disabled={isSavingAction || actionInput.trim().length === 0}
                className="nav-btn-next disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingAction ? 'Зберігаємо...' : 'Зберегти дію'}
              </button>
              <button type="button" onClick={() => setIsActionEditorOpen(false)} className="nav-btn-back">
                Скасувати
              </button>
            </div>
          </section>
        ) : null}

        <section className="glass-card border border-[rgba(92,136,255,0.14)] bg-[linear-gradient(180deg,rgba(37,70,144,0.22),rgba(9,16,34,0.94))] p-5 shadow-[0_22px_60px_rgba(8,15,32,0.24)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">{coachOffer.title}</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/76">{sanitizeMentorCopy(coachOffer.body)}</p>
          <Link to={coachOffer.href} className="nav-btn-next mt-5 inline-flex">
            {coachOffer.ctaLabel}
          </Link>
        </section>
      </div>
    </main>
  )
}
