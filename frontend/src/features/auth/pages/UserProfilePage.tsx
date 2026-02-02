// frontend/src/features/auth/pages/UserProfilePage.tsx
// Оптимізована версія з glassmorphism стилями, RTK Query та Abilities
import { cn } from '@/lib/utils';
import { FormData } from '@/shared/types/profile.types';
import { UserSettings } from '@/shared/types/user.types';
import { Button, GlassCard, Input } from '@/ui';
import { GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/ui/GlassCard';
import { Globe, Moon, Save, Sun, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useGetMeQuery, useUpdateUserSettingsMutation } from '../services/auth.api';

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <GlassCard blur="lg">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-white/10" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-32 bg-white/10 rounded" />
            <div className="h-4 w-48 bg-white/5 rounded" />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function UserAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  return (
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
      <span className="text-xl font-bold text-white">{initials}</span>
    </div>
  );
}

interface SettingsToggleProps {
  label: string;
  icon: React.ReactNode;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function SettingsToggle({ label, icon, options, value, onChange, disabled }: SettingsToggleProps) {
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

export default function UserProfilePage() {
  const { data: meData, isLoading } = useGetMeQuery();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserSettingsMutation();
  const user = meData?.user;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    settings: { theme: 'dark', language: 'uk' },
  });

  useEffect(() => {
    if (!user) return;
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      settings: {
        theme: user.settings?.theme ?? 'dark',
        language: user.settings?.language ?? 'uk',
      },
    });
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    try {
      await updateUser({
        id: user.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        settings: formData.settings as UserSettings,
      }).unwrap();
      setIsEditing(false);
      toast.success('Профіль оновлено! ✨');
    } catch (err) {
      toast.error('Помилка оновлення профілю');
      console.error(err);
    }
  }, [user, formData, updateUser]);

  const handleCancel = useCallback(() => {
    if (!user) return;
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      settings: {
        theme: user.settings?.theme ?? 'dark',
        language: user.settings?.language ?? 'uk',
      },
    });
    setIsEditing(false);
  }, [user]);

  if (isLoading || !user) return <ProfileSkeleton />;

  const fullName = `${formData.firstName} ${formData.lastName}`.trim();

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <GlassCard blur="xl" hover glow>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <UserAvatar name={fullName || user.email || 'Користувач'} />
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-xl font-bold text-white">{fullName || 'Користувач'}</h1>
            <p className="text-white/60 text-sm">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  color="gray"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  Скасувати
                </Button>
                <Button
                  color="orange"
                  size="sm"
                  onClick={handleSave}
                  isLoading={isUpdating}
                  leftIcon={Save}
                >
                  Зберегти
                </Button>
              </>
            ) : (
              <Button variant="glass" color="white" size="sm" onClick={() => setIsEditing(true)}>
                Редагувати
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Personal Info */}
      <GlassCard blur="lg">
        <GlassCardHeader>
          <GlassCardTitle>Особиста інформація</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <Input
            label="Ім'я"
            value={formData.firstName}
            onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            icon={User}
            disabled={!isEditing || isUpdating}
          />
          <Input
            label="Прізвище"
            value={formData.lastName}
            onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            icon={User}
            disabled={!isEditing || isUpdating}
          />
        </GlassCardContent>
      </GlassCard>

      {/* Settings */}
      <GlassCard blur="lg">
        <GlassCardHeader>
          <GlassCardTitle>Налаштування</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <SettingsToggle
            label="Тема"
            icon={formData.settings.theme === 'dark' ? <Moon /> : <Sun />}
            options={[
              { value: 'light', label: '☀️ Світла' },
              { value: 'dark', label: '🌙 Темна' },
            ]}
            value={formData.settings.theme ?? 'dark'}
            onChange={v =>
              setFormData(prev => ({
                ...prev,
                settings: { ...prev.settings, theme: v as 'light' | 'dark' },
              }))
            }
            disabled={!isEditing || isUpdating}
          />
          <SettingsToggle
            label="Мова"
            icon={<Globe />}
            options={[
              { value: 'uk', label: '🇺🇦 UA' },
              { value: 'en', label: '🇬🇧 EN' },
            ]}
            value={formData.settings.language ?? 'uk'}
            onChange={v =>
              setFormData(prev => ({
                ...prev,
                settings: { ...prev.settings, language: v as 'uk' | 'en' },
              }))
            }
            disabled={!isEditing || isUpdating}
          />
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}
