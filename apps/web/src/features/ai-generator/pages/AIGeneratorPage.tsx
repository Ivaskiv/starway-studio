// features/ai-generator/pages/AIGeneratorPage.tsx

import {
  ATTEMPTS_PER_STEP,
  GenerationAttempt,
  STEP_DEFINITIONS,
  type OwnerOnboardingProfile,
  type StepData,
} from '@/features/ai-generator/types/wizard.types';
import { useSystemState } from '@/features/auth/hooks/useSystemState';
import { ModuleIntro } from '@/features/modules/components/ModuleIntro';
import { ModuleUsageCounter } from '@/features/modules/components/ModuleUsageCounter';
import { Button, GlassCard, Textarea } from '@/ui';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Film,
  Gem,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AIGeneratorProvider, useAIGenerator } from '../components/AIGeneratorProvider';
import OwnerOnboardingCard from '../components/OwnerOnboardingCard';

type BuilderTab = 'funnel' | 'aIMentor' | 'marathon';

type PreviewCard = {
  title: string;
  items: string[];
  icon: ReactNode;
};

const WHEEL_SPHERES_PREVIEW = [
  'Здоров’я',
  'Фінанси',
  'Кар’єра',
  'Відносини',
  'Самореалізація',
  'Оточення',
  'Духовність',
  'Відпочинок',
];

const TAB_CONFIG: Record<
  BuilderTab,
  {
    title: string;
    subtitle: string;
    icon: ReactNode;
    steps: number[];
  }
> = {
  // fix code_x: split AI Producer into 3 product engines (funnel / aIMentor / marathon) without breaking 11-step core workflow.
  funnel: {
    title: 'AI Воронка',
    subtitle: 'Архітектура funnel: вхід → trial → підписка → апсел',
    icon: <Workflow className="h-4 w-4" />,
    steps: [1, 2, 3, 4, 11],
  },
  aIMentor: {
    title: 'AI Ментор',
    subtitle: 'Щоденна логіка, колесо балансу, звіти, Telegram, miniapp',
    icon: <Bot className="h-4 w-4" />,
    steps: [5, 6, 7, 8, 9, 10],
  },
  marathon: {
    title: 'Марафон 5 точок',
    subtitle: 'Контент марафону: структура, задачі, daily-cycle, результат',
    icon: <Film className="h-4 w-4" />,
    steps: [1, 2, 3, 7, 8, 11],
  },
};

function normalizeTab(value: string | null | undefined): BuilderTab {
  if (value === 'funnel' || value === 'aIMentor' || value === 'marathon') return value;
  // fix code_x: default AI Generator flow opens aIMentor/wheel setup first.
  return 'aIMentor';
}

function extractShort(text: string | undefined, fallback: string) {
  if (!text?.trim()) return fallback;
  return text.trim().split('\n')[0].slice(0, 140);
}

function HintBubble({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[color:rgba(var(--accent-rgb),0.45)] bg-[color:rgba(var(--accent-rgb),0.18)] text-white/95 transition-all hover:scale-110 animate-pulse"
        aria-label="Підказка"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute left-1/2 top-8 z-40 w-72 -translate-x-1/2 rounded-xl border border-white/15 bg-slate-950/95 p-3 text-xs leading-relaxed text-white/90 shadow-[0_16px_34px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {text}
        </div>
      )}
    </div>
  );
}

