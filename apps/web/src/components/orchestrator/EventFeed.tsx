import { cn } from '@/lib/utils';

export interface OrchestratorEventItem {
  id: string;
  type: string;
  timestamp: string;
  channel?: 'web' | 'telegram' | 'miniapp';
  summary?: string;
}

interface EventFeedProps {
  events: OrchestratorEventItem[];
  className?: string;
}

const channelBadgeTone: Record<NonNullable<OrchestratorEventItem['channel']>, string> = {
  web: 'bg-slate-300/10 text-slate-100',
  telegram: 'bg-blue-300/12 text-blue-100',
  miniapp: 'bg-sky-300/12 text-sky-100',
};

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}

export default function EventFeed({ events, className }: EventFeedProps) {
  const recentEvents = events.slice(0, 10);

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_30%,rgba(17,20,36,0.24)),radial-gradient(circle_at_bottom_left,rgba(104,139,255,0.16),transparent_38%)]" />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Event Feed</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Latest routed events</h3>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
            {recentEvents.length} shown
          </span>
        </div>

        <div className="space-y-3">
          {recentEvents.map((event) => (
            <article
              key={event.id}
              className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium capitalize text-white">{formatLabel(event.type)}</p>
                  <p className="mt-1 text-xs text-white/45">{event.timestamp}</p>
                </div>
                {event.channel ? (
                  <span
                    className={cn(
                      'inline-flex rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium capitalize',
                      channelBadgeTone[event.channel],
                    )}
                  >
                    {event.channel}
                  </span>
                ) : null}
              </div>

              {event.summary ? (
                <p className="mt-3 text-sm leading-6 text-white/70">{event.summary}</p>
              ) : null}
            </article>
          ))}

          {recentEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/50">
              No orchestrator events yet.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
