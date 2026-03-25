import { useSelector } from 'react-redux'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import type { RootState } from '@/app/store'
import MiniAppLayout from '@/components/miniapp/MiniAppLayout'
import { EmailCompletionCard } from '@/features/auth/components/EmailCompletionCard'
import { useUserState } from '@/features/auth/hooks/useUserState'
import MiniAppHomeSection from '@/features/social/components/MiniAppHomeSection'
import MiniAppLibrarySection from '@/features/social/components/MiniAppLibrarySection'
import MiniAppMentorSection from '@/features/social/components/MiniAppMentorSection'
import MiniAppProfileSection from '@/features/social/components/MiniAppProfileSection'
import MiniAppTrackerSection from '@/features/social/components/MiniAppTrackerSection'
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api'
import { useMiniAppMentorChat } from '@/features/social/hooks/useMiniAppMentorChat'
import { useMiniAppTelegram } from '@/features/social/hooks/useMiniAppTelegram'
import { useMiniAppViewModel } from '@/features/social/hooks/useMiniAppViewModel'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import type { MiniAppLibraryItem, MiniAppPageId } from '@/features/social/types/miniapp'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'

const LIBRARY_ITEMS: MiniAppLibraryItem[] = [
  { title: '5 точок опори', sub: 'Безкоштовно', locked: false },
  { title: 'Система 21', sub: 'Тріал · 33€', locked: false },
  { title: 'Страхи', sub: '33€ · 30 днів', locked: true },
  { title: 'Код змін', sub: '33€ · 30 днів', locked: true },
  { title: 'Стан — ключ до успіху', sub: '10€ · 14 днів', locked: true },
]

export default function MiniAppPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const page = useMemo<MiniAppPageId>(() => {
    if (location.pathname.startsWith('/miniapp/library')) return 'library'
    if (
      location.pathname.startsWith('/miniapp/mentor') ||
      location.pathname.startsWith('/miniapp/ai') ||
      location.pathname.startsWith('/miniapp/assistant')
    ) {
      return 'mentor'
    }
    if (location.pathname.startsWith('/miniapp/tracker')) return 'tracker'
    if (location.pathname.startsWith('/miniapp/profile')) return 'profile'
    return 'home'
  }, [location.pathname])
  const mentorContext = useMemo(() => {
    const search = new URLSearchParams(location.search)
    return search.get('context')
  }, [location.search])

  const user = useSelector((state: RootState) => state.auth.user)
  const userId = user?.id ?? ''
  const userName = user?.firstName ?? user?.name ?? 'Учень'
  const { emailCompletionRequired, refetch } = useUserState()
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !userId })
  const { data: summary } = useGetSummaryQuery(undefined, { skip: !userId })
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId, { skip: !userId })
  const { chatInput, chatMessages, isSending, sendMessage, setChatInput } = useMiniAppMentorChat({
    userId,
    context: page === 'mentor' ? mentorContext : null,
  })
  const { isBootstrappingAuth, telegramUser } = useMiniAppTelegram({
    page,
    onOpenMentor: () => navigate('/miniapp/mentor'),
    onOpenStarway: () => navigate('/dashboard'),
  })
  const view = useMiniAppViewModel({
    latestWheel,
    profile: summary,
    telegramUser,
    trial,
    userName,
  })

  return (
    <MiniAppLayout activeTab={page}>
        {isBootstrappingAuth && !userId ? (
          <div className="px-4 pt-6">
            <div className="card-surface liquid-glass p-5 text-center">
              <p className="text-sm font-semibold text-white">Синхронізуємо вхід…</p>
              <p className="mt-2 text-xs text-white/65">
                Підтягуємо сесію з Telegram і відновлюємо доступ без повторного логіну.
              </p>
            </div>
          </div>
        ) : null}

        {!isBootstrappingAuth && emailCompletionRequired ? (
          <div className="px-4 pt-6">
            <EmailCompletionCard onCompleted={async () => { await refetch() }} />
          </div>
        ) : null}

        {!isBootstrappingAuth && !emailCompletionRequired && page === 'home' && (
          <MiniAppHomeSection
            hasAccess={view.hasAccess}
            profileBitMind={view.profileBitMind}
            profileLevel={view.profileLevel}
            profileStreak={view.profileStreak}
            trialDay={view.trialDay}
            trackerProgress={view.trackerProgress}
            onOpenMentor={() => navigate('/miniapp/mentor')}
            onOpenTracker={() => navigate('/miniapp/tracker')}
            onOpenLibrary={() => navigate('/miniapp/library')}
          />
        )}

        {!isBootstrappingAuth && !emailCompletionRequired && page === 'mentor' && (
          <MiniAppMentorSection
            chatInput={chatInput}
            chatMessages={chatMessages}
            isSending={isSending}
            onChatInputChange={setChatInput}
            onSendMessage={sendMessage}
          />
        )}

        {!isBootstrappingAuth && !emailCompletionRequired && page === 'tracker' && (
          <MiniAppTrackerSection currentDay={view.trialDay} />
        )}

        {!isBootstrappingAuth && !emailCompletionRequired && page === 'library' && (
          <MiniAppLibrarySection items={LIBRARY_ITEMS} />
        )}

        {!isBootstrappingAuth && !emailCompletionRequired && page === 'profile' && (
          <MiniAppProfileSection
            displayName={view.displayName}
          />
        )}
    </MiniAppLayout>
  )
}
