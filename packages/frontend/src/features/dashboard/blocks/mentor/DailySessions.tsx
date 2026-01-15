// packages/frontend/src/features/dashboard/blocks/mentor/DailySessions.tsx
import { Button, GlassCard } from '@/ui'
import { Moon, Sun } from 'lucide-react'

export default function DailySessions({ user_id }: { user_id: string }) {
  return (
    <GlassCard className="p-6">
      <h2 className="text-white font-bold mb-4">Сесії</h2>
      <div className="grid grid-cols-2 gap-4">
        <Button><Sun /> Ранкова</Button>
        <Button><Moon /> Вечірня</Button>
      </div>
    </GlassCard>
  )
}
