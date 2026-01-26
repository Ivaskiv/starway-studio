// frontend/src/features/dashboard/blocks/mentor/Recommendations.tsx

import { Recommendation } from '../../../../shared/types/mentor.types';
import { useGetCourseRecommendationsQuery } from '../../../../templates/ai-mentor';
import { GlassCard } from '../../../../ui';

import { useAuth } from '../../../auth/hooks/useAuth';

export default function Recommendations() {
  const { user } = useAuth();
  if (!user) return null;

  const { data = [] } = useGetCourseRecommendationsQuery(user.id);

  if (!data.length) return null;

  return (
    <GlassCard className="p-6">
      <h2 className="text-white font-bold mb-3">Рекомендації</h2>
      {data.map((r: Recommendation) => (
        <p key={r.code} className="text-white/70">
          {r.title}
        </p>
      ))}
    </GlassCard>
  );
}
