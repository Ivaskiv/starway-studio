import { cn } from '@/lib/utils';
import AgentPanel, { type OrchestratorAgentDecision } from './AgentPanel';
import EventFeed, { type OrchestratorEventItem } from './EventFeed';
import UserStateCard, { type OrchestratorUserState } from './UserStateCard';

export interface OrchestratorDashboardProps {
  state: OrchestratorUserState;
  decision: OrchestratorAgentDecision;
  events: OrchestratorEventItem[];
  className?: string;
}

export default function Dashboard({
  state,
  decision,
  events,
  className,
}: OrchestratorDashboardProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(17,22,40,0.94),rgba(31,20,42,0.88))] p-5 shadow-[0_28px_90px_rgba(4,8,20,0.52)] sm:p-6',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,159,255,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.08),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_28%,rgba(255,255,255,0.02))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.9)_48%,transparent_52%),radial-gradient(rgba(255,255,255,0.85)_0.45px,transparent_0.45px)] [background-position:0_0,0_0] [background-size:220px_220px,13px_13px]" />
      <div className="pointer-events-none absolute -left-20 top-1/3 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">Growth Orchestrator</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Glass control surface</h2>
          </div>
          <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/58">
            Unified monitoring across web, Telegram, and Mini App
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <UserStateCard state={state} />
          <AgentPanel decision={decision} />
        </div>

        <EventFeed events={events} />
      </div>
    </section>
  );
}
