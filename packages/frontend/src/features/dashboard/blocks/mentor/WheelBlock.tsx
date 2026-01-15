// packages/frontend/src/features/dashboard/blocks/mentor/WheelBlock.tsx
import { GlassCard } from '@/ui';

interface WheelBlockProps {
  user_id?: string;
}

export default function WheelBlock({ user_id }: WheelBlockProps) {
  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-2">Колесо активностей</h3>
      <p className="text-gray-500">Інтерактивні завдання для користувача {user_id}</p>
    </GlassCard>
  );
}
