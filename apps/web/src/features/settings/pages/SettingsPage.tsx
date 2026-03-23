// frontend/src/features/settings/pages/SettingsPage.tsx
import { Palette, Sparkles, SunMoon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'

import { AppDispatch } from '@/app/store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUpdateUserSettingsMutation } from '@/features/auth/services/auth.api'
import { updateUserSettings as updateUserSettingsState } from '@/features/auth/services/auth.slice'
import { ThemeSettingsPanel } from '@/features/settings/components/ThemeSettingsPanel'
import { cn } from '@/lib/utils'
import { useThemeContext } from '@/theme/ThemeProvider'
import {
  applyAccentColor,
  loadAccentColor,
  loadUiMode,
  saveAccentColor,
  saveUiMode,
  type UiMode,
} from '@/theme/accent.utils'
import { GlassCard } from '@/ui'

export default function SettingsPage() {
  const { user } = useAuth()
  const dispatch = useDispatch<AppDispatch>()
  const theme = useThemeContext()
  const [updateUserSettings, { isLoading }] = useUpdateUserSettingsMutation()

  const defaultAccent = user?.settings?.accentColor ?? theme.accent ?? loadAccentColor()
  const defaultMode: UiMode = (user?.settings?.theme as UiMode) ?? theme.mode ?? loadUiMode()
  const [accent, setAccent] = useState(defaultAccent)
  const [mode, setMode] = useState<UiMode>(defaultMode)
  const [saved, setSaved] = useState({
    accent: defaultAccent,
    mode: defaultMode,
  })

  useEffect(() => {
    if (!user) return
    const savedAccent = user.settings?.accentColor ?? defaultAccent
    const savedMode = (user.settings?.theme as UiMode) ?? defaultMode
    setAccent(savedAccent)
    setMode(savedMode)
    setSaved({
      accent: savedAccent,
      mode: savedMode,
    })
    applyAccentColor(savedAccent, savedMode)
    theme.setAccent(savedAccent)
    theme.setMode(savedMode)
  }, [user, defaultAccent, defaultMode, theme])

  const hasChanges = useMemo(
    () =>
      accent !== saved.accent ||
      mode !== saved.mode,
    [accent, mode, saved],
  )

  const handleAccent = useCallback((hex: string) => {
    setAccent(hex)
    theme.setAccent(hex)
    applyAccentColor(hex, mode)
  }, [mode, theme])

  const handleMode = useCallback((next: UiMode) => {
    setMode(next)
    theme.setMode(next)
    applyAccentColor(accent, next)
  }, [accent, theme])

  const handleSave = async () => {
    if (!user) return
    try {
      await updateUserSettings({
        settings: { accentColor: accent, theme: mode },
      }).unwrap()
      dispatch(updateUserSettingsState({ accentColor: accent, theme: mode }))
      saveAccentColor(accent, mode)
      saveUiMode(mode)
      setSaved({ accent, mode })
      toast.success('Налаштування збережено')
    } catch (error) {
      console.error('settings save failed', error)
      toast.error('Не вдалося зберегти налаштування')
    }
  }

  const handleCancel = () => {
    setAccent(saved.accent)
    setMode(saved.mode)
    theme.setAccent(saved.accent)
    theme.setMode(saved.mode)
    applyAccentColor(saved.accent, saved.mode)
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
              Візуальна система Starway
            </h1>
            <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
              Один центр керування темою, акцентом і glass-поверхнями. Без мовного перемикача, без зайвих технічних рішень, тільки український інтерфейс.
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="ios-glass-soft p-4">
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <Palette size={16} />
                <span className="text-xs font-semibold uppercase tracking-widest">Accent</span>
              </div>
              <p className="mt-3 text-sm text-[var(--text-primary)]">{accent}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Базове джерело кольору для glow, кнопок і highlights.</p>
            </div>

            <div className="ios-glass-soft p-4">
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <SunMoon size={16} />
                <span className="text-xs font-semibold uppercase tracking-widest">Режим</span>
              </div>
              <p className="mt-3 text-sm capitalize text-[var(--text-primary)]">{mode}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Світлий або темний glass-корпус із однаковою структурою.</p>
            </div>

            <div className="ios-glass-soft p-4">
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <Sparkles size={16} />
                <span className="text-xs font-semibold uppercase tracking-widest">UI</span>
              </div>
              <p className="mt-3 text-sm text-[var(--text-primary)]">Liquid Glass</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Панелі, кнопки і поля синхронізовані в один iOS-подібний шар.</p>
            </div>
          </div>
        </GlassCard>

        <ThemeSettingsPanel
          accent={accent}
          mode={mode}
          onAccentChange={handleAccent}
          onModeChange={handleMode}
        />
      </section>
    </div>
  )
}
