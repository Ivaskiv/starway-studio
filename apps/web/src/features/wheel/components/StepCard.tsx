import { ReactNode } from 'react';

import { GlassCard } from '@/ui/GlassCard';

interface StepCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export const StepCard = ({ title, subtitle, children }: StepCardProps) => {
  return (
    <GlassCard blur="xl" className="mx-auto w-full max-w-[440px] p-5 md:p-6" glow>
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold text-white md:text-xl">{title}</h2>
        {subtitle ? <p className="text-sm text-white/65">{subtitle}</p> : null}
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">{children}</div>
    </GlassCard>
  );
};
