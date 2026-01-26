// frontend/src/features/dashboard/blocks/mentor/MentorStats.tsx
import { useGetGamificationStateQuery } from '../../../../templates/ai-mentor'
import { GlassCard } from '../../../../ui'
import { useAuth } from '../../../auth/hooks/useAuth'

export default function MentorStats() {
 const { user } = useAuth()

  if (!user) return null

  const { data } = useGetGamificationStateQuery(user.id)

  if (!data) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <GlassCard className="p-4">🔥 {data.streak_days} днів</GlassCard>
      <GlassCard className="p-4">⭐ XP: {data.xp}</GlassCard>
      <GlassCard className="p-4">🎯 Рівень {data.level}</GlassCard>
    </div>
  )
}
