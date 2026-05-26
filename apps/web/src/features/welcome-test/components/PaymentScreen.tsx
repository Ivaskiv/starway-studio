import { Button } from '@/ui'

import { WelcomeTestShell } from './WelcomeTestShell'

type PaymentScreenProps = {
  onPay: () => void
  onOpenFocus?: () => void
  onResendAccess?: () => void
  isPaying: boolean
  isPaid?: boolean
  isAlreadyActive?: boolean
  errorMessage?: string | null
  onRetry?: () => void
}

export function PaymentScreen({
  onPay,
  onOpenFocus,
  onResendAccess,
  isPaying,
  isPaid = false,
  isAlreadyActive = false,
  errorMessage,
  onRetry,
}: PaymentScreenProps) {
  return (
    <WelcomeTestShell
      kicker="ФОКУС"
      title={isPaid ? 'Оплату підтверджено' : isAlreadyActive ? 'Доступ вже активний' : 'Оплатити за 1 місяць'}
      subtitle={
        isPaid
          ? 'Доступ активовано. Перевірте Telegram-канал ФОКУС.'
          : isAlreadyActive
            ? 'Підписка ФОКУС вже активна. Відкрийте доступ або надішліть його повторно.'
          : '780 грн · доступ до закритого каналу та щотижневих Zoom-практик.'
      }
      footer={
        isPaid ? null : isAlreadyActive ? (
          <div className="flex w-full flex-col gap-3">
            <Button type="button" variant="glass" fullWidth onClick={onOpenFocus}>
              Відкрити ФОКУС
            </Button>
            <Button type="button" variant="ghost" fullWidth onClick={onResendAccess}>
              Отримати доступ повторно
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="glass"
            fullWidth
            disabled={isPaying}
            onClick={onPay}
          >
            {isPaying ? 'Відкриваємо оплату...' : 'Оплатити за 1 місяць'}
          </Button>
        )
      }
    >
      <p className="ab-test-result-text">
        Після оплати доступ активується автоматично. Якщо сторінка оплати не відкрилась, натисніть кнопку ще раз.
      </p>
      {errorMessage ? (
        <div className="mt-4 space-y-3">
          <p className="ab-test-inline-error">{errorMessage}</p>
          {onRetry ? (
            <button type="button" className="ab-test-retry" onClick={onRetry}>
              Спробувати знову
            </button>
          ) : null}
        </div>
      ) : null}
    </WelcomeTestShell>
  )
}
