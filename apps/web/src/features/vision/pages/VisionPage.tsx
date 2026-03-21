import { ROUTES } from '@/config/routes';
import { useAccess } from '@/features/auth/hooks/useAccess';
import { GlassCard } from '@/ui';
import { ArrowRight, Lock, Sparkles, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VisionPage() {
  const navigate = useNavigate();
  const { can } = useAccess();
  const locked = !can('mentor.vision');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Бачення</h1>
        <p className="text-white/60 mt-2">Сформуй чіткий образ точки Б і критерії, як ти зрозумієш, що прийшов.</p>
      </div>

      <GlassCard className={`p-6 ${locked ? 'opacity-80 border-white/10' : 'border-[color:rgba(var(--accent-rgb),0.35)]'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              Стратегічне бачення
              {locked ? <Lock className="w-4 h-4 text-amber-300" /> : <Sparkles className="w-4 h-4 text-orange-400" />}
            </h2>
            <p className="text-white/65 mt-2">
              Модуль допомагає сформулювати довгострокову ціль, ключові сфери змін та критерії успіху.
            </p>
          </div>
          <Target className="w-5 h-5 text-white/60" />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {locked ? (
            <button
              type="button"
              onClick={() => navigate(`${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(ROUTES.VISION)}`)}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Відкрити доступ
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(ROUTES.GOALS)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400"
            >
              Перейти до цілей
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
