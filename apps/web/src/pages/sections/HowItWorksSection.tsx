import { MentorFlowCard } from '@/features/auth/components/MentorFlowCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUserState } from '@/features/auth/hooks/useUserState'
import { hasPaidAccess } from '@/features/user/types/user.types'
import { Button, GlassCard } from '@/ui'
import { ArrowLeft, ArrowRight, Play, Sparkles, Target } from 'lucide-react'
import type { ElementType } from 'react'
import { useState } from 'react'

type StepId = '01' | '02' | '03'

interface Step {
  id: StepId
  title: string
  desc: string
  icon: ElementType
}

const STEPS: Step[] = [
  {
    id: '01',
    title: 'Реєстрація',
    desc: 'Email + пароль за 30 секунд. Увійди в систему і відкрий наступний крок.',
    icon: Play,
  },
  {
    id: '02',
    title: 'Підключення Telegram',
    desc: 'Підключіть Telegram, щоб продовжити прямо тут або в додатку і отримувати щоденний flow.',
    icon: Target,
  },
  {
    id: '03',
    title: 'Колесо та AI flow',
    desc: 'Переходь до колеса балансу і далі рухайся по системі крок за кроком.',
    icon: Sparkles,
  },
] as const

const PROGRESS_WIDTH: Record<StepId, string> = {
  '01': 'w-1/3',
  '02': 'w-2/3',
  '03': 'w-full',
}

