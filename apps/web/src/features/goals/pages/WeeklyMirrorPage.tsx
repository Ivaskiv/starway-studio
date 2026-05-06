import { ROUTES } from '@/config/routes';
import { GlassCard } from '@/ui';
import { ArrowRight, CalendarCheck2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WEEKLY_ITEMS = [
  { label: 'Перемоги тижня', helper: 'Що вдалося найкраще і чому?' },
  { label: 'Провали/ризики', helper: 'Де була втрата фокусу?' },
  { label: 'Ключове рішення', helper: 'Що зміниш уже з понеділка?' },
];

export default function WeeklyMirrorPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Weekly Mirror</h1>
        <p className="text-white/60 mt-2">Щотижневий огляд динаміки: результат, перешкоди, фокус наступного тижня.</p>
      </div>

      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <CalendarCheck2 className="w-5 h-5 text-orange-400" />
          Шаблон тижневого огляду
        </h2>
        <div className="mt-4 space-y-3">
          {WEEKLY_ITEMS.map((item) => (
            <div key={item.label} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-white font-medium">{item.label}</p>
              <p className="text-sm text-white/60 mt-1">{item.helper}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.GOALS)}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400"
          >
            Повернутись до цілей
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(ROUTES.JOURNAL)}
            className="rounded-lg border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-white/85 hover:bg-white/5"
          >
            Відкрити журнал
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
