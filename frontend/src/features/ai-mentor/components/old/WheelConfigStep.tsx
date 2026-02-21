// @ts-nocheck
// fix code_x: archived legacy component (kept for reference only). Do not use in active flow.
// frontend/src/features/admin/components/WheelConfigStep.tsx
import { WheelConfigItem } from '@/features/wheel/types/wheel.types';
import { GlassCard, Input, Textarea } from '@/ui';
import { useState } from 'react';

interface Props {
  data: WheelConfigItem[];
  onUpdate: (data: WheelConfigItem[]) => void;
}

export const WheelConfigStep = ({ data, onUpdate }: Props) => {
  const [spheres, setSpheres] = useState<WheelConfigItem[]>(data);

  const handleChange = (index: number, field: keyof WheelConfigItem, value: string) => {
    const updated = [...spheres];
    updated[index] = { ...updated[index], [field]: value };
    setSpheres(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Налаштування Колеса Балансу</h2>
      <p className="text-white/60">Створіть 8 сфер життя для вашого ментора</p>

      <div className="grid gap-4">
        {spheres.map((sphere, i) => (
          <GlassCard key={i} className="p-4">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-3xl">{sphere.emoji || '⭐'}</span>
              <Input
                placeholder="Емодзі (напр. 💰)"
                value={sphere.emoji}
                onChange={e => handleChange(i, 'emoji', e.target.value)}
                className="w-20"
              />
              <Input
                placeholder={`Сфера ${i + 1} (напр. Гроші)`}
                value={sphere.label}
                onChange={e => handleChange(i, 'label', e.target.value)}
                className="flex-1"
              />
            </div>
            <Textarea
              placeholder="Опис сфери"
              value={sphere.description}
              onChange={e => handleChange(i, 'description', e.target.value)}
              rows={2}
            />
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
