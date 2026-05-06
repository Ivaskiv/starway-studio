import { cn } from '@/lib/utils';

type UserStage = 'onboarding' | 'trial' | 'active' | 'risk' | 'churn';

export interface OrchestratorUserState {
  stage: UserStage;
  activationScore: number;
  churnRisk: number;
  engagementScore: number;
}

interface UserStateCardProps {
  state: OrchestratorUserState;
  className?: string;
}

const stageTone: Record<UserStage, string> = {
  onboarding: 'bg-slate-400/12 text-slate-100 border-white/15',
  trial: 'bg-blue-400/12 text-blue-100 border-blue-200/20',
  active: 'bg-sky-300/12 text-sky-100 border-sky-200/20',
  risk: 'bg-slate-300/12 text-slate-50 border-white/15',
  churn: 'bg-slate-500/12 text-slate-100 border-white/15',
};

function meterTone(value: number) {
  if (value >= 70) return 'from-sky-300/90 to-blue-500/80';
  if (value >= 40) return 'from-blue-300/80 to-slate-400/70';
  return 'from-slate-400/70 to-slate-600/70';
}

function MetricRow(props: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(props.value)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/62">{props.label}</span>
        <span className="font-medium text-white/92">{safeValue}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r shadow-[0_0_22px_rgba(87,131,255,0.35)] transition-all duration-500',
            meterTone(safeValue),
          )}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

export default function UserStateCard({ state, className }: UserStateCardProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,160,255,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02)_42%,rgba(21,28,54,0.24))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.6px,transparent_0.6px)] [background-size:12px_12px]" />

      <div className="relative space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">User State</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Growth readiness snapshot</h3>
          </div>
          <span
            className={cn(
              'inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize backdrop-blur-md',
              stageTone[state.stage],
            )}
          >
            {state.stage}
          </span>
        </div>

        <div className="grid gap-4">
          <MetricRow label="Activation score" value={state.activationScore} />
          <MetricRow label="Churn risk" value={state.churnRisk} />
          <MetricRow label="Engagement score" value={state.engagementScore} />
        </div>
      </div>
    </section>
  );
}
