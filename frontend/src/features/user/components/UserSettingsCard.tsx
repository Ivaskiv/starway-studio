import {
  useGetMeQuery,
  useUpdateUserSettingsMutation,
} from '@/features/auth/services/auth.api';
import { cn } from '@/lib/utils';
import { Button, GlassCard } from '@/ui';
import { Globe, Moon, Sun, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

// ==========================
// Типи для Toggle
// ==========================
interface ToggleOption<T> {
  value: T;
  label: string;
}

interface SettingsToggleProps<T extends string> {
  label: string;
  icon: React.ReactNode;
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

// ==========================
// Компонент Toggle
// ==========================
function SettingsToggle<T extends string>({
  label,
  icon,
  options,
  value,
  onChange,
  disabled,
}: SettingsToggleProps<T>) {
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

// ==========================
// UserSettingsCard
// ==========================
interface Props {
  userId?: string; // якщо хочемо показати налаштування іншого користувача
}

export default function UserSettingsCard({ userId }: Props) {
  const { data: meData } = useGetMeQuery();
  const [updateUser] = useUpdateUserSettingsMutation();

  // Локальний state для теми і мови
  const [formData, setFormData] = useState<{ theme: 'light' | 'dark'; language: 'uk' | 'en' }>({
    theme: 'dark',
    language: 'uk',
  });

  // ==========================
  // Ініціалізація з бекенду
  // ==========================
  useEffect(() => {
    const userSettings = userId ? undefined : meData?.user?.settings;
    if (userSettings) {
      setFormData({
        theme: userSettings.theme || 'dark',
        language: userSettings.language || 'uk',
      });
    }
  }, [meData?.user?.settings, userId]);

  // ==========================
  // Збереження налаштувань
  // ==========================
  const handleSave = useCallback(async () => {
    if (!meData?.user) return;
    try {
      await updateUser({
        id: meData.user.id,
        settings: formData, // правильні типи для TS
      }).unwrap();
      toast.success('Налаштування збережено!');
    } catch {
      toast.error('Не вдалося зберегти налаштування');
    }
  }, [formData, updateUser, meData?.user]);

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-blue-400" />
        Налаштування користувача
      </h3>

      {/* Toggle для теми */}
      <SettingsToggle<'light' | 'dark'>
        label="Тема"
        icon={
          formData.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />
        }
        options={[
          { value: 'light', label: '☀️ Світла' },
          { value: 'dark', label: '🌙 Темна' },
        ]}
        value={formData.theme}
        onChange={v => setFormData(prev => ({ ...prev, theme: v }))}
      />

      {/* Toggle для мови */}
      <SettingsToggle<'uk' | 'en'>
        label="Мова"
        icon={<Globe className="w-4 h-4" />}
        options={[
          { value: 'uk', label: '🇺🇦 UA' },
          { value: 'en', label: '🇬🇧 EN' },
        ]}
        value={formData.language}
        onChange={v => setFormData(prev => ({ ...prev, language: v }))}
      />

      <Button color="orange" size="sm" className="mt-4" onClick={handleSave}>
        Зберегти
      </Button>
    </GlassCard>
  );
}
