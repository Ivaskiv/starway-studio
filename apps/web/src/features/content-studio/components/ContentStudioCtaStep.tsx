// apps/web/src/features/content-studio/components/ContentStudioCtaStep.tsx
import { EditableLinesTextarea, FormatChecklist, SingleChoiceChecklist } from './ContentStudioStepPrimitives';
import { InfoHint } from '@/ui';
import type { ContentStudioFunnelInsight } from '../types/contentStudio.types';

type Props = {
  sectionTitleClass: string;
  textareaClass: string;
  campaignContextSample: string;
  reflection: string;
  setReflection: (value: string) => void;
  ctaType: string;
  ctaTypeOptions: ReadonlyArray<{ value: string; label: string; hint: string }>;
  setCtaType: (value: string) => void;
  ctaDestination: string[];
  ctaDestinationOptions: ReadonlyArray<{ value: string; label: string; hint: string }>;
  setCtaDestination: (value: string) => void;
  ctaRoutingMode: string;
  ctaRoutingOptions: ReadonlyArray<{ value: string; label: string; hint: string }>;
  setCtaRoutingMode: (value: string) => void;
  ctaSuggestions: readonly string[];
  selectedCtas: string[];
  handleAddCtaSuggestion: (value: string) => void;
  updateCtaField: (value: string) => void;
};

export default function ContentStudioCtaStep(props: Props) {
  const {
    sectionTitleClass,
    textareaClass,
    campaignContextSample,
    reflection,
    setReflection,
    ctaType,
    ctaTypeOptions,
    setCtaType,
    ctaDestination,
    ctaDestinationOptions,
    setCtaDestination,
    ctaRoutingMode,
    ctaRoutingOptions,
    setCtaRoutingMode,
    ctaSuggestions,
    selectedCtas,
    handleAddCtaSuggestion,
    updateCtaField,
  } = props;

  return (
    <div className="space-y-4">
      <div>
        <p className={sectionTitleClass}>СТА і шлях</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Окремо задай CTA, куди ведемо і як система веде людину далі.
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 min-[480px]:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>Тип CTA</p>
              <InfoHint label="Тип CTA" description="Яку саме дію пропонуємо..." instruction="Обери один головний тип CTA..." />
            </div>
            <SingleChoiceChecklist value={ctaType} options={ctaTypeOptions} onSelect={setCtaType} emptyLabel="Використати базовий CTA" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>Куди ведемо</p>
              <InfoHint label="Куди ведемо" description="Куди саме веде кнопка..." instruction="Обери маршрут..." />
            </div>
            <FormatChecklist
              selectedFormats={ctaDestination}
              onToggle={setCtaDestination}
              options={ctaDestinationOptions}
              emptyStateLabel="Вибрати маршрут"
              instruction="Познач маршрут..."
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>Як ведемо далі</p>
              <InfoHint label="Як ведемо далі" description="Режим продажу..." instruction="Для одного продукту обирай прямий маршрут..." />
            </div>
            <SingleChoiceChecklist value={ctaRoutingMode} options={ctaRoutingOptions} onSelect={setCtaRoutingMode} emptyLabel="Один продукт" />
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>Заклик до дії</p>
              <InfoHint label="Заклик до дії" description="Фінальний перехід у дію..." instruction="Давай 1-3 короткі заклики..." />
            </div>
            <p className="text-xs leading-5 text-[var(--text-muted)]">
              Кожен Enter створює окремий заклик.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ctaSuggestions.map((suggestion) => {
                const isSelected = selectedCtas.includes(suggestion);
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAddCtaSuggestion(suggestion)}
                    className={[
                      'rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all duration-200',
                      isSelected
                        ? 'border-white/70 bg-[rgba(var(--accent-rgb),0.14)] text-[rgb(var(--accent-soft-rgb))] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                        : 'border-[var(--border)] bg-[rgba(255,255,255,0.035)] text-[var(--text-secondary)] hover:border-[rgba(var(--accent-rgb),0.22)] hover:text-[var(--text-primary)]',
                    ].join(' ')}
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
            <EditableLinesTextarea
              lines={selectedCtas}
              onCommit={updateCtaField}
              placeholder={`АНАЛІЗ\nСТАРТ\nЗАПИС НА ZOOM\nСПРОБУВАТИ 7 ДНІВ`}
              minHeightClass="min-h-[152px]"
            />
          </div>

          <div className="rounded-[18px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.06)] px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Як це зійдеться в пакеті</p>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Тип</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {ctaTypeOptions.find((item) => item.value === ctaType)?.label}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Куди ведемо</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {ctaDestination.length > 0
                    ? ctaDestinationOptions.filter((item) => ctaDestination.includes(item.value)).map((item) => item.label).join(' · ')
                    : 'Не вибрано'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Маршрут</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {ctaRoutingOptions.find((item) => item.value === ctaRoutingMode)?.label}
                </p>
              </div>
            </div>
            <p className="mt-2.5 text-xs leading-5 text-[var(--text-muted)]">
              Спершу задай тип дії, куди ведемо і режим маршруту, а вже потім переходь до формули.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}