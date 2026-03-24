import { useUserState } from '@/features/auth/hooks/useUserState'
import { useGetTelegramLinkUrlQuery } from '@/features/auth/services/auth.api'
import { Button, GlassCard } from '@/ui'
import { ArrowLeft, ArrowRight, Play, Sparkles, Target } from 'lucide-react'
import type { ElementType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type StepId = 'register' | 'telegram' | 'flow'

interface Step {
  id: StepId
  title: string
  desc: string
  icon: ElementType
}

const STEP_CONFIG: Record<StepId, Step> = {
  register: {
    id: 'register',
    title: 'Реєстрація',
    desc: 'Email + пароль за 30 секунд. Увійди в систему і відкрий наступний крок.',
    icon: Play,
  },
  telegram: {
    id: 'telegram',
    title: 'Telegram',
    desc: 'Підключення бота і синхронізація доступу.',
    icon: Target,
  },
  flow: {
    id: 'flow',
    title: 'Колесо та AI flow',
    desc: 'Переходь до колеса балансу і далі рухайся по системі крок за кроком.',
    icon: Sparkles,
  },
}

export function HowItWorksSection({ onGetStarted }: { onGetStarted: () => void }) {
  const navigate = useNavigate()
  const {
    step,
    isAuthenticated,
    hasRealEmail,
    emailCompletionRequired,
    telegramLinked,
    botActive,
  } = useUserState()

  const { data: telegramLinkData } = useGetTelegramLinkUrlQuery(undefined, {
    skip: !isAuthenticated || emailCompletionRequired,
  })

  const hasTelegramIdentity = useMemo(() => {
    if (telegramLinked) return true
    if (typeof window === 'undefined') return false

    const telegram = (window as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number } } } } }).Telegram
    return Boolean(telegram?.WebApp?.initDataUnsafe?.user?.id)
  }, [telegramLinked])

  const steps = useMemo(() => {
    const order: StepId[] =
      isAuthenticated && hasTelegramIdentity && !hasRealEmail
        ? ['telegram', 'register', 'flow']
        : ['register', 'telegram', 'flow']

    return order.map((id, index) => ({
      ...STEP_CONFIG[id],
      displayId: String(index + 1).padStart(2, '0'),
    }))
  }, [hasRealEmail, hasTelegramIdentity, isAuthenticated])

  const getInitialStep = (): StepId => {
    if (!isAuthenticated) return steps[0]?.id ?? 'register'
    if (emailCompletionRequired) return hasTelegramIdentity ? 'register' : 'telegram'
    if (!telegramLinked || !botActive) return 'telegram'
    if (step === 'LINK_TELEGRAM') return 'telegram'
    if (step === 'START_FLOW' || step === 'WHEEL' || step === 'DAILY_MORNING') return 'flow'
    return 'register'
  }

  const [activeStep, setActiveStep] = useState<StepId>(() => getInitialStep())
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [returnMessage] = useState<string | null>(() => {
    if (!isAuthenticated) return null
    if (telegramLinked && !botActive) {
      return 'Схоже, ти видалив бота. Підключи знову і продовжиш з того місця.'
    }
    return null
  })

  const telegramFlowUrl = telegramLinkData?.url ?? null
  const activeIndex = Math.max(steps.findIndex(item => item.id === activeStep), 0)
  const progressWidth = ['w-1/3', 'w-2/3', 'w-full'][activeIndex] ?? 'w-1/3'

  useEffect(() => {
    setActiveStep(getInitialStep())
  }, [step, isAuthenticated, emailCompletionRequired, telegramLinked, botActive, hasTelegramIdentity, hasRealEmail])

  const openStep = (nextStep: StepId) => {
    if (nextStep === 'register' && !isAuthenticated) {
      onGetStarted()
      return
    }

    if (nextStep === 'telegram' && !isAuthenticated) {
      setStatusMessage('Спочатку зареєструйся')
      return
    }

    if (nextStep === 'flow' && (emailCompletionRequired || !telegramLinked || !botActive)) {
      setActiveStep(emailCompletionRequired && hasTelegramIdentity ? 'register' : 'telegram')
      setStatusMessage(null)
      return
    }

    setActiveStep(nextStep)
    setStatusMessage(null)
  }

  const goPrev = () => {
    const prev = steps[activeIndex - 1]
    if (prev) {
      setActiveStep(prev.id)
      setStatusMessage(null)
    }
  }

  const goNext = () => {
    const next = steps[activeIndex + 1]
    if (next) {
      openStep(next.id)
    }
  }

  const registerPrimaryLabel = !isAuthenticated
    ? 'Почати'
    : hasRealEmail
      ? 'Продовжити'
      : 'Додати email'

  const stepsWithDynamicCopy = steps.map(item => {
    if (item.id !== 'register') return item

    return {
      ...item,
      desc: isAuthenticated && hasTelegramIdentity && !hasRealEmail
        ? 'Telegram уже визначено. Тепер додай email, щоб завершити вхід у систему.'
        : item.desc,
    }
  })

  const shouldHideSection = isAuthenticated && hasRealEmail && telegramLinked

  if (shouldHideSection) {
    return null
  }

  return (
    <section id="how-it-works" className="py-8">
      <div className="mx-auto max-w-[1600px] px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-black text-white md:text-5xl">
              Як це <span className="text-[rgb(var(--accent-soft-rgb))]">працює</span>
            </h2>
            <p className="text-xl text-white/45">Три кроки до початку трансформації</p>
          </div>

          <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className={`h-full ${progressWidth} bg-[rgb(var(--accent-soft-rgb))] transition-all duration-500`}
            />
          </div>

          {statusMessage && (
            <div className="mb-4 rounded-2xl border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] px-4 py-3 text-center text-sm text-white/78">
              {statusMessage}
            </div>
          )}

          <div className="mb-10 grid gap-6 md:grid-cols-3">
            {stepsWithDynamicCopy.map((item, index) => {
              const isActive = activeStep === item.id

              return (
                <div key={item.id} className="relative group">
                  {index < stepsWithDynamicCopy.length - 1 && (
                    <div className="absolute left-[calc(100%+12px)] top-9 z-10 hidden w-6 md:block">
                      <ArrowRight className="h-5 w-5 text-white/50" />
                    </div>
                  )}

                  <GlassCard
                    className={[
                      'step-card flex min-h-[340px] flex-col transition-all duration-300',
                      isActive
                        ? 'border-[rgba(var(--accent-soft-rgb))] bg-[rgba(var(--accent-rgb),0.08)] shadow-[0_0_0_1px_rgba(var(--accent-rgb),0.28),0_0_28px_rgba(var(--accent-rgb),0.18),0_18px_40px_rgba(0,0,0,0.22)]'
                        : 'cursor-pointer border-white/10 opacity-80 hover:opacity-100',
                    ].join(' ')}
                    onClick={isActive ? undefined : () => openStep(item.id)}
                  >
                    <div className="step-card__badge gap-1 text-[rgb(var(--accent-soft-rgb))]">
                      {item.displayId}
                      <div className="step-card__icon">
                        <item.icon className="h-5 w-5 text-[rgb(var(--accent-soft-rgb))]" />
                      </div>
                    </div>

                    <h3 className="step-card-title">
                      <span
                        className={[
                          'transition-colors hover:text-[rgb(var(--accent-soft-rgb))] hover:underline',
                          isActive ? 'text-[rgb(var(--accent-soft-rgb))]' : '',
                        ].join(' ')}
                      >
                        {item.title}
                      </span>
                    </h3>

                    <p className="step-card-desc text-sm">{item.desc}</p>

                    {item.id === 'register' && isActive && (
                      <div className="mt-auto flex flex-col gap-4 pt-6">
                        <div className="flex justify-center">
                          <Button
                            onClick={event => {
                              event.stopPropagation()
                              if (isAuthenticated) {
                                goNext()
                                return
                              }
                              onGetStarted()
                            }}
                            className="hero-cta-primary inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-semibold"
                          >
                            {registerPrimaryLabel}
                          </Button>
                        </div>

                        {activeIndex < stepsWithDynamicCopy.length - 1 && (
                          <div className="flex justify-end">
                            <Button
                              onClick={event => {
                                event.stopPropagation()
                                goNext()
                              }}
                              variant="outline"
                            >
                              Далі
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {item.id === 'telegram' && isActive && (
                      <div className="mt-auto flex flex-col gap-4 pt-6">
                        {returnMessage && (
                          <div className="rounded-2xl border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] px-4 py-3 text-center text-sm text-white/78">
                            {returnMessage}
                          </div>
                        )}

                        {emailCompletionRequired && !hasTelegramIdentity && (
                          <div className="rounded-2xl border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] px-4 py-3 text-sm text-white/78">
                            Спочатку додай email до акаунта.
                          </div>
                        )}

                        <div className="flex justify-center">
                          {!emailCompletionRequired && (!telegramLinked || !botActive) ? (
                            telegramFlowUrl ? (
                              <a
                                href={telegramFlowUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex"
                                onClick={event => event.stopPropagation()}
                              >
                                <Button>
                                  {telegramLinked && !botActive ? 'Підключити знову' : 'Підключити Telegram'}
                                </Button>
                              </a>
                            ) : (
                              <Button disabled>Завантаження Telegram...</Button>
                            )
                          ) : (
                            <Button disabled={!telegramLinked && !hasTelegramIdentity}>
                              {telegramLinked || hasTelegramIdentity ? 'Telegram підключено' : 'Очікуємо підключення'}
                            </Button>
                          )}
                        </div>

                        <div className="flex items-end justify-between gap-3">
                          {activeIndex > 0 ? (
                            <Button
                              onClick={event => {
                                event.stopPropagation()
                                goPrev()
                              }}
                              variant="outline"
                            >
                              <ArrowLeft className="h-4 w-4" />
                              Назад
                            </Button>
                          ) : (
                            <span />
                          )}

                          {activeIndex < stepsWithDynamicCopy.length - 1 && (
                            <Button
                              onClick={event => {
                                event.stopPropagation()
                                goNext()
                              }}
                              disabled={emailCompletionRequired || (!telegramLinked && !hasTelegramIdentity) || !botActive}
                              variant="outline"
                            >
                              Вперед
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {item.id === 'flow' && isActive && (
                      <div className="mt-auto flex flex-col gap-4 pt-6">
                        <div className="flex justify-center">
                          <Button
                            onClick={event => {
                              event.stopPropagation()
                              navigate('/dashboard/wheel')
                            }}
                          >
                            Відкрити колесо
                          </Button>
                        </div>

                        <div className="flex justify-start">
                          <Button
                            onClick={event => {
                              event.stopPropagation()
                              goPrev()
                            }}
                            variant="outline"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Назад
                          </Button>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
