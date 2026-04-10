// frontend/src/features/ai-mentor/pages/MentorLanding.tsx
/**
 * MentorLanding Page
 * Landing page before setup wizard
 */

import { useNavigate } from 'react-router-dom';
import { useGetSetupProgressQuery } from '../services/setup.api';
import { Button, GlassCard } from '@/ui';
import { Sparkles, Target, Calendar, CheckCircle } from 'lucide-react';

export default function MentorLanding() {
  const navigate = useNavigate();
  const { data: progress } = useGetSetupProgressQuery();

  const handleStart = () => {
    if (progress?.currentStep === 'complete') {
      navigate('/dashboard/mentor/workspace');
    } else {
      navigate('/dashboard/mentor/setup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h1 className="text-5xl font-bold text-white mb-4">
            Ментор: Зоряний Шлях
          </h1>
          <p className="text-xl text-white/70">
            Система для усвідомленого життя з щоденною менторською підтримкою
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <GlassCard className="p-6">
            <Target className="w-10 h-10 text-purple-400 mb-3" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Колесо балансу
            </h3>
            <p className="text-white/70">
              Оціни 8 сфер життя та отримай персоналізований аналіз
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <Calendar className="w-10 h-10 text-pink-400 mb-3" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Щоденний цикл
            </h3>
            <p className="text-white/70">
              Ранкові та вечірні питання для підтримки фокусу та рефлексії
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <CheckCircle className="w-10 h-10 text-green-400 mb-3" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Відслідковування прогресу
            </h3>
            <p className="text-white/70">
              Streak, метрики стабільності, аналіз виборів
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <Sparkles className="w-10 h-10 text-yellow-400 mb-3" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Персональний ментор
            </h3>
            <p className="text-white/70">
              Ментор адаптується до твоїх цілей та стилю спілкування
            </p>
          </GlassCard>
        </div>

        {/* How It Works */}
        <GlassCard className="p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Як це працює
          </h2>
          <div className="space-y-4">
            <Step
              number={1}
              title="Створи колесо балансу"
              description="Оціни 8 сфер життя (5 хвилин)"
            />
            <Step
              number={2}
              title="Налаштуй питання"
              description="Обери коли хочеш отримувати питання (3 хвилини)"
            />
            <Step
              number={3}
              title="Почни щоденний цикл"
              description="Менторський контур буде підтримувати тебе щодня"
            />
          </div>
        </GlassCard>

        {/* CTA Button */}
        <div className="text-center">
          <Button
            onClick={handleStart}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-12 py-4 text-lg"
          >
            {progress?.currentStep === 'complete' 
              ? 'Перейти до ментора' 
              : 'Створити ментора'}
          </Button>
          <p className="text-white/50 text-sm mt-4">
            Займе лише 8 хвилин • Безкоштовно 7 днів
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper component
function Step({ number, title, description }: { 
  number: number; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
        {number}
      </div>
      <div>
        <h4 className="text-lg font-semibold text-white">{title}</h4>
        <p className="text-white/60">{description}</p>
      </div>
    </div>
  );
}
