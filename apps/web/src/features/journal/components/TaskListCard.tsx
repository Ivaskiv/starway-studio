// apps/web/src/features/journal/components/TaskListCard.tsx
import type { JournalEvent } from '../types';
import { getTaskStatus, getStatusTone, stripTaskPrefix, getTaskId } from '../utils';
import { getJournalBadgeMeta } from '../eventPresentation';

interface TaskListCardProps {
  events: JournalEvent[];
  onOpen: () => void;
  onComplete: (taskId: string) => void;
  onSkip: (taskId: string) => void;
}

export default function TaskListCard({ events, onOpen, onComplete, onSkip }: TaskListCardProps) {
  const groupedStatus = events.every((event) => getTaskStatus(event) === 'done')
    ? 'done'
    : events.some((event) => getTaskStatus(event) === 'pending')
      ? 'pending'
      : 'missed';

  const groupedTone = getStatusTone(groupedStatus);

  return (
    <div className="w-full rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getJournalBadgeMeta(events[0]).badgeClassName}`}>
            Практика
          </span>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {events.length} {events.length === 1 ? 'завдання' : events.length < 5 ? 'завдання' : 'завдань'} за день
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${groupedTone.chip}`}>
          {groupedStatus === 'done' ? 'Виконано' : groupedStatus === 'missed' ? 'Потребує уваги' : 'Активно'}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {events.map((event) => {
          const status = getTaskStatus(event);
          const tone = getStatusTone(status);
          const taskId = getTaskId(event);
          const eventDate = new Date(event.date);
          const timeLabel = eventDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={event.id}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {stripTaskPrefix(event.title)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {status === 'done'
                      ? 'Завдання виконано і враховане в підсумку дня.'
                      : status === 'missed'
                        ? 'Завдання перенесене або прострочене.'
                        : 'Активне завдання дня. Його статус синхронізується з мікрозавданнями.'}
                  </p>
                </button>

                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tone.chip}`}>
                    {status === 'done' ? 'Виконано' : status === 'missed' ? 'Пропущено' : 'Активно'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{timeLabel}</span>
                </div>
              </div>

              {taskId && status === 'pending' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onComplete(taskId)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tone.chip}`}
                  >
                    Позначити виконаним
                  </button>
                  <button
                    type="button"
                    onClick={() => onSkip(taskId)}
                    className="rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    Перенести
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}