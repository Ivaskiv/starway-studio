// frontend/src/features/dashboard/blocks/user/UserProducts.tsx

import { GlassCard } from '../../../ui';

export default function UserProducts() {
  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-2">Ваші продукти</h3>
      <p className="text-gray-500">Тут користувач бачить свої підписки та курси.</p>
    </GlassCard>
  );
}
