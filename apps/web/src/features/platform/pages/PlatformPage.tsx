import { Link, useLocation } from 'react-router-dom'

import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import {
  useGeneratePlatformWeeklyReportMutation,
  useGetPlatformAccessQuery,
  useGetPlatformCycleHistoryQuery,
  useGetPlatformMonthlyReportQuery,
  useGetPlatformTodayCycleQuery,
  useGetPlatformWeeklyReportQuery,
  useGetPlatformWheelQuery,
  type PlatformAccess,
} from '../services/platform.api'

const PAID_ONBOARDING_STEPS = [
  { hour: '0-12 год', title: 'Підтвердити доступ', text: 'Перевірити профіль, Telegram і точку входу.' },
  { hour: '12-24 год', title: 'Колесо і фокус', text: 'Оновити колесо, знайти слабку сферу і вибрати фокус.' },
  { hour: '24-48 год', title: 'Щоденний цикл', text: 'Запустити ранковий цикл, мікродію і вечірнє закриття.' },
  { hour: '48-72 год', title: 'Перший звіт', text: 'Зібрати перший weekly snapshot і наступний крок.' },
] as const

function isPlatformSection(pathname: string, section: string) {
  return pathname === `/platform/${section}` || pathname === `/platform/${section}/`
}

function PlatformNav() {
  const links = [
    ['/platform', 'Огляд'],
    ['/platform/cycle', 'Цикл'],
    ['/platform/wheel', 'Колесо'],
    ['/platform/reports', 'Звіти'],
    ['/platform/onboarding', '72 год'],
  ] as const

  return (
    <nav className="flex flex-wrap gap-2">
      {links.map(([to, label]) => (
        <Link
          key={to}
          to={to}
          className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.06em] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

function AccessStrip({ access }: { access?: PlatformAccess }) {
  const trialLabel = access?.status === 'TRIAL_ACTIVE'
    ? `Trial день ${access.trialDay ?? 1} · ${access.daysLeft ?? 0} д left`
    : access?.status ?? 'Завантаження'

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">Platform access</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <strong className="text-lg text-[var(--color-text-primary)]">{trialLabel}</strong>
        <span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
          {access?.canAccessPaidModules ? 'Paid modules on' : access?.canAccessPlatform ? 'Platform on' : 'Locked'}
        </span>
      </div>
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}

export default function PlatformPage() {
  const { pathname } = useLocation()
  const { canRunProtectedQueries } = useSessionOrchestrator()
  const skip = !canRunProtectedQueries
  const { data: access } = useGetPlatformAccessQuery(undefined, { skip })
  const { data: today } = useGetPlatformTodayCycleQuery(undefined, { skip })
  const { data: history = [] } = useGetPlatformCycleHistoryQuery(7, { skip })
  const { data: wheel } = useGetPlatformWheelQuery(undefined, { skip })
  const { data: weekly } = useGetPlatformWeeklyReportQuery(undefined, { skip })
  const { data: monthly } = useGetPlatformMonthlyReportQuery(undefined, { skip })
  const [generateWeekly, weeklyGeneration] = useGeneratePlatformWeeklyReportMutation()

  const showCycle = isPlatformSection(pathname, 'cycle')
  const showWheel = isPlatformSection(pathname, 'wheel')
  const showReports = isPlatformSection(pathname, 'reports')
  const showOnboarding = isPlatformSection(pathname, 'onboarding')
  const showOverview = !showCycle && !showWheel && !showReports && !showOnboarding

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 py-6">
      <header className="flex flex-col gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">Starway platform · Level 2</p>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Платформа щоденного руху</h1>
        <PlatformNav />
      </header>

      <AccessStrip access={access} />

      {showOverview ? (
        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Цикли за 7 днів" value={weekly?.metrics.dailyEntries ?? 0} />
          <MetricCard label="Баланс колеса" value={wheel?.analytics.balanceIndex ?? 0} />
          <MetricCard label="Trial left" value={access?.daysLeft ?? '—'} />
        </section>
      ) : null}

      {showCycle ? (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Daily Cycle</h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Сьогодні: {today?.empty ? 'ще немає запису' : 'запис знайдено'}</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Історія: {history.length} записів</p>
        </section>
      ) : null}

      {showWheel ? (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Wheel</h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Оцінок: {wheel?.analytics.totalAssessments ?? 0}</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Trend: {wheel?.analytics.trend ?? 'stable'}</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Наступне колесо: {wheel?.cooldown.nextWheelAt ?? 'доступно зараз'}</p>
        </section>
      ) : null}

      {showReports ? (
        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Weekly AI</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              {(weekly?.summary ?? []).map(item => <li key={item}>{item}</li>)}
            </ul>
            <button
              className="mt-4 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] disabled:opacity-50"
              disabled={weeklyGeneration.isLoading}
              onClick={() => void generateWeekly()}
            >
              {weeklyGeneration.isLoading ? 'Генеруємо…' : 'Згенерувати AI weekly'}
            </button>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Monthly</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              {(monthly?.summary ?? []).map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </section>
      ) : null}

      {showOnboarding ? (
        <section className="grid gap-3 md:grid-cols-2">
          {PAID_ONBOARDING_STEPS.map(step => (
            <article key={step.hour} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">{step.hour}</p>
              <h2 className="mt-2 text-base font-semibold text-[var(--color-text-primary)]">{step.title}</h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{step.text}</p>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  )
}
