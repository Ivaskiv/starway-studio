import { useAppSelector } from '@/app/hooks'
import { getStoredUser } from '@/features/auth/services/token'
import { selectCurrentUser, selectUserRole, setLoading } from '@/features/auth/services/auth.slice'
import {
  useTelegramMiniAppAuthMutation,
  useUpdateUserSettingsMutation,
} from '@/features/auth/services/auth.api'
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import type { User } from '@/features/user/types/user.types'
import { CoachZoomPanel, UserZoomPanel } from '@/features/zoom'
import ZoomCalendarPage from '@/features/zoom/pages/ZoomCalendarPage'
import HomeTab from '@/features/zoom/tabs/HomeTab'

import ZoomCalendar from '@/features/zoom/ZoomCalendar'
import { useGetAudioListQuery } from '@/features/zoom/services/audio.api'
import { useGetWeekOverviewQuery } from '@/features/zoom/services/zoom.api'
import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useDispatch } from 'react-redux'

type MiniAppZoomTabId = 'home' | 'calendar' | 'battle' | 'progress' | 'profile'

const MINI_APP_ENTRY_INTENT = {
  BOOKING: 'booking',
} as const

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      initData?: string
      initDataUnsafe?: {
        user?: {
          first_name?: string
        }
      }
    }
  }
}

function getTelegramWindow(): TelegramWindow {
  return window as TelegramWindow
}

function resolveMiniAppEntryIntent(search: string): string | null {
  const intent = new URLSearchParams(search).get('intent')?.trim()
  return intent || null
}

function MiniAppZoomMessage({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'error'
}) {
  const toneClassName =
    tone === 'error'
      ? 'border-rose-300/30 bg-rose-400/10 text-rose-100'
      : 'border-white/10 bg-[var(--bg-secondary)] text-[var(--text-primary)]'

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8 pb-10">
      <div className={`rounded-2xl border p-5 text-sm ${toneClassName}`}>{children}</div>
    </div>
  )
}

function MiniAppZoomOnboarding({
  email,
  error,
  firstName,
  isSaving,
  onEmailChange,
  onFirstNameChange,
  onSubmit,
}: {
  email: string
  error: string | null
  firstName: string
  isSaving: boolean
  onEmailChange: (value: string) => void
  onFirstNameChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8 pb-10">
      <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        <p className="text-sm text-[var(--text-primary)]">
          Щоб бачити розклад Zoom-практик і отримувати нагадування - залиш email. Це займе 10 секунд.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-muted)]">Ім&apos;я</span>
            <input
              value={firstName}
              onChange={(event) => onFirstNameChange(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-white/30"
              placeholder="Твоє ім'я"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-muted)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-white/30"
              placeholder="you@example.com"
            />
          </label>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)] disabled:opacity-60"
          >
            Зберегти і відкрити Zoom-календар
          </button>
        </form>
      </div>
    </div>
  )
}

