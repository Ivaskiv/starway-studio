// /frontend/src/features/dashboard/blocks/mentor/GoalsProgress.tsx

import { GlassCard } from '@/ui';

interface GoalsProgressProps {
  user_id?: string;
}

export default function GoalsProgress({ user_id }: GoalsProgressProps) {
  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-2">Прогрес цілей</h3>
      <p className="text-gray-500">Прогрес користувача {user_id} відображається тут.</p>
    </GlassCard>
  );
}
