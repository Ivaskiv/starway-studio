// frontend/src/features/dashboard/blocks/user/UserProgress.tsx
import { GlassCard } from '../../../../ui';
import { useAuth } from '../../../auth/hooks/useAuth';
import { useGetProgressQuery } from '../../../progress/services/progress.api';

export default function UserProgress() {
  const { user } = useAuth();

  if (!user) return null;

  const { data } = useGetProgressQuery(user.id);

  if (!data) return null;
  return (
    <GlassCard className="p-6">
      <h2 className="text-white font-bold mb-2">Прогрес {user.first_name}</h2>
      <p className="text-white">XP: {data.xp}</p>
      <p className="text-white/60">Рівень: {data.level}</p>
    </GlassCard>
  );
}
