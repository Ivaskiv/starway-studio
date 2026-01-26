// frontend/src/features/dashboard/blocks/mentor/DailySessions.tsx
import { Moon, Sun } from 'lucide-react';
import { Button, GlassCard } from '../../../../ui';
import { useAuth } from '../../../auth/hooks/useAuth';

export default function DailySessions() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <GlassCard className="p-6">
      <h2 className="text-white font-bold mb-4">Сесії</h2>
      <p className="text-gray-400 mb-2">
        Сесії для користувача <strong>{user.first_name}</strong>
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Button>
          <Sun /> Ранкова
        </Button>
        <Button>
          <Moon /> Вечірня
        </Button>
      </div>
    </GlassCard>
  );
}
