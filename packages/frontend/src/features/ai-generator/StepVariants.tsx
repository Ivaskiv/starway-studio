// packages/frontend/src/components/aIGenerator/StepVariants.tsx

import { Check } from 'lucide-react';

interface StepVariant {
  content: string;
  selected: boolean;
}

interface StepVariantsProps {
  variants: StepVariant[];
  onSelect: (index: number) => void;
}

export default function StepVariants({ variants, onSelect }: StepVariantsProps) {
  if (!variants || variants.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        Немає варіантів для відображення
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {variants.map((variant, index) => (
        <div
          key={index}
          onClick={() => onSelect(index)}
          className={`
            glass-card p-4 cursor-pointer transition-all
            ${variant.selected 
              ? 'ring-2 ring-orange-500 bg-slate-800/80' 
              : 'hover:bg-slate-800/50'
            }
          `}
        >
          <div className="flex items-start gap-3">
            <div className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
              ${variant.selected 
                ? 'border-orange-500 bg-orange-500' 
                : 'border-slate-600'
              }
            `}>
              {variant.selected && (
                <Check className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                {variant.content}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}