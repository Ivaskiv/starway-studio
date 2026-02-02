// /features/admin/components/LandingConfigStep.tsx
import { LandingConfig } from '@/features/mentor/types/mentor.types';
import { Button, GlassCard, Input, Textarea } from '@/ui';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
  data: LandingConfig;
  onUpdate: (data: LandingConfig) => void;
}

export const LandingConfigStep = ({ data, onUpdate }: Props) => {
  const [config, setConfig] = useState<LandingConfig>(data);

  const updateField = (field: keyof LandingConfig, value: any) => {
    const updated = { ...config, [field]: value };
    setConfig(updated);
    onUpdate(updated);
  };

  const addFeature = () => {
    updateField('features', [...config.features, '']);
  };

  const updateFeature = (index: number, value: string) => {
    const features = [...config.features];
    features[index] = value;
    updateField('features', features);
  };

  const removeFeature = (index: number) => {
    updateField(
      'features',
      config.features.filter((_, i) => i !== index),
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Налаштування Landing Page</h2>
      <p className="text-white/60">Створіть промо-сторінку для вашого AI-ментора</p>

      <GlassCard className="p-4 space-y-4">
        <div>
          <label className="text-white text-sm mb-2 block">Заголовок Hero</label>
          <Input
            placeholder="Ваш персональний AI-ментор"
            value={config.heroTitle}
            onChange={e => updateField('heroTitle', e.target.value)}
          />
        </div>

        <div>
          <label className="text-white text-sm mb-2 block">Підзаголовок</label>
          <Textarea
            placeholder="Досягайте цілей з AI-підтримкою 24/7"
            value={config.heroSubtitle}
            onChange={e => updateField('heroSubtitle', e.target.value)}
            rows={2}
          />
        </div>

        <div>
          <label className="text-white text-sm mb-2 block">Текст CTA кнопки</label>
          <Input
            placeholder="Розпочати безкоштовно"
            value={config.ctaText}
            onChange={e => updateField('ctaText', e.target.value)}
          />
        </div>
      </GlassCard>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">Особливості</h3>
        <div className="space-y-2">
          {config.features.map((feature, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder={`Особливість ${i + 1}`}
                value={feature}
                onChange={e => updateFeature(i, e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => removeFeature(i)}
                className="bg-red-500/20 hover:bg-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button onClick={addFeature} className="w-full mt-3 bg-white/10 hover:bg-white/20">
          <Plus className="w-4 h-4 mr-2" />
          Додати особливість
        </Button>
      </div>
    </div>
  );
};
