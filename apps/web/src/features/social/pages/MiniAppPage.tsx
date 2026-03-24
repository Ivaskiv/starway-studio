import { useSelector } from 'react-redux'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import type { RootState } from '@/app/store'
import BottomNav from '@/components/miniapp/BottomNav'
import MiniAppHomeSection from '@/features/social/components/MiniAppHomeSection'
import MiniAppLibrarySection from '@/features/social/components/MiniAppLibrarySection'
import MiniAppMentorSection from '@/features/social/components/MiniAppMentorSection'
import MiniAppProfileSection from '@/features/social/components/MiniAppProfileSection'
import MiniAppTrackerSection from '@/features/social/components/MiniAppTrackerSection'
import { useGetProfileQuery } from '@/features/gamification/services/gamification.api'
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

  const user = useSelector((state: RootState) => state.auth.user)
  const userId = user?.id ?? ''
  const userName = user?.firstName ?? user?.name ?? 'Учень'
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !userId })
  const { data: profile } = useGetProfileQuery(undefined, { skip: !userId })
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId, { skip: !userId })
  const { chatInput, chatMessages, isSending, sendMessage, setChatInput } = useMiniAppMentorChat({ userId })
  const { telegramUser } = useMiniAppTelegram({
    page,
    onOpenMentor: () => navigate('/miniapp/mentor'),
    onOpenStarway: () => navigate('/dashboard'),
  })
  const view = useMiniAppViewModel({
    latestWheel,
    profile,
    telegramUser,
    trial,
    userName,
  })

  return (
    <div className="miniapp-page-shell mx-auto flex w-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="flex-1 overflow-y-auto pb-32">
        {page === 'home' && (
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

        {page === 'mentor' && (
          <MiniAppMentorSection
            chatInput={chatInput}
            chatMessages={chatMessages}
            isSending={isSending}
            onChatInputChange={setChatInput}
            onSendMessage={sendMessage}
          />
        )}

        {page === 'tracker' && (
          <MiniAppTrackerSection currentDay={view.trialDay} trackerData={view.trackerData} />
        )}

        {page === 'library' && (
          <MiniAppLibrarySection items={LIBRARY_ITEMS} />
        )}

        {page === 'profile' && (
          <MiniAppProfileSection
            displayName={view.displayName}
            isTrialActive={view.isTrialActive}
            profileBitMind={view.profileBitMind}
            profileNeuroGems={view.profileNeuroGems}
            profileStreak={view.profileStreak}
            navigate={navigate}
          />
        )}
      </div>

      <BottomNav
        activeTab={page === 'mentor' ? 'ai' : page}
        onTabChange={(tab) => {
          switch (tab) {
            case 'library':
              navigate('/miniapp/library')
              return
            case 'ai':
              navigate('/miniapp/mentor')
              return
            case 'tracker':
              navigate('/miniapp/tracker')
              return
            case 'profile':
              navigate('/miniapp/profile')
              return
            default:
              navigate('/miniapp')
          }
        }}
      />
    </div>
  )
}
