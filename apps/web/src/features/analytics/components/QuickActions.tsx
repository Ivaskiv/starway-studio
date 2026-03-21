// features/dashboard/blocks/admin/QuickActions.tsx

import { PlusCircle, Settings } from 'lucide-react';
import { Button, GlassCard } from '../../../ui';

export default function QuickActions() {
  return (
    <GlassCard className="p-6 flex items-center justify-between">
      <Button className="flex items-center gap-2">
        <PlusCircle /> Створити воронку
      </Button>
      <Button className="flex items-center gap-2">
        <Settings /> Налаштування
      </Button>
    </GlassCard>
  );
}
