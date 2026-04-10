// apps/web/src/features/journal/components/SummaryStats.tsx
import { Sparkles, Flame, ListTodo, MoonStar } from 'lucide-react';
import type { JournalDayState } from '../types';
import { getStatusTone } from '../utils';

interface SummaryStatsProps {
  summary: JournalDayState['summary'];
}

export default function SummaryStats({ summary }: SummaryStatsProps) {
  const cards = [
    { label: 'XP', value: summary.xp, tone: 'text-[rgb(var(--accent-soft-rgb))]', icon: Sparkles },
    { label: 'Виконано', value: summary.completed, tone: getStatusTone('done').text, icon: Flame },
    { label: 'Очікує', value: summary.pending, tone: getStatusTone('pending').text, icon: ListTodo },
    { label: 'Не виконано', value: summary.missed, tone: getStatusTone('missed').text, icon: MoonStar },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
        >
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <card.icon className="h-4 w-4" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{card.label}</p>
          </div>
          <p className={`mt-3 text-3xl font-black ${card.tone}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}