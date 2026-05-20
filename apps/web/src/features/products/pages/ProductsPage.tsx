import { ROUTES } from '@/config/routes'
import { useAccess } from '@/features/auth/hooks/useAccess'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useGetMyProductsQuery } from '@/features/products/services/products.api'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { GlassCard } from '@/ui'
import {
  ArrowRight,
  Bot,
  Clock3,
  Gift,
  Lock,
  Sparkles,
} from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'accent' | 'success' | 'warning'
  children: React.ReactNode
}) {
  const className = {
    neutral: 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)]',
    accent: 'border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.12)] text-[var(--text-primary)]',
    success: 'border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.12)] text-[rgb(134,239,172)]',
    warning: 'border-[rgba(250,204,21,0.32)] bg-[rgba(250,204,21,0.12)] text-[rgb(254,240,138)]',
  }[tone]

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  )
}

function FeaturePill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
      {label}
    </span>
  )
}

function UserProductCard({
  icon,
  title,
  subtitle,
  status,
  statusTone,
  body,
  meta,
  features,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  warning,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  status: string
  statusTone: 'neutral' | 'accent' | 'success' | 'warning'
  body: string
  meta?: string
  features: string[]
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  warning?: string
}) {
  return (
    <div className="dashboard-liquid-card--soft overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-5">
        <div className="flex min-w-0 items-start gap-4">
          <div className="btn-icon h-12 w-12 text-[rgb(var(--accent-soft-rgb))]">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
              <StatusBadge tone={statusTone}>{status}</StatusBadge>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
            {meta ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
                {meta}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        <p className="text-sm leading-7 text-[var(--text-secondary)]">{body}</p>

        <div className="flex flex-wrap gap-2">
          {features.map((feature) => (
            <FeaturePill key={feature} label={feature} />
          ))}
        </div>

        {warning ? (
          <div className="rounded-2xl border border-[rgba(250,204,21,0.22)] bg-[rgba(250,204,21,0.08)] px-4 py-3 text-sm text-[rgb(254,240,138)]">
            {warning}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={onPrimary}
            className="hero-cta-primary inline-flex items-center gap-2"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </button>

          {secondaryLabel && onSecondary ? (
            <button
              type="button"
              onClick={onSecondary}
              className="hero-cta-secondary inline-flex items-center gap-2"
            >
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ProducerProductCard({
  title,
  description,
  status,
  isLocked,
  modules,
  onOpen,
}: {
  title: string
  description?: string | null
  status: string
  isLocked: boolean
  modules: string[]
  onOpen: () => void
}) {
  return (
    <div className="dashboard-liquid-card--soft overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
            <StatusBadge tone={isLocked ? 'neutral' : 'accent'}>{status}</StatusBadge>
          </div>
          <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
            {description || 'Системна обгортка над продуктом, яка поєднує модулі, логіку доступу і сценарії проходження.'}
          </p>
        </div>
        {isLocked ? <Lock className="mt-1 h-4 w-4 text-amber-300" /> : null}
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap gap-2">
          {modules.length > 0 ? (
            modules.map((module) => <FeaturePill key={module} label={module} />)
          ) : (
            <>
              <FeaturePill label="Колесо балансу" />
              <FeaturePill label="Ранкові питання" />
              <FeaturePill label="Вечірні питання" />
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
            isLocked
              ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
              : 'hero-cta-primary'
          }`}
        >
          {isLocked ? 'Оформити доступ' : 'Відкрити продукт'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { appState: sessionStatus } = useSessionOrchestrator()
  const shouldSkipProtectedQueries = sessionStatus !== 'authenticated'
  const { plan, isPaid } = useAccess()
  const { data: myProducts = [] } = useGetMyProductsQuery(undefined, {
    skip: shouldSkipProtectedQueries,
  })
  const { counts, accessControl, subscription } = useSystemState()
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !user?.id })

  const currentRole = user?.role ?? 'USER'
  const isProducerView = currentRole === 'EXPERT' || currentRole === 'SUPERADMIN'
  const isSuperAdmin = currentRole === 'SUPERADMIN'
  const hasLeadMagnet = Boolean(
    accessControl?.hasLeadMagnet
      || accessControl?.currentFlow === 'mentor'
      || (trial?.currentDay ?? 0) > 0,
  )

  const mentorTrialActive = Boolean(trial?.isActive)
  const mentorTrialExpired = !trial?.isActive && !trial?.isPaid && (trial?.currentDay ?? 0) > 0
  const mentorDay = trial?.currentDay ?? 0
  const trialEndingSoon = mentorTrialActive && mentorDay >= 6 && !trial?.isPaid
  const mentorProgressLabel = trial?.isPaid
    ? 'Premium активний'
    : mentorTrialActive
      ? `День ${mentorDay} із 7`
      : mentorTrialExpired
        ? 'Тріал завершено'
        : 'Ще не активовано'

  const producerProducts = useMemo(() => {
    if (myProducts.length > 0) return myProducts

    return [
      {
        id: 'ai-mentor-fallback',
        title: 'ABsystem',
        name: 'ABsystem',
        description: 'Асистент-обгортка над усіма продуктами. Поки що активний модуль ABsystem із колесом балансу та ранковим/вечірнім циклом.',
        status: 'published',
        modules: ['Колесо балансу', 'Ранкові питання', 'Вечірні питання'],
      },
    ]
  }, [myProducts])

  if (isProducerView) {
    return (
      <div className="space-y-6">
        <div className="dashboard-liquid-card--soft p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
                Мої продукти
              </p>
              <h1 className="mt-2 text-3xl font-black text-[var(--text-primary)]">Продуктова лінійка експерта</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                Тут зібрані всі продукти, які ти показуєш як продюсер. Зараз основна обгортка — ABsystem,
                що поєднує колесо балансу, ранкові та вечірні питання в один маршрут користувача.
              </p>
            </div>

            {isSuperAdmin ? (
              <button
                type="button"
                onClick={() => navigate(ROUTES.PRODUCT_CREATION)}
                className="hero-cta-primary inline-flex items-center gap-2"
              >
                Створити продукт
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="dashboard-liquid-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Продукти</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{producerProducts.length}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Усього в лінійці</p>
          </div>
          <div className="dashboard-liquid-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Підписники</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{counts.subscribedProducts}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Активні доступи</p>
          </div>
          <div className="dashboard-liquid-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Шаблони</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{counts.templates}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Підготовлені сценарії</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {producerProducts.map((product) => {
            const normalizedStatus = plan === 'paid' || currentRole === 'SUPERADMIN' ? 'Активний' : plan === 'trial' ? 'Тріал' : 'Locked'
            const isLocked = normalizedStatus === 'Locked'

            return (
              <ProducerProductCard
                key={product.id}
                title={product.title || product.name}
                description={product.description}
                status={normalizedStatus}
                isLocked={isLocked}
                modules={product.modules ?? []}
                onOpen={() => navigate(isLocked ? ROUTES.SUBSCRIPTION : ROUTES.AI_MENTOR)}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dashboard-liquid-card--soft p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
              Мої підписки
            </p>
            <h1 className="mt-2 text-3xl font-black text-[var(--text-primary)]">Твої продукти Starway</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              Тут зібрано все, що ти вже проходиш: стартовий практикум і ABsystem. Структура спеціально проста —
              як у Duolingo: видно, де ти вже всередині, що активне зараз і який наступний крок.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={hasLeadMagnet ? 'success' : 'neutral'}>
              {hasLeadMagnet ? 'Практикум відкрито' : 'Практикум доступний'}
            </StatusBadge>
            <StatusBadge tone={trial?.isPaid ? 'success' : mentorTrialActive ? 'accent' : mentorTrialExpired ? 'warning' : 'neutral'}>
              {mentorProgressLabel}
            </StatusBadge>
          </div>
        </div>
      </div>

      {(trialEndingSoon || mentorTrialExpired) && (
        <div className="dashboard-liquid-card p-5">
          <div className="flex items-start gap-3">
            <div className="btn-icon h-11 w-11 text-[rgb(var(--accent-soft-rgb))]">
              <Clock3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {trialEndingSoon ? 'Завтра останній день тріалу ABsystemа' : 'Тріал ABsystemа завершився'}
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                {trialEndingSoon
                  ? 'Щоб не втратити темп після 7 дня, краще заздалегідь відкрити підписку. Усі твої результати, streak і записи залишаться на місці.'
                  : 'Усі результати, прогрес, ранкові й вечірні записи вже збережені. Коли підключиш підписку, система просто продовжить із цього місця.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.SUBSCRIPTION)}
                  className="hero-cta-primary inline-flex items-center gap-2"
                >
                  Відкрити підписку
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.AI_MENTOR)}
                  className="hero-cta-secondary inline-flex items-center gap-2"
                >
                  Подивитись прогрес
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <UserProductCard
          icon={<Gift className="h-5 w-5" />}
          title="Практикум (free)"
          subtitle="5 точок опори для старту системи"
          status={hasLeadMagnet ? 'Пройдено' : 'Доступно'}
          statusTone={hasLeadMagnet ? 'success' : 'accent'}
          meta={hasLeadMagnet ? 'Стартова точка вже зафіксована' : 'Можна пройти в будь-який момент'}
          body={
            hasLeadMagnet
              ? 'Ти вже пройшов стартовий вхід у систему. Результат збережений і може бути точкою опори для наступного циклу або повернення в практику.'
              : 'Це безкоштовний стартовий маршрут, щоб визначити поточний стан і увійти в ритм без перевантаження.'
          }
          features={['5 точок опори', 'Стартова точка', 'Перший фокус']}
          primaryLabel={hasLeadMagnet ? 'Відкрити практикум' : 'Почати практикум'}
          onPrimary={() => navigate(ROUTES.COURSES)}
          secondaryLabel="Деталі"
          onSecondary={() => navigate(ROUTES.COURSES)}
        />

        <UserProductCard
          icon={<Bot className="h-5 w-5" />}
          title="ABsystem"
          subtitle="Колесо балансу, ранкові та вечірні питання"
          status={trial?.isPaid ? 'Premium' : mentorTrialActive ? 'Тріал активний' : mentorTrialExpired ? 'На паузі' : 'Готовий до старту'}
          statusTone={trial?.isPaid ? 'success' : mentorTrialActive ? 'accent' : mentorTrialExpired ? 'warning' : 'neutral'}
          meta={trial?.isPaid ? 'Без обмежень' : mentorTrialActive ? `День ${mentorDay} із 7` : mentorTrialExpired ? 'Прогрес збережено' : 'Поки не активовано'}
          body={
            mentorTrialExpired
              ? 'Твій тріал завершився, але вся історія проходження, результати колеса балансу, ранкові та вечірні сесії збережені. Після оплати підписки ти продовжиш без втрати прогресу.'
              : mentorTrialActive
                ? 'ABsystem уже веде тебе по циклу дня. Тут зберігаються колесо балансу, ранкові питання, вечірні підсумки й наступні кроки.'
                : 'ABsystem відкриває головний маршрут системи: діагностика, щоденні check-in сесії та персональний рух без хаосу.'
          }
          features={['Колесо балансу', 'Ранкові питання', 'Вечірні питання']}
          primaryLabel={mentorTrialActive || trial?.isPaid ? 'Продовжити ABsystem' : 'Активувати доступ'}
          onPrimary={() => navigate(mentorTrialActive || trial?.isPaid ? ROUTES.AI_MENTOR : ROUTES.SUBSCRIPTION)}
          secondaryLabel={mentorTrialActive || trial?.isPaid ? 'Відкрити щоденний цикл' : 'Плани підписки'}
          onSecondary={() => navigate(mentorTrialActive || trial?.isPaid ? ROUTES.CYCLE : ROUTES.SUBSCRIPTION)}
          warning={
            trialEndingSoon
              ? 'Завтра 7 день тріалу. Щоб продовжити без паузи, краще оформити підписку вже зараз.'
              : undefined
          }
        />
      </div>

      <GlassCard className="p-5">
        <div className="flex items-start gap-3">
          <div className="btn-icon h-11 w-11 text-[rgb(var(--accent-soft-rgb))]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Прогрес не зникає</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              Навіть якщо підписка не активна, система не видаляє твої результати. Колесо балансу, ранкові та вечірні відповіді,
              streak і наступні кроки лишаються збереженими, щоб ти міг повернутися і продовжити без старту з нуля.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <FeaturePill label={subscription?.isActive || isPaid ? 'Підписка активна' : 'Можна продовжити пізніше'} />
              <FeaturePill label={mentorTrialExpired ? 'Прогрес на паузі' : 'Прогрес синхронізований'} />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
