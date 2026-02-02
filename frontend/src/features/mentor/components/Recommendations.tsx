// frontend/src/features/dashboard/blocks/mentor/Recommendations.tsx

import { useLastDecision } from "@/features/aiDecisionEngine/hooks/useLastDecision"
import { useGetRecommendationsQuery } from "@/features/mentor/services/recommendations.api"

// import { useGetRecommendationsQuery } from '@/features/dailyQuestion/services/recommendations.api'
// import { useLastDecision } from '@/features/aiDecisionEngine/hooks/useLastDecision'

export default function Recommendations() {
  const decision = useLastDecision()

  const enabled = decision?.recommendations?.enabled
  const reason = decision?.recommendations?.reason

  const { data = [], isLoading } = useGetRecommendationsQuery(undefined, {
    skip: !enabled,
  })

  if (!enabled) return null
  if (isLoading) return <div>AI підбирає рекомендації…</div>

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        🧠 Рекомендовано: {reason}
      </p>

      {data.map((rec) => (
        <div key={rec.id} className="rounded-xl border p-4">
          <h4 className="font-semibold">{rec.title}</h4>
          <p className="text-sm opacity-80">{rec.description}</p>
        </div>
      ))}
    </div>
  )
}
