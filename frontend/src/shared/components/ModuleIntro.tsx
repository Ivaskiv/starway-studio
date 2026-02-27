import { GlassCard } from '@/ui/GlassCard';

interface ModuleIntroProps {
  title: string;
  description?: string;
  steps: string[];
}

export function ModuleIntro({ title, description, steps }: ModuleIntroProps) {
  return (
    <GlassCard className="p-5 md:p-6 border border-[color:rgba(var(--glass-border-rgb),0.24)]">
      <h1 className="text-2xl md:text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-sm text-white/70">{description}</p>
      <ul className="mt-4 grid gap-2 text-sm text-white/80">
        {steps.map((step) => (
          <li
            key={step}
            className="rounded-lg border border-[color:rgba(var(--glass-border-rgb),0.2)] bg-[color:rgba(var(--ambient-rgb-2),0.3)] px-3 py-2"
          >
            {step}
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
