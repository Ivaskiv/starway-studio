// frontend/src/features/mirrors/pages/TrialMirrorPage.tsx
/**
 * TrialMirrorPage - Day 4 or Day 7 mirror
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useGetTrialMirrorQuery } from '../services/mirror.api';
import { MirrorCard } from '../components/MirrorCard';
import { PatternAnalysis } from '../components/PatternAnalysis';
import { Button, GlassCard } from '@/ui';
import { ArrowLeft, Zap } from 'lucide-react';

export default function TrialMirrorPage() {
  const { day } = useParams<{ day: '4' | '7' }>();
  const navigate = useNavigate();
  
  const mirrorDay = day === '7' ? 7 : 4;
  const { data: mirror, isLoading } = useGetTrialMirrorQuery({ day: mirrorDay });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-lg">Завантаження дзеркала...</div>
      </div>
    );
  }

  if (!mirror) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
        <div className="max-w-3xl mx-auto">
          <GlassCard className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Дзеркало ще не готове
            </h2>
            <p className="text-white/70 mb-6">
              Дзеркало дня {mirrorDay} буде доступне після завершення відповідного періоду
            </p>
            <Button onClick={() => navigate('/dashboard/mentor')}>
              Повернутись до ментора
            </Button>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          onClick={() => navigate('/dashboard/mentor')}
          variant="ghost"
          className="mb-6 text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад до ментора
        </Button>

        {/* Mirror Card */}
        <div className="mb-6">
          <MirrorCard mirror={mirror} />
        </div>

        {/* Pattern Analysis */}
        {mirror.statePattern && mirror.mainDrain && (
          <div className="mb-6">
            <PatternAnalysis
              statePattern={mirror.statePattern}
              mainDrain={mirror.mainDrain}
            />
          </div>
        )}

        {/* Day 7 CTA */}
        {mirrorDay === 7 && (
          <GlassCard className="p-8 text-center bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50">
            <h2 className="text-2xl font-bold text-white mb-3">
              Trial завершено! 🎉
            </h2>
            <p className="text-white/80 mb-6">
              Ти пройшла 7 днів з AI-ментором. Бачиш прогрес? 
              Продовж подорож з повним доступом!
            </p>
            <Button
              onClick={() => navigate('/subscription')}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Zap className="w-5 h-5 mr-2" />
              Оформити підписку
            </Button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}