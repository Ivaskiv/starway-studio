import { ROUTES } from '@/config/routes';
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api';
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
  const { data: trial } = useGetTrialStatusQuery();
  const hasAccess = (trial?.isActive ?? false) || (trial?.isPaid ?? false);

  if (!hasAccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 p-6">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="bg-[var(--accent-bg,var(--bg-secondary))] p-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
              ЩОДЕННИЙ ЦИКЛ
            </p>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Зафіксуй свій стан дня
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Ранкові питання та вечірня рефлексія доступні
              з активним тріалом або підпискою.
            </p>
          </div>
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🌞', label: 'Ранкові питання', sub: '6 питань · ~5 хв · о 09:00' },
                { icon: '🌙', label: 'Вечірня рефлексія', sub: 'Афірмації + підсумок · о 21:00' },
              ].map(item => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 text-center"
                >
                  <span className="text-xl">{item.icon}</span>
                  <p className="mt-2 text-xs font-medium text-[var(--text-primary)]">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{item.sub}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:brightness-110"
              onClick={() => navigate('/dashboard/ai-mentor')}
            >
              ▶ Розпочати 7 днів безкоштовно
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] py-3 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)]"
              onClick={() => navigate('/dashboard/subscription')}
            >
              Переглянути плани →
            </button>
          </div>
        </div>
      </div>
    );
  }

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
