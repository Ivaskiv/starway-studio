import { ROUTES } from '@/config/routes'
import { useGetMyWeeklyReportQuery } from '@/features/ai-mentor/services/mentor.api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDailyCycle } from '@/features/daily-cycle/hooks/useDailyCycle'
import BottomNavBar from '@/features/dashboard/components/BottomNavBar'
import ExpertDashboardView from '@/features/dashboard/components/ExpertDashboardView'
import HeroCard from '@/features/dashboard/components/HeroCard'
import RhythmCard from '@/features/dashboard/components/RhythmCard'
import StatsRow from '@/features/dashboard/components/StatsRow'
import StepGrid from '@/features/dashboard/components/StepGrid'
import WeeklyReportCard from '@/features/dashboard/components/WeeklyReportCard'
import type { MarketingCardConfig } from '@/features/dashboard/types/dashboard.types'
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'
import { useLocation } from 'react-router-dom'

const STEP_LABELS: Record<string, string> = {
  wheel: 'Колесо балансу',
  morning: 'Ранок',
  tasks: 'Мікрозавдання',
  evening: 'Вечір',
  analysis: 'Аналіз дня',
  done: 'Завершено',
}

function formatInsight(
  currentStep: string,
  pendingTasks: number,
  hasUnfinishedYesterday: boolean,
) {
  if (hasUnfinishedYesterday) {
    return 'Учорашній цикл ще відкритий. Закрий його спочатку, щоб сьогоднішній ритм зібрався без розриву.'
  }
  if (currentStep === 'tasks' && pendingTasks > 0) {
    return `У тебе ${pendingTasks} мікрозавдань у фокусі. Сьогодні важливо не добити все, а не втратити ритм.`
  }
  if (currentStep === 'evening') {
    return 'День уже майже закритий. Зафіксуй, що спрацювало, і дай системі зібрати чистий підсумок без шуму.'
  }
  return 'Тримай один зрозумілий маршрут: колесо, ранок, дія, вечір. Так прогрес відчувається щодня, а не раз на тиждень.'
}

function resolveProducerSection(pathname: string, search: string) {
  const params = new URLSearchParams(search)
  const section = params.get('section')?.trim()

  if (section) return section
  if (pathname === '/dashboard/students') return 'students'
  if (pathname === '/dashboard/leadmagnet') return 'leadmagnet'
  if (pathname === '/dashboard/ai-seo' || pathname === '/dashboard/ads') return 'ai-seo'
  if (pathname === '/dashboard/admin/studio') return 'content'
  return 'overview'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { pathname, search } = useLocation()
  const role = String(user?.role ?? 'USER').toUpperCase()
  const isProducerView = ['EXPERT', 'ADMIN', 'SUPERADMIN'].includes(role)
  const producerSection = resolveProducerSection(pathname, search)
  const { journeySteps, dayNumber, currentStep, weeklyReportAvailable } = useUserProgress()
  const { data: summary } = useGetSummaryQuery(undefined, { skip: !user?.id })
  const { data: weeklyReport } = useGetMyWeeklyReportQuery(undefined, { skip: !user?.id || isProducerView })
  const { data: wheel } = useGetLatestWheelAssessmentQuery(user?.id ?? '', { skip: !user?.id })
  const { tasks } = useMicroTasks({ skip: !user?.id })
  const cycleState = useDailyCycle(user?.id ?? '')

  if (isProducerView) {
    return (
      <ExpertDashboardView
        currentRole={role}
        displayName={user?.firstName || user?.name || 'Expert'}
        todayLabel={new Date().toLocaleDateString('uk-UA')}
        section={producerSection}
        metrics={[]}
        producerProducts={[]}
        generatedCards={{}}
        marketingCards={[] as MarketingCardConfig[]}
        onGenerateCard={() => {}}
      />
    )
  }

  const displayName = user?.firstName || user?.name || 'Ти'
  const todayTasks = tasks.filter(task => task.status !== 'COMPLETED')
  const stats = [
    { label: 'Активний крок', value: STEP_LABELS[currentStep] ?? 'Ранок' },
    { label: 'Відкриті дії', value: String(todayTasks.length) },
    { label: 'Останнє колесо', value: wheel?.createdAt?.slice(0, 10) ?? '—' },
    { label: 'Тижневий score', value: String(weeklyReport?.overallScore ?? '—') },
  ]

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <HeroCard
          displayName={displayName}
          dayNumber={dayNumber}
          insight={formatInsight(currentStep, todayTasks.length, cycleState.hasUnfinishedYesterday)}
        />

        <StepGrid journeySteps={journeySteps} />

        <div className="grid gap-3 lg:grid-cols-2">
          <RhythmCard
            xpTotal={summary?.xp.total ?? 0}
            streak={summary?.streak.current ?? 0}
            level={summary?.xp.level ?? 1}
          />
          <WeeklyReportCard
            title={weeklyReportAvailable ? 'Тижневий звіт доступний' : 'Звіт відкриється після 7 днів'}
            summary={weeklyReport?.summaryText?.trim() || 'Щойно назбирається достатньо даних, тут з’явиться короткий weekly insight із підсумком дня.'}
            href={ROUTES.PROGRESS}
          />
        </div>

        <StatsRow stats={stats} />

        <BottomNavBar
          backLabel="Назад"
          centerText={`День ${dayNumber}`}
          nextLabel="Щоденник"
          nextHref={ROUTES.JOURNAL}
        />
      </div>
    </main>
  )
}
