import { ROUTES } from '@/config/routes';
import { useAppSelector } from '@/app/hooks';
import { useGetWheelHistoryQuery } from '@/features/wheel/api';
import { WHEEL_TEXTS } from '@/features/wheel/constants/texts';
import { isWheelSphereId, WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types';
import { Button } from '@/ui';
import { History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WheelHistoryProps {
  userId: string;
  showLegend?: boolean;
}

// fix code_x: lightweight fallback history component while legacy history API is absent.
export function WheelHistory({
  userId,
  showLegend = true,
}: WheelHistoryProps) {
  const navigate = useNavigate();
  const me = useAppSelector(s => s.auth.user);
  const { data: history = [], isLoading, isError } = useGetWheelHistoryQuery({ userId, limit: 12 });
  const userName =
    me?.firstName?.trim() || me?.name?.trim() || me?.email?.split('@')[0] || 'користувача';

  const labelById = new Map(WHEEL_CATEGORIES.map(i => [i.id, i.nameUk]));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2">
        <History className="h-4.5 w-4.5 text-orange-400" />
        <h2 className="text-base font-semibold text-white">{WHEEL_TEXTS.history.title}</h2>
      </div>

      {isLoading && <p className="text-sm text-white/60">{WHEEL_TEXTS.history.loading}</p>}
      {isError && (
        <p className="text-sm text-rose-300/90">
          {WHEEL_TEXTS.history.error}
        </p>
      )}

      {!isLoading && !isError && history.length === 0 && (
        <p className="text-sm text-white/60">
          {WHEEL_TEXTS.history.empty(userName)}
        </p>
      )}

      {!isLoading && !isError && history.length > 0 && (
        <div className="flex-1 space-y-3">
          {history.map(item => (
            <div key={item.id} className="text-sm text-white/75">
              <p className="text-white/85">
                {new Date(item.createdAt).toLocaleDateString('uk-UA')} — {item.averageScore.toFixed(1)} —{' '}
                {isWheelSphereId(item.gaps?.[0]) ? (labelById.get(item.gaps[0]) ?? item.gaps[0]) : item.gaps?.[0] || '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 ? (
        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={() => navigate(ROUTES.JOURNAL)}
            size="sm"
            className="hero-cta-primary w-full justify-center"
          >
            {WHEEL_TEXTS.history.journalCta}
          </Button>
        </div>
      ) : null}

      {showLegend ? (
        <div className="mt-3 grid gap-1.5 border-t border-white/10 pt-3">
          {WHEEL_CATEGORIES.map(category => (
            <div
              key={category.id}
              className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-white/70"
            >
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-white/25" />
              <span className="font-medium text-white/80">{category.nameUk}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default WheelHistory;
