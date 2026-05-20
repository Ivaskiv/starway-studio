import { Button } from '@/ui'

import { WelcomeTestShell } from './WelcomeTestShell'

type WelcomeTestErrorStateProps = {
  title: string
  message: string
  onRetry?: () => void
  retryLabel?: string
}

export function WelcomeTestErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Спробувати ще раз',
}: WelcomeTestErrorStateProps) {
  return (
    <WelcomeTestShell title={title} subtitle={message} variant="error">
      {onRetry ? (
        <button type="button" onClick={onRetry} className="ab-test-retry">
          {retryLabel}
        </button>
      ) : null}
    </WelcomeTestShell>
  )
}

export function WelcomeTestSessionError({
  code,
  message,
  onRetry,
  onRestart,
}: {
  code?: string
  message: string
  onRetry?: () => void
  onRestart?: () => void
}) {
  const title =
    code === 'expired_session'
      ? 'Сесію тесту завершено'
      : code === 'unauthorized'
        ? 'Потрібен вхід'
        : code === 'network'
          ? 'Немає зʼєднання'
          : 'Щось пішло не так'

  return (
    <WelcomeTestShell title={title} subtitle={message} variant="error">
      <div className="flex flex-col gap-3">
        {onRetry ? (
          <button type="button" onClick={onRetry} className="ab-test-retry">
            Оновити стан
          </button>
        ) : null}
        {onRestart ? (
          <Button type="button" variant="glass" fullWidth onClick={onRestart}>
            Почати спочатку
          </Button>
        ) : null}
      </div>
    </WelcomeTestShell>
  )
}
