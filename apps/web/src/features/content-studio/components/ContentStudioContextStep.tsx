// apps/web/src/features/content-studio/components/ContentStudioContextStep.tsx
import { useMemo } from 'react';
import { AlertTriangle, PencilLine } from 'lucide-react';
import { InfoHint } from '@/ui';
import { detectLeadMagnetProblem } from '../utils/contentTransforms';

type Props = {
  sectionTitleClass: string;
  fieldClass: string;
  textareaClass: string;
  campaignProductValue: string;
  campaignProductOptions: readonly string[];
  dispatchUpdateProduct: (value: string) => void;
  platform: string;
  platformOptions: ReadonlyArray<{ value: string; label: string }>;
  handlePlatformChange: (value: string) => void;
  contextAudienceText: string;
  updateAudience: (value: string) => void;
  adMessageGoal: string;
  adMessageGoalOptions: ReadonlyArray<{ value: string; label: string }>;
  setAdMessageGoal: (value: string) => void;
  contextPainText: string;
  updatePain: (value: string) => void;
  aiInsightPreview: string;
  onAiInsightChange: (value: string) => void;
  leadMagnetStepAdded: boolean;
  leadMagnetStepDismissedFor: string | null;
  onAddLeadMagnetStep: () => void;
  onSkipLeadMagnetStep: (signature: string) => void;
};

export default function ContentStudioContextStep(props: Props) {
  const {
    sectionTitleClass,
    fieldClass,
    textareaClass,
    campaignProductValue,
    campaignProductOptions,
    dispatchUpdateProduct,
    platform,
    platformOptions,
    handlePlatformChange,
    contextAudienceText,
    updateAudience,
    adMessageGoal,
    adMessageGoalOptions,
    setAdMessageGoal,
    contextPainText,
    updatePain,
    aiInsightPreview,
    onAiInsightChange,
    leadMagnetStepAdded,
    leadMagnetStepDismissedFor,
    onAddLeadMagnetStep,
    onSkipLeadMagnetStep,
  } = props;

  const leadMagnetDetection = useMemo(() => detectLeadMagnetProblem(aiInsightPreview), [aiInsightPreview]);

  const showLeadMagnetAlert =
    leadMagnetDetection.matched &&
    !leadMagnetStepAdded &&
    leadMagnetStepDismissedFor !== leadMagnetDetection.signature;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={sectionTitleClass}>Контекст кампанії</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Один стартовий крок: продукт, аудиторія, біль, платформа, AI інсайт і базовий продажний вектор.
          </p>
        </div>
        <InfoHint
          label="Контекст кампанії"
          description="Стартовий блок для всієї машини: що продаємо, кому, через який біль і куди ведемо далі."
          instruction="Заповни коротко і конкретно. Саме тут формується логіка всіх наступних кроків."
        />
      </div>

      <div className="grid gap-x-5 gap-y-4 min-[480px]:grid-cols-2">
        {/* Продукт */}
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <span>Продукт/Послуга</span>
            <InfoHint label="Продукт / Послуга" description="Що саме продаємо зараз і що йде після trial." instruction="Пиши так, як це бачить бізнес..." />
          </div>
          <select value={campaignProductValue} onChange={(e) => dispatchUpdateProduct(e.target.value)} className={fieldClass}>
            {campaignProductOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        {/* Платформа */}
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <span>Платформа</span>
            <InfoHint label="Платформа" description="Головний display-канал пакета." instruction="Тут визначаємо, де пакет показується в першу чергу." />
          </div>
          <select value={platform} onChange={(e) => handlePlatformChange(e.target.value)} className={fieldClass}>
            {platformOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {/* Аудиторія */}
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <span>Цільова аудиторія</span>
            <PencilLine className="h-3.5 w-3.5 text-[rgb(var(--accent-soft-rgb))]" />
            <InfoHint label="Цільова аудиторія" description="Для кого саме цей пакет." instruction="Опиши сегмент так, як людина сама відчуває свій стан." />
          </div>
          <textarea
            value={contextAudienceText}
            onChange={(e) => updateAudience(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className={`min-h-[98px] ${textareaClass}`}
          />
        </label>

        {/* Ціль повідомлення */}
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <span>Ціль рекламного повідомлення</span>
            <InfoHint label="Ціль рекламного повідомлення" description="Яку дію має викликати реклама." instruction="Для продажного пакета зазвичай BOFU..." />
          </div>
          <select value={adMessageGoal} onChange={(e) => setAdMessageGoal(e.target.value)} className={fieldClass}>
            {adMessageGoalOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {/* Біль */}
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <span className="whitespace-nowrap">Основний біль / проблема</span>
            <PencilLine className="h-3.5 w-3.5 text-[rgb(var(--accent-soft-rgb))]" />
            <InfoHint label="Основний біль" description="Що саме заважає людині дійти до покупки." instruction="Фокусуйся не тільки на емоції..." />
          </div>
          <textarea
            value={contextPainText}
            onChange={(e) => updatePain(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className={`min-h-[98px] ${textareaClass}`}
          />
        </label>

        {/* AI Інсайт */}
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <span>AI Інсайт з системи (автозаповнення)</span>
            <InfoHint label="AI Інсайт з системи" description="AI = продакт-менеджер..." instruction="Висновок збирається з overview..." />
          </div>
          <textarea
            value={aiInsightPreview}
            onChange={(e) => onAiInsightChange(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className={`min-h-[114px] ${textareaClass} text-[var(--text-secondary)]`}
          />
        </label>
      </div>

      {showLeadMagnetAlert && (
        <div className="rounded-[24px] border border-[rgba(250,204,21,0.34)] bg-[linear-gradient(180deg,rgba(250,204,21,0.16)_0%,rgba(250,204,21,0.08)_100%)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[rgb(250,204,21)]" />
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgb(250,204,21)]">Lead magnet ламається</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                AI бачить сигнал на кроці входу: {leadMagnetDetection.keywords.join(' · ')}.
                Це означає, що далі краще додати окремий лідмагнітний крок.
              </p>
            </div>
            <div className="rounded-full border border-[rgba(250,204,21,0.26)] bg-[rgba(250,204,21,0.1)] px-3 py-1.5 text-xs font-semibold text-[rgb(250,204,21)]">
              Новий крок 10
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAddLeadMagnetStep}
              className="rounded-[18px] border border-[rgba(250,204,21,0.32)] bg-[rgb(250,204,21)] px-4 py-2.5 text-sm font-semibold text-[#111111] transition-colors hover:bg-[rgb(245,197,18)]"
            >
              ✦ Додати Крок 10
            </button>
            <button
              type="button"
              onClick={() => onSkipLeadMagnetStep(leadMagnetDetection.signature)}
              className="rounded-[18px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[rgba(250,204,21,0.24)] hover:text-[var(--text-primary)]"
            >
              Пропустити цей раз
            </button>
          </div>
        </div>
      )}
    </div>
  );
}