// frontend/src/features/settings/pages/SettingsPage.tsx
import { Palette } from 'lucide-react'
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

type Language = 'uk' | 'en'

const LANGUAGES: { id: Language; label: string; flag: string }[] = [
  { id: 'uk', label: 'Українська', flag: '🇺🇦' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const dispatch = useDispatch<AppDispatch>()
  const theme = useThemeContext()
  const [updateUserSettings, { isLoading }] = useUpdateUserSettingsMutation()

  const defaultAccent = user?.settings?.accentColor ?? theme.accent ?? loadAccentColor()
  const defaultMode: UiMode = (user?.settings?.theme as UiMode) ?? theme.mode ?? loadUiMode()
  const defaultLang = (user?.settings?.language as Language) || 'uk'

  const [accent, setAccent] = useState(defaultAccent)
  const [mode, setMode] = useState<UiMode>(defaultMode)
  const [language, setLanguage] = useState<Language>(defaultLang)
  const [saved, setSaved] = useState({
    accent: defaultAccent,
    mode: defaultMode,
    language: defaultLang,
  })

  useEffect(() => {
    if (!user) return
    const savedAccent = user.settings?.accentColor ?? defaultAccent
    const savedMode = (user.settings?.theme as UiMode) ?? defaultMode
    const savedLang = (user.settings?.language as Language) ?? defaultLang
    setAccent(savedAccent)
    setMode(savedMode)
    setLanguage(savedLang)
    setSaved({
      accent: savedAccent,
      mode: savedMode,
      language: savedLang,
    })
    applyAccentColor(savedAccent, savedMode)
    theme.setAccent(savedAccent)
    theme.setMode(savedMode)
  }, [user, defaultAccent, defaultMode, defaultLang, theme])

  const hasChanges = useMemo(
    () =>
      accent !== saved.accent ||
      mode !== saved.mode ||
      language !== saved.language,
    [accent, mode, language, saved],
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
        settings: { accentColor: accent, theme: mode, language },
      }).unwrap()
      dispatch(updateUserSettingsState({ accentColor: accent, theme: mode, language }))
      saveAccentColor(accent, mode)
      saveUiMode(mode)
      setSaved({ accent, mode, language })
      toast.success('Налаштування збережено')
    } catch (error) {
      console.error('settings save failed', error)
      toast.error('Не вдалося зберегти налаштування')
    }
  }

  const handleCancel = () => {
    setAccent(saved.accent)
    setMode(saved.mode)
    setLanguage(saved.language)
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-[var(--text-muted)] mb-1">Налаштування</p>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">Колірна система · Tokens · Components</h1>
          <p className="text-sm text-[var(--text-muted)]">Обирайте акцент, переключайте тему, зберігайте токени.</p>
        </div>

        <div className="flex items-center gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id)}
              className={cn(
                'px-3 py-1 rounded-full text-sm border transition-colors',
                language === lang.id
                  ? 'border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.2)] text-[var(--accent-soft)]'
                  : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-soft)]',
              )}
            >
              <span className="mr-1">{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-full text-sm border border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-rgb)]"
          >
            Скинути
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className={cn(
              'px-5 py-2.5 rounded-full text-sm font-semibold transition',
              hasChanges ? 'bg-[var(--accent)] text-white shadow-[0_10px_30px_rgba(var(--accent-rgb),0.35)]' : 'bg-white/5 text-[var(--text-muted)] cursor-not-allowed',
            )}
          >
            {isLoading ? 'Збереження...' : 'Зберегти'}
          </button>
        </div>
      </div>

      <GlassCard className="space-y-6 border border-[var(--border-primary)]">
        <div className="px-6 pt-6 space-y-4">
          <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
            <Palette size={16} />
            Керуйте акцентом, токенами та компонентами в одному місці
          </div>
          <ThemeSettingsPanel
            accent={accent}
            mode={mode}
            onAccentChange={handleAccent}
            onModeChange={handleMode}
          />
        </div>
      </GlassCard>
    </div>
  )
}
