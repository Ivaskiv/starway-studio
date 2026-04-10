// apps/web/src/features/journal/components/JournalHeader.tsx
import type { ReactNode } from 'react';
import { Button } from '@/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface JournalHeaderProps {
  compact?: boolean;
  month: number;
  year: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  children: ReactNode;
}

export default function JournalHeader({
  compact = false,
  month,
  year,
  onPrevMonth,
  onNextMonth,
  children,
}: JournalHeaderProps) {
  const title = new Date(year, month - 1, 1).toLocaleDateString('uk-UA', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="dashboard-liquid-card--soft overflow-hidden">
      <div className={compact ? 'dashboard-liquid-edge--top p-4' : 'dashboard-liquid-edge--top p-5'}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className={compact ? 'text-2xl font-black text-[var(--text-primary)]' : 'text-3xl font-black text-[var(--text-primary)]'}>
                Щоденник
              </h1>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                Живий стан дня: рефлексії, мікрозавдання, Zoom і нагадування в одному місці.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="glass" color="muted" size="sm" leftIcon={ChevronLeft} onClick={onPrevMonth}>
                {' '}
              </Button>
              <div className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
                {title}
              </div>
              <Button variant="glass" color="muted" size="sm" rightIcon={ChevronRight} onClick={onNextMonth}>
                {' '}
              </Button>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
