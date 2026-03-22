import { useAppSelector } from '@/app/hooks'
import { Bot, Sparkles } from 'lucide-react'
import { ROUTES } from '@/config/routes'
import { selectUserRole } from '@/features/auth/services/auth.slice'
import { useGetTrialStatusQuery, useStartTrialMutation } from '@/features/trial/services/trial.api'

import { useMentorAccess } from '../hooks/useMentorAccess'
import { useMentorOnboarding } from '../hooks/useMentorOnboarding'
import { useGetSetupProgressQuery } from '../services/setup.api'

import MentorHeader from '../components/MentorHeader'
import MentorLocked from '../components/MentorLocked'
import MentorWorkspace from '../components/mentorWorkspace/MentorWorkspace'
import OnboardingFlow from '@/features/ai-mentor/components/OnboardingFlow/OnboardingFlow'
import { SetupWizard } from '../components/SetupWizard'

import AIMentorChat from '../components/AIMentorChat'
import { GlassCard } from '@/ui'
import GamificationWidget from '@/features/gamification/components/GamificationWidget'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AIMentorPage() {
  const navigate = useNavigate()
  const access = useMentorAccess()
  const onboarding = useMentorOnboarding()
  const userRole = useAppSelector(selectUserRole)
  const isSuperAdmin = (userRole ?? '').toUpperCase() === 'SUPERADMIN'
  const [previewAsUser, setPreviewAsUser] = useState(false)
  const showAsUser = !isSuperAdmin || previewAsUser
  const { data: trial } = useGetTrialStatusQuery()
  const [startTrial] = useStartTrialMutation()

  const { data: setupProgress, isLoading } =
    useGetSetupProgressQuery(undefined, {
      skip: access.level === 'none',
    })

  const shouldShowSetup =
    access.level !== 'none' && setupProgress?.currentStep !== 'complete'

  const tabs = [
    { id: 'session', label: 'Сесія', path: ROUTES.AI_MENTOR, active: true },
    { id: 'wheel', label: 'Колесо', path: ROUTES.WHEEL, active: false },
    { id: 'report', label: 'Звіт', path: `${ROUTES.PROGRESS}?tab=report`, active: false },
    { id: 'progress', label: 'Прогрес', path: ROUTES.PROGRESS, active: false },
  ] as const

  const handleStartTrial = async () => {
    try {
      await startTrial().unwrap()
    } catch (e) {
      console.error('[AIMentor] startTrial failed:', e)
    }
  }

  return (
    <div className="space-y-6">
      {isSuperAdmin && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--accent)] bg-[var(--accent-bg,var(--bg-secondary))] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--accent)]">
              {previewAsUser ? '👤 Вигляд користувача' : '🎓 Вигляд коуча'}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {previewAsUser ? '— тестуєш як звичайний user' : '— твій режим SUPERADMIN'}
            </span>
          </div>
          <button
            onClick={() => setPreviewAsUser(v => !v)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
          >
            {previewAsUser ? 'Повернутись як коуч' : 'Переглянути як user'}
          </button>
        </div>
      )}

      <MentorHeader
        level={access.level}
        isOnboarding={onboarding.isOnboarding}
        progress={onboarding.getProgressPercentage()}
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (!tab.active) navigate(tab.path)
            }}
            className={[
              'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
              tab.active
                ? 'border-[rgba(var(--accent-rgb),0.45)] bg-[rgba(var(--accent-rgb),0.16)] text-white'
                : 'border-white/12 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <GamificationWidget />

      {showAsUser && !trial?.isActive && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="p-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
              AI МЕНТОР
            </p>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Персональний коуч 24/7
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Ранкові питання, вечірні афірмації, колесо балансу,
              мікрозавдання та AI аналіз твого стану.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { plan: 'Тиждень', price: '7€', desc: 'Ідеально для тесту', key: 'WEEK' },
                { plan: 'Місяць', price: '30€', desc: 'Глибинна робота', key: 'MONTH' },
                { plan: 'Рік', price: '300€', desc: 'Максимальна економія', key: 'YEAR' },
              ].map(p => (
                <div
                  key={p.key}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary,var(--bg-secondary))] p-4 text-center"
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">{p.plan}</p>
                  <p className="text-2xl font-bold text-[var(--accent)]">{p.price}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{p.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleStartTrial}
                className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:brightness-110"
              >
                Розпочати 7 днів безкоштовно
              </button>
              <button
                onClick={() => navigate('/dashboard/subscription')}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
              >
                Обрати план
              </button>
            </div>
          </div>
        </div>
      )}

      {(showAsUser && trial?.isActive) || !showAsUser ? (
        <>
          {access.level === 'none' && <MentorLocked />}

          {isLoading && access.level !== 'none' && (
            <GlassCard className="p-6 text-white/70">
              Завантаження конфігурації AI-ментора...
            </GlassCard>
          )}

          {shouldShowSetup && (
            <>
              <GlassCard className="p-6 md:p-7 border border-[color:rgba(var(--accent-rgb),0.35)]">

                <div className="flex items-start gap-3">

                  <div className="h-10 w-10 rounded-xl bg-[color:rgba(var(--accent-rgb),0.22)] border border-[color:rgba(var(--accent-rgb),0.4)] flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>

                  <div>

                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      AI Mentor Quick Start
                    </p>

                    <h2 className="text-xl md:text-2xl font-semibold text-white mt-1">
                      Створи власного AI-ментора
                    </h2>

                    <p className="text-white/70 mt-2">
                      1) Колесо балансу
                      2) Telegram контакт
                      3) Генерація питань
                    </p>

                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-white/75">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                      СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ
                    </div>

                  </div>
                </div>

              </GlassCard>

              <SetupWizard embedded />
            </>
          )}

          {access.level === 'trial' && !shouldShowSetup && (
            <>
              <OnboardingFlow />
              <MentorWorkspace limited>
                <AIMentorChat />
              </MentorWorkspace>
            </>
          )}

          {access.level === 'paid' && !shouldShowSetup && (
            <>
              {onboarding.isOnboarding && <OnboardingFlow />}
              <MentorWorkspace>
                <AIMentorChat />
              </MentorWorkspace>
            </>
          )}
        </>
      ) : null}

    </div>
  )
}
