// apps/web/src/features/journal/components/Section.tsx
import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

export default function Section({ title, icon, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[rgb(var(--accent-soft-rgb))]">{icon}</span>
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
          {title}
        </h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}