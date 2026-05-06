import { ROUTES } from '@/config/routes';
import { GlassCard } from '@/ui';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TRIAL_CHECKPOINTS = [
  'Який головний зсув стався за цей період?',
  'Що дало найбільше стабільності?',
  'Яка одна звичка дала 80% прогресу?',
  'Що блокує наступний рівень?',
];

export default function TrialMirrorPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Trial Mirror</h1>
        <p className="text-white/60 mt-2">
          Рефлексія після trial-періоду: фіксуємо реальні результати і наступний крок.
        </p>
      </div>

      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          Контрольні питання
        </h2>
        <ul className="mt-4 space-y-3">
          {TRIAL_CHECKPOINTS.map((item) => (
            <li key={item} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white/85">
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.SUBSCRIPTION)}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400"
          >
            Продовжити з Premium
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(ROUTES.JOURNAL)}
            className="rounded-lg border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-white/85 hover:bg-white/5"
          >
            Перейти до журналу
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
