// frontend/src/features/auth/components/MentorFlowCard.tsx
import { ROUTES } from '@/config/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUserState } from '@/features/auth/hooks/useUserState'
import { useGetTelegramLinkUrlQuery } from '@/features/auth/services/auth.api'
import { useStartFlowMutation } from '@/features/auth/services/user-state.api'
import { useGetWebMapQuery } from '@/features/web-map/services/web-map.api'
import { hasPaidAccess } from '@/features/user/types/user.types'
import { Button } from '@/ui'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'
import { EmailCompletionCard } from './EmailCompletionCard'

interface Props {
  onRequireAuth?: () => void
  autoRedirectWheel?: boolean
  onContinueToNextStep?: () => void
}

interface ReconnectTelegramUIProps {
  botActive: boolean
  hasActiveSubscription: boolean
  isLoading: boolean
  onContinueToNextStep?: () => void
  telegramFlowUrl: string | null
  telegramLinked: boolean
}

function ReconnectTelegramUI({
  botActive,
  hasActiveSubscription,
  isLoading,
  onContinueToNextStep,
  telegramFlowUrl,
  telegramLinked,
}: ReconnectTelegramUIProps) {
  const title = telegramLinked && !botActive ? 'Підключити знову' : 'Підключити Telegram'
  const description = telegramLinked && !botActive
    ? 'Схоже, ти видалив бота. Підключи знову — продовжиш з того місця'
    : 'Підключи Telegram щоб продовжити'

  return (
    <div className="card-surface liquid-glass mx-auto max-w-xl p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
        Крок підключення
      </p>
      <h2 className="mt-3 text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/65">
        {description}
      </p>
      {hasActiveSubscription && (
        <div className="mt-4 rounded-2xl border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] px-4 py-3 text-sm text-white/78">
          Підписка активна. Після підключення Telegram можна перейти далі.
        </div>
      )}
      <div className="mt-6">
        {telegramFlowUrl ? (
          <a href={telegramFlowUrl} target="_blank" rel="noreferrer" className="inline-flex">
            <Button disabled={isLoading}>{title}</Button>
          </a>
        ) : (
          <Button disabled={isLoading}>Завантаження Telegram...</Button>
        )}
      </div>
      {hasActiveSubscription && onContinueToNextStep && (
        <div className="mt-4">
          <Button onClick={onContinueToNextStep} variant="outline">
            Продовжити
          </Button>
        </div>
      )}
    </div>
  )
}

