// frontend/src/features/settings/pages/SettingsPage.tsx
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUpdateUserSettingsMutation } from '@/features/auth/services/auth.api';
import { cn } from '@/lib/utils';
import { applyAccentColor, saveAccentColor } from '@/shared/utils/accent.utils';
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

  // Синхронізуємо коли user завантажився
  useEffect(() => {
    if (!user) return;
    setAccentColor(user.settings?.accentColor || '#f97316');
    setLanguage((user.settings?.language as 'uk' | 'en' | undefined) || 'uk');
    setTheme(normalizeUiTheme(user.settings?.theme));
  }, [user?.settings?.accentColor, user?.settings?.language, user?.settings?.theme]);

  const hasUnsaved = useMemo(
    () => accentColor !== defaultAccent || language !== defaultLang || theme !== defaultTheme,
    [accentColor, language, theme, defaultAccent, defaultLang, defaultTheme],
  );

  const handleAccentChange = (hex: string) => {
    setAccentColor(hex);
    applyAccentColor(hex); // ✅ Одразу застосовуємо — live preview
  };

  const handleSave = async () => {
    try {
      await updateUserSettings({
        settings: { accentColor, language, theme },
      }).unwrap();
      saveAccentColor(accentColor); // ✅ localStorage + applyAccentColor
      saveUiTheme(theme);
      toast.success('Налаштування збережено');
    } catch (err) {
      console.error('settings save error', err);
      toast.error('Не вдалося зберегти');
    }
  };

  // ✅ Показуємо сторінку завжди — не блокуємо на null
  if (!user)
    return (
      <div className="flex items-center justify-center h-48 text-white/40 text-sm">
        Завантаження...
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      {/* ── Accent color ─────────────────────────────────── */}
      <GlassCard className="p-6 space-y-5 border-white/10 bg-white/4 backdrop-blur-2xl">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-white/50" />
            Акцентний колір
          </h2>
          <p className="text-xs text-white/40 mt-1">
            Обраний колір застосовується до всього інтерфейсу
          </p>
        </div>

        <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-black/20 border border-white/8">
          {/* fix code_x: single custom accent picker without duplicated preset arrays. */}
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
            <span className="text-xs text-white/60">Своє</span>
            <input
              type="color"
              value={accentColor}
              onChange={e => handleAccentChange(e.target.value)}
              className="w-7 h-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
            />
          </label>
        </div>

        {/* Live preview */}
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ background: accentColor }}
        />
      </GlassCard>

      {/* ── Language ─────────────────────────────────────── */}
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

      {/* ── Save ─────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasUnsaved || isLoading}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
            hasUnsaved && !isLoading
              ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20 hover:border-white/40'
              : 'opacity-30 cursor-not-allowed text-white/50 border border-white/10',
          )}
          style={hasUnsaved ? { boxShadow: `0 0 20px ${accentColor}30` } : {}}
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Збереження...' : 'Зберегти зміни'}
        </button>
      </div>
    </div>
  );
}
