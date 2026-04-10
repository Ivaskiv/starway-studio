import { ROUTES } from '@/config/routes';
import { useAppSelector } from '@/app/hooks';
import { useGetWheelHistoryQuery } from '@/features/wheel/api';
import type { WheelAssessment } from '@/features/wheel/types/wheel.types';
import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types';
import { Button, GlassCard } from '@/ui';
import { CalendarClock, Download, Eye, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WheelHistoryProps {
  userId: string;
  onViewPdf?: (wheel: WheelAssessment) => void;
  onDownloadPdf?: (wheel: WheelAssessment) => void;
}

// fix code_x: lightweight fallback history component while legacy history API is absent.
export function WheelHistory({ userId, onViewPdf, onDownloadPdf }: WheelHistoryProps) {
  const navigate = useNavigate();
  const me = useAppSelector(s => s.auth.user);
  const { data: history = [], isLoading, isError } = useGetWheelHistoryQuery({ userId, limit: 12 });
  const userName =
    me?.firstName?.trim() || me?.name?.trim() || me?.email?.split('@')[0] || 'користувача';

  const labelById = new Map(WHEEL_CATEGORIES.map(i => [i.id, i.nameUk]));

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-5 h-5 text-orange-400" />
        <h2 className="text-lg font-semibold text-white">Історія колеса</h2>
      </div>

      {isLoading && <p className="text-sm text-white/60">Завантаження історії...</p>}
      {isError && (
        <p className="text-sm text-rose-300/90">
          Не вдалося завантажити історію. Спробуйте ще раз трохи пізніше.
        </p>
      )}

      {!isLoading && !isError && history.length === 0 && (
        <p className="text-sm text-white/60">
          Для <span className="text-white/80">{userName}</span> ще немає збережених оцінок колеса.
        </p>
      )}

      {!isLoading && !isError && history.length > 0 && (
        <div className="space-y-2">
          {history.map(item => (
            <div key={item.id} className="rounded-xl border border-white/12 bg-white/[0.04] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">
                    {new Date(item.createdAt).toLocaleDateString('uk-UA')} •{' '}
                    <span className="text-white/75">середній бал {item.averageScore.toFixed(1)}</span>
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Слабка сфера: {labelById.get(item.gaps?.[0] || '') || item.gaps?.[0] || '—'} • Фокус:{' '}
                    {labelById.get(item.strengths?.[0] || '') || item.strengths?.[0] || '—'}
                  </p>
                </div>
                {onViewPdf || onDownloadPdf ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {onViewPdf ? (
                      <button
                        type="button"
                        onClick={() => onViewPdf(item)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.08] hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Перегляд
                      </button>
                    ) : null}
                    {onDownloadPdf ? (
                      <button
                        type="button"
                        onClick={() => onDownloadPdf(item)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.08] hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button
          onClick={() => navigate(ROUTES.PROGRESS)}
          className="inline-flex items-center gap-2 bg-white/10 text-white hover:bg-white/20"
        >
          <CalendarClock className="w-4 h-4" />
          Перейти до прогресу
        </Button>
      </div>

      <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2">
        {WHEEL_CATEGORIES.map(category => (
          <div
            key={category.id}
            className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-white/70"
          >
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-white/25" />
            <span className="font-medium text-white/80">{category.nameUk}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export default WheelHistory;
