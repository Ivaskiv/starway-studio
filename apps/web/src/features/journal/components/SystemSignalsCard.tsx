// apps/web/src/features/journal/components/SystemSignalsCard.tsx
import { useState, useMemo } from 'react';
import type { JournalEvent } from '../types';
import { getJournalBadgeMeta } from '../eventPresentation';

interface SystemSignalsCardProps {
  events: JournalEvent[];
  onOpen: () => void;
}

export default function SystemSignalsCard({ events, onOpen }: SystemSignalsCardProps) {
  const [channelFilter, setChannelFilter] = useState<'all' | 'app' | 'telegram'>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'reflection' | 'subscription' | 'weekly'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 4;

  const normalizedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
  );

  const filteredEvents = useMemo(() => {
    return normalizedEvents.filter((event) => {
      const channel = event.meta?.channel === 'TELEGRAM' ? 'telegram' : 'app';
      const title = event.title.toLowerCase();
      const signalKind = title.includes('підпис')
        ? 'subscription'
        : title.includes('тижнев')
          ? 'weekly'
          : title.includes('рефлекс')
            ? 'reflection'
            : 'all';

      const matchesChannel = channelFilter === 'all' || channel === channelFilter;
      const matchesKind = kindFilter === 'all' || signalKind === kindFilter;
      return matchesChannel && matchesKind;
    });
  }, [channelFilter, kindFilter, normalizedEvents]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredEvents.slice((safePage - 1) * pageSize, safePage * pageSize);

  const channelFilters = [
    { value: 'all' as const, label: 'Усі канали' },
    { value: 'app' as const, label: 'У застосунку' },
    { value: 'telegram' as const, label: 'Telegram' },
  ];

  const kindFilters = [
    { value: 'all' as const, label: 'Усі сигнали' },
    { value: 'reflection' as const, label: 'Рефлексія' },
    { value: 'subscription' as const, label: 'Підписка' },
    { value: 'weekly' as const, label: 'Звіти' },
  ];

  return (
    <div className="w-full rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getJournalBadgeMeta(events[0]).badgeClassName}`}>
            Нагадування
          </span>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {events.length} {events.length === 1 ? 'сигнал' : events.length < 5 ? 'сигнали' : 'сигналів'} за день
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {channelFilters.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setChannelFilter(option.value);
              setPage(1);
            }}
            className={[
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
              channelFilter === option.value
                ? 'border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.12)] text-[var(--text-primary)]'
                : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {kindFilters.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setKindFilter(option.value);
              setPage(1);
            }}
            className={[
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
              kindFilter === option.value
                ? 'border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.12)] text-[var(--text-primary)]'
                : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {pageItems.map((event) => {
          const eventDate = new Date(event.date);
          const timeLabel = eventDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
          const preview = typeof event.meta?.preview === 'string' ? event.meta.preview : 'Сигнал синхронізовано між каналами.';
          const channel = event.meta?.channel === 'TELEGRAM' ? 'Telegram' : 'У застосунку';

          return (
            <button
              key={event.id}
              type="button"
              onClick={onOpen}
              className="flex w-full items-start justify-between gap-3 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] px-3 py-3 text-left transition-all duration-200 hover:border-[rgba(var(--accent-rgb),0.18)] hover:bg-[rgba(255,255,255,0.035)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{event.title}</p>
                  <span className="rounded-full border border-[rgba(255,255,255,0.08)] px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    {channel}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{preview}</p>
              </div>
              <span className="text-xs text-[var(--text-muted)]">{timeLabel}</span>
            </button>
          );
        })}

        {pageItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.08)] px-3 py-4 text-sm leading-6 text-[var(--text-muted)]">
            За цими фільтрами сигналів зараз немає. Перемкни канал або тип.
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          Показано {pageItems.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
          {pageItems.length > 0 ? `–${(safePage - 1) * pageSize + pageItems.length}` : ''} із {filteredEvents.length}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((c) => Math.max(1, c - 1))}
            disabled={safePage === 1}
            className="rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            Назад
          </button>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {safePage}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
            disabled={safePage === totalPages}
            className="rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            Далі
          </button>
        </div>
      </div>
    </div>
  );
}