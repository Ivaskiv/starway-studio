// frontend/src/features/ai-generator/pages/AIProducerConsolePage.tsx
import { Button, GlassCard } from '@/ui';
import { ROUTES } from '@/config/routes';
import { ArrowRight, Bot, Cog, Crown, Gem, Layers, Rocket, Sparkles, Star } from 'lucide-react';
import { selectCurrentUser } from '@/features/auth/services/auth.slice';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ATTEMPTS_PER_STEP, STEP_DEFINITIONS, TOTAL_STEPS } from '@/features/products/types/generator.types';

const LANES = [
  {
    title: 'Discovery',
    hint: 'Діагностика, формат, аудиторія',
    steps: [1, 2, 3],
    icon: Sparkles,
  },
  {
    title: 'Monetization',
    hint: 'Модель доходу, продукти, щоденна логіка',
    steps: [4, 5, 6, 7],
    icon: Layers,
  },
  {
    title: 'Activation',
    hint: 'Звіти, Telegram, miniapp, фінальна воронка',
    steps: [8, 9, 10, 11],
    icon: Bot,
  },
] as const;

const GAMIFICATION_LEVELS = [
  { icon: Star, label: 'Start', minStep: 1 },
  { icon: Rocket, label: 'Builder', minStep: 6 },
  { icon: Crown, label: 'Producer', minStep: 11 },
] as const;

export default function AIProducerConsolePage() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const completedByDefault = useMemo(() => {
    const storageKey = `starway_ai_producer_state_v1:${currentUser?.id || 'anonymous'}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return 1;
      const parsed = JSON.parse(raw) as { currentStep?: number };
      return Math.max(1, Number(parsed.currentStep || 1));
    } catch {
      return 1;
    }
  }, [currentUser?.id]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <GlassCard className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45 mb-2">AI Producer Console</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-white">Workflow-дошка 11 кроків</h1>
            <p className="text-white/60 mt-2 max-w-3xl">
              {/* fix code_x: dedicated workflow board screen for AI Producer phases before generation flow. */}
              Послідовно проходь фази від діагностики до запуску воронки. Кожна фаза має один
              фінальний вихід і готує дані для наступної.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {GAMIFICATION_LEVELS.map((level) => {
                const Icon = level.icon;
                const isActive = completedByDefault >= level.minStep;
                return (
                  <div
                    key={level.label}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                      isActive
                        ? 'border-[color:rgba(var(--accent-rgb),0.65)] bg-[color:rgba(var(--accent-rgb),0.18)] text-white shadow-[0_0_16px_rgba(var(--accent-rgb),0.32)]'
                        : 'border-white/15 bg-white/[0.04] text-white/45'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-white/35'}`} />
                    {level.label}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2 text-xs text-white/80">
              <Gem className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              {TOTAL_STEPS} кроків • {TOTAL_STEPS * ATTEMPTS_PER_STEP} генерації
            </div>
            <Button className="btn rounded-xl bg-white/10 border-white/20" onClick={() => navigate(ROUTES.AI_GENERATOR)}>
              <Cog className="w-4 h-4" />
              Відкрити генератор
            </Button>
            <Button
              className="btn rounded-xl bg-[color:rgba(var(--accent-rgb),0.78)] border-[color:rgba(var(--accent-rgb),0.95)]"
              onClick={() => navigate(ROUTES.AI_GENERATOR)}
            >
              Почати фази
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {LANES.map((lane) => {
          const Icon = lane.icon;
          // fix code_x: lane.steps should compare with step.number (not object itself).
          const steps = STEP_DEFINITIONS.filter((step) => lane.steps.some((n) => n === step.number));

          return (
            <GlassCard key={lane.title} className="p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5 text-[var(--color-accent)]" />
                <h2 className="text-lg font-semibold text-white">{lane.title}</h2>
              </div>
              <p className="text-sm text-white/55 mb-4">{lane.hint}</p>

              <div className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-white">
                      {step.number}. {step.title}
                    </p>
                    <p className="text-xs text-white/55 mt-1">{step.expectedOutput || step.description}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
