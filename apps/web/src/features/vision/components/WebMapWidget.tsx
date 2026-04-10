import { ROUTES } from '@/config/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGetWebMapQuery } from '@/features/web-map/services/web-map.api'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
import { Progress } from '@/ui'

function getCurrentMonthLabel() {
  return new Date().toLocaleDateString('uk-UA', { month: 'long' })
}

export default function WebMapWidget() {
  const { user } = useAuth()
  const { navigateTo } = useSmartNavigation()
  const { data: map } = useGetWebMapQuery(undefined, { skip: !user?.id })
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(user?.id ?? '', { skip: !user?.id })

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const currentMonthPlan = map?.months.find(item => item.month === currentMonth && item.year === currentYear) ?? null
  const mainGoal = map?.goals.find(goal => goal.id === map.mainGoalId) ?? map?.goals.find(goal => goal.isMain) ?? null
  const behindCount = map?.goals.filter(goal => goal.status === 'behind').length ?? 0

  const hasWheel = Boolean(latestWheel)
  const hasMap = Boolean(map && map.status !== 'draft')

  return (
    <button
      type="button"
      onClick={() => navigateTo(hasWheel ? ROUTES.VISION : ROUTES.WHEEL, { requiresAuth: true })}
      className="mt-4 w-full rounded-2xl border border-[var(--border-primary)] bg-[rgba(10,16,31,0.82)] p-3 text-left transition-colors hover:border-[rgba(var(--accent-rgb),0.26)] hover:bg-[rgba(12,19,36,0.94)]"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
        Точка Б
      </div>

      {!hasWheel ? (
        <div className="mt-2 space-y-2">
          <div className="text-sm font-semibold text-[var(--text-primary)]">Спочатку пройди колесо</div>
          <div className="text-xs leading-5 text-[var(--text-muted)]">
            Перший крок після реєстрації — колесо балансу. Потім AI збере річну карту і вже після цього цикл піде по ланцюгу стан → ціль → вибір → рішення → дія.
          </div>
          <div className="text-[11px] font-medium text-[var(--accent)]">Відкрити колесо →</div>
        </div>
      ) : !hasMap ? (
        <div className="mt-2 space-y-2">
          <div className="text-sm font-semibold text-[var(--text-primary)]">Сформуй WEB-Карту 2026</div>
          <div className="text-xs leading-5 text-[var(--text-muted)]">
            Колесо вже є. Наступний крок — зібрати Точка Б, головну ціль року та фокус по місяцях.
          </div>
          <div className="text-[11px] font-medium text-[var(--accent)]">Відкрити Точка Б →</div>
        </div>
      ) : (
        <div className="mt-2 space-y-3">
          <div>
            <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{mainGoal?.title ?? 'Головна ціль формується'}</div>
            <div className="mt-1 truncate text-xs text-[var(--text-muted)]">
              Фокус {getCurrentMonthLabel()}: {currentMonthPlan?.focus ?? 'онови фокус місяця'}
            </div>
          </div>

          <Progress value={mainGoal?.progress ?? 0} size="sm" />

          {behindCount > 0 ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/8 px-2.5 py-1 text-[11px] text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Відстає: {behindCount}
            </div>
          ) : (
            <div className="text-[11px] text-[var(--text-muted)]">Місячний контур активний</div>
          )}
        </div>
      )}
    </button>
  )
}