export function HowItWorksSection({ onGetStarted }: { onGetStarted: () => void }) {
  const { user } = useAuth()
  const {
    step,
    isAuthenticated,
    emailCompletionRequired,
    telegramLinked,
    botActive,
  } = useUserState()
  const hasActiveSubscription = hasPaidAccess(user ?? null)

  const getInitialStep = (): StepId => {
    if (!isAuthenticated) return '01'
    if (emailCompletionRequired) return '02'
    if (!telegramLinked || !botActive) return '02'
    if (step === 'LINK_TELEGRAM') return '02'
    if (step === 'START_FLOW' || step === 'WHEEL' || step === 'DAILY_MORNING') return '03'
    return '01'
  }

  const [activeStep, setActiveStep] = useState<StepId>(() => getInitialStep())
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [returnMessage] = useState<string | null>(() => {
    if (!isAuthenticated) return null
    if (telegramLinked && !botActive) {
      return 'Схоже, ти видалив бота. Підключи знову — продовжиш з того місця'
    }
    return null
  })
  const shouldRenderMentorFlowCard =
    emailCompletionRequired ||
    !telegramLinked ||
    !botActive ||
    step === 'LINK_TELEGRAM'

  const openStep = (nextStep: StepId) => {
    if (nextStep === '01' && !isAuthenticated) {
      onGetStarted()
      return
    }

    if (nextStep === '02' && !isAuthenticated) {
      setStatusMessage('Спочатку зареєструйся')
      return
    }

    if (nextStep === '03' && (!telegramLinked || !botActive)) {
      setActiveStep('02')
      return
    }

    setActiveStep(nextStep)
    setStatusMessage(null)
  }

  const goPrev = () => {
    if (activeStep === '03') {
      setActiveStep('02')
      return
    }

    if (activeStep === '02') {
      setActiveStep('01')
    }
  }

  const goNext = () => {
    if (activeStep === '01') {
      openStep('02')
      return
    }

    if (activeStep === '02') {
      openStep('03')
    }
  }

  return (
    <section id="how-it-works" className=" sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-black text-white md:text-5xl">
            Як це <span className="text-[rgb(var(--accent-soft-rgb))]">працює</span>
          </h2>
          <p className="text-xl text-white/45">Три кроки до початку трансформації</p>
        </div>

        <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div className={`h-full ${PROGRESS_WIDTH[activeStep]} bg-[rgb(var(--accent-soft-rgb))] transition-all duration-500`} />
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((item, index) => (
            <div key={item.id} className="relative group">
              {index < STEPS.length - 1 && (
                <div className="absolute left-[calc(100%+12px)] top-9 z-10 hidden w-6 md:block">
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              )}

              <button
                type="button"
                onClick={() => openStep(item.id)}
                className={`block w-full cursor-pointer text-left transition-opacity ${
                  activeStep === item.id ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                }`}
              >
                <GlassCard
                  className={`step-card transition-all duration-300 ${
                    activeStep === item.id
                      ? 'border-[rgba(var(--accent-soft-rgb))] bg-[rgba(var(--accent-rgb),0.08)] shadow-[0_0_0_1px_rgba(var(--accent-rgb),0.28),0_0_28px_rgba(var(--accent-rgb),0.18),0_18px_40px_rgba(0,0,0,0.22)]'
                      : 'border-white/10'
                  }`}
                >
                  <div className="step-card__badge gap-1 text-[rgb(var(--accent-soft-rgb))]">
                    {item.id}
                    <div className="step-card__icon">
                      <item.icon className="h-5 w-5 text-[rgb(var(--accent-soft-rgb))]" />
                    </div>
                  </div>

                  <h3 className="step-card-title">
                    <span
                      className={`cursor-pointer transition-colors hover:text-[rgb(var(--accent-soft-rgb))] hover:underline ${
                        activeStep === item.id ? 'text-[rgb(var(--accent-soft-rgb))]' : ''
                      }`}
                    >
                      {item.title}
                    </span>
                  </h3>

                  <p className="step-card-desc text-sm">{item.desc}</p>
                </GlassCard>
              </button>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-xl">
          {statusMessage && (
            <div className="mb-4 rounded-2xl border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] px-4 py-3 text-center text-sm text-white/78">
              {statusMessage}
            </div>
          )}

          {activeStep === '01' && (
            <div className="card-surface p-6 text-center">
              <h3 className="text-xl font-bold text-white">Реєстрація</h3>
              <p className="mt-2 text-white/60">
                Email + пароль за 30 секунд. Увійди в систему і відкрий наступний крок.
              </p>

              {isAuthenticated && (
                <div className="mt-4 rounded-2xl border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] px-4 py-3 text-sm text-white/78">
                  Користувач успішно зареєстрований і залогінений. Тепер перейти до кроку 02.
                </div>
              )}

              <div className="mt-6 text-center">
                <Button
                  onClick={() => {
                    if (isAuthenticated) {
                      setActiveStep('02')
                      setStatusMessage(null)
                      return
                    }
                    onGetStarted()
                  }}
                  className="hero-cta-primary inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-semibold"
                >
                  {isAuthenticated ? 'Перейти до кроку 02' : 'Почати'}
                  <ArrowRight className="relative z-[1] h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {activeStep === '02' && (
            <>
              {returnMessage && (
                <div className="mb-4 rounded-2xl border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] px-4 py-3 text-center text-sm text-white/78">
                  {returnMessage}
                </div>
              )}

              {shouldRenderMentorFlowCard ? (
                <MentorFlowCard
                  autoRedirectWheel={false}
                  onContinueToNextStep={() => setActiveStep('03')}
                />
              ) : (
                <div className="card-surface p-6 text-center">
                  <h3 className="text-xl font-bold text-white">Telegram підключено</h3>
                  <p className="mt-2 text-white/60">
                    Бот активний. Переходь до кроку 03, щоб продовжити роботу з колесом та AI flow.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => setActiveStep('03')}>
                      Перейти до кроку 03
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeStep === '03' && (
            <div className="card-surface p-6 text-center">
              <h3 className="text-xl font-bold text-white">Колесо та AI flow</h3>
              <p className="mt-2 text-white/60">
                Переходь до колеса балансу і далі рухайся по системі.
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button onClick={goPrev} disabled={activeStep === '01'} variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>
            <Button
              onClick={goNext}
              disabled={activeStep === '03' || (activeStep === '02' && !hasActiveSubscription && step === 'LINK_TELEGRAM')}
            >
              Далі
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
