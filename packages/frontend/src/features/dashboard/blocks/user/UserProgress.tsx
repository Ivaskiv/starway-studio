// packages/frontend/src/features/dashboard/blocks/user/UserProgress.tsx
import { useGetProgressQuery } from '@/features/progress/services/progress.api'
import { GlassCard } from '@/ui'

export default function UserProgress({ user_id }: { user_id: string }) {
  const { data } = useGetProgressQuery()

  if (!data) return null

  return (
    <GlassCard className="p-6">
      <p className="text-white">XP: {data.xp}</p>
    </GlassCard>
  )
}
