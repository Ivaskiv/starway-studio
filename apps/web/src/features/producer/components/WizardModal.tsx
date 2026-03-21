// src/features/producer/components/WizardModal.tsx
// ═══════════════════════════════════════════════════════════════
// НОВИЙ файл у вже існуючій папці features/producer/components/
// Поряд з AudienceCard.tsx, SEOPanel.tsx, WeeklyReportCard.tsx
// Використовує: GlassCard з ui/, useProducerWizard з hooks/
// ═══════════════════════════════════════════════════════════════
import { PRODUCER_WIZARD_FIELDS, type ProducerTemplate } from '@/features/ai-generator/utils/templates';
import { Button } from '@/ui/Button';
import { GlassCard } from '@/ui/GlassCard';
import { Textarea } from '@/ui/Textarea';
import { type FC, useEffect, useRef, useState } from 'react';
import { useProducerWizard } from '../hooks/useProducer';

interface WizardModalProps {
  template: ProducerTemplate | null;
  onClose: () => void;
  onSuccess: (plan: string, name: string) => void;
}

export const WizardModal: FC<WizardModalProps> = ({ template, onClose, onSuccess }) => {
  const [step, setStep] = useState(0);
  const { wizardData, setField, prefill, generate, isGenerating, generatedPlan, error } = useProducerWizard();

  // Prefill якщо прийшов шаблон
  useEffect(() => {
    if (template?.prefill) prefill(template.prefill);
  }, [template]);

  const isDone = generatedPlan !== null;
  const accentColor = template?.color ?? '#d4af37';
  const accentSoft = `${accentColor}bb`;
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.style.setProperty('--wizard-accent', accentColor);
      overlayRef.current.style.setProperty('--wizard-accent-soft', accentSoft);
    }
  }, [accentColor, accentSoft]);

  if (!template) return null;

  return (
    <div
      ref={overlayRef}
      className="wizard-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <GlassCard className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-7">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="wizard-subtitle uppercase mb-1">
              ✦ Майстер створення
            </p>
            <h2 className="text-lg font-bold text-white">{template.title}</h2>
          </div>
          <button onClick={onClose} className="wizard-close-btn">✕</button>
        </div>

        {/* Progress bar */}
        {!isDone && (
        <div className="wizard-progress flex gap-1.5 mb-6">
          {PRODUCER_WIZARD_FIELDS.map((_, i) => (
            <div
              key={i}
              className={
                i < step
                  ? 'wizard-progress-dot wizard-progress-dot--done'
                  : i === step
                    ? 'wizard-progress-dot wizard-progress-dot--current'
                    : 'wizard-progress-dot'
              }
            />
          ))}
        </div>
        )}

        {/* Generating spinner */}
        {isGenerating && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4 inline-block animate-spin">✦</div>
            <p className="wizard-spinner-title text-base font-semibold mb-2">AI будує твій продукт...</p>
            <p className="text-white/40 text-sm">Генерую воронку, бот, PDF-звіт, монетизацію</p>
          </div>
        )}

        {/* Result */}
        {isDone && !isGenerating && (
          <div>
            <div className="wizard-result-badge rounded-xl p-3 mb-4 flex gap-3 items-center">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-green-400 font-bold text-sm">Продукт «{wizardData.name}» створено!</p>
                <p className="text-white/40 text-xs">AI згенерував повну структуру вашого AI-ментора</p>
              </div>
            </div>
            <div className="wizard-plan-card rounded-xl p-4 max-h-72 overflow-y-auto text-xs leading-relaxed text-white/80 whitespace-pre-wrap mb-5">
              {generatedPlan}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onSuccess(generatedPlan!, wizardData.name)} className="flex-1">
                💬 Продовжити в AI Чаті →
              </Button>
              <Button variant="outline" onClick={onClose}>Закрити</Button>
            </div>
          </div>
        )}

        {/* Wizard fields */}
        {!isDone && !isGenerating && step < PRODUCER_WIZARD_FIELDS.length && (() => {
          const f = PRODUCER_WIZARD_FIELDS[step];
          return (
            <div>
              <p className="text-white/40 text-xs mb-1">Крок {step + 1} з {PRODUCER_WIZARD_FIELDS.length}</p>
              <p className="text-2xl mb-1">{f.icon}</p>
              <h3 className="text-base font-bold mb-3">{f.label}</h3>
              <Textarea
                autoFocus
                value={wizardData[f.key]}
                onChange={e => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={4}
                className="w-full mb-4"
              />
              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="outline" onClick={() => setStep(s => s - 1)}>← Назад</Button>
                )}
                <Button
                  className="wizard-primary-btn flex-1"
                  onClick={() => {
                    if (step < PRODUCER_WIZARD_FIELDS.length - 1) setStep(s => s + 1);
                    else generate();
                  }}
                >
                  {step < PRODUCER_WIZARD_FIELDS.length - 1 ? 'Далі →' : '✦ Згенерувати план'}
                </Button>
              </div>
            </div>
          );
        })()}

      </GlassCard>
    </div>
  );
};
