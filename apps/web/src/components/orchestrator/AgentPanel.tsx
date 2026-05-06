import { cn } from '@/lib/utils';

export interface OrchestratorAgentDecision {
  agent: string;
  priority: 'low' | 'medium' | 'high';
  channel: 'web' | 'telegram' | 'miniapp';
  reason: string;
}

interface AgentPanelProps {
  decision: OrchestratorAgentDecision;
  className?: string;
}

const priorityTone: Record<OrchestratorAgentDecision['priority'], string> = {
  low: 'border-white/15 bg-white/8 text-white/78',
  medium: 'border-blue-200/20 bg-blue-300/10 text-blue-50',
  high: 'border-slate-200/20 bg-slate-300/10 text-slate-50',
};

const channelTone: Record<OrchestratorAgentDecision['channel'], string> = {
  web: 'bg-slate-200/10 text-slate-100',
  telegram: 'bg-blue-300/12 text-blue-100',
  miniapp: 'bg-sky-300/12 text-sky-100',
};

export default function AgentPanel({ decision, className }: AgentPanelProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(18,28,56,0.68),rgba(44,24,56,0.28)_58%,rgba(255,255,255,0.05)),radial-gradient(circle_at_top_right,rgba(101,143,255,0.24),transparent_34%)]" />
      <div className="pointer-events-none absolute left-6 top-4 h-20 w-20 rounded-full bg-blue-300/10 blur-2xl" />

      <div className="relative space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">Active Agent</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Current orchestration decision</h3>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[rgba(15,20,39,0.32)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">Agent</p>
          <p className="mt-2 text-lg font-semibold text-white">{decision.agent}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <span
            className={cn(
              'inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize backdrop-blur-md',
              priorityTone[decision.priority],
            )}
          >
            {decision.priority} priority
          </span>
          <span
            className={cn(
              'inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-medium capitalize',
              channelTone[decision.channel],
            )}
          >
            {decision.channel}
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">Reason</p>
          <p className="mt-2 text-sm leading-6 text-white/78">{decision.reason}</p>
        </div>
      </div>
    </section>
  );
}
