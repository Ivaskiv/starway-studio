// frontend/src/features/dashboard/blocks/mentor/WheelBlock.tsx
import { GlassCard } from "../../../../ui";
import { useAuth } from "../../../auth/hooks/useAuth";

export default function WheelBlock() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-2">Колесо активностей</h3>
      <p className="text-gray-400">
        Інтерактивні завдання для користувача <strong>{user.first_name}</strong>
      </p>
    </GlassCard>
  );
}