export function MentorFlowCard({ onRequireAuth, autoRedirectWheel = true, onContinueToNextStep }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const {
    isAuthenticated,
    state,
    step,
    emailCompletionRequired,
    isLoading,
    refetch,
    telegramLinked,
    botActive,
  } = useUserState()
  const [startFlow, { isLoading: isStarting }] = useStartFlowMutation()
  const { data: webMap } = useGetWebMapQuery(undefined, {
    skip: !isAuthenticated || emailCompletionRequired,
  })

  const { data: telegramLinkData, isFetching: isTelegramLinkLoading } = useGetTelegramLinkUrlQuery(undefined, {
    skip: !isAuthenticated || emailCompletionRequired,
  })
  // Telegram linking must stay on the canonical /start deeplink with payload.
  // Replacing it with a custom path breaks the actual bot subscription/link flow.
  const telegramFlowUrl = telegramLinkData?.url ?? null
  const hasActiveSubscription = hasPaidAccess(user ?? null)
  const linkButtonText = telegramLinked && !botActive
    ? 'Підключити знову'
    : 'Підключити Telegram'

  useEffect(() => {
    if (!isAuthenticated || emailCompletionRequired || !autoRedirectWheel) return
    if (step !== 'WHEEL') return
    if (location.pathname === ROUTES.WHEEL_START) return
    navigate(ROUTES.WHEEL_START, { replace: true })
  }, [autoRedirectWheel, emailCompletionRequired, isAuthenticated, location.pathname, navigate, step])

  if (!isAuthenticated) {
    return null
  }

  if (emailCompletionRequired) {
    return <EmailCompletionCard onCompleted={async () => { await refetch() }} />
  }

  if (isLoading) {
    return (
      <div className="card-surface liquid-glass mx-auto max-w-xl p-6 text-center text-white/70">
        Завантажуємо ваш наступний крок...
      </div>
    )
  }

  if (isAuthenticated && (!telegramLinked || !botActive)) {
    return (
      <ReconnectTelegramUI
        botActive={botActive}
        hasActiveSubscription={hasActiveSubscription}
        isLoading={isTelegramLinkLoading}
        onContinueToNextStep={onContinueToNextStep}
        telegramFlowUrl={telegramFlowUrl}
        telegramLinked={telegramLinked}
      />
    )
  }

  const handleStart = async () => {
    if (step === 'START_FLOW') {
      navigate(ROUTES.WHEEL_START, { replace: true })
      return
    }

    try {
      const result = await startFlow().unwrap()
      await refetch()
      if (result.step === 'WHEEL') {
        navigate(ROUTES.WHEEL_START, { replace: true })
        return
      }
    } catch (error: unknown) {
      const apiError =
        typeof error === 'object' && error !== null && 'data' in error
          ? (error as { data?: { error?: string } }).data
          : undefined

      const message = apiError?.error === 'INVALID_TRANSITION'
        ? 'Цей крок зараз недоступний'
        : 'Не вдалося запустити flow'
      toast.error(message)
    }
  }

  if (step === 'LINK_TELEGRAM') {
    return (
      <div className="card-surface liquid-glass mx-auto max-w-xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
          Крок підключення
        </p>
        <h2 className="mt-3 text-2xl font-bold text-white">Підключіть Telegram</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Підключіть Telegram, щоб продовжити прямо тут або в додатку.
        </p>
        {hasActiveSubscription && (
          <div className="mt-4 rounded-2xl border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] px-4 py-3 text-sm text-white/78">
            Підписка активна. Після підключення Telegram можна перейти далі.
          </div>
        )}
        <div className="mt-6">
          {telegramFlowUrl ? (
            <a href={telegramFlowUrl} target="_blank" rel="noreferrer" className="inline-flex">
              <Button disabled={isTelegramLinkLoading}>{linkButtonText}</Button>
            </a>
          ) : (
            <Button disabled={isTelegramLinkLoading}>{linkButtonText}</Button>
          )}
        </div>
        {hasActiveSubscription && onContinueToNextStep && (
          <div className="mt-4">
            <Button onClick={onContinueToNextStep} variant="outline">
              Продовжити
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (step === 'START_FLOW') {
    return (
      <div className="card-surface liquid-glass mx-auto max-w-xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
          Перший крок
        </p>
        <h2 className="mt-3 text-2xl font-bold text-white">Колесо балансу</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Оціни кожну сферу — побачиш де найбільший перекіс.
        </p>
        <div className="mt-6">
          <Button onClick={handleStart} disabled={isStarting}>
            {isStarting ? 'Запускаємо...' : '▶️ Почати'}
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'WHEEL') {
    return (
      <div className="card-surface liquid-glass mx-auto max-w-xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
          Поточний крок
        </p>
        <h2 className="mt-3 text-2xl font-bold text-white">Продовжити до колеса</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Дані стану синхронізовані. Переходимо до екрана колеса.
        </p>
        <div className="mt-6">
          <Button onClick={() => navigate(ROUTES.WHEEL_START)}>Відкрити Wheel</Button>
        </div>
      </div>
    )
  }

  if (step === 'DAILY_MORNING') {
    return (
      <div className="card-surface liquid-glass mx-auto max-w-xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
          Поточний крок
        </p>
        <h2 className="mt-3 text-2xl font-bold text-white">{webMap ? 'Daily cycle' : 'Точка Б'}</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">
          {webMap
            ? 'Щоденний цикл активний. Відповідай на ранкові та вечірні питання в Telegram.'
            : 'Після колеса спершу відкрий Точка Б, зафіксуй річну карту і тільки тоді переходь у щоденний цикл.'}
        </p>
        {!webMap && (
          <div className="mt-6">
            <Button onClick={() => navigate(ROUTES.VISION)}>Відкрити Точка Б</Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card-surface liquid-glass mx-auto max-w-xl p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
        Поточний крок
      </p>
      <h2 className="mt-3 text-2xl font-bold text-white">Система активна</h2>
      <p className="mt-2 text-sm leading-6 text-white/65">
        Продовжуй роботу через Telegram.
      </p>
      {!isAuthenticated && onRequireAuth && (
        <div className="mt-6">
          <Button onClick={onRequireAuth}>Увійти</Button>
        </div>
      )}
    </div>
  )
}
