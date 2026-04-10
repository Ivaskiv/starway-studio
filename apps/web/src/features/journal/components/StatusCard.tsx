// apps/web/src/features/journal/components/StatusCard.tsx
import { ExternalLink } from "lucide-react";

interface StatusCardProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export default function StatusCard({ title, description, actionLabel, onAction }: StatusCardProps) {
  return (
    <div className="rounded-[24px] border border-dashed border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.015)] px-4 py-5">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.12)] px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[rgba(var(--accent-rgb),0.34)] hover:bg-[rgba(var(--accent-rgb),0.18)]"
      >
        {actionLabel}
        <ExternalLink className="h-4 w-4" />
      </button>
    </div>
  );
}