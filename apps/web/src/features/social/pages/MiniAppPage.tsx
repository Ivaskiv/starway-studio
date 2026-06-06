import { useSelector } from 'react-redux'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import type { RootState } from '@/app/store'
import MiniAppLayout from '@/components/miniapp/MiniAppLayout'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
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
import { useGetWeekOverviewQuery } from '@/features/zoom/services/zoom.api'
import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'

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
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: shouldSkipProtectedQueries || !userId })
  const { data: summary } = useGetSummaryQuery(undefined, { skip: shouldSkipProtectedQueries || !userId })
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId, {
    skip: shouldSkipProtectedQueries || !userId,
  })
  const { data: weekOverview, isLoading: isWeekOverviewLoading, isError: isWeekOverviewError } = useGetWeekOverviewQuery(undefined, {
    skip: shouldSkipProtectedQueries || !userId,
    refetchOnMountOrArgChange: true,
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
  const telegramInitData = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const telegram = window as Window & {
      Telegram?: {
        WebApp?: {
          initData?: string
        }
      }
    }

    return telegram.Telegram?.WebApp?.initData?.trim() ?? ''
  }, [])
  const hasTelegramInitData = Boolean(telegramInitData)

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

  if (!isBootstrappingAuth && !hasTelegramInitData) {
    return (
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center justify-center px-4 py-8 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 text-sm text-white/75 shadow-[0_20px_80px_rgba(0,0,0,0.16)]">
          Відкрий в Telegram
        </div>
      </div>
    )
  }

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

        {!isBootstrappingAuth && page === 'home' && (
          <MiniAppZoomWeekPanel
            isError={isWeekOverviewError}
            isLoading={isWeekOverviewLoading}
            overview={weekOverview ?? null}
          />
        )}

        {!isBootstrappingAuth && page === 'mentor' && (
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

        {!isBootstrappingAuth && page === 'tracker' && (
          <MiniAppTrackerSection currentDay={view.trialDay} />
        )}

        {!isBootstrappingAuth && page === 'journal' && (
          <div className="px-4 pt-6">
            <MiniAppJournalSection showHeader />
          </div>
        )}

        {!isBootstrappingAuth && page === 'library' && (
          <MiniAppLibrarySection items={LIBRARY_ITEMS} />
        )}

        {!isBootstrappingAuth && page === 'profile' && (
          <MiniAppProfileSection
            displayName={view.displayName}
            panel={profilePanel}
          />
        )}
    </MiniAppLayout>
  )
}

function MiniAppZoomWeekPanel({
  overview,
  isLoading,
  isError,
}: {
  overview: ZoomWeekOverview | null
  isLoading: boolean
  isError: boolean
}) {
  const formatDateTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleString('uk-UA', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Kyiv',
    })
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
          Завантажуємо Zoom-розклад поточного тижня...
        </div>
      </div>
    )
  }

  if (isError || !overview) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-4">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          Не вдалося завантажити Zoom-розклад. Спробуй оновити сторінку.
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Zoom-календар</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Поточний тиждень</h2>
            <p className="mt-1 text-sm text-white/55">
              {new Date(overview.week.from).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long' })}
              {' '}—{' '}
              {new Date(overview.week.to).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long' })}
              {' '}· {overview.week.timezone}
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] text-white/60">
            {overview.sessions.length} сесій
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {overview.sessions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
              На цей тиждень Zoom-сесій ще немає.
            </div>
          ) : (
            overview.sessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{session.topic}</p>
                    <p className="mt-1 text-xs text-white/55">
                      {formatDateTime(session.scheduledAt)}
                      {' '}· {session.type}
                      {session.attendeesCount ? ` · ${session.attendeesCount} учасн.` : ''}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
                    {session.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {session.zoomLink ? (
                    <a
                      href={session.zoomLink}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:opacity-90"
                    >
                      Відкрити Zoom
                    </a>
                  ) : null}

                  {session.hasAudio ? (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-100">
                      Є аудіо-запис
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {overview.audios.length > 0 ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Аудіо цього тижня</p>
            <div className="mt-3 space-y-2">
              {overview.audios.map((audio) => (
                <div key={audio.sessionId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/75">
                  <p className="font-semibold text-white">{audio.topic}</p>
                  <p className="mt-1 text-xs text-white/55">
                    {formatDateTime(audio.scheduledAt)} · {audio.type}
                  </p>
                  <p className="mt-2 text-xs text-white/60">Audio file ID: {audio.audioFileId}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
