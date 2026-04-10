// apps/web/src/features/journal/components/EventCard.tsx
import { getJournalBadgeMeta } from '../eventPresentation';
import type { JournalEvent } from '../types';
import { stripTaskPrefix } from '../utils';

interface EventCardProps {
  event: JournalEvent;
  onOpen: () => void;
  footer?: string;
  actions?: React.ReactNode;
}

export default function EventCard({ event, onOpen, footer, actions }: EventCardProps) {
  const badgeMeta = getJournalBadgeMeta(event);
  const eventTitle = event.type === 'TASK' ? stripTaskPrefix(event.title) : event.title;
  const shouldHideBadge = event.type === 'REFLECTION' || badgeMeta.label === eventTitle;

  const eventDate = new Date(event.date);
  const isSyntheticMidnightReflection =
    event.type === 'REFLECTION' && eventDate.getHours() === 0 && eventDate.getMinutes() === 0;

  const timeLabel = isSyntheticMidnightReflection
    ? 'Збережено'
    : eventDate.toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-left transition-all duration-200 hover:border-[rgba(var(--accent-rgb),0.18)] hover:bg-[rgba(255,255,255,0.035)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {!shouldHideBadge && (
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeMeta.badgeClassName}`}>
                {badgeMeta.label}
              </span>
            )}
            <p className="text-sm font-semibold text-[var(--text-primary)]">{eventTitle}</p>
          </div>

          {footer && <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{footer}</p>}

          {actions && (
            <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>

        <span className="text-xs text-[var(--text-muted)]">{timeLabel}</span>
      </div>
    </button>
  );
}