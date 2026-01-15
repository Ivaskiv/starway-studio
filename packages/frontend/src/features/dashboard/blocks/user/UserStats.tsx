// /frontend/src/features/dashboard/blocks/user/UserStats.tsx

import { GlassCard } from '@/ui';

interface UserStatsProps {
  user_id?: string;
}

export default function UserStats({ user_id }: UserStatsProps) {
  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-2">Статистика користувача</h3>
      <p className="text-gray-500">Прогрес і активності користувача {user_id}</p>
    </GlassCard>
  );
}
