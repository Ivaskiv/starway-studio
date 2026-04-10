import { useEffect, useMemo, useState } from 'react'

import { AlertTriangle, CheckCircle2, PencilLine, RefreshCcw, Sparkles, X, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

import { Button, InfoHint, Textarea } from '@/ui'
import { CrossChannelPreviewModal, TelegramPreview } from '@/features/content-preview'
import type { CrossChannelPreviewMode } from '@/features/content-preview'
import type { ContentStudioAIStrategy, ContentStudioFunnelInsight, ContentStudioItem, ContentStudioLeadMagnetPayload, LeadMagnet } from '../types/contentStudio.types'
import { EditableLinesTextarea, FormatChecklist, MetricBadgeHint, ModeToggle, SingleChoiceChecklist } from './ContentStudioStepPrimitives'
import { detectLeadMagnetProblem } from '../utils/contentTransforms'
import { LeadMagnetBuilderBlock } from './lead-magnet/LeadMagnetBuilderBlock'

export function ContentStudioContextStep(props: {
  sectionTitleClass: string
  fieldClass: string
  textareaClass: string
  campaignProductValue: string
  campaignProductOptions: readonly string[]
  dispatchUpdateProduct: (value: string) => void
  platform: string
  platformOptions: ReadonlyArray<{ value: string; label: string }>
  handlePlatformChange: (value: string) => void
  contextAudienceText: string
  updateAudience: (value: string) => void
  adMessageGoal: string
  adMessageGoalOptions: ReadonlyArray<{ value: string; label: string }>
  setAdMessageGoal: (value: string) => void
  contextPainText: string
  updatePain: (value: string) => void
  aiInsightPreview: string
  onAiInsightChange: (value: string) => void
  leadMagnetStepAdded: boolean
  leadMagnetStepDismissedFor: string | null
  onAddLeadMagnetStep: () => void
  onSkipLeadMagnetStep: (signature: string) => void
}) {
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
  } = props
  const leadMagnetDetection = useMemo(() => detectLeadMagnetProblem(aiInsightPreview), [aiInsightPreview])
  const showLeadMagnetAlert = leadMagnetDetection.matched && !leadMagnetStepAdded && leadMagnetStepDismissedFor !== leadMagnetDetection.signature

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
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <span>Продукт/Послуга</span>
            <InfoHint label="Продукт / Послуга" description="Що саме продаємо зараз і що йде після trial." instruction="Пиши так, як це бачить бізнес: сам продукт, trial, підписка або інший оплачуваний етап. Тут система має розуміти весь шлях від першого входу до грошей." />
          </div>
          <select value={campaignProductValue} onChange={(event) => dispatchUpdateProduct(event.target.value)} className={fieldClass}>
            {campaignProductOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <span>Платформа</span>
            <InfoHint label="Платформа" description="Головний display-канал пакета." instruction="Тут визначаємо, де пакет показується в першу чергу." />
          </div>
          <select value={platform} onChange={(event) => handlePlatformChange(event.target.value)} className={fieldClass}>
            {platformOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <span>Цільова аудиторія</span>
            <PencilLine className="h-3.5 w-3.5 text-[rgb(var(--accent-soft-rgb))]" />
            <InfoHint label="Цільова аудиторія" description="Для кого саме цей пакет." instruction="Опиши сегмент так, як людина сама відчуває свій стан." />
          </div>
          <textarea value={contextAudienceText} onChange={(event) => updateAudience(event.target.value)} onKeyDown={(event) => event.stopPropagation()} className={`min-h-[98px] ${textareaClass}`} />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <span>Ціль рекламного повідомлення</span>
            <InfoHint label="Ціль рекламного повідомлення" description="Яку дію має викликати реклама." instruction="Для продажного пакета зазвичай BOFU, для прогріву MOFU/TOFU." />
          </div>
          <select value={adMessageGoal} onChange={(event) => setAdMessageGoal(event.target.value)} className={fieldClass}>
            {adMessageGoalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <span className="whitespace-nowrap">
              Основний біль
              <span className="px-1">/</span>
              проблема
            </span>
            <PencilLine className="h-3.5 w-3.5 text-[rgb(var(--accent-soft-rgb))]" />
            <InfoHint label="Основний біль" description="Що саме заважає людині дійти до покупки." instruction="Фокусуйся не тільки на емоції, а й на продажній гальмівній точці: що не дає клікнути, пройти lead magnet, стартонути trial або дійти до підписки. Пиши проблему як бізнес-втрату: немає продажів, немає нових користувачів, не купують, не доходять до trial." />
          </div>
          <textarea value={contextPainText} onChange={(event) => updatePain(event.target.value)} onKeyDown={(event) => event.stopPropagation()} className={`min-h-[98px] ${textareaClass}`} />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <span>AI Інсайт з системи (автозаповнення)</span>
            <InfoHint
              label="AI Інсайт з системи"
              description="AI = продакт-менеджер, який каже “ось де ти втрачаєш гроші і що робити. Автозаповнення для продажу: реклама, нові юзери, lead magnet, trial і підписка."
              instruction="Висновок збирається з overview (нові й активні користувачі), funnel (start → lead magnet → wheel → trial → purchase), topEvents, topProblems і topCategories. `14` і `13` беруться з newUsers та activeUsers; `1938` і `499` — це лічильники topEvents; відсотки в funnel — це реальні conversion rates. Якщо `100%` або `General` виглядає дивно, це не шаблон, а сигнал, що дані ще занадто узагальнені або в цьому сегменті поки мало розбиття. Для фази продажу система має підсвічувати не прокрастинацію, а втрату продажів, нових користувачів і підписок."
            />
          </div>
          <textarea value={aiInsightPreview} onChange={(event) => onAiInsightChange(event.target.value)} onKeyDown={(event) => event.stopPropagation()} className={`min-h-[114px] ${textareaClass} text-[var(--text-secondary)]`} />
        </label>
      </div>

      {showLeadMagnetAlert ? (
        <div className="rounded-[24px] border border-[rgba(250,204,21,0.34)] bg-[linear-gradient(180deg,rgba(250,204,21,0.16)_0%,rgba(250,204,21,0.08)_100%)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[rgb(250,204,21)]" />
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgb(250,204,21)]">Lead magnet ламається</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                AI бачить сигнал на кроці входу: {leadMagnetDetection.keywords.join(' · ')}.
                Це означає, що далі краще додати окремий лідмагнітний крок із ясним переходом.
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
      ) : null}

    </div>
  )
}

export function ContentStudioLeadMagnetStep(props: any) {
  const {
    productLabel,
    aiStrategy,
    funnelInsight,
    aiInsightPreview,
    leadMagnetDraft,
    setLeadMagnetDraft,
    leadMagnetSelectedFormat,
    leadMagnetConfirmations,
    setLeadMagnetConfirmations,
    onSaveLeadMagnet,
    onPublishLeadMagnet,
  } = props as {
    aiStrategy: ContentStudioAIStrategy | null
    productLabel: string
    funnelInsight: ContentStudioFunnelInsight | null
    aiInsightPreview: string
    leadMagnetDraft: LeadMagnet | null
    setLeadMagnetDraft: (value: LeadMagnet | null) => void
    leadMagnetSelectedFormat: string
    leadMagnetConfirmations: boolean[]
    setLeadMagnetConfirmations: (value: boolean[]) => void
    onSaveLeadMagnet: (payload: ContentStudioLeadMagnetPayload) => Promise<unknown>
    onPublishLeadMagnet: (payload: ContentStudioLeadMagnetPayload) => Promise<unknown>
  }

  return (
    <LeadMagnetBuilderBlock
      insight={aiStrategy}
      funnelInsight={funnelInsight}
      productLabel={productLabel}
      formatKey={leadMagnetSelectedFormat}
      formatLabel={leadMagnetSelectedFormat}
      aiInsight={aiInsightPreview}
      confirmations={leadMagnetConfirmations}
      setConfirmations={setLeadMagnetConfirmations}
      destinations={leadMagnetDraft?.destinations ?? ['telegram_bot']}
      setDestinations={(value) => {
        if (!leadMagnetDraft) {
          setLeadMagnetDraft({
            id: `${Date.now()}`,
            title: `${productLabel} · Lead magnet`,
            promise: 'Перший результат за 10 хвилин',
            format: 'checklist',
            structure: {
              hook: aiStrategy?.hookAngle ?? 'Ти відчуваєш, що результат ще не зрушив з місця?',
              explanation: aiStrategy?.coreProblem ?? 'Після lead magnet людина не бачить ясного наступного кроку',
              steps: (aiStrategy?.actions ?? ['Спростити onboarding до 1 дії', 'Додати миттєву цінність', 'Підсилити CTA']).slice(0, 5),
              result: `Людина швидко бачить перший зсув і розуміє, як ${aiStrategy?.contentFocus ?? 'рухатися далі'} саме у ${productLabel}.`,
              transitionToProduct: aiStrategy?.ctaStrategy ?? `Перейди в ${productLabel} і забери наступний крок одразу.`,
            },
            status: 'review',
            destinations: value,
            createdAt: new Date(),
          })
          return
        }
        setLeadMagnetDraft({ ...leadMagnetDraft, destinations: value })
      }}
      leadMagnet={leadMagnetDraft}
      setLeadMagnet={setLeadMagnetDraft}
      onSave={onSaveLeadMagnet}
      onPublish={onPublishLeadMagnet}
      onReset={() => {
        setLeadMagnetDraft(null)
        setLeadMagnetConfirmations([false, false, false, false, false])
      }}
    />
  )
}

export function ContentStudioCtaStep(props: {
  sectionTitleClass: string
  textareaClass: string
  campaignContextSample: string
  reflection: string
  setReflection: (value: string) => void
  ctaType: string
  ctaTypeOptions: ReadonlyArray<{ value: string; label: string; hint: string }>
  setCtaType: (value: string) => void
  ctaDestination: string[]
  ctaDestinationOptions: ReadonlyArray<{ value: string; label: string; hint: string }>
  setCtaDestination: (value: string) => void
  ctaRoutingMode: string
  ctaRoutingOptions: ReadonlyArray<{ value: string; label: string; hint: string }>
  setCtaRoutingMode: (value: string) => void
  ctaSuggestions: readonly string[]
  selectedCtas: string[]
  handleAddCtaSuggestion: (value: string) => void
  updateCtaField: (value: string) => void
}) {
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
  } = props

  return (
    <div className="space-y-4">

      <div>
        <p className={sectionTitleClass}>СТА і шлях</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Окремо задай CTA, куди ведемо і як система веде людину далі: в один продукт чи через автопідбір.
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 min-[480px]:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>Тип CTA</p>
              <InfoHint label="Тип CTA" description="Яку саме дію пропонуємо після перегляду контенту." instruction="Обери один головний тип CTA, щоб контент, DM і Telegram не розходились у різні боки." />
            </div>
            <SingleChoiceChecklist value={ctaType} options={ctaTypeOptions} onSelect={setCtaType} emptyLabel="Використати базовий CTA" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>Куди ведемо</p>
              <InfoHint label="Куди ведемо" description="Куди саме веде кнопка або ключове слово. Усі варіанти зібрані в одному чеклісті." instruction="Обери маршрут, який збігається з реальною наступною точкою. Можна позначити кілька варіантів, якщо вони всі дійсно працюють у пакеті." />
            </div>
            <FormatChecklist
              selectedFormats={ctaDestination}
              onToggle={setCtaDestination}
              options={ctaDestinationOptions}
              emptyStateLabel="Вибрати маршрут"
              instruction="Познач маршрут, якщо хочеш бачити його в пакеті та в preview. Можна обрати кілька маршрутів одночасно, і вибрані варіанти піднімуться вгорі, як у форматах."
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>Як ведемо далі</p>
              <InfoHint label="Як ведемо далі" description="Режим продажу: у конкретний офер або через автопідбір." instruction="Для одного продукту обирай прямий маршрут. Для кількох оферів увімкни автопідбір." />
            </div>
            <SingleChoiceChecklist value={ctaRoutingMode} options={ctaRoutingOptions} onSelect={setCtaRoutingMode} emptyLabel="Один продукт" />
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>Заклик до дії</p>
              <PencilLine className="h-3.5 w-3.5 text-[rgb(var(--accent-soft-rgb))]" />
              <InfoHint label="Заклик до дії" description="Фінальний перехід у дію: аналіз, старт, zoom, trial, консультація, покупка." instruction="Давай 1-3 короткі заклики окремими рядками. Enter створює новий рядок." />
            </div>
            <p className="text-xs leading-5 text-[var(--text-muted)]">
              Кожен Enter створює окремий заклик. Це саме ті фрази, які підуть у Reels, DM і Telegram.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ctaSuggestions.map((suggestion) => {
                const isSelected = selectedCtas.includes(suggestion)
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
                )
              })}
            </div>
            <EditableLinesTextarea
              lines={selectedCtas}
              onCommit={updateCtaField}
              placeholder={`АНАЛІЗ
СТАРТ
ЗАПИС НА ZOOM
СПРОБУВАТИ 7 ДНІВ
ПЕРЕЙТИ В МІНІАП
ВІДКРИТИ STARWAY
ОТРИМАТИ ПЛАН
ОТРИМАТИ РОЗБІР
ПІДКЛЮЧИТИ AI МЕНТОРА
ОФОРМИТИ ПІДПИСКУ
ПЕРЕЙТИ ДО ОПЛАТИ
НАПИСАТИ МЕНЕДЖЕРУ`}
              minHeightClass="min-h-[152px]"
            />
          </div>

          <div className="rounded-[18px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.06)] px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Як це зійдеться в пакеті</p>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Тип</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{ctaTypeOptions.find((item) => item.value === ctaType)?.label}</p>
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
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{ctaRoutingOptions.find((item) => item.value === ctaRoutingMode)?.label}</p>
              </div>
            </div>
            <p className="mt-2.5 text-xs leading-5 text-[var(--text-muted)]">
              Спершу задай тип дії, куди ведемо і режим маршруту, а вже потім переходь до формули.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ContentStudioFormulaStep(props: {
  sectionTitleClass: string
  formulaType: string
  setFormulaType: (value: string) => void
  funnelInsight: ContentStudioFunnelInsight | null
  formulaCards: ReadonlyArray<{
    key: string
    badge: string
    badgeClass: string
    title: string
    description: string
    bullets: readonly { key: string; text: string }[]
    footer: string
    note?: string
    accentClass: string
  }>
}) {
  const { sectionTitleClass, formulaType, setFormulaType, funnelInsight, formulaCards } = props
  const [isFunnelOpen, setIsFunnelOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] p-4">
        <div className="flex items-center gap-2">
          <p className={sectionTitleClass}>Формула</p>
          <InfoHint
            label="Формула"
            description="Формула визначає, як саме буде побудований текст: через біль, через бажання, через трансформацію або через раціональний продаж."
            instruction="Обирай PAS/AIDA/BAB/4P/STACK під конкретне завдання. Для холодної аудиторії часто заходить AIDA або PAS, для прогріву — BAB або 4P, для сильного міксу — STACK."
          />
        </div>
        {funnelInsight ? (
          <div className="mt-3 rounded-[20px] border border-[rgba(var(--accent-rgb),0.12)] bg-[rgba(255,255,255,0.03)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>Funnel metrics</span>
                <InfoHint
                  label="Funnel metrics"
                  description="Чесне порівняння реальної конверсії з ідеальною для кожного кроку."
                  instruction="Дивись на real conversion, ideal conversion, sample size і пояснення. Якщо вибірка мала, сигнал нестабільний."
                />
              </div>
              <button
                type="button"
                onClick={() => setIsFunnelOpen((value) => !value)}
                className="rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.08)] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--accent-soft-rgb))] transition-colors hover:border-[rgba(var(--accent-rgb),0.24)] hover:bg-[rgba(var(--accent-rgb),0.12)]"
              >
                {isFunnelOpen ? 'Закрити' : 'Відкрити'}
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{funnelInsight.summary}</p>
            {isFunnelOpen ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
                  Реальна конверсія = що є в даних. Ідеал = робочий орієнтир за UX і best-practice. Різниця показує, де найкращий запас росту.
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {funnelInsight.steps.map((step) => {
                    const diffLabel = step.differencePoints === null
                      ? 'немає даних'
                      : step.differencePoints === 0
                        ? '0 п.п. від ідеалу'
                        : step.differencePoints > 0
                          ? `+${step.differencePoints} п.п.`
                          : `${step.differencePoints} п.п.`

                    return (
                      <div
                        key={step.step}
                        className={[
                          'rounded-[18px] border px-4 py-4',
                          step.step === funnelInsight.weakestStableStep
                            ? 'border-[rgba(var(--accent-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.08)] shadow-[0_18px_34px_rgba(0,0,0,0.22)]'
                            : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                              {step.fromLabel} → {step.toLabel}
                            </p>
                            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                              {step.realConversion}
                            </p>
                          </div>
                          <span className={[
                            'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                            step.isStable
                              ? 'border-[rgba(94,234,212,0.22)] bg-[rgba(94,234,212,0.08)] text-[rgb(94,234,212)]'
                              : 'border-[rgba(255,171,89,0.22)] bg-[rgba(255,171,89,0.08)] text-[rgb(255,171,89)]',
                          ].join(' ')}>
                            {step.isStable ? 'стабільно' : 'мала вибірка'}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                            Ідеал: {step.idealConversion}
                          </span>
                          <span className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--accent-soft-rgb))]">
                            Реально: {step.realUsers} користувачів
                          </span>
                          <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                            Дельта: {diffLabel}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{step.explanation}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {step.arguments.map((argument) => (
                            <span key={argument} className="rounded-full border border-[rgba(var(--accent-rgb),0.12)] bg-[rgba(var(--accent-rgb),0.06)] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--accent-soft-rgb))]">
                              {argument}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid items-stretch gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3">
        {formulaCards.map((card) => (
          (() => {
            const footerPercentMatch = card.footer.match(/(\d+)%/)
            const footerPercent = footerPercentMatch?.[1] ?? null
            return (
          <button
            key={card.key}
            type="button"
            onClick={() => setFormulaType(card.key)}
            className={[
              'relative flex h-full flex-col rounded-[20px] border px-4 py-4 text-left transition-all duration-200',
              formulaType === card.key
                ? 'z-10 border-[rgba(96,121,255,0.72)] bg-[rgba(15,20,38,0.96)] shadow-[0_0_0_1px_rgba(96,121,255,0.18),0_18px_36px_rgba(44,72,180,0.14)]'
                : 'border-[rgba(96,121,255,0.24)] bg-[rgba(12,18,34,0.86)] hover:border-[rgba(96,121,255,0.46)]',
            ].join(' ')}
          >
            {formulaType === card.key ? (
              <span className="absolute left-4 right-4 top-0 h-[2px] rounded-full bg-[rgba(96,121,255,0.92)] shadow-[0_0_12px_rgba(96,121,255,0.45)]" />
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${card.badgeClass}`}>
                {card.badge}
              </span>
              {formulaType === card.key ? <span className="text-xs font-semibold text-white">✓</span> : null}
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{card.title}</p>
            <p className={formulaType === card.key ? 'mt-2 text-xs leading-5 text-[rgba(255,255,255,0.82)]' : 'mt-2 text-xs leading-5 text-[rgba(255,255,255,0.62)]'}>{card.description}</p>
            <div className="mt-3 flex-1 space-y-2.5">
              {card.bullets.map((bullet) => (
                <div key={`${card.key}-${bullet.key}-${bullet.text}`} className="flex items-start gap-2.5">
                  <span className="min-w-[14px] pt-[1px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--accent-soft-rgb))]">
                    {bullet.key}
                  </span>
                  <p className={formulaType === card.key ? 'text-xs leading-5 text-[rgba(255,255,255,0.88)]' : 'text-xs leading-5 text-[rgba(255,255,255,0.78)]'}>
                    {bullet.text}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <p className={`text-[11px] font-semibold ${card.accentClass}`}>{card.footer}</p>
              <InfoHint
                label="Що означає %"
                description="Відсоток показує, наскільки цей варіант сильніший за базовий текст у вибірці."
                instruction={footerPercent
                  ? `${footerPercent}% тут означає орієнтовне підсилення відносно базового тексту для цього конкретного варіанту. Якщо це критичне значення у твоєму наборі, система підсвічує його як найсильніший орієнтир серед доступних карток.`
                  : 'Це число показує орієнтовне підсилення відносно базового тексту для цього варіанту. Якщо значення високе, це сильніший орієнтир для вибору саме цієї картки.'}
              />
            </div>
            {card.note ? <p className={formulaType === card.key ? 'mt-1 text-[11px] text-[rgba(255,255,255,0.55)]' : 'mt-1 text-[11px] text-[rgba(255,255,255,0.5)]'}>{card.note}</p> : null}
          </button>
            )
          })()
        ))}
      </div>
    </div>
  )
}

export function ContentStudioHookStep(props: {
  sectionTitleClass: string
  textareaClass: string
  campaignContextSample: string
  reflection: string
  setReflection: (value: string) => void
  contextHookVariants: string[]
  activeContextHookIndex: number
  canResetHookLimit: boolean
  handleResetContextHookLimit: () => void
  canRestorePreviousContext: boolean
  handleRestorePreviousContext: () => void
  handleSelectContextHookVariant: (index: number) => void
  handlePrevContextHookVariant: () => void
  handleGenerateContextHook: () => void
  handleNextContextHookVariant: () => void
  selectedHookType: string
  selectedHookLabel: string
  setSelectedHookType: (value: string) => void
  researchUpdatedLabel: string
  researchSourceLabel: string
  hookScoreContext: {
    blended: number
    categoryScore: number
    problemScore: number
    formatScore: number
    destinationScore: number
    goalScore: number
    typeScore: number
    sourceLabel: string
  }
  hasResearchMeta: boolean
  isFallback: boolean
  isResearchStale: boolean
  researchHookOptions: ReadonlyArray<{ key: string; eyebrow: string; title: string; body: string; footer: string }>
}) {
  const {
    sectionTitleClass,
    textareaClass,
    campaignContextSample,
    reflection,
    setReflection,
    contextHookVariants,
    activeContextHookIndex,
    canResetHookLimit,
    handleResetContextHookLimit,
    canRestorePreviousContext,
    handleRestorePreviousContext,
    handleSelectContextHookVariant,
    handlePrevContextHookVariant,
    handleGenerateContextHook,
    handleNextContextHookVariant,
    selectedHookType,
    selectedHookLabel,
    setSelectedHookType,
    researchUpdatedLabel,
    researchSourceLabel,
    hookScoreContext,
    hasResearchMeta,
    isFallback,
    isResearchStale,
    researchHookOptions,
  } = props

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-[24px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>Контекст для hook</p>
              <InfoHint label="Контекст для hook" description="Що сьогодні важливе? Який стан? Що хочеш сказати своїй аудиторії." instruction="Сюди вносимо живий вектор дня. Звідси система збирає hook і напрям усіх форматів." />
            </div>
            <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">Що сьогодні важливе? Який стан? Що хочеш сказати своїй аудиторії.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>Генерацій hook: {contextHookVariants.length}/5</span>
            {canRestorePreviousContext ? (
              <button type="button" onClick={handleRestorePreviousContext} className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.1)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.18)] hover:text-[var(--text-primary)]">
                <RefreshCcw className="h-3.5 w-3.5" />
                Повернути попередній контекст
              </button>
            ) : null}
            {canResetHookLimit ? (
              <button type="button" onClick={handleResetContextHookLimit} className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.1)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.18)] hover:text-[var(--text-primary)]">
                <X className="h-3.5 w-3.5" />
                Скинути генерацію
              </button>
            ) : null}
          </div>
        </div>

        <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} onKeyDown={(event) => event.stopPropagation()} placeholder={campaignContextSample} className={`min-h-[138px] ${textareaClass}`} />

        {contextHookVariants.length >= 4 ? (
          <div className="flex justify-center gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <button
                key={`hook-dot-step-${index}`}
                type="button"
                onClick={() => handleSelectContextHookVariant(index)}
                disabled={!contextHookVariants[index]}
                aria-label={`Вибрати варіант hook ${index + 1}`}
                title={`Вибрати варіант hook ${index + 1}`}
                className={[
                  'h-2.5 w-2.5 rounded-full transition-opacity',
                  index === activeContextHookIndex ? 'bg-[rgb(var(--accent-soft-rgb))]' : contextHookVariants[index] ? 'bg-[rgba(255,255,255,0.35)]' : 'bg-[rgba(255,255,255,0.12)]',
                  !contextHookVariants[index] ? 'cursor-not-allowed opacity-35' : '',
                ].join(' ')}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {contextHookVariants.length > 0 ? (
            <Button type="button" onClick={handlePrevContextHookVariant} disabled={activeContextHookIndex === 0} aria-label="Попередній варіант hook" title="Попередній варіант hook" className="dashboard-liquid-card--soft inline-flex items-center justify-center rounded-[16px] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : null}
          <button type="button" onClick={handleGenerateContextHook} disabled={contextHookVariants.length >= 5} className="btn-liquid-dashboard--ice inline-flex items-center gap-2 rounded-[16px] px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55">
            <Sparkles className="h-4 w-4" />
            {contextHookVariants.length >= 5 ? 'Ліміт hook досягнуто' : 'Згенерувати hook'}
          </button>
          {contextHookVariants.length > 1 ? (
            <Button type="button" onClick={handleNextContextHookVariant} disabled={activeContextHookIndex >= contextHookVariants.length - 1} aria-label="Наступний варіант hook" title="Наступний варіант hook" className="dashboard-liquid-card--soft inline-flex items-center justify-center rounded-[16px] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45">
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : null}
          <span className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2.5 py-1 text-[rgb(var(--accent-soft-rgb))]">
            {selectedHookLabel}
          </span>
        </div>
      </div>

      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Це не оцінка успіху, а наскільки hook підходить до твого поточного контексту. Система перераховує варіанти з урахуванням контексту, дії, маршруту, форматів і аналітики з попередніх кроків.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>Дані актуальні на: {researchUpdatedLabel}</span>
              <span>Джерело: {researchSourceLabel}</span>
              <MetricBadgeHint
                value={`Fit score: ${hookScoreContext.blended}%`}
                label="Fit score"
                description="Показує, наскільки hook підходить саме до твого поточного контексту."
                instruction={`Просто для розуміння: ${hookScoreContext.blended}% означає, що цей hook добре збігається з контекстом, дією, маршрутом, форматами і аналітикою. 100% = дуже точний збіг, менше = більше простору для правки.`}
                className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2 py-1"
              />
              <InfoHint
                label="Як рахується?"
                description={`Це не оцінка успіху, а наскільки цей hook підходить до твого поточного контексту. Fit score збирається з історії кроків, аналітики та поточної дії.`}
                instruction={`Пояснення простою мовою: ${hookScoreContext.categoryScore}% бере аналітика по категоріях, ${hookScoreContext.problemScore}% бере топ-проблеми, ${hookScoreContext.formatScore}% враховує формати, ${hookScoreContext.destinationScore}% враховує маршрут, ${hookScoreContext.typeScore}% враховує тип дії, ${hookScoreContext.goalScore}% враховує ціль. Джерело категорії: ${hookScoreContext.sourceLabel}.`}
              />
              {!hasResearchMeta ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">Стартовий шаблон</span>
              ) : null}
              {isFallback ? (
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-cyan-100">Тимчасовий fallback</span>
              ) : null}
              {isResearchStale ? (
                <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-amber-200">Дані скоро застаріють</span>
              ) : null}
              <span>Автооновлення: 1-го числа кожного місяця</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className={sectionTitleClass}>Кут входу</p>
            <InfoHint label="Кут входу" description="Зафіксуй основний кут входу до підключення API і дослідження." instruction="Тип входу в першу секунду має бути визначений до генерації текстів і Reels." />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[rgba(var(--accent-rgb),0.12)] bg-[rgba(var(--accent-rgb),0.06)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <span>Обраний hook перейде в наступні кроки як поточний кут</span>
          <span className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2.5 py-1 text-[rgb(var(--accent-soft-rgb))]">
            {selectedHookLabel}
          </span>
        </div>
      </div>

      <div className="grid gap-2.5 min-[480px]:grid-cols-2">
        {researchHookOptions.map((option) => {
          const isActive = selectedHookType === option.key
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setSelectedHookType(option.key)}
              aria-pressed={isActive}
              className={[
                'relative rounded-[18px] border px-4 py-3.5 text-left transition-all duration-300 motion-safe:transform-gpu',
                isActive
                  ? 'z-10 animate-hook-pop border-[rgba(96,121,255,0.72)] bg-[rgba(15,20,38,0.96)] scale-[1.01] shadow-[0_0_0_1px_rgba(96,121,255,0.18),0_18px_36px_rgba(44,72,180,0.14)]'
                  : 'border-[rgba(96,121,255,0.24)] bg-[rgba(12,18,34,0.86)] opacity-86 hover:-translate-y-0.5 hover:border-[rgba(96,121,255,0.46)] hover:opacity-100',
              ].join(' ')}
            >
              {isActive ? <span className="absolute left-4 right-4 top-0 h-[2px] rounded-full bg-[rgba(96,121,255,0.92)] shadow-[0_0_12px_rgba(96,121,255,0.45)]" /> : null}
              {isActive ? (
                <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(94,234,212,0.28)] bg-[rgba(94,234,212,0.12)] text-[rgb(94,234,212)] shadow-[0_10px_24px_rgba(44,72,180,0.12)]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              ) : null}
              <p className="text-[11px] uppercase tracking-[0.14em] text-[rgb(var(--accent-soft-rgb))]">{option.eyebrow}</p>
              <div className="mt-2 flex items-start justify-between gap-3 pr-10">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{option.title}</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{option.body}</p>
              <MetricBadgeHint
                value={option.footer}
                label={`${option.eyebrow} metric`}
                description="Зелений рядок показує орієнтир сили hook: одне число описує очікуване підсилення поведінки, а fit score показує, наскільки цей hook збігається з поточним контекстом."
                instruction="Ліве число в цьому рядку — це прогнозований ефект самого hook-шаблону, наприклад CTR boost або Watch time. Праве число fit — це збіг з твоїм контекстом, дією, маршрутом, форматом, формулою і аналітикою. Тут усе зведено в один робочий орієнтир."
                className="mt-2.5"
              />
            </button>
          )
        })}
      </div>

      <div>
        <p className={sectionTitleClass}>Кут входу в першу секунду</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Спочатку зафіксуй тип хука, через який зайдеш у Reels, а вже потім підключай API та дослідження.
        </p>
      </div>
    </div>
  )
}

export function ContentStudioApiStep(props: {
  sectionTitleClass: string
  segmentClass: string
  fieldClass: string
  stackColumnsClass: string
  stackColumnClass: string
  sectionCardClass: string
  elevenKeyMode: 'saved' | 'manual'
  setElevenKeyMode: (value: 'saved' | 'manual') => void
  savedElevenKeyLabel: string
  setSavedElevenKeyLabel: (value: string) => void
  elevenKey: string
  setElevenKey: (value: string) => void
  voiceIdMode: 'saved' | 'manual'
  setVoiceIdMode: (value: 'saved' | 'manual') => void
  savedVoiceIdLabel: string
  setSavedVoiceIdLabel: (value: string) => void
  voiceId: string
  setVoiceId: (value: string) => void
  openAiKeyMode: 'saved' | 'manual'
  setOpenAiKeyMode: (value: 'saved' | 'manual') => void
  savedOpenAiKeyLabel: string
  setSavedOpenAiKeyLabel: (value: string) => void
  gptKey: string
  setGptKey: (value: string) => void
  telegramTokenMode: 'saved' | 'manual'
  setTelegramTokenMode: (value: 'saved' | 'manual') => void
  savedTelegramBotLabel: string
  setSavedTelegramBotLabel: (value: string) => void
  tgToken: string
  setTgToken: (value: string) => void
  telegramChatMode: 'saved' | 'manual'
  setTelegramChatMode: (value: 'saved' | 'manual') => void
  savedTelegramChatLabel: string
  setSavedTelegramChatLabel: (value: string) => void
  tgChat: string
  setTgChat: (value: string) => void
}) {
  const {
    sectionTitleClass,
    segmentClass,
    fieldClass,
    stackColumnsClass,
    stackColumnClass,
    sectionCardClass,
    elevenKeyMode,
    setElevenKeyMode,
    savedElevenKeyLabel,
    setSavedElevenKeyLabel,
    elevenKey,
    setElevenKey,
    voiceIdMode,
    setVoiceIdMode,
    savedVoiceIdLabel,
    setSavedVoiceIdLabel,
    voiceId,
    setVoiceId,
    openAiKeyMode,
    setOpenAiKeyMode,
    savedOpenAiKeyLabel,
    setSavedOpenAiKeyLabel,
    gptKey,
    setGptKey,
    telegramTokenMode,
    setTelegramTokenMode,
    savedTelegramBotLabel,
    setSavedTelegramBotLabel,
    tgToken,
    setTgToken,
    telegramChatMode,
    setTelegramChatMode,
    savedTelegramChatLabel,
    setSavedTelegramChatLabel,
    tgChat,
    setTgChat,
  } = props
  const elevenSavedMissing = elevenKeyMode === 'saved' && !savedElevenKeyLabel.trim()
  const voiceSavedMissing = voiceIdMode === 'saved' && !savedVoiceIdLabel.trim()
  const openAiSavedMissing = openAiKeyMode === 'saved' && !savedOpenAiKeyLabel.trim()
  const telegramBotSavedMissing = telegramTokenMode === 'saved' && !savedTelegramBotLabel.trim()
  const telegramChatSavedMissing = telegramChatMode === 'saved' && !savedTelegramChatLabel.trim()

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-5 text-[var(--text-muted)]">
        За замовчуванням система працює в режимі <span className="font-semibold text-[var(--text-secondary)]">Використати збережений</span>.
      </p>
      <div className={stackColumnsClass}>
        <div className={stackColumnClass}>
          <div className={sectionCardClass}>
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>Налаштування голосу</p>
              <InfoHint
                label="Налаштування голосу"
                description="Тут визначається, яким ключем і яким voice profile система буде озвучувати контент."
                instruction="Робочий режим — через збережені label з vault і voice profiles. Ручний ввід лишай тільки для тестів."
              />
            </div>
            <div className="mt-3 space-y-4">
              <div className={segmentClass}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">ElevenLabs API</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Краще брати ключ із vault.</p>
                  </div>
                  <ModeToggle value={elevenKeyMode} onChange={setElevenKeyMode} warning={elevenSavedMissing} />
                </div>
                {elevenKeyMode === 'saved' ? (
                  <>
                    <input
                      aria-label="ElevenLabs API label"
                      title="ElevenLabs API label"
                      placeholder="elevenlabs-main"
                      value={savedElevenKeyLabel}
                      onChange={(event) => setSavedElevenKeyLabel(event.target.value)}
                      className={`mt-4 ${fieldClass} ${elevenSavedMissing ? 'border-[rgba(255,113,124,0.36)] bg-[rgba(255,113,124,0.06)] focus:border-[rgba(255,113,124,0.48)]' : ''}`}
                    />
                    {elevenSavedMissing ? <p className="mt-2 text-xs text-[rgb(255,113,124)]">Заповни label, щоб «Використати збережений» працювало коректно.</p> : null}
                  </>
                ) : (
                  <input aria-label="ElevenLabs API key" title="ElevenLabs API key" placeholder="Введи ElevenLabs API key" value={elevenKey} onChange={(event) => setElevenKey(event.target.value)} type="password" className={`mt-4 ${fieldClass}`} />
                )}
              </div>
              <div className={segmentClass}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Voice ID</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Для кількох голосів краще працювати через label профілю.</p>
                  </div>
                  <ModeToggle value={voiceIdMode} onChange={setVoiceIdMode} warning={voiceSavedMissing} />
                </div>
                {voiceIdMode === 'saved' ? (
                  <>
                    <input
                      aria-label="Voice ID label"
                      title="Voice ID label"
                      placeholder="mentor-voice-main"
                      value={savedVoiceIdLabel}
                      onChange={(event) => setSavedVoiceIdLabel(event.target.value)}
                      className={`mt-4 ${fieldClass} ${voiceSavedMissing ? 'border-[rgba(255,113,124,0.36)] bg-[rgba(255,113,124,0.06)] focus:border-[rgba(255,113,124,0.48)]' : ''}`}
                    />
                    {voiceSavedMissing ? <p className="mt-2 text-xs text-[rgb(255,113,124)]">Заповни label, щоб «Використати збережений» працювало коректно.</p> : null}
                  </>
                ) : (
                  <input aria-label="Voice ID" title="Voice ID" placeholder="Введи Voice ID" value={voiceId} onChange={(event) => setVoiceId(event.target.value)} className={`mt-4 ${fieldClass}`} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={stackColumnClass}>
          <div className={sectionCardClass}>
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>OpenAI і Telegram</p>
              <InfoHint
                label="OpenAI і Telegram"
                description="Ключі моделі, бот і маршрут, через які машина збирає пакет і відправляє його далі."
                instruction="На production краще використовувати тільки збережені label для ключів, ботів і чатів."
              />
            </div>
            <div className="mt-3 space-y-4">
              <div className={segmentClass}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">OpenAI API</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">У production краще використовувати збережений ключ по label.</p>
                  </div>
                  <ModeToggle value={openAiKeyMode} onChange={setOpenAiKeyMode} warning={openAiSavedMissing} />
                </div>
                {openAiKeyMode === 'saved' ? (
                  <>
                    <input
                      aria-label="OpenAI API label"
                      title="OpenAI API label"
                      placeholder="openai-main"
                      value={savedOpenAiKeyLabel}
                      onChange={(event) => setSavedOpenAiKeyLabel(event.target.value)}
                      className={`mt-4 ${fieldClass} ${openAiSavedMissing ? 'border-[rgba(255,113,124,0.36)] bg-[rgba(255,113,124,0.06)] focus:border-[rgba(255,113,124,0.48)]' : ''}`}
                    />
                    {openAiSavedMissing ? <p className="mt-2 text-xs text-[rgb(255,113,124)]">Заповни label, щоб «Використати збережений» працювало коректно.</p> : null}
                  </>
                ) : (
                  <input aria-label="OpenAI API key" title="OpenAI API key" placeholder="Введи OpenAI API key" value={gptKey} onChange={(event) => setGptKey(event.target.value)} type="password" className={`mt-4 ${fieldClass}`} />
                )}
              </div>
              <div className={segmentClass}>
                <p className="text-sm font-medium text-[var(--text-primary)]">Telegram Bot</p>
                <div className="mt-3 space-y-3">
                  <ModeToggle value={telegramTokenMode} onChange={setTelegramTokenMode} warning={telegramBotSavedMissing} />
                  {telegramTokenMode === 'saved' ? (
                    <>
                      <input
                        aria-label="Telegram bot label"
                        title="Telegram bot label"
                        placeholder="main-bot"
                        value={savedTelegramBotLabel}
                        onChange={(event) => setSavedTelegramBotLabel(event.target.value)}
                        className={`${fieldClass} ${telegramBotSavedMissing ? 'border-[rgba(255,113,124,0.36)] bg-[rgba(255,113,124,0.06)] focus:border-[rgba(255,113,124,0.48)]' : ''}`}
                      />
                      {telegramBotSavedMissing ? <p className="text-xs text-[rgb(255,113,124)]">Заповни label, щоб «Використати збережений» працювало коректно.</p> : null}
                    </>
                  ) : (
                    <input aria-label="Telegram bot token" title="Telegram bot token" placeholder="Введи Telegram bot token" value={tgToken} onChange={(event) => setTgToken(event.target.value)} type="password" className={fieldClass} />
                  )}
                </div>
              </div>
              <div className={segmentClass}>
                <p className="text-sm font-medium text-[var(--text-primary)]">Telegram маршрут</p>
                <div className="mt-3 space-y-3">
                  <ModeToggle value={telegramChatMode} onChange={setTelegramChatMode} warning={telegramChatSavedMissing} />
                  {telegramChatMode === 'saved' ? (
                    <>
                      <input
                        aria-label="Telegram маршрут label"
                        title="Telegram маршрут label"
                        placeholder="review-chat"
                        value={savedTelegramChatLabel}
                        onChange={(event) => setSavedTelegramChatLabel(event.target.value)}
                        className={`${fieldClass} ${telegramChatSavedMissing ? 'border-[rgba(255,113,124,0.36)] bg-[rgba(255,113,124,0.06)] focus:border-[rgba(255,113,124,0.48)]' : ''}`}
                      />
                      {telegramChatSavedMissing ? <p className="text-xs text-[rgb(255,113,124)]">Заповни label, щоб «Використати збережений» працювало коректно.</p> : null}
                    </>
                  ) : (
                    <input aria-label="Telegram маршрут" title="Telegram маршрут" placeholder="@channel або chat id" value={tgChat} onChange={(event) => setTgChat(event.target.value)} className={fieldClass} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ContentStudioResearchStep(props: {
  sectionTitleClass: string
  researchUpdatedLabel: string
  researchSourceLabel: string
  hasResearchMeta: boolean
  isFallback: boolean
  isResearchStale: boolean
  isRefreshing: boolean
  onRefresh: () => void
  campaignCards: ReadonlyArray<{ key: string; eyebrow: string; title: string; body: string; metrics: readonly string[] }>
}) {
  const {
    sectionTitleClass,
    researchUpdatedLabel,
    researchSourceLabel,
    hasResearchMeta,
    isFallback,
    isResearchStale,
    isRefreshing,
    onRefresh,
    campaignCards,
  } = props

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              AI проаналізував найкращі рекламні кампанії у ніші coaching/personal development. Натисни на hook щоб адаптувати його у свій контент.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>Дані актуальні на: {researchUpdatedLabel}</span>
              <span>Джерело: {researchSourceLabel}</span>
              {!hasResearchMeta ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">Стартовий шаблон</span> : null}
              {isFallback ? <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-cyan-100">Тимчасовий fallback</span> : null}
              {isResearchStale ? <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-amber-200">Дані скоро застаріють</span> : null}
              <span>Автооновлення: 1-го числа кожного місяця</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--accent-soft-rgb))] transition-colors hover:border-[rgba(var(--accent-rgb),0.28)] disabled:opacity-55"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Оновлення…' : 'Оновити дані'}
          </button>
        </div>
      </div>

      <div className="grid gap-2.5 min-[480px]:grid-cols-2">
        {campaignCards.map((card) => (
          <div key={card.key} className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-3.5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{card.eyebrow}</p>
            <p className="mt-2.5 text-base font-semibold text-[var(--text-primary)]">{card.title}</p>
            <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{card.body}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {card.metrics.map((metric) => (
                <span key={metric} className="rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.09)] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--accent-soft-rgb))]">
                  {metric}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

export function ContentStudioTextsStep(props: {
  sectionTitleClass: string
  groups: ReadonlyArray<{ key: string; label: string }>
  activeGroup: string
  setActiveGroup: (value: string) => void
  formulaType: string
  selectedHookLabel: string
  isGenerating: boolean
  isStrategyReady: boolean
  runGenerateAll: () => Promise<ContentStudioItem[] | undefined>
  textItems: ContentStudioItem[]
  busyItemId: string | null
  onRegenerateItem: (item: ContentStudioItem) => Promise<ContentStudioItem | null> | ContentStudioItem | null
  onApproveItem: (id: string) => void
  onCopy: (value: string) => Promise<void> | void
  onUpdateItemContent: (id: string, value: string) => void
  textVariantPresets: ReadonlyArray<{ title: string; badge: string; tone: string }>
}) {
  const {
    sectionTitleClass,
    groups,
    activeGroup: currentGroup,
    setActiveGroup,
    formulaType,
    selectedHookLabel,
    isGenerating,
    isStrategyReady,
    runGenerateAll,
    textItems,
    busyItemId,
    onRegenerateItem,
    onApproveItem,
    onCopy,
    onUpdateItemContent,
    textVariantPresets,
  } = props

  const hasLiveCards = textItems.length > 0
  const [selectedTextItemId, setSelectedTextItemId] = useState<string | null>(null)
  const visibleTextItems = useMemo(() => {
    if (!hasLiveCards) return []
    const seen = new Set<string>()
    return textItems.filter((item) => {
      const fingerprint = [item.title.trim().toLowerCase(), item.content.join('\n').trim().toLowerCase()].join('::')
      if (seen.has(fingerprint)) return false
      seen.add(fingerprint)
      return true
    }).slice(0, 3)
  }, [hasLiveCards, textItems])

  useEffect(() => {
    if (!hasLiveCards) {
      setSelectedTextItemId(null)
      return
    }
    const latestApproved = textItems
      .filter((item) => item.status === 'approved' || item.status === 'published')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]?.id ?? null
    setSelectedTextItemId(latestApproved)
  }, [hasLiveCards, textItems])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => setActiveGroup(group.key)}
            className={[
              'rounded-[18px] border px-4 py-2 text-sm font-semibold transition-colors',
              currentGroup === group.key
                ? 'border-[rgba(var(--accent-rgb),0.26)] bg-[rgba(var(--accent-rgb),0.1)] text-[var(--text-primary)]'
                : 'border-[var(--border)] bg-[rgba(255,255,255,0.025)] text-[var(--text-secondary)]',
            ].join(' ')}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={sectionTitleClass}>Три варіанти тексту</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Кожна картка нижче вже є готовим блоком продажу: її можна уточнювати, копіювати, підтвердити або перегенерувати. Поточний hook, який впливає на цей крок: {selectedHookLabel}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[rgba(255,122,89,0.22)] bg-[rgba(255,122,89,0.1)] px-3 py-1 text-[11px] font-semibold text-[rgb(255,160,130)]">
              {formulaType} формула
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await runGenerateAll()
                  toast.success('Згенеровано')
                } catch (error) {
                  console.error('[ContentStudioTextsStep] regenerate all failed', error)
                  toast.error('Не вдалося згенерувати')
                }
              }}
              disabled={isGenerating}
              className="rounded-[16px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                {isGenerating ? 'Перегенерація…' : 'Перегенерувати всі'}
              </span>
            </button>
          </div>
        </div>
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-3">
          {(hasLiveCards ? visibleTextItems : textVariantPresets).map((entry, index) => {
            const preset = textVariantPresets[index] ?? textVariantPresets[0]
            const item = hasLiveCards ? (entry as ContentStudioItem) : null
            const bodyText = item
              ? item.content.join('\n\n')
              : [
                  'Вона не чекала дозволу.',
                  'Вона просто вирішила: сьогодні — по-іншому.',
                  'ABsystem не змінює тебе. Він збирає систему, яка перестає зливати твою енергію.',
                ].join('\n\n')

            return (
              <div
                key={item?.id ?? `${preset.badge}-${index}`}
                className={[
                  'flex h-full flex-col rounded-[20px] border px-4 py-4 transition-all',
                  item?.id === selectedTextItemId
                    ? 'border-[rgba(var(--accent-rgb),0.38)] bg-[rgba(var(--accent-rgb),0.08)] shadow-[0_18px_34px_rgba(44,72,180,0.18)]'
                    : 'border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(255,255,255,0.02)]',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] text-[11px] font-semibold text-[var(--text-muted)]">
                      {preset.tone}
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-5 text-[var(--text-primary)]">{preset.title}</p>
                      <span className="mt-2 inline-flex rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-soft-rgb))]">
                        {preset.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[16px] bg-[rgba(7,10,18,0.88)] p-3">
                  <Textarea
                    value={bodyText}
                    onChange={(event) => {
                      if (!item) return
                      onUpdateItemContent(item.id, event.target.value)
                    }}
                    className="min-h-[176px] w-full resize-none bg-transparent text-sm leading-6 text-[var(--text-primary)] outline-none"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (item) {
                          const regenerated = await onRegenerateItem(item)
                          if (regenerated) toast.success('Згенеровано')
                          else toast.error('Не вдалося згенерувати')
                        } else {
                          const generated = await runGenerateAll()
                          if (generated?.length) toast.success('Згенеровано')
                          else toast.error('Не вдалося згенерувати')
                        }
                      } catch (error) {
                        console.error('[ContentStudioTextsStep] regenerate item failed', error)
                        toast.error('Не вдалося згенерувати')
                      }
                    }}
                    disabled={item ? busyItemId === item.id : isGenerating}
                    className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-60"
                  >
                    ↺ Ще раз
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await onCopy(bodyText)
                        toast.success('Скопійовано в буфер обміну')
                      } catch (error) {
                        console.error('[ContentStudioTextsStep] copy failed', error)
                        toast.error('Не вдалося скопіювати текст')
                      }
                    }}
                    className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    Копіювати
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (item) {
                        setSelectedTextItemId(item.id)
                        onApproveItem(item.id)
                        toast.success('Картку обрано')
                        return
                      }
                      const generatedItems = await runGenerateAll()
                      const generatedTexts = generatedItems?.filter((nextItem) => nextItem.type === currentGroup) ?? []
                      const generatedItem = generatedTexts[index] ?? generatedTexts[0]
                      if (generatedItem) {
                        setSelectedTextItemId(generatedItem.id)
                        onApproveItem(generatedItem.id)
                        toast.success('Картку обрано')
                      }
                    }}
                    className="rounded-[14px] border border-[rgba(var(--accent-rgb),0.26)] bg-[rgba(var(--accent-rgb),0.12)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {item?.id === selectedTextItemId ? (
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[rgb(var(--accent-soft-rgb))]">
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                    ) : (
                      'Обрати'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function ContentStudioBannersStep(props: {
  sectionTitleClass: string
  adItems: ContentStudioItem[]
  bannerVariantPresets: ReadonlyArray<{ key: string; title: string; badge: string; emoji: string; imagePrompt: string }>
  imageBusyItemId: string | null
  busyItemId: string | null
  isGenerating: boolean
  isStrategyReady: boolean
  onUpdatePrompt: (id: string, value: string) => void
  onGenerateImagesExisting: (item: ContentStudioItem) => Promise<ContentStudioItem | null | undefined> | ContentStudioItem | null | undefined
  onGenerateImagesTemplate: (index: number) => Promise<ContentStudioItem | null | undefined> | ContentStudioItem | null | undefined
  onRegenerateExisting: (item: ContentStudioItem) => Promise<ContentStudioItem | null | undefined> | ContentStudioItem | null | undefined
  onRegenerateTemplate: () => Promise<ContentStudioItem[] | null | undefined> | ContentStudioItem[] | null | undefined
  onApproveItem: (id: string) => void
  onPublishItem: (item: ContentStudioItem) => Promise<void> | void
}) {
  const {
    sectionTitleClass,
    adItems,
    bannerVariantPresets,
    imageBusyItemId,
    busyItemId,
    isGenerating,
    isStrategyReady,
    onUpdatePrompt,
    onGenerateImagesExisting,
    onGenerateImagesTemplate,
    onRegenerateExisting,
    onRegenerateTemplate,
    onApproveItem,
    onPublishItem,
  } = props

  const hasLiveCards = adItems.length > 0
  const bannerCards = adItems.slice(0, 6)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [previewMode, setPreviewMode] = useState<CrossChannelPreviewMode>('miniapp')
  const previewCard = hasLiveCards
    ? bannerCards[previewIndex ?? 0] ?? null
    : null
  const previewPreset = bannerVariantPresets[previewIndex ?? 0] ?? bannerVariantPresets[0]
  const previewTitle = previewCard?.title ?? previewPreset.title
  const previewPrompt = previewCard?.imagePrompt ?? previewPreset.imagePrompt
  const previewImage = previewCard?.generatedImages?.[0]?.url ?? null

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className={sectionTitleClass}>Банери з зображеннями</p>
            <InfoHint
              label="Банери і реклама"
              description="Кожен банер відповідає окремому варіанту тексту і має свій image prompt."
              instruction="Відредагуй prompt, натисни «Генерувати» й після цього переходь у Reels Engine."
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">Зображення генеруються через ChatGPT Images / DALL·E</p>
        </div>
        <div className="mt-4 rounded-[18px] border border-[rgba(var(--accent-rgb),0.12)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
          Кожен банер відповідає одній формулі. Відредагуй prompt → натисни “Генерувати” → ChatGPT Images збере візуал під цей кут.
        </div>
        {!isStrategyReady ? <p className="mt-3 text-xs text-[rgb(255,160,130)]">Спочатку підтвердь AI стратегію, щоб банери йшли з правильного контексту.</p> : null}

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-3 auto-rows-fr">
          {Array.from({ length: 6 }, (_, index) => {
            const item = bannerCards[index] ?? null
            const preset = bannerVariantPresets[index] ?? bannerVariantPresets[0]
            const promptValue = item?.imagePrompt ?? preset.imagePrompt
            const imageUrl = item?.generatedImages?.[0]?.url

            return (
              <div key={item?.id ?? preset.key} className="flex h-full flex-col overflow-hidden rounded-[20px] border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{preset.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.08)] text-[14px] text-[rgb(var(--accent-soft-rgb))] grayscale">
                      {preset.emoji}
                    </span>
                    <span className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-soft-rgb))]">
                      {preset.badge}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col border-t border-[rgba(255,255,255,0.06)] bg-[rgba(7,10,18,0.72)] px-4 py-4">
                  <div className="flex min-h-[180px] flex-1 items-center justify-center rounded-[16px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] text-center">
                    {imageUrl ? (
                      <img src={imageUrl} alt={preset.title} className="h-full w-full rounded-[14px] object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center px-4">
                        <div className="text-3xl text-[var(--text-muted)]">🖼</div>
                        <p className="mt-3 max-w-[180px] text-sm text-[var(--text-muted)]">Натисни “Генерувати” для ChatGPT Images</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Image prompt</p>
                    <Textarea
                      value={promptValue}
                      onChange={(event) => {
                        if (!item) return
                        onUpdatePrompt(item.id, event.target.value)
                      }}
                      className="mt-2 min-h-[112px] w-full resize-none rounded-[14px] bg-[rgba(7,10,18,0.82)] px-3 py-3 text-xs leading-5 text-[var(--text-primary)] outline-none"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (item) {
                            const result = await onGenerateImagesExisting(item)
                            if (result) toast.success('Зображення згенеровано')
                            else toast.error('Не вдалося згенерувати зображення')
                            return
                          }
                          const result = await onGenerateImagesTemplate(index)
                          if (result) toast.success('Зображення згенеровано')
                          else toast.error('Не вдалося згенерувати зображення')
                        } catch (error) {
                          console.error('[ContentStudioBannersStep] generate images failed', error)
                          toast.error('Не вдалося згенерувати зображення')
                        }
                      }}
                      disabled={(item ? imageBusyItemId === item.id : isGenerating) || !isStrategyReady}
                      className="rounded-[14px] border border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.14)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {!isStrategyReady ? 'Підтверди AI стратегію' : item && imageBusyItemId === item.id ? 'Генерую…' : 'Генерувати'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (item) {
                            await onRegenerateExisting(item)
                            toast.success('Згенеровано')
                            return
                          }
                          const regenerated = await onRegenerateTemplate()
                          if (regenerated?.length) toast.success('Згенеровано')
                          else toast.error('Не вдалося згенерувати')
                        } catch (error) {
                          console.error('[ContentStudioBannersStep] regenerate failed', error)
                          toast.error('Не вдалося згенерувати')
                        }
                      }}
                      disabled={item ? busyItemId === item.id : isGenerating}
                      className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-60"
                    >
                      ↺ Ще раз
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!item) {
                          setPreviewIndex(index)
                          return
                        }
                        setPreviewIndex(index)
                      }}
                      className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      Превʼю
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!item) {
                          setPreviewIndex(index)
                          toast('Спочатку згенеруй банер, щоб опублікувати його.', { icon: '🖼' })
                          return
                        }
                        try {
                          await onPublishItem(item)
                          onApproveItem(item.id)
                          toast.success('Банер опубліковано')
                        } catch (error) {
                          console.error('[ContentStudioBannersStep] publish failed', error)
                          toast.error('Не вдалося опублікувати')
                        }
                      }}
                      className={[
                        'rounded-[14px] border px-3 py-2 text-xs font-semibold transition-colors',
                        item
                          ? 'border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] text-white hover:border-[rgba(var(--accent-rgb),0.34)]'
                          : 'border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] hover:border-[rgba(var(--accent-rgb),0.22)] hover:text-[var(--text-primary)]',
                      ].join(' ')}
                    >
                      Опублікувати
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <CrossChannelPreviewModal
        isOpen={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
        title={previewTitle}
        description="Банер можна подивитися як спільний креатив для desktop, mini app і Telegram, а потім опублікувати в потрібний канал."
        mode={previewMode}
        onModeChange={setPreviewMode}
        moduleName={previewTitle}
        desktop={
          <div className="flex items-start justify-center">
            <div className="w-full max-w-[360px] overflow-hidden rounded-[24px] border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(7,10,18,0.92)]">
              {previewImage ? (
                <img src={previewImage} alt={previewTitle} className="aspect-[4/5] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm leading-6 text-[var(--text-muted)]">
                  {previewPrompt}
                </div>
              )}
              <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Desktop preview</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Готовий візуал для вебу й рекламного показу.</p>
              </div>
            </div>
          </div>
        }
        miniApp={
          <div className="flex items-start justify-center">
            <div className="w-full max-w-[360px] overflow-hidden rounded-[24px] border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(7,10,18,0.92)]">
              {previewImage ? (
                <img src={previewImage} alt={previewTitle} className="aspect-[4/5] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm leading-6 text-[var(--text-muted)]">
                  {previewPrompt}
                </div>
              )}
              <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Mini App preview</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Той самий креатив у мініапці, без втрати контексту.</p>
              </div>
            </div>
          </div>
        }
        telegram={
          <div className="flex items-start justify-center">
            <div className="w-full max-w-[360px] overflow-hidden rounded-[24px] border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(7,10,18,0.92)] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Telegram preview</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {previewTitle}
              </p>
              <div className="mt-4 overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                {previewImage ? (
                  <img src={previewImage} alt={previewTitle} className="aspect-[4/5] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm leading-6 text-[var(--text-muted)]">
                    {previewPrompt}
                  </div>
                )}
              </div>
            </div>
          </div>
        }
      />
    </div>
  )
}
