
// apps/web/src/features/journal/components/FilterButtons.tsx
import type { JournalFilter } from '../types';

interface FilterButtonsProps {
  filter: JournalFilter;
  onFilterChange: (next: JournalFilter) => void;
}

const FILTER_OPTIONS: Array<{ value: JournalFilter; label: string }> = [
  { value: 'all', label: 'Всі' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'practices', label: 'Практики' },
];

export default function FilterButtons({ filter, onFilterChange }: FilterButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onFilterChange(option.value)}
          className={[
            'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
            filter === option.value
              ? 'border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.12)] text-[var(--text-primary)]'
              : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
          ].join(' ')}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}