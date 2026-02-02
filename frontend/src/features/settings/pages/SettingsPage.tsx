import { Globe, Moon, Sun } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Button, GlassCard } from '@/ui';

import {
  useGetMeQuery,
  useUpdateUserSettingsMutation,
} from '@/features/auth/services/auth.api';

import { cn } from '@/lib/utils';
import { useGetThemesQuery } from '@/services/settings.api';
import type { ToggleProps } from '@/shared/types/user.types';
import { GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/ui/GlassCard';

function SettingsToggle({ label, icon, options, value, onChange, disabled }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/60">
          {icon}
        </div>
        <span className="text-sm text-white">{label}</span>
      </div>
      <div className="flex gap-1 p-1 rounded-lg bg-white/5">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium transition-all',
              value === opt.value
                ? 'bg-orange-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: userData } = useGetMeQuery();
  const [updateUserSettings, { isLoading }] = useUpdateUserSettingsMutation();

  const { data: themes } = useGetThemesQuery();

  const [initialized, setInitialized] = useState(false);
  const [formData, setFormData] = useState<{ theme: string; language: 'uk' | 'en' }>({
    theme: '',
    language: 'uk',
  });

  // 🔹 Ініціалізація один раз, синхронізація з бекендом
  useEffect(() => {
    if (!userData?.user?.settings || initialized) return;

    setFormData({
      theme: userData.user.settings.theme || themes?.find(t => t.isDefault)?.id || 'dark',
      language: userData.user.settings.language || 'uk',
    });
    setInitialized(true);
  }, [userData?.user?.settings, themes, initialized]);

  const handleSave = useCallback(async () => {
    if (!userData?.user) return;
    try {
      await updateUserSettings({
        id: userData.user.id,
        // settings: formData,
        // settings: {
        //   theme: formData.theme,
        //   language: formData.language,
        // }
      }).unwrap();
      toast.success('Налаштування збережено');
    } catch {
      toast.error('Не вдалося зберегти налаштування');
    }
  }, [formData, updateUserSettings, userData?.user]);

  if (!userData?.user) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <GlassCard blur="lg">
        <GlassCardHeader>
          <GlassCardTitle className="text-lg">Налаштування</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <SettingsToggle
            label="Тема"
            icon={
              formData.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />
            }
            options={themes?.map(t => ({ value: t.id, label: t.name })) || []}
            value={formData.theme}
            onChange={v => setFormData(prev => ({ ...prev, theme: v }))}
            disabled={isLoading}
          />

          <SettingsToggle
            label="Мова"
            icon={<Globe className="w-4 h-4" />}
            options={[
              { value: 'uk', label: '🇺🇦 UA' },
              { value: 'en', label: '🇬🇧 EN' },
            ]}
            value={formData.language}
            onChange={v => setFormData(prev => ({ ...prev, language: v as 'uk' | 'en' }))}
            disabled={isLoading}
          />
        </GlassCardContent>
      </GlassCard>

      <Button color="orange" size="sm" onClick={handleSave} disabled={isLoading}>
        Зберегти
      </Button>
    </div>
  );
}
