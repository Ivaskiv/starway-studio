import { Button } from '@/ui'

import { WelcomeTestShell } from './WelcomeTestShell'

type PaymentScreenProps = {
  onPay: () => void
  isPaying: boolean
  isPaid?: boolean
  errorMessage?: string | null
  onRetry?: () => void
}

export function PaymentScreen({
  onPay,
  isPaying,
  isPaid = false,
  errorMessage,
  onRetry,
}: PaymentScreenProps) {
  return (
    <WelcomeTestShell
      kicker="ФОКУС"
      title={isPaid ? 'Оплату підтверджено' : 'Оплатити за 1 місяць'}
      subtitle={
        isPaid
          ? 'Доступ активовано. Перевірте Telegram-канал ФОКУС.'
          : '780 грн · доступ до закритого каналу та щотижневих Zoom-практик.'
      }
      footer={
        isPaid ? null : (
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