function LivePreview({
  activeTab,
  selected,
  currentStep,
  currentStepText,
}: {
  activeTab: BuilderTab;
  selected: Record<number, string>;
  currentStep: number;
  currentStepText: string;
}) {
  const cards = useMemo<PreviewCard[]>(() => {
    const fallback = {
      funnelHook: 'Точка входу через контент/Telegram + діагностика',
      aIMentorMorning: 'Ранок: фокус дня, енергія 1-10, 1 ключова дія',
      aIMentorEvening: 'Вечір: підсумок дня, перешкоди, наступний крок',
      marathonFlow: '5 днів: відео + практична дія + AI-перевірка',
    };

    // fix code_x: live-preview panel shows how generated config will look for end-user.
    if (activeTab === 'funnel') {
      return [
        {
          title: 'Preview: Workflow сценарій',
          icon: <Workflow className="h-4 w-4 text-[var(--color-accent)]" />,
          items: [
            `Вхід: ${extractShort(selected[1], fallback.funnelHook)}`,
            `Формат і чек: ${extractShort(selected[2], 'Trial 7 днів + підписка')}`,
            `ЦА/тригери: ${extractShort(selected[3], 'Чіткий портрет і болі')}`,
            `Монетизація: ${extractShort(selected[4], 'Одна модель + апсел')}`,
            `Фінальна збірка: ${extractShort(selected[11], 'Готова AI-воронка')}`,
          ],
        },
      ];
    }

    if (activeTab === 'aIMentor') {
      return [
        {
          title: 'Preview: Картка AI-ментора',
          icon: <Bot className="h-4 w-4 text-[var(--color-accent)]" />,
          items: [
            `Колесо балансу: ${extractShort(selected[5], '8 сфер + AI аналіз')}`,
            `System prompt: ${extractShort(selected[6], 'Стан → Ціль → Вибір → Рішення → Дія')}`,
            `Ранок/вечір: ${extractShort(selected[7], fallback.aIMentorMorning)}`,
            `Звіти: ${extractShort(selected[8], 'Тижневий/місячний/загальний PDF')}`,
            `Telegram+miniapp: ${extractShort(selected[9], 'Нагадування, меню, синхронізація')}`,
            `Гейміфікація: ${extractShort(selected[10], 'Streak/XP/бейджі')}`,
          ],
        },
      ];
    }

    return [
      {
        title: 'Preview: Марафон 5 точок',
        icon: <Film className="h-4 w-4 text-[var(--color-accent)]" />,
        items: [
          `Трансформація: ${extractShort(selected[1], 'З хаосу рішень у стабільну дію')}`,
          `Формат: ${extractShort(selected[2], '5 відео + 5 практичних завдань')}`,
          `ЦА: ${extractShort(selected[3], 'Чіткий сегмент для запуску марафону')}`,
          `Daily-cycle: ${extractShort(selected[7], fallback.marathonFlow)}`,
          `Звіти: ${extractShort(selected[8], 'Проміжні та фінальні підсумки')}`,
          `Воронка продажу: ${extractShort(selected[11], 'Вхід → марафон → апсел')}`,
        ],
      },
    ];
  }, [activeTab, selected]);

  return (
    <div className="space-y-3">
      <GlassCard className="p-4 border border-white/10 bg-white/[0.03]">
        <h3 className="text-sm font-semibold text-white mb-2">Попередній перегляд кроку</h3>
        <p className="text-xs text-white/70">
          Крок {currentStep}: {STEP_DEFINITIONS[currentStep - 1]?.title.replace(/^Крок\s\d+:\s*/, '')}
        </p>
        <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/75 leading-relaxed">
          {extractShort(currentStepText, 'Заповни крок і згенеруй варіант, щоб побачити конкретний прев’ю результат.')}
        </p>
      </GlassCard>

      {activeTab === 'aIMentor' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <GlassCard className="p-4 border border-white/10 bg-white/[0.03]">
            {/* fix code_x: balance wheel product preview block to show expected generated outcome for aIMentor engine. */}
            <h3 className="text-sm font-semibold text-white mb-3">Preview: Колесо балансу (8 сфер)</h3>
            <div className="grid grid-cols-2 gap-2">
              {WHEEL_SPHERES_PREVIEW.map((sphere) => (
                <div key={sphere} className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-[11px] text-white/80">
                  {sphere}
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
              <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-emerald-200">
                Сильна сфера: Відносини
              </div>
              <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-amber-200">
                Сфера росту: Фінанси
              </div>
              <div className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-cyan-100">
                Середній бал: 6.4 / 10
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 border border-white/10 bg-white/[0.03]">
            {/* fix code_x: daily module preview card mirrors morning/evening flow from WheelPage ecosystem. */}
            <h3 className="text-sm font-semibold text-white mb-3">Preview: Daily (ранок / вечір)</h3>
            <div className="space-y-2">
              <div className="rounded-lg border border-sky-400/25 bg-sky-500/10 px-3 py-2">
                <p className="text-[11px] text-sky-200 font-semibold">🌅 Ранок</p>
                <p className="mt-1 text-[11px] text-white/80">
                  Фокус дня, енергія 1-10, ключова дія.
                </p>
              </div>
              <div className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2">
                <p className="text-[11px] text-violet-200 font-semibold">🌙 Вечір</p>
                <p className="mt-1 text-[11px] text-white/80">
                  Підсумок дня, перешкоди, мікро-задача, афірмація.
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2">
                <p className="text-[11px] text-white/75">
                  Telegram: нагадування 08:00 / 20:00 + дубль у кабінет користувача.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {cards.map((card) => (
        <GlassCard key={card.title} className="p-4 border border-white/10 bg-white/[0.03]">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-white mb-2">
            {card.icon}
            {card.title}
          </h3>
          <ul className="space-y-2 text-xs text-white/75">
            {card.items.map((item) => (
              <li key={item} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </GlassCard>
      ))}
    </div>
  );
}

function AIGeneratorContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, counts, getModuleAccess } = useSystemState();
  const requestedTab = normalizeTab(searchParams.get('tab'));
  const [activeTab, setActiveTab] = useState<BuilderTab>(requestedTab);
  const {
    currentStep,
    stepsData,
    totalRemainingAttempts,
    isGenerating,
    generatedBlueprint,
    handleUserInput,
    handleCommunityPrompt,
    handleGenerate,
    getAvailableGenerationsForStep,
    handleSelectVariant,
    handleSaveCurrentStep,
    handleGoToStep,
    handleNextStep,
    handlePreviousStep,
    handleSaveFunnel,
    resetGenerator,
    onboarding,
    setOnboardingField,
    applyNadyaTemplate,
  } = useAIGenerator();

  const handleOnboardingFieldChange = <K extends keyof OwnerOnboardingProfile>(
    key: K,
    value: OwnerOnboardingProfile[K],
  ) => {
    setOnboardingField(key, value);
  };

  const stepData = stepsData[currentStep - 1];
  const stepDef = STEP_DEFINITIONS[currentStep - 1];
  const completedSteps = stepsData.filter((s: StepData) => s.selectedAttemptId).map((s: StepData) => s.number);
  const progress = Math.round((completedSteps.length / stepsData.length) * 100);
  const availableForStep = getAvailableGenerationsForStep(currentStep);
  const maxUnlockedStep = Math.min(
    stepsData.length,
    Math.max(
      1,
      stepsData.reduce((max: number, step: StepData) => (step.selectedAttemptId ? Math.max(max, step.number + 1) : max), 1),
    ),
  );

  const visibleSteps = TAB_CONFIG[activeTab].steps;
  const selectedByStep = useMemo(() => {
    const map: Record<number, string> = {};
    stepsData.forEach((step: StepData) => {
      const selected = step.attempts.find((attempt: GenerationAttempt) => attempt.id === step.selectedAttemptId);
      if (selected?.content) map[step.number] = selected.content;
      else if (step.userInput?.trim()) map[step.number] = step.userInput;
    });
    return map;
  }, [stepsData]);

  const completedStepsCount = completedSteps.length;
  const attemptBudget = stepsData.length * ATTEMPTS_PER_STEP;
  const usedAttempts = Math.max(0, attemptBudget - totalRemainingAttempts);
  const introSteps = [
    'Крок за кроком створюйте контент: від діагностики до фінальної структури воронки.',
    'Надавайте AI чіткі приклади, зосереджуючись на конкретних результатах і діях.',
    'Обирайте варіанти, зберігайте крок та рухайтесь вперед, поки не вичерпаєте генерації.',
  ];
  const introBlock = (
    <>
      <ModuleIntro
        title="AI Генератор"
        description="На основі backend-даних (useSystemState) відстежуйте свої генерації, шаблони та прогрес."
        steps={introSteps}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ModuleUsageCounter label="Завершені кроки" used={completedStepsCount} total={stepsData.length} />
        <ModuleUsageCounter label="Генерацій" used={usedAttempts} total={attemptBudget} />
        <ModuleUsageCounter label="Шаблони" used={counts.templates} total={Math.max(1, counts.templates)} />
      </div>
    </>
  );
  const showSampleData = counts.ownedProducts === 0 && counts.subscribedProducts === 0;
  const sampleDataCard = showSampleData && (
    <GlassCard className="p-4 border border-white/10 bg-white/[0.03]">
      <p className="text-xs text-white/60 mb-1">Тестові дані</p>
      <p className="text-sm text-white/70">
        У вас ще немає власних продуктів або підписок. Ми відобразимо реальні дані після першої
        AI-генерації.
      </p>
    </GlassCard>
  );
  const aiGeneratorAccess = getModuleAccess('AI_GENERATOR');

  const generationLabel =
    availableForStep <= 0
      ? 'Ліміт кроку вичерпано'
      : `Згенерувати (${availableForStep} ${
          availableForStep === 1 ? 'генерація' : availableForStep < 5 ? 'генерації' : 'генерацій'
        })`;
  const hasOptions = Array.isArray(stepDef?.options) && stepDef.options.length > 0;
  const isCustomOptionInput = hasOptions && !stepDef!.options!.includes(stepData.userInput);

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    if (!searchParams.get('tab')) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'aIMentor');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (generatedBlueprint) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {introBlock}
        {sampleDataCard}
        <GlassCard className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/25">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Воронку згенеровано</h2>
          <p className="text-slate-400 mb-6">{generatedBlueprint.name}</p>

          <div className="flex gap-4 justify-center">
            <Button onClick={handleSaveFunnel} className="gradient-button">
              <Sparkles className="w-5 h-5 mr-2" />
              Зберегти під ключ
            </Button>
            <Button onClick={resetGenerator} className="glass-button">
              Створити нову
            </Button>
          </div>
        </GlassCard>

        <OwnerOnboardingCard
          value={onboarding}
          onChange={handleOnboardingFieldChange}
          onApplyNadyaTemplate={applyNadyaTemplate}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {introBlock}
      {sampleDataCard}
      <ModuleIntro
        title={TAB_CONFIG[activeTab].title}
        description={TAB_CONFIG[activeTab].subtitle}
        steps={[
          '1. Заповніть поточний крок конкретними даними.',
          '2. Згенеруйте варіанти та оберіть фінальний.',
          '3. Збережіть крок і переходьте далі по workflow.',
        ]}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* <ModuleUsageCounter
          label="Генерації"
          used={Math.max(0, stepsData.length * ATTEMPTS_PER_STEP - totalRemainingAttempts)}
          total={stepsData.length * ATTEMPTS_PER_STEP}
        /> */}
        <ModuleUsageCounter
          label="Завершені кроки"
          used={completedSteps.length}
          total={stepsData.length}
        />
      </div>

      {aiGeneratorAccess.isLocked && (
        <GlassCard className="p-4 border border-amber-300/30 bg-amber-500/10">
          <p className="text-sm text-amber-100">
            Модуль AI Генератор тимчасово недоступний. Оформіть підписку для продовження.
          </p>
        </GlassCard>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Producer</h1>
          <p className="text-slate-400 mt-1">Крок {currentStep} з {stepsData.length}</p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-sm">
          <button
            type="button"
            className="mr-2 text-xs text-white/75 underline underline-offset-4 hover:text-white"
            onClick={() => navigate('/dashboard/ai-producer-console')}
          >
            Workflow Board
          </button>
          <Gem className="w-5 h-5 text-purple-300" />
          <span className="text-lg font-bold text-purple-300">{totalRemainingAttempts}</span>
          <span className="text-sm text-purple-400">генерацій</span>
        </div>
      </div>

      <GlassCard className="p-5 md:p-6 space-y-5">
        <div className="space-y-4 pb-3 border-b border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2 text-slate-400">
              Прогрес
              <HintBubble text="Фази проходяться послідовно: діагностика → валідація → монетизація → архітектура." />
            </span>
            <span className="text-white font-medium">{completedSteps.length}/{stepsData.length}</span>
          </div>

          <progress
            className="ai-generator-progress"
            value={progress}
            max={100}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            {(Object.keys(TAB_CONFIG) as BuilderTab[]).map((tabKey) => {
              const tab = TAB_CONFIG[tabKey];
              const isActive = activeTab === tabKey;
              const completedInTab = tab.steps.filter((number) => completedSteps.includes(number)).length;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set('tab', tabKey);
                    setSearchParams(next, { replace: true });
                    setActiveTab(tabKey);
                    if (!tab.steps.includes(currentStep)) {
                      handleGoToStep(tab.steps[0]);
                    }
                  }}
                  className={`w-full min-h-[92px] rounded-xl border p-3 text-left transition-all ${
                    isActive
                      ? 'border-[color:rgba(var(--accent-rgb),0.6)] bg-[color:rgba(var(--accent-rgb),0.16)] text-white shadow-[0_0_14px_rgba(var(--accent-rgb),0.25)]'
                      : 'border-white/15 bg-white/[0.03] text-white/75 hover:bg-white/[0.08]'
                  }`}
                >
                  <p className="inline-flex items-center gap-2 text-sm font-semibold">
                    {tab.icon}
                    {tab.title}
                  </p>
                  <p className="mt-1 text-[11px] text-white/60">{tab.subtitle}</p>
                  <p className="mt-2 text-[11px] text-white/70">{completedInTab}/{tab.steps.length} кроків</p>
                </button>
              );
            })}
          </div>
        </div>

        <LivePreview
          activeTab={activeTab}
          selected={selectedByStep}
          currentStep={currentStep}
          currentStepText={stepData.userInput || selectedByStep[currentStep] || ''}
        />

        <div className="grid grid-cols-1 gap-5">
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
              {visibleSteps.map((number) => {
                const isCompleted = completedSteps.includes(number);
                const isCurrent = currentStep === number;
                const isLocked = number > maxUnlockedStep;

                return (
                  <button
                    key={number}
                    type="button"
                    onClick={() => handleGoToStep(number)}
                    disabled={isLocked}
                    className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-all border whitespace-nowrap ${
                      isCompleted
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                        : isCurrent
                          ? 'border-[color:rgba(var(--accent-rgb),0.65)] bg-[color:rgba(var(--accent-rgb),0.2)] text-white shadow-[0_0_16px_rgba(var(--accent-rgb),0.25)]'
                          : isLocked
                            ? 'border-white/10 bg-white/[0.03] text-white/35 cursor-not-allowed'
                            : 'border-white/15 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {isCompleted ? '✓' : number}. {STEP_DEFINITIONS[number - 1]?.title.replace(/^Крок\s\d+:\s*/, '')}
                  </button>
                );
              })}
            </div>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/25">
                <span className="text-xl font-bold text-white">{currentStep}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">{stepDef?.title}</h2>
                <p className="text-slate-400 text-sm md:text-base">{stepDef?.description}</p>
                {stepData.isSaved && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                    Крок збережено
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-300">
                Твоя відповідь
                <HintBubble text="Будь конкретним: цифри, дедлайни, KPI та чіткий результат значно покращують AI-генерацію." />
              </label>

              {stepDef?.options ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stepDef.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleUserInput(currentStep, opt)}
                        className={`glass-card p-4 text-left transition-all rounded-xl ${
                          stepData.userInput === opt ? 'ring-2 ring-orange-500 bg-orange-500/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              stepData.userInput === opt ? 'border-orange-500 bg-orange-500' : 'border-slate-600'
                            }`}
                          >
                            {stepData.userInput === opt && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-white text-sm">{opt}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-white/70">Або свій варіант (кастом)</label>
                      {isCustomOptionInput && (
                        <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                          Кастомний варіант
                        </span>
                      )}
                    </div>
                    <Textarea
                      value={isCustomOptionInput ? stepData.userInput : ''}
                      onChange={(e) => handleUserInput(currentStep, e.target.value)}
                      placeholder="Введи свій варіант, якщо жоден з preset не підходить"
                      rows={3}
                      className="w-full glass-field"
                    />
                  </div>
                </div>
              ) : (
                <Textarea
                  value={stepData.userInput}
                  onChange={(e) => handleUserInput(currentStep, e.target.value)}
                  placeholder={stepDef?.placeholder || 'Введи відповідь...'}
                  rows={5}
                  className="w-full glass-field"
                />
              )}

              {!!stepDef?.examples?.length && (
                <GlassCard className="p-4 border border-white/10 bg-white/[0.03]">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold text-white/80 mb-2">
                    Приклади для цього кроку
                    <HintBubble text="Використай приклад як старт. Потім обовʼязково адаптуй під свій продукт та ринок." />
                  </p>
                  <ul className="space-y-1.5">
                    {stepDef.examples.map((example) => (
                      <li key={example} className="flex items-start gap-2 justify-between">
                        <span className="text-xs text-white/65 leading-relaxed pr-2">• {example}</span>
                        <button
                          type="button"
                          onClick={() => handleUserInput(currentStep, example)}
                          className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
                        >
                          Підставити
                        </button>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                  Додатковий контекст (Community Builder GPT)
                  <HintBubble text="AI аналізує попередні відповіді й контекст, тому не генерує “все одразу”, а уточнює стратегію крок за кроком." />
                </label>
                <Textarea
                  value={stepData.communityPrompt || ''}
                  onChange={(e) => handleCommunityPrompt(currentStep, e.target.value)}
                  placeholder="Встав підказки/контекст з Community Builder GPT (опціонально)"
                  rows={3}
                  className="w-full glass-field"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  type="button"
                  onClick={() => handleGenerate(currentStep)}
                  disabled={!stepData.userInput.trim() || availableForStep <= 0 || isGenerating}
                  className="gradient-button"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Генерація...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      {generationLabel}
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleSaveCurrentStep}
                  disabled={!stepData.selectedAttemptId && !stepData.userInput.trim()}
                  className="glass-button"
                >
                  <Check className="w-5 h-5 mr-2" />
                  {stepData.isSaved ? 'Крок збережено' : 'Зберегти крок'}
                </Button>
              </div>
            </div>

            {stepData.attempts.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                    AI-варіанти
                    <HintBubble text="Одна фаза = один фінальний варіант. Обери найкращий, збережи крок і тільки після цього переходь далі." />
                  </h3>
                  <span className="text-xs text-slate-400">{stepData.attempts.length} згенеровано</span>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                  {stepData.attempts.map((attempt: GenerationAttempt) => (
                    <button
                      key={attempt.id}
                      type="button"
                      onClick={() => handleSelectVariant(currentStep, attempt.id)}
                      className={`w-full text-left glass-card p-4 rounded-xl transition-all ${
                        attempt.isSelected ? 'ring-2 ring-green-500 bg-green-500/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            attempt.isSelected ? 'border-green-500 bg-green-500' : 'border-slate-600'
                          }`}
                        >
                          {attempt.isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{attempt.content}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <GlassCard className="p-4 border border-white/10 bg-white/[0.03]">
            <h3 className="text-sm font-semibold text-white mb-2">Статус кроку</h3>
            <ul className="space-y-1.5 text-xs text-white/70">
              <li>Доступно: <span className="text-white font-semibold">{availableForStep}</span></li>
              <li>Глобальний залишок: <span className="text-white font-semibold">{totalRemainingAttempts}</span></li>
              <li>Вибраний варіант: <span className="text-white font-semibold">{stepData.selectedAttemptId ? 'так' : 'ні'}</span></li>
              <li>Збереження: <span className="text-white font-semibold">{stepData.isSaved ? 'так' : 'ні'}</span></li>
            </ul>
          </GlassCard>

          <GlassCard className="p-4 border border-white/10 bg-white/[0.03]">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-white mb-2">
              Стратегічний порядок
              <HintBubble text="Рекомендований порядок: продукт 1 (Колесо балансу) → продукт 2 (AI-ментор) → інтеграція у funnel." />
            </h3>
            <p className="text-xs text-white/65 leading-relaxed">
              Тепер генератор структурований по 3 engines. Спочатку збери продукт, потім фіналізуй funnel.
            </p>
          </GlassCard>
        </div>

        <div className="pt-4 border-t border-white/10 flex gap-3">
          <Button
            type="button"
            onClick={handlePreviousStep}
            disabled={currentStep === 1}
            className="flex-1 glass-button"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Назад
          </Button>

          <Button
            type="button"
            onClick={handleNextStep}
            disabled={!stepData.selectedAttemptId || !stepData.isSaved}
            className="flex-1 gradient-button"
          >
            {currentStep === stepsData.length ? 'Готово' : 'Далі'}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

export default function AIGeneratorPage() {
  return (
    <AIGeneratorProvider>
      <AIGeneratorContent />
    </AIGeneratorProvider>
  );
}
