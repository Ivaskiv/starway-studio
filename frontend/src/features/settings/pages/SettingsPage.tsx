// frontend/src/features/settings/pages/SettingsPage.tsx
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUpdateUserSettingsMutation } from '@/features/auth/services/auth.api';
import { ThemeColorsPanel } from '@/features/settings/components/ThemeColorsPanel';
import { cn } from '@/lib/utils';
import { buildThemePalette, applyPalette } from '@/shared/utils/color.utils';
import { saveAccentColor } from '@/shared/utils/accent.utils';
import { applyUiTheme, normalizeUiTheme, saveUiTheme, type UiTheme } from '@/shared/utils/theme.utils';
import { GlassCard } from '@/ui';
import { Globe, Moon, Palette, Save, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  // ✅ Беремо user з Redux через useAuth — не залежимо від useGetMeQuery
  const { user } = useAuth();
  const [updateUserSettings, { isLoading }] = useUpdateUserSettingsMutation();

  const defaultAccent = user?.settings?.accentColor || '#f97316';
  const defaultLang = (user?.settings?.language as 'uk' | 'en' | undefined) || 'uk';
  const defaultTheme = normalizeUiTheme(user?.settings?.theme);

  const [accentColor, setAccentColor] = useState(defaultAccent);
  const [language, setLanguage] = useState<'uk' | 'en'>(defaultLang);
  const [theme, setTheme] = useState<UiTheme>(defaultTheme);
  const [savedSettings, setSavedSettings] = useState({
    accent: defaultAccent,
    language: defaultLang,
    theme: defaultTheme,
  });

  // Синхронізуємо коли user завантажився
  useEffect(() => {
    if (!user) return;
    const savedAccent = user.settings?.accentColor || '#f97316';
    const savedLanguage = (user.settings?.language as 'uk' | 'en' | undefined) || 'uk';
    const savedTheme = normalizeUiTheme(user.settings?.theme);
    setAccentColor(savedAccent);
    setLanguage(savedLanguage);
    setTheme(savedTheme);
    setSavedSettings({ accent: savedAccent, language: savedLanguage, theme: savedTheme });
  }, [user?.settings?.accentColor, user?.settings?.language, user?.settings?.theme]);

  useEffect(() => {
    applyPalette(buildThemePalette(accentColor, theme));
  }, [accentColor, theme]);

  const hasUnsaved = useMemo(
    () =>
      accentColor !== savedSettings.accent ||
      language !== savedSettings.language ||
      theme !== savedSettings.theme,
    [accentColor, language, theme, savedSettings],
  );

  const handleAccentChange = (hex: string) => {
    setAccentColor(hex);
    applyPalette(buildThemePalette(hex, theme));
  };

  const handleSave = async () => {
    try {
      await updateUserSettings({
        settings: { accentColor, language, theme },
      }).unwrap();
      saveAccentColor(accentColor); // ✅ localStorage + applyAccentColor
      saveUiTheme(theme);
      setSavedSettings({ accent: accentColor, language, theme });
      toast.success('Налаштування збережено');
    } catch (err) {
      console.error('settings save error', err);
      toast.error('Не вдалося зберегти');
    }
  };

  const handleCancel = () => {
    setAccentColor(savedSettings.accent);
    setLanguage(savedSettings.language);
    setTheme(savedSettings.theme);
    applyPalette(buildThemePalette(savedSettings.accent, savedSettings.theme));
    applyUiTheme(savedSettings.theme);
  };

  // ✅ Показуємо сторінку завжди — не блокуємо на null
  if (!user)
    return (
      <div className="flex items-center justify-center h-48 text-white/40 text-sm">
        Завантаження...
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:px-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="space-y-4">
          <GlassCard className="p-6 space-y-4 border-white/10 bg-white/4 backdrop-blur-2xl">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-white/50" />
              Мова інтерфейсу
            </h2>
            <div className="inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
              {(['uk', 'en'] as const).map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    language === lang
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/50 hover:text-white hover:bg-white/8',
                  )}
                >
                  {lang === 'uk' ? '🇺🇦 Українська' : '🇬🇧 English'}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6 space-y-4 border-white/10 bg-white/4 backdrop-blur-2xl">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-5 h-5 text-white/50" /> : <Sun className="w-5 h-5 text-white/50" />}
              Тема
            </h2>
            <div className="inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
              {(['dark', 'light'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setTheme(mode);
                    applyUiTheme(mode);
                    applyPalette(buildThemePalette(accentColor, mode));
                  }}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    theme === mode
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/50 hover:text-white hover:bg-white/8',
                  )}
                >
                  {mode === 'dark' ? '🌑 Темна' : '☀️ Світла'}
                </button>
              ))}
            </div>
          </GlassCard>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={!hasUnsaved || isLoading}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 border border-white/20',
                hasUnsaved && !isLoading
                  ? 'text-white/50 hover:text-white hover:border-white/40 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white/40'
                  : 'opacity-30 cursor-not-allowed text-white/30',
              )}
            >
              Відмінити
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsaved || isLoading}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 settings-save-button',
                hasUnsaved && !isLoading
                  ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20 hover:border-white/40'
                  : 'opacity-30 cursor-not-allowed text-white/50 border border-white/10',
              )}
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Збереження...' : 'Зберегти зміни'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <ThemeColorsPanel accentColor={accentColor} onAccentChange={handleAccentChange} themeMode={theme} />
        </div>
      </div>
    </div>
  );
}
