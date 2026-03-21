import { Bot, Sparkles } from 'lucide-react'

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

export default function AIMentorPage() {
  const access = useMentorAccess()
  const onboarding = useMentorOnboarding()

  const { data: setupProgress, isLoading } =
    useGetSetupProgressQuery(undefined, {
      skip: access.level === 'none',
    })

  const shouldShowSetup =
    access.level !== 'none' && setupProgress?.currentStep !== 'complete'

  return (
    <div className="space-y-6">

      <MentorHeader
        level={access.level}
        isOnboarding={onboarding.isOnboarding}
        progress={onboarding.getProgressPercentage()}
      />

      <GamificationWidget />

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

    </div>
  )
}
