import { ROUTES } from '@/config/routes';
import { useAccess } from '@/features/auth/hooks/useAccess';
import { GlassCard } from '@/ui';
import { ArrowRight, CheckSquare, Lock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ACTION_BLOCKS = [
  {
    title: 'Фокус дня',
    description: 'Одна головна дія, яка рухає до первинної цілі.',
    icon: Zap,
  },
  {
    title: 'Підтвердження дій',
    description: 'Що зроблено і який результат отримано за день.',
    icon: CheckSquare,
  },
];

export default function ActionsPage() {
  const navigate = useNavigate();
  const { can } = useAccess();
  const locked = !can('mentor.actions');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Дії</h1>
        <p className="text-white/60 mt-2">Системна щоденна дисципліна: мінімум хаосу, максимум результату.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACTION_BLOCKS.map((block) => (
          <GlassCard key={block.title} className={`p-5 ${locked ? 'opacity-70' : ''}`}>
            <block.icon className="w-6 h-6 text-orange-400 mb-3" />
            <h2 className="text-lg font-semibold text-white">{block.title}</h2>
            <p className="text-sm text-white/60 mt-2">{block.description}</p>
          </GlassCard>
        ))}
      </div>

      {locked ? (
        <GlassCard className="p-5 border-white/10">
          <p className="text-white flex items-center gap-2 font-medium">
            <Lock className="w-4 h-4 text-amber-300" />
            Модуль дій доступний у Premium
          </p>
          <button
            type="button"
            onClick={() => navigate(`${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(ROUTES.ACTIONS)}`)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            Оформити підписку
            <ArrowRight className="w-4 h-4" />
          </button>
        </GlassCard>
      ) : (
        <GlassCard className="p-5">
          <p className="text-white/80">Доступ активний. Продовжуй і дивись динаміку в журналі шляху.</p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.JOURNAL)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400"
          >
            Відкрити журнал
            <ArrowRight className="w-4 h-4" />
          </button>
        </GlassCard>
      )}
    </div>
  );
}
