import { Button } from '@/ui';
import { ChevronRight, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WHEEL_CATEGORIES, type WheelScore } from '../types/wheel.types';
import { WheelChart } from './WheelChart';

interface WheelSummaryProps {
  scores: WheelScore[] | null;
  average_score?: number;
  canFill?: boolean;
  daysUntilNext?: number;
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

export const WheelSummary = ({
  scores,
  average_score,
  canFill = true,
  daysUntilNext = 0,
  compact = false,
  showActions = true,
  className = '',
}: WheelSummaryProps) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const stats = useMemo(() => {
    if (!scores || scores.length === 0) return null;

    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const total = scores.reduce((sum, s) => sum + s.score, 0);
    const avg = average_score ?? total / scores.length;

    return {
      average: avg,
      total,
      strengths: sorted.slice(0, 3),
      gaps: sorted.slice(-3).reverse(),
    };
  }, [scores, average_score]);

  const getCategory = (id: string) => WHEEL_CATEGORIES.find(c => c.id === id);

  /* ───────────── EMPTY STATE ───────────── */
  if (!scores || scores.length === 0) {
    return (
      <div
        className={`
          relative rounded-2xl overflow-hidden
          transition-all duration-300
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          ${className}
        `}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-3xl rounded-full" />

        <div className="relative z-10 flex flex-col items-center text-center py-8 px-4">
          <div className="w-20 h-20 rounded-2xl bg-orange-500/15 flex items-center justify-center mb-4 border border-orange-500/20">
            <Sparkles className="w-10 h-10 text-orange-400" />
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">Колесо балансу</h3>

          <p className="text-white/50 text-sm mb-6 max-w-xs">
            Оціни 8 сфер життя та отримай персональний AI-аналіз
          </p>

          {canFill ? (
            <Button onClick={() => navigate('/dashboard/wheel')}>Заповнити колесо</Button>
          ) : (
            <div className="text-white/40 text-sm">Доступно через {daysUntilNext} дн.</div>
          )}
        </div>
      </div>
    );
  }

  /* ───────────── FILLED STATE ───────────── */
  return (
    <div
      className={`
        relative rounded-2xl overflow-hidden
        transition-all duration-300
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${className}
      `}
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 blur-3xl rounded-full" />
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Колесо балансу</h3>
          </div>

          {showActions && (
            <Button
              onClick={() => navigate('/dashboard/wheel')}
              className="flex items-center gap-1 text-sm text-white/50 hover:text-orange-400"
            >
              Детальніше
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className={`flex ${compact ? 'flex-col items-center' : 'gap-6'}`}>
          <WheelChart
            scores={scores}
            size={compact ? 200 : 240}
            showEmoji={!compact}
            glowIntensity={compact ? 'low' : 'medium'}
          />

          {stats && !compact && (
            <div className="flex-1 space-y-4">
              <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-4xl font-bold text-orange-400">{stats.average.toFixed(1)}</div>
                <div className="text-white/40 text-sm">Середній бал</div>
              </div>

              {/* Strengths */}
              <div>
                <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                  <TrendingUp className="w-4 h-4" />
                  Сильні сторони
                </div>
                <div className="flex gap-2 flex-wrap">
                  {stats.strengths.map(s => {
                    const cat = getCategory(s.category_id);
                    return (
                      <div
                        key={s.category_id}
                        className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
                      >
                        {cat?.emoji} {s.score}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gaps */}
              <div>
                <div className="flex items-center gap-2 text-orange-400 text-sm mb-2">
                  <Target className="w-4 h-4" />
                  Для розвитку
                </div>
                <div className="flex gap-2 flex-wrap">
                  {stats.gaps.map(s => {
                    const cat = getCategory(s.category_id);
                    return (
                      <div
                        key={s.category_id}
                        className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm"
                      >
                        {cat?.emoji} {s.score}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {showActions && !compact && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <Button fullWidth disabled={!canFill} onClick={() => navigate('/dashboard/wheel')}>
              {canFill ? 'Оновити оцінку' : `Доступно через ${daysUntilNext} дн.`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WheelSummary;