function formatZoomDateTime(iso: string): string {
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

function MiniAppZoomWeekPanel() {
  const user = useAppSelector(selectCurrentUser)
  const [audioMonth, setAudioMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const { data, isLoading, isError } = useGetWeekOverviewQuery(undefined, {
    skip: !user,
    refetchOnMountOrArgChange: true,
  })
  const { data: audioArchive, isLoading: isAudioArchiveLoading } = useGetAudioListQuery(audioMonth, {
    skip: !user,
    refetchOnMountOrArgChange: true,
  })

  if (!user) {
    return null
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

  if (isError || !data) {
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
              {new Date(data.week.from).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long' })}
              {' '}—{' '}
              {new Date(data.week.to).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long' })}
              {' '}· {data.week.timezone}
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] text-white/60">
            {data.sessions.length} сесій
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {data.sessions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
              На цей тиждень Zoom-сесій ще немає.
            </div>
          ) : (
            data.sessions.map((session: ZoomWeekOverview['sessions'][number]) => (
              <div key={session.id} className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{session.topic}</p>
                    <p className="mt-1 text-xs text-white/55">
                      {formatZoomDateTime(session.scheduledAt)}
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
                      className="rounded-full border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--accent-rgb))]"
                    >
                      Відкрити Zoom
                    </a>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/40">
                      Zoom-лінк ще не додано
                    </span>
                  )}

                  {session.audioFileId ? (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200">
                      Є аудіо запис
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/40">
                      Аудіо запису немає
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Аудіо</p>
          {data.audios.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
              Записів за цей тиждень поки немає.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {data.audios.map((audio: ZoomWeekOverview['audios'][number]) => (
                <div key={audio.sessionId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm font-medium text-white">{audio.topic}</p>
                  <p className="mt-1 text-xs text-white/55">
                    {formatZoomDateTime(audio.scheduledAt)} · {audio.type} · {audio.status}
                  </p>
                  <p className="mt-2 break-all font-mono text-[11px] text-white/45">
                    {audio.audioFileId}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Архів аудіо</p>
            <input
              type="month"
              value={audioMonth}
              onChange={(event) => setAudioMonth(event.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/75 outline-none focus:border-white/25"
            />
          </div>

          {isAudioArchiveLoading ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
              Завантажуємо архів аудіо...
            </div>
          ) : !(audioArchive?.items.length) ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
              За вибраний місяць аудіо не знайдено.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {audioArchive.items.map((audio) => (
                <div key={audio.assetId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm font-medium text-white">{audio.fileName}</p>
                  <p className="mt-1 text-xs text-white/55">
                    {audio.createdAt ? formatZoomDateTime(audio.createdAt) : 'Дата невідома'}
                    {audio.duration ? ` · ${Math.round(audio.duration)}s` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`/api/audio/stream/${encodeURIComponent(audio.assetId)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200"
                    >
                      Слухати
                    </a>
                    <a
                      href={`/api/audio/stream/${encodeURIComponent(audio.assetId)}?download=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70"
                    >
                      Завантажити
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ZoomPageWrapper() {
  const user = useAppSelector(selectCurrentUser)
  const role = useAppSelector(selectUserRole)

  if (!user) {
    return null
  }

  const isCoach = role === 'EXPERT' || role === 'SUPERADMIN'

  return isCoach ? <CoachZoomPanel expertId={user.id} /> : <UserZoomPanel userId={user.id} />
}

export function MiniAppZoomRoute() {
  const dispatch = useDispatch()
  const user = useAppSelector(selectCurrentUser)
  const [telegramMiniAppAuth, { isLoading: isAuthLoading }] = useTelegramMiniAppAuthMutation()
  const [updateUserSettings, { isLoading: isSaving }] = useUpdateUserSettingsMutation()
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const authAttemptedRef = useRef(false)
  const isTelegramRuntime = isTelegramMiniApp('/zoom')

  useEffect(() => {
    const telegramUser = getTelegramWindow().Telegram?.WebApp?.initDataUnsafe?.user
    const telegramFirstName = telegramUser?.first_name?.trim()

    if (telegramFirstName) {
      setFirstName(telegramFirstName)
    }
  }, [])

  useEffect(() => {
    const telegramWebApp = getTelegramWindow().Telegram?.WebApp
    const hasWebApp = Boolean(telegramWebApp)
    const initData = telegramWebApp?.initData?.trim() ?? ''

    console.log('[MiniAppZoomRoute] Debug:', {
      isTelegramRuntime,
      hasWebApp,
      initDataLength: initData.length,
      initDataExists: Boolean(initData),
      user: user?.id ?? null,
    })

    if (user) {
      if (isTelegramRuntime) {
        setNeedsOnboarding(false)
        return
      }

      setNeedsOnboarding(!user.email || !user.firstName)
      if (user.firstName) {
        setFirstName(user.firstName)
      }
      if (user.email) {
        setEmail(user.email)
      }
      return
    }

    if (authAttemptedRef.current) {
      return
    }

    authAttemptedRef.current = true

    if (!initData) {
      const storedUser = getStoredUser<User>()
      const fallbackEmail =
        storedUser?.email?.trim().toLowerCase() ||
        localStorage.getItem('user_email')?.trim().toLowerCase() ||
        ''

      if (fallbackEmail) {
        console.log('[MiniAppZoomRoute] Using fallback email:', fallbackEmail)
        dispatch(setLoading())
        void telegramMiniAppAuth({
          initData: '',
          fallbackEmail,
        })
          .unwrap()
          .then(() => {
            setError(null)
            setNeedsOnboarding(false)
          })
          .catch((authError) => {
            console.warn('[MiniAppZoomRoute] Fallback auth failed', authError)
            setError(null)
            setNeedsOnboarding(false)
          })
        return
      }

      setError(null)
      setNeedsOnboarding(false)
      return
    }

    dispatch(setLoading())
    void telegramMiniAppAuth({ initData })
      .unwrap()
      .then((result) => {
        setNeedsOnboarding(isTelegramRuntime ? false : Boolean(result.needsOnboarding))
      })
      .catch((authError) => {
        console.error('[MiniAppZoomRoute] telegram auth failed', authError)
        setError('Не вдалося авторизуватись через Telegram. Спробуй ще раз.')
      })
  }, [dispatch, isTelegramRuntime, telegramMiniAppAuth, user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !firstName.trim()) {
      setError("Заповни ім'я та email.")
      return
    }

    try {
      await updateUserSettings({
        firstName: firstName.trim(),
        email: email.trim(),
      }).unwrap()
      setNeedsOnboarding(false)
    } catch (saveError) {
      console.error('[MiniAppZoomRoute] onboarding save failed', saveError)
      setError('Не вдалося зберегти дані. Спробуй ще раз.')
    }
  }

  if (isTelegramRuntime && error) {
    return <MiniAppZoomMessage>{error}</MiniAppZoomMessage>
  }

  if (isAuthLoading || needsOnboarding === null) {
    return <MiniAppZoomMessage>Синхронізуємо вхід у Zoom-календар...</MiniAppZoomMessage>
  }

  if (!isTelegramRuntime && needsOnboarding) {
    return (
      <MiniAppZoomOnboarding
        email={email}
        error={error}
        firstName={firstName}
        isSaving={isSaving}
        onEmailChange={setEmail}
        onFirstNameChange={setFirstName}
        onSubmit={handleSubmit}
      />
    )
  }

  if (!user) {
    return <ZoomCalendarPage />
  }

  return (
    <div className="space-y-4 pb-6">
      <MiniAppZoomWeekPanel />
      <div className="mx-auto w-full max-w-5xl px-4 pb-4">
        <ZoomCalendar mode="user" userId={user.id} />
      </div>
    </div>
  )
}

function BattleTabStub() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/60">
      <div className="text-center">
        <p className="mb-2 text-lg font-semibold">⚔️ Батли</p>
        <p className="text-sm">Скоро запустимо обмін місцями та виклики</p>
      </div>
    </div>
  )
}

function ProgressTabStub() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/60">
      <div className="text-center">
        <p className="mb-2 text-lg font-semibold">📈 Прогрес</p>
        <p className="text-sm">Статистика та досягнення з&apos;являться тут</p>
      </div>
    </div>
  )
}

function ProfileTabStub() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/60">
      <div className="text-center">
        <p className="mb-2 text-lg font-semibold">👤 Профіль</p>
        <p className="text-sm">Налаштування та облік скоро</p>
      </div>
    </div>
  )
}

function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: MiniAppZoomTabId
  onTabChange: (tab: MiniAppZoomTabId) => void
}) {
  const tabs: Array<{ id: MiniAppZoomTabId; label: string }> = [
    { id: 'home', label: '🏠' },
    { id: 'calendar', label: '📅' },
    { id: 'battle', label: '⚔️' },
    { id: 'progress', label: '📈' },
    { id: 'profile', label: '👤' },
  ]

  return (
    <div className="fixed right-0 bottom-0 left-0 flex justify-around border-t border-[#2A3543] bg-[#0F1419] py-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`text-2xl transition-colors ${
            activeTab === tab.id ? 'text-[#4A90FF]' : 'text-[#6B7280]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function MiniAppZoomCalendar() {
  const search = typeof window === 'undefined' ? '' : window.location.search
  const intent = resolveMiniAppEntryIntent(search)
  const hasTelegramInitData = Boolean(getTelegramWindow().Telegram?.WebApp?.initData?.trim())
  const isBookingIntent = intent === MINI_APP_ENTRY_INTENT.BOOKING
  const [activeTab, setActiveTab] = useState<MiniAppZoomTabId>(isBookingIntent ? 'calendar' : 'home')

  if (isBookingIntent && !hasTelegramInitData) {
    return (
      <div className="flex h-screen flex-col bg-[#0F1419]">
        <div className="flex-1 overflow-y-auto pb-24">
          <MiniAppZoomMessage>Відкрийте Mini App через Telegram.</MiniAppZoomMessage>
        </div>

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-[#0F1419]">
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'calendar' && <MiniAppZoomRoute />}
        {activeTab === 'battle' && <BattleTabStub />}
        {activeTab === 'progress' && <ProgressTabStub />}
        {activeTab === 'profile' && <ProfileTabStub />}
      </div>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
