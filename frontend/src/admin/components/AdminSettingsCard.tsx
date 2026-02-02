// frontend/src/admin/components/AdminSettingsCard.tsx

import { Settings } from 'lucide-react';
// import { AdminSettings } from '@/frontend/srcshared/types/profile.types'
import { Button, GlassCard } from '../../ui';
import { useGetAdminSettingsQuery, useUpdateAdminSettingsMutation } from '../services/admin.api';

interface Props {
  adminId: string;
}

export default function AdminSettingsCard({ adminId }: Props) {
  const { data: settings, isLoading } = useGetAdminSettingsQuery(adminId);
  const [updateSettings] = useUpdateAdminSettingsMutation();

  if (isLoading || !settings) return null;

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-purple-400" />
        Налаштування адміністратора
      </h3>

      {/* Тут можна додати toggle чи input для adminSettings */}
      <Button onClick={() => updateSettings({ adminId, settings })}>Оновити налаштування</Button>
    </GlassCard>
  );
}
