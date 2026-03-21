import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types';
import React from 'react';

interface Props {
  scores: number[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export const WheelTabs = React.memo(({ scores, activeIndex, onSelect }: Props) => (
  <div className="mb-6">
    {/* fix code_x: responsive elastic grid keeps emoji tabs aligned and readable on narrow screens. */}
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 w-full max-w-3xl mx-auto">
    {WHEEL_CATEGORIES.map((cat, i) => (
      <button
        key={cat.id}
        onClick={() => onSelect(i)}
        className={`inline-flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-sm font-medium transition-all border min-w-0 ${
          i === activeIndex
            ? 'text-white border-[color:rgba(var(--accent-rgb),0.42)] bg-[color:rgba(var(--accent-rgb),0.2)] shadow-[0_0_14px_rgba(var(--accent-rgb),0.22)]'
            : 'text-white/70 border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
        }`}
      >
        <span className="text-base leading-none">{cat.emoji}</span>
        <span className="text-[12px] sm:text-[13px]">{scores[i]}</span>
      </button>
    ))}
    </div>
  </div>
));
