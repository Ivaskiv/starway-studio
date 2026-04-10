// frontend/src/features/settings/pages/SettingsPage.tsx
import { Link as LinkIcon, RefreshCw, Smartphone, Unlink2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'

import { AppDispatch } from '@/app/store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { authApi, useGetTelegramStatusQuery, useLazyGetTelegramLinkUrlQuery, useUpdateUserSettingsMutation } from '@/features/auth/services/auth.api'
import { updateUserSettings as updateUserSettingsState } from '@/features/auth/services/auth.slice'
import { useDisconnectSocialMutation } from '@/features/social/services/social.api'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/ui'

export default function SettingsPage() {
  const { user } = useAuth()
  const dispatch = useDispatch<AppDispatch>()
  const [updateUserSettings, { isLoading }] = useUpdateUserSettingsMutation()
  const [triggerTelegramLink, telegramLinkRequest] = useLazyGetTelegramLinkUrlQuery()
  const [disconnectSocial, { isLoading: isDisconnecting }] = useDisconnectSocialMutation()
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null)
  const [isWaitingForTelegram, setIsWaitingForTelegram] = useState(false)
  const [linkClock, setLinkClock] = useState(() => Date.now())
  const hasTelegramIdentity = Boolean(user?.telegramChatId || user?.telegramUserId || user?.telegramUserName)
  const telegramStatusQuery = useGetTelegramStatusQuery(undefined, {
    skip: !user,
    refetchOnFocus: true,
    pollingInterval: isWaitingForTelegram ? 3000 : 0,
  })
  const telegramLinked = telegramStatusQuery.data?.linked ?? hasTelegramIdentity
  const telegramBotActive = telegramStatusQuery.data?.botActive ?? telegramLinked

  const defaultNotifications = useMemo(() => (user?.settings?.notifications ?? {
    enabled: true,
    morningTime: '09:00',
    eveningTime: '21:00',
    types: {
      dailyMorning: true,
      dailyEvening: true,
      weeklySummary: true,
      streakAlert: true,
      streakBroken: true,
      levelUp: true,
      subscription: true,
      aiReminders: true,
    },
  }), [user?.settings?.notifications])
  const [saved, setSaved] = useState({
    notificationsEnabled: defaultNotifications.enabled ?? true,
    morningTime: defaultNotifications.morningTime ?? '09:00',
    eveningTime: defaultNotifications.eveningTime ?? '21:00',
    notificationTypes: {
      dailyMorning: defaultNotifications.types?.dailyMorning ?? true,
      dailyEvening: defaultNotifications.types?.dailyEvening ?? true,
      weeklySummary: defaultNotifications.types?.weeklySummary ?? true,
      streakAlert: defaultNotifications.types?.streakAlert ?? true,
      streakBroken: defaultNotifications.types?.streakBroken ?? true,
      levelUp: defaultNotifications.types?.levelUp ?? true,
      subscription: defaultNotifications.types?.subscription ?? true,
      aiReminders: defaultNotifications.types?.aiReminders ?? true,
    },
  })
  const [notificationsEnabled, setNotificationsEnabled] = useState(defaultNotifications.enabled ?? true)
  const [morningTime, setMorningTime] = useState(defaultNotifications.morningTime ?? '09:00')
  const [eveningTime, setEveningTime] = useState(defaultNotifications.eveningTime ?? '21:00')
  const [notificationTypes, setNotificationTypes] = useState({
    dailyMorning: defaultNotifications.types?.dailyMorning ?? true,
    dailyEvening: defaultNotifications.types?.dailyEvening ?? true,
    weeklySummary: defaultNotifications.types?.weeklySummary ?? true,
      streakAlert: defaultNotifications.types?.streakAlert ?? true,
      streakBroken: defaultNotifications.types?.streakBroken ?? true,
      levelUp: defaultNotifications.types?.levelUp ?? true,
      subscription: defaultNotifications.types?.subscription ?? true,
      aiReminders: defaultNotifications.types?.aiReminders ?? true,
  })

  useEffect(() => {
    if (!user) return
    const nextNotifications = user.settings?.notifications ?? defaultNotifications
    setNotificationsEnabled(nextNotifications.enabled ?? true)
    setMorningTime(nextNotifications.morningTime ?? '09:00')
    setEveningTime(nextNotifications.eveningTime ?? '21:00')
    setNotificationTypes({
      dailyMorning: nextNotifications.types?.dailyMorning ?? true,
      dailyEvening: nextNotifications.types?.dailyEvening ?? true,
      weeklySummary: nextNotifications.types?.weeklySummary ?? true,
        streakAlert: nextNotifications.types?.streakAlert ?? true,
        streakBroken: nextNotifications.types?.streakBroken ?? true,
        levelUp: nextNotifications.types?.levelUp ?? true,
        subscription: nextNotifications.types?.subscription ?? true,
        aiReminders: nextNotifications.types?.aiReminders ?? true,
      })
    setSaved({
      notificationsEnabled: nextNotifications.enabled ?? true,
      morningTime: nextNotifications.morningTime ?? '09:00',
      eveningTime: nextNotifications.eveningTime ?? '21:00',
      notificationTypes: {
        dailyMorning: nextNotifications.types?.dailyMorning ?? true,
        dailyEvening: nextNotifications.types?.dailyEvening ?? true,
        weeklySummary: nextNotifications.types?.weeklySummary ?? true,
          streakAlert: nextNotifications.types?.streakAlert ?? true,
          streakBroken: nextNotifications.types?.streakBroken ?? true,
          levelUp: nextNotifications.types?.levelUp ?? true,
          subscription: nextNotifications.types?.subscription ?? true,
          aiReminders: nextNotifications.types?.aiReminders ?? true,
      },
    })
  }, [user, defaultNotifications])

  useEffect(() => {
    if (!isWaitingForTelegram || !telegramLinked) return

    setIsWaitingForTelegram(false)
    setLinkExpiresAt(null)
    void dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true, subscribe: false }))
    toast.success('Telegram підключено')
  }, [dispatch, isWaitingForTelegram, telegramLinked])

  useEffect(() => {
    if (!isWaitingForTelegram || !linkExpiresAt) return

    const expiresAt = new Date(linkExpiresAt).getTime()
    if (Number.isNaN(expiresAt)) return

    const tick = () => {
      setLinkClock(Date.now())
      if (Date.now() < expiresAt) return
      setIsWaitingForTelegram(false)
      setDeepLink(null)
      setLinkExpiresAt(null)
      toast.error('Magic Link протух. Згенеруйте нове Telegram-посилання.')
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [isWaitingForTelegram, linkExpiresAt])

  const secondsUntilLinkExpiry = useMemo(() => {
    if (!linkExpiresAt) return null
    const diff = Math.max(0, Math.floor((new Date(linkExpiresAt).getTime() - linkClock) / 1000))
    return diff
  }, [linkClock, linkExpiresAt])

  const hasChanges = useMemo(
    () =>
      notificationsEnabled !== saved.notificationsEnabled ||
      morningTime !== saved.morningTime ||
      eveningTime !== saved.eveningTime ||
      JSON.stringify(notificationTypes) !== JSON.stringify(saved.notificationTypes),
    [saved, notificationsEnabled, morningTime, eveningTime, notificationTypes],
  )

  const handleSave = async () => {
    if (!user) return
    try {
      await updateUserSettings({
        settings: {
          notifications: {
            enabled: notificationsEnabled,
            morningTime,
            eveningTime,
            types: notificationTypes,
          },
        },
      }).unwrap()
      dispatch(updateUserSettingsState({
        notifications: {
          enabled: notificationsEnabled,
          morningTime,
          eveningTime,
          types: notificationTypes,
        },
      }))
      setSaved({
        notificationsEnabled,
        morningTime,
        eveningTime,
        notificationTypes,
      })
      toast.success('Налаштування збережено')
    } catch (error) {
      console.error('settings save failed', error)
      toast.error('Не вдалося зберегти налаштування')
    }
  }

  const handleCancel = () => {
    setNotificationsEnabled(saved.notificationsEnabled)
    setMorningTime(saved.morningTime)
    setEveningTime(saved.eveningTime)
    setNotificationTypes(saved.notificationTypes)
  }

  const handleConnectTelegram = useCallback(async () => {
    try {
      const result = await triggerTelegramLink().unwrap()
      setDeepLink(result.url)
      setLinkExpiresAt(result.expiresAt)
      setLinkClock(Date.now())
      setIsWaitingForTelegram(true)

      if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.open(result.url, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      console.error('telegram link generation failed', error)
      toast.error('Не вдалося згенерувати Telegram-посилання')
    }
  }, [triggerTelegramLink])

  const handleCopyTelegramLink = useCallback(async () => {
    if (!deepLink) return

    try {
      await navigator.clipboard.writeText(deepLink)
      toast.success('Посилання скопійовано')
    } catch (error) {
      console.error('copy telegram link failed', error)
      toast.error('Не вдалося скопіювати посилання')
    }
  }, [deepLink])

  const handleDisconnectTelegram = useCallback(async () => {
    try {
      await disconnectSocial({ provider: 'telegram' }).unwrap()
      setDeepLink(null)
      setLinkExpiresAt(null)
      setIsWaitingForTelegram(false)
      await telegramStatusQuery.refetch()
      void dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true, subscribe: false }))
      toast.success('Telegram відключено')
    } catch (error) {
      console.error('telegram disconnect failed', error)
      toast.error('Не вдалося відключити Telegram')
    }
  }, [disconnectSocial, dispatch, telegramStatusQuery])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <GlassCard className="px-6 py-4 text-sm text-[var(--text-muted)]">
          Завантаження налаштувань...
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <section className="ios-panel">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Налаштування
            </p>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] md:text-4xl">
              Telegram нагадування
            </h1>
            <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
              Керуйте ранковими й вечірніми нагадуваннями, тижневим звітом та системними сигналами в одному місці.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[164px] sm:items-stretch lg:self-start">
            <button onClick={handleCancel} className="ios-button-secondary">
              Скинути
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
              className={cn(
                'ios-button',
                (!hasChanges || isLoading) && 'cursor-not-allowed opacity-50 hover:translate-y-0 hover:scale-100',
              )}
            >
              {isLoading ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard className="ios-panel">
          <div className="max-w-2xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Telegram
            </p>
            <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
              Підключення і нагадування
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              Спочатку привʼяжіть Telegram до акаунту через magic link у боті. Після цього тут же працюють ранкові й вечірні нагадування, тижневі звіти, streak alerts і level up.
            </p>
          </div>
        </GlassCard>

        <GlassCard className="ios-panel space-y-5">
          <div className="rounded-3xl border border-[var(--border)] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                  Magic Link через бота
                </p>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  {telegramLinked ? 'Telegram підключено' : 'Підключити Telegram'}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {telegramLinked
                    ? telegramBotActive
                      ? 'Бот активний. Нагадування і сповіщення будуть приходити прямо в Telegram.'
                      : 'Акаунт прив’язаний, але бот зараз неактивний. Можна швидко підключити знову.'
                    : 'Натисніть кнопку, відкрийте бота і підтвердіть прив’язку. Сайт сам побачить підключення без перезавантаження.'}
                </p>
                {!telegramLinked && deepLink ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    Magic Link активний {secondsUntilLinkExpiry !== null ? `ще ${secondsUntilLinkExpiry} с` : 'тимчасово'}.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {telegramLinked ? (
                  <>
                    {deepLink && !telegramBotActive && (
                      <a href={deepLink} target="_blank" rel="noreferrer" className="inline-flex">
                        <button className="ios-button-secondary">
                          Підключити знову
                        </button>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleDisconnectTelegram}
                      disabled={isDisconnecting}
                      className={cn(
                        'ios-button-secondary inline-flex items-center gap-2',
                        isDisconnecting && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <Unlink2 className="h-4 w-4" />
                      {isDisconnecting ? 'Відключення...' : 'Відключити'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectTelegram}
                    disabled={telegramLinkRequest.isFetching}
                    className={cn(
                      'ios-button inline-flex items-center gap-2',
                      telegramLinkRequest.isFetching && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <LinkIcon className="h-4 w-4" />
                    {telegramLinkRequest.isFetching ? 'Генеруємо посилання...' : 'Підключити Telegram'}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Статус</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {telegramLinked ? 'Підключено' : 'Не підключено'}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Бот</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {telegramBotActive ? 'Активний' : telegramLinked ? 'Потрібно перепідключити' : 'Очікує підключення'}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Синхронізація</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {isWaitingForTelegram ? 'Очікуємо підтвердження…' : 'Автоматична'}
                </p>
              </div>
            </div>

            {deepLink && (
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                      Telegram посилання
                    </p>
                    <p className="mt-2 truncate text-sm text-[var(--text-secondary)]">
                      {deepLink}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={deepLink} target="_blank" rel="noreferrer" className="inline-flex">
                      <button className="ios-button-secondary inline-flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Відкрити Telegram
                      </button>
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyTelegramLink}
                      className="ios-button-secondary inline-flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Скопіювати
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Посилання діє 15 хвилин. Після підтвердження ботом сайт сам оновить статус без перезавантаження.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Увімкнути TG нагадування</p>
              <p className="text-xs text-[var(--text-muted)]">Працює для підключеного Telegram профілю.</p>
            </div>
            <button
              type="button"
              onClick={() => setNotificationsEnabled(value => !value)}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-semibold transition-colors',
                notificationsEnabled
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)]',
              )}
            >
              {notificationsEnabled ? 'Увімкнено' : 'Вимкнено'}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Ранок</span>
              <input
                type="time"
                value={morningTime}
                onChange={(event) => setMorningTime(event.target.value)}
                className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>

            <label className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Вечір</span>
              <input
                type="time"
                value={eveningTime}
                onChange={(event) => setEveningTime(event.target.value)}
                className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: 'dailyMorning', label: 'Ранкова рефлексія' },
              { key: 'dailyEvening', label: 'Вечірній підсумок' },
              { key: 'weeklySummary', label: 'Тижневий звіт' },
              { key: 'streakAlert', label: 'Попередження про streak' },
              { key: 'streakBroken', label: 'Відновлення після зриву' },
              { key: 'levelUp', label: 'Новий рівень' },
              { key: 'subscription', label: 'Підписка і білінг' },
              { key: 'aiReminders', label: 'Сесії з ментором та мікрозадачі' },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={notificationTypes[item.key as keyof typeof notificationTypes]}
                  onChange={(event) => {
                    setNotificationTypes(prev => ({
                      ...prev,
                      [item.key]: event.target.checked,
                    }))
                  }}
                  className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">{item.label}</span>
              </label>
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  )
}
