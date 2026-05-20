import { Button } from '@/ui'

import { WelcomeTestShell } from './WelcomeTestShell'

type WelcomeScreenProps = {
  onStart: () => void
  isLoading?: boolean
}

export function WelcomeScreen({ onStart, isLoading = false }: WelcomeScreenProps) {
  return (
    <WelcomeTestShell
      kicker="ФОКУС · Welcome test"
      title="Короткий тест перед практикою"
      subtitle="8 питань, щоб побачити, де зараз гальмує рух — і отримати наступний крок."
      footer={
        <Button
          type="button"
          variant="glass"
          fullWidth
          disabled={isLoading}
          onClick={onStart}
        >
          {isLoading ? 'Підготовка...' : 'Почати тест'}
        </Button>
      }
    >
      <p className="ab-test-result-text">
        Відповіді зберігаються автоматично. Можна повернутись пізніше і продовжити з того ж місця.
      </p>
    </WelcomeTestShell>
  )
}
