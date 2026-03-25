// frontend/src/features/settings/pages/SettingsPage.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'

import { AppDispatch } from '@/app/store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUpdateUserSettingsMutation } from '@/features/auth/services/auth.api'
import { updateUserSettings as updateUserSettingsState } from '@/features/auth/services/auth.slice'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/ui'

export default function SettingsPage() {
  const { user } = useAuth()
  const dispatch = useDispatch<AppDispatch>()
  const [updateUserSettings, { isLoading }] = useUpdateUserSettingsMutation()

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
      },
    })
  }, [user, defaultNotifications])

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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
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

          <div className="flex flex-wrap gap-3">
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
              Telegram Notifications
            </p>
            <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
              Нагадування і сигнали
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              Один блок для Telegram-нагадувань: ранковий старт, вечірній підсумок, тижневий звіт, streak alerts і level up.
            </p>
          </div>
        </GlassCard>

        <GlassCard className="ios-panel space-y-5">
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
