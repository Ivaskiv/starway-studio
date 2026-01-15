// /frontend/src/features/auth/UsersPage.tsx
import { useGetMeQuery, useUpdateUserMutation } from '@/features/auth/services/auth.api';
import { UserSettings } from '@/types/user.types';
import { GlassCard } from '@/ui';
import EditableCard from '@/ui/EditableCard';
import FormField from '@/ui/FormField';
import { useEffect, useState } from 'react';

interface FormData {
  first_name: string;
  last_name: string;
  settings: UserSettings;
}

export default function UsersPage() {
  const { data: userData, isLoading } = useGetMeQuery();
  const user = userData?.user;

  const [updateUser] = useUpdateUserMutation();

  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    settings: { theme: 'light', language: 'uk' },
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        settings: {
          theme: user.settings?.theme || 'light',
          language: user.settings?.language || 'uk',
        },
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      await updateUser({
        id: user.id,              
        first_name: formData.first_name,
        last_name: formData.last_name,
        settings: formData.settings, 
      }).unwrap();

      console.log('Профіль користувача оновлено!');
    } catch (err) {
      console.error('Помилка оновлення користувача:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <GlassCard className="p-12" data-blur="xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-white/60">Завантаження профілю...</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <EditableCard title="Особиста інформація" onSave={handleSave}>
        {(isEditing) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Ім'я"
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              icon="user"
              readOnly={!isEditing}
            />
            <FormField
              label="Прізвище"
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              icon="user"
              readOnly={!isEditing}
            />
          </div>
        )}
      </EditableCard>
    </div>
  );
}
