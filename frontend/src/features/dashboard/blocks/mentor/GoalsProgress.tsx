// /frontend/src/features/dashboard/blocks/mentor/GoalsProgress.tsx

import { GlassCard } from "../../../../ui";
import { useAuth } from "../../../auth/hooks/useAuth";

export default function GoalsProgress() {
const {user} =useAuth();
if(!user) return null; 
  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-2">Прогрес цілей</h3>
      <p className="text-gray-500">Прогрес користувача {user.first_name}</p>
    </GlassCard>
  );
}
