// packages/frontend/src/features/dashboard/blocks/mentor/Recommendations.tsx
import { useGetCourseRecommendationsQuery } from '@/templates/ai-mentor/services/aiMentor.api'
import { GlassCard } from '@/ui'

export default function Recommendations({ user_id }: { user_id: string }) {
  const { data = [] } = useGetCourseRecommendationsQuery(user_id)

  if (!data.length) return null

  return (
    <GlassCard className="p-6">
      <h2 className="text-white font-bold mb-3">Рекомендації</h2>
      {data.map(r => (
        <p key={r.code} className="text-white/70">{r.title}</p>
      ))}
    </GlassCard>
  )
}
