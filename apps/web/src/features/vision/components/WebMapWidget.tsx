import { ROUTES } from '@/config/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { dashboardDesignSystem } from '@/styles/design-system'
import { useGetWebMapQuery } from '@/features/web-map/services/web-map.api'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
import { Progress } from '@/ui'

function getCurrentMonthLabel() {
  return new Date().toLocaleDateString('uk-UA', { month: 'long' })
}

export default function WebMapWidget() {
  const visionTokens = dashboardDesignSystem.vision
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
      className={visionTokens.widgetButton}
    >
      <div className={visionTokens.widgetLabel}>
        Точка Б
      </div>

      {!hasWheel ? (
        <div className="mt-2 space-y-2">
          <div className={visionTokens.widgetTitle}>Спочатку пройди колесо</div>
          <div className={visionTokens.widgetText}>
            Перший крок після реєстрації — колесо балансу. Потім AI збере річну карту і вже після цього цикл піде по ланцюгу стан → ціль → вибір → рішення → дія.
          </div>
          <div className={visionTokens.widgetLink}>Відкрити колесо →</div>
        </div>
      ) : !hasMap ? (
        <div className="mt-2 space-y-2">
          <div className={visionTokens.widgetTitle}>Сформуй WEB-Карту 2026</div>
          <div className={visionTokens.widgetText}>
            Колесо вже є. Наступний крок — зібрати Точка Б, головну ціль року та фокус по місяцях.
          </div>
          <div className={visionTokens.widgetLink}>Відкрити Точка Б →</div>
        </div>
      ) : (
        <div className="mt-2 space-y-3">
          <div>
            <div className={visionTokens.widgetTitle}>{mainGoal?.title ?? 'Головна ціль формується'}</div>
            <div className={visionTokens.widgetText}>
              Фокус {getCurrentMonthLabel()}: {currentMonthPlan?.focus ?? 'онови фокус місяця'}
            </div>
          </div>

          <Progress value={mainGoal?.progress ?? 0} size="sm" />

          {behindCount > 0 ? (
            <div className={visionTokens.widgetBadge}>
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Відстає: {behindCount}
            </div>
          ) : (
            <div className={visionTokens.widgetMeta}>Місячний контур активний</div>
          )}
        </div>
      )}
    </button>
  )
}
