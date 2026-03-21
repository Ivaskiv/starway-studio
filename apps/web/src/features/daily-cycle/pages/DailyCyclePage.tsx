import { ROUTES } from '@/config/routes';
import { GlassCard } from '@/ui';
import { ArrowRight, CheckCircle2, Clock3, HeartPulse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GamificationWidget from '@/features/gamification/components/GamificationWidget';

const STEPS = [
  {
    title: 'Стан дня',
    description: 'Оціни свій поточний стан, рівень напруги та опори.',
    icon: HeartPulse,
  },
  {
    title: 'Вибір дня',
    description: 'Зафіксуй ключове рішення та що вплинуло на нього.',
    icon: CheckCircle2,
  },
  {
    title: 'План дій',
    description: 'Оберіть 1-2 дії, які закріплять нову траєкторію.',
    icon: Clock3,
  },
];

export default function DailyCyclePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Щоденний цикл</h1>
        <p className="text-white/60 mt-2">
          Коротка щоденна практика для стабільного прогресу і чистих рішень.
        </p>
      </div>

      <GamificationWidget />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STEPS.map((step) => (
          <GlassCard key={step.title} className="p-5">
            <step.icon className="w-6 h-6 text-orange-400 mb-3" />
            <h2 className="text-lg font-semibold text-white">{step.title}</h2>
            <p className="text-sm text-white/60 mt-2">{step.description}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-white font-medium">Готовий перейти до практики?</p>
          <p className="text-sm text-white/60 mt-1">Після заповнення переглянь результати у модулі прогресу.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.PROGRESS)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400"
        >
          Перейти до прогресу
          <ArrowRight className="w-4 h-4" />
        </button>
      </GlassCard>
    </div>
  );
}
