import { useSelector } from 'react-redux'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import type { RootState } from '@/app/store'
import MiniAppLayout from '@/components/miniapp/MiniAppLayout'
import { EmailCompletionCard } from '@/features/auth/components/EmailCompletionCard'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { useUserState } from '@/features/auth/hooks/useUserState'
import MiniAppHomeSection from '@/features/social/components/MiniAppHomeSection'
import MiniAppJournalSection from '@/features/social/components/MiniAppJournalSection'
import MiniAppLibrarySection from '@/features/social/components/MiniAppLibrarySection'
import MiniAppMentorSection from '@/features/social/components/MiniAppMentorSection'
import MiniAppProfileSection from '@/features/social/components/MiniAppProfileSection'
import MiniAppTrackerSection from '@/features/social/components/MiniAppTrackerSection'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api'
import { useGenerateDeepLinkMutation } from '@/features/auth/services/deeplinks.api'
import { useMiniAppMentorChat } from '@/features/social/hooks/useMiniAppMentorChat'
import { useMiniAppTelegram } from '@/features/social/hooks/useMiniAppTelegram'
import { useMiniAppViewModel } from '@/features/social/hooks/useMiniAppViewModel'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { useTrackFrontendEventMutation } from '@/features/analytics/services/events.api'
import type { MiniAppLibraryItem, MiniAppPageId } from '@/features/social/types/miniapp'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'
import { isTelegramMiniAppContext } from '@/features/social/utils/telegramWebApp'

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
  const isMiniAppRuntime = isTelegramMiniAppContext(location.pathname)

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
    if (location.pathname.startsWith('/miniapp/journal')) return 'journal'
    if (location.pathname.startsWith('/miniapp/profile')) return 'profile'
    return 'home'
  }, [location.pathname])
  const mentorContext = useMemo(() => {
    const search = new URLSearchParams(location.search)
    return search.get('context')
  }, [location.search])
  const profilePanel = useMemo(() => {
    const search = new URLSearchParams(location.search)
    const panel = search.get('panel')
    if (panel === 'subscription' || panel === 'settings' || panel === 'profile' || panel === 'level_up') {
      return panel
    }
    return null
  }, [location.search])

  const user = useSelector((state: RootState) => state.auth.user)
  const userId = user?.id ?? ''
  const { appState: sessionStatus } = useSessionOrchestrator()
  const shouldSkipProtectedQueries = sessionStatus !== 'authenticated'
  const userName = user?.firstName ?? user?.name ?? 'Учень'
  const { subscription } = useSystemState()
  const { emailCompletionRequired, refetch } = useUserState()
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: shouldSkipProtectedQueries || !userId })
  const { data: summary } = useGetSummaryQuery(undefined, { skip: shouldSkipProtectedQueries || !userId })
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId, {
    skip: shouldSkipProtectedQueries || !userId,
  })
  const [generateDeepLink, { isLoading: isGeneratingCrossChannelLink }] = useGenerateDeepLinkMutation()
  const [trackFrontendEvent] = useTrackFrontendEventMutation()
  const leadEntryTrackedRef = useRef(false)
  const { chatInput, chatMessages, isSending, sendMessage, setChatInput } = useMiniAppMentorChat({
    userId,
    context: page === 'mentor' ? mentorContext : null,
  })
  const { isBootstrappingAuth, telegramUser } = useMiniAppTelegram({
    page,
    onOpenMentor: () => navigate('/miniapp/mentor'),
    onOpenStarway: () => navigate('/miniapp'),
  })
  const view = useMiniAppViewModel({
    latestWheel,
    profile: summary,
    telegramUser,
    trial,
    subscription,
    userName,
  })
  const shouldBlockForEmailCompletion = emailCompletionRequired && !isMiniAppRuntime

  const handleOpenTelegramSession = async () => {
    const session = mentorContext === 'evening' ? 'evening' : mentorContext === 'morning' ? 'morning' : null
    if (!session) return

    const result = await generateDeepLink({
      action: 'resume_task',
      source: 'miniapp',
      target: 'telegram',
      path: `/dashboard/cycle?session=${session}`,
      payload: {
        session,
        date: new Date().toISOString(),
      },
    }).unwrap()

    window.open(result.telegramUrl, '_blank', 'noopener,noreferrer')
  }

  const handleOpenWebsiteSession = async () => {
    const session = mentorContext === 'evening' ? 'evening' : mentorContext === 'morning' ? 'morning' : null
    if (!session) return

    const result = await generateDeepLink({
      action: 'continue_flow',
      source: 'miniapp',
      target: 'web',
      path: `/dashboard/cycle?session=${session}`,
      payload: {
        session,
        date: new Date().toISOString(),
      },
    }).unwrap()

    window.open(result.webUrl, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    if (!userId || isBootstrappingAuth || leadEntryTrackedRef.current) {
      return
    }

    const search = new URLSearchParams(location.search)
    const utmSource = search.get('utm_source')?.trim() || search.get('utmSource')?.trim() || null
    const utmCampaign = search.get('utm_campaign')?.trim() || search.get('utmCampaign')?.trim() || null
    const productId = search.get('product_id')?.trim() || search.get('productId')?.trim() || null

    leadEntryTrackedRef.current = true
    void trackFrontendEvent({
      userId,
      type: 'lead_entered_app',
      source: 'miniapp',
      state: user?.subscriptionStatus ?? null,
      email: user?.email ?? null,
      utm_source: utmSource,
      utm_campaign: utmCampaign,
      product_id: productId,
      payload: {
        entry: 'miniapp',
        page,
        utmSource,
        utmCampaign,
        productId,
      },
    })
  }, [isBootstrappingAuth, location.search, page, trackFrontendEvent, user?.email, user?.subscriptionStatus, userId])

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

        {!isBootstrappingAuth && shouldBlockForEmailCompletion ? (
          <div className="px-4 pt-6">
            <EmailCompletionCard onCompleted={async () => { await refetch() }} />
          </div>
        ) : null}

        {!isBootstrappingAuth && !shouldBlockForEmailCompletion && page === 'home' && (
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

        {!isBootstrappingAuth && !shouldBlockForEmailCompletion && page === 'mentor' && (
          <MiniAppMentorSection
            context={mentorContext}
            chatInput={chatInput}
            chatMessages={chatMessages}
            isSending={isSending}
            isSyncing={isGeneratingCrossChannelLink}
            onChatInputChange={setChatInput}
            onSendMessage={sendMessage}
            onOpenTelegram={handleOpenTelegramSession}
            onOpenWebsite={handleOpenWebsiteSession}
          />
        )}

        {!isBootstrappingAuth && !shouldBlockForEmailCompletion && page === 'tracker' && (
          <MiniAppTrackerSection currentDay={view.trialDay} />
        )}

        {!isBootstrappingAuth && !shouldBlockForEmailCompletion && page === 'journal' && (
          <div className="px-4 pt-6">
            <MiniAppJournalSection showHeader />
          </div>
        )}

        {!isBootstrappingAuth && !shouldBlockForEmailCompletion && page === 'library' && (
          <MiniAppLibrarySection items={LIBRARY_ITEMS} />
        )}

        {!isBootstrappingAuth && !shouldBlockForEmailCompletion && page === 'profile' && (
          <MiniAppProfileSection
            displayName={view.displayName}
            panel={profilePanel}
          />
        )}
    </MiniAppLayout>
  )
}
