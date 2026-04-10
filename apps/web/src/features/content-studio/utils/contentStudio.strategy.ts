import type {
  AnalyticsFunnel,
  AnalyticsInsights,
  AnalyticsOverview,
  AnalyticsTrackingIntegrity,
} from '../../analytics/types/types'
import type {
  ContentStudioAIStrategy,
  ContentStudioInputs,
  ContentStudioWeakestStep,
} from '../types/contentStudio.types'

type StrategyMeta = {
  displayLabel: string
  coreProblem: string
  reasons: string[]
  actions: string[]
  contentFocus: string
  hookAngle: string
  ctaStrategy: string
  suggestedFormats: ContentStudioAIStrategy['suggestedFormats']
  formatReasoning: string
  hookType: string
  emotion: string
}

const STEP_META: Record<ContentStudioWeakestStep, StrategyMeta> = {
  lead_magnet_to_app_entry: {
    displayLabel: 'lead magnet → app entry',
    coreProblem: 'відсутній зв’язок між lead magnet і продуктом',
    reasons: [
      'користувачі з lead magnet не передаються в продукт',
      'немає user matching (email / utm / id)',
      'дані з різних систем не зв’язані',
    ],
    actions: [
      'передавати email або user_id при переході в продукт',
      "додати подію 'lead_entered_app'",
      'зв’язати SendPulse / Telegram / Web через єдиний user_id',
    ],
    contentFocus: 'змусити перейти в продукт',
    hookAngle: 'перейди і отримай результат одразу',
    ctaStrategy: 'відкрити інструмент зараз',
    suggestedFormats: ['reels', 'ad'],
    formatReasoning: 'Потрібно спочатку повернути людей у продукт, тому найкраще працюють охоплення і пряме переведення в дію.',
    hookType: 'disruption',
    emotion: 'терміновість',
  },
  lead_magnet_to_wheel: {
    displayLabel: 'lead magnet → wheel',
    coreProblem: 'після lead magnet людина не бачить ясного наступного кроку',
    reasons: ['слабкий CTA', 'немає чіткого наступного кроку', 'немає миттєвої цінності'],
    actions: ['спростити onboarding до 1 дії', 'додати миттєву цінність у першій взаємодії', 'підсилити ясність CTA'],
    contentFocus: 'швидка цінність + простий перший крок',
    hookAngle: 'отримай результат за 60 секунд',
    ctaStrategy: 'перейди і спробуй одразу',
    suggestedFormats: ['reels', 'stories'],
    formatReasoning: 'Потрібні швидке залучення та дуже просте донесення цінності, щоб людина не зависла між lead magnet і наступним кроком.',
    hookType: 'curiosity',
    emotion: 'цікавість',
  },
  wheel_to_trial: {
    displayLabel: 'wheel → trial',
    coreProblem: 'людина не доходить до trial, бо крок здається складним або неемоційним',
    reasons: ['занадто складно', 'немає емоційного хука'],
    actions: ['зменшити когнітивне навантаження', 'додати емоційний тригер (біль / бажання)', 'показати результат до процесу'],
    contentFocus: 'зняти складність',
    hookAngle: 'це простіше ніж здається',
    ctaStrategy: 'почни без зусиль',
    suggestedFormats: ['reels', 'dm'],
    formatReasoning: 'Тут потрібно коротко пояснити, що це легко, а потім дожати людину через особисту комунікацію.',
    hookType: 'education',
    emotion: 'довіра',
  },
  trial_to_engagement: {
    displayLabel: 'trial → engagement',
    coreProblem: 'trial не дає швидкої цінності і не втягує людину в дію',
    reasons: ['немає quick win', 'неясне використання'],
    actions: ['створити quick win сценарій за 60 секунд', 'провести людину одним зрозумілим flow', 'зменшити фрикцію в UI'],
    contentFocus: 'показати quick win',
    hookAngle: 'перший результат вже зараз',
    ctaStrategy: 'зроби 1 дію',
    suggestedFormats: ['stories', 'dm'],
    formatReasoning: 'Потрібно втягнути користувача в дію і провести його через короткий супровід без перевантаження.',
    hookType: 'reframe',
    emotion: 'полегшення',
  },
  trial_to_purchase: {
    displayLabel: 'trial → purchase',
    coreProblem: 'trial не показує достатньої цінності, щоб людина купила',
    reasons: ['немає відчутної цінності', 'слабкий офер'],
    actions: ['прояснити цінність продукту', 'додати proof або кейси', 'підсилити офер бонусом чи терміновістю'],
    contentFocus: 'цінність + результат',
    hookAngle: 'ось що ти реально отримаєш',
    ctaStrategy: 'забери доступ',
    suggestedFormats: ['dm', 'ad'],
    formatReasoning: 'На цьому кроці потрібні дожим і продаж: особистий контакт або реклама, яка прямо веде до покупки.',
    hookType: 'proof',
    emotion: 'терміновість',
  },
}

const FALLBACK_META: StrategyMeta = {
  displayLabel: 'немає чіткого вузького кроку',
  coreProblem: 'немає стабільного потоку нових користувачів',
  reasons: ['немає достатньо вузького патерну в даних'],
  actions: ['збільшити стабільний потік нових користувачів', 'звести стартовий маршрут до 1 ясного кроку'],
  contentFocus: 'швидка цінність + простий перший крок',
  hookAngle: 'отримай результат за 60 секунд',
  ctaStrategy: 'перейди і спробуй одразу',
  suggestedFormats: ['reels'],
  formatReasoning: 'Поки не видно вузького bottleneck, краще почати з Reels і швидко зібрати сигнал від нових користувачів.',
  hookType: 'curiosity',
  emotion: 'цікавість',
}

function buildDisconnectedMeta(integrity: AnalyticsTrackingIntegrity): StrategyMeta {
  return {
    displayLabel: STEP_META.lead_magnet_to_app_entry.displayLabel,
    coreProblem: integrity.coreProblem,
    reasons: [...integrity.reasons],
    actions: [...integrity.actions],
    contentFocus: STEP_META.lead_magnet_to_app_entry.contentFocus,
    hookAngle: STEP_META.lead_magnet_to_app_entry.hookAngle,
    ctaStrategy: STEP_META.lead_magnet_to_app_entry.ctaStrategy,
    suggestedFormats: ['reels', 'ad'],
    formatReasoning: STEP_META.lead_magnet_to_app_entry.formatReasoning,
    hookType: 'disruption',
    emotion: 'терміновість',
  }
}

function safeRate(nextUsers: number, currentUsers: number) {
  if (!currentUsers || currentUsers <= 0) return 0
  return Math.round((nextUsers / currentUsers) * 100)
}

function getStageUsers(stages: AnalyticsFunnel['stages'], stage: AnalyticsFunnel['stages'][number]['stage']) {
  return stages.find((entry) => entry.stage === stage)?.users ?? 0
}

function getTransitionRate(
  funnel: AnalyticsFunnel | null,
  fromStage: AnalyticsFunnel['stages'][number]['stage'],
  toStage: AnalyticsFunnel['stages'][number]['stage'],
  fallback: { numerator: number; denominator: number },
) {
  if (!funnel) return safeRate(fallback.numerator, fallback.denominator)
  const stageUsers = getStageUsers(funnel.stages, toStage)
  const fromUsers = getStageUsers(funnel.stages, fromStage)
  if (fromStage === 'lead_magnet' && toStage === 'wheel') return funnel.conversions.leadMagnetToWheel
  if (fromStage === 'wheel' && toStage === 'trial') return funnel.conversions.wheelToTrial
  if (fromStage === 'trial' && toStage === 'purchase') return funnel.conversions.trialToPurchase
  if (fromStage === 'trial' && toStage === 'engagement') return safeRate(stageUsers, fromUsers)
  return safeRate(stageUsers, fromUsers)
}

function isEligibleRate(conversion: number, sampleSize: number) {
  if (sampleSize < 10) return false
  if (conversion === 100 && sampleSize < 20) return false
  return true
}

function buildHumanInsight(meta: StrategyMeta, conversion: number, sampleSize: number) {
  return [
    `Ключова проблема: ${meta.coreProblem}.`,
    `Де ламається: ${meta.displayLabel} (${conversion}% на вибірці ${sampleSize}).`,
    `Чому: ${meta.reasons.map((reason) => reason.toLowerCase()).join(' · ')}.`,
    `Що робити: ${meta.actions.join(' · ')}.`,
  ].join('\n')
}

export function buildContentStudioAIStrategy(params: {
  inputs: ContentStudioInputs
  analyticsInsights: AnalyticsInsights | null
  analyticsOverview: AnalyticsOverview | null
  analyticsFunnel: AnalyticsFunnel | null
  trackingIntegrity?: AnalyticsTrackingIntegrity | null
}) : ContentStudioAIStrategy {
  const { inputs, analyticsInsights, analyticsOverview, analyticsFunnel, trackingIntegrity } = params
  if (trackingIntegrity?.isDisconnected) {
    const meta = buildDisconnectedMeta(trackingIntegrity)
    const humanInsight = [
      `Ключова проблема: ${meta.coreProblem}.`,
      'Де ламається: після lead magnet, бо користувач не доходить у продукт або не зв’язується між системами.',
      `Чому: ${meta.reasons.join(' · ')}.`,
      `Що робити: ${meta.actions.join(' · ')}.`,
      trackingIntegrity.worstSource ? `Найгірше джерело: ${trackingIntegrity.worstSource} · конверсія ${trackingIntegrity.sourceConversion}%.` : null,
    ].filter(Boolean).join('\n')

    return {
      coreProblem: meta.coreProblem,
      weakestStep: trackingIntegrity.weakestStep,
      conversion: trackingIntegrity.conversion,
      sampleSize: trackingIntegrity.sampleSize,
      reasons: [...meta.reasons],
      actions: [...meta.actions],
      contentFocus: meta.contentFocus,
      hookAngle: meta.hookAngle,
      ctaStrategy: meta.ctaStrategy,
      hookType: meta.hookType,
      emotion: meta.emotion,
      suggestedFormats: [...meta.suggestedFormats],
      formatReasoning: meta.formatReasoning,
      humanInsight,
      isFallback: true,
      trackingDisconnected: true,
      worstSource: trackingIntegrity.worstSource,
      sourceConversion: trackingIntegrity.sourceConversion,
    }
  }
  const stages = analyticsFunnel?.stages ?? []
  const transitionCandidates = [
    {
      key: 'lead_magnet_to_wheel' as const,
      conversion: getTransitionRate(analyticsFunnel, 'lead_magnet', 'wheel', { numerator: getStageUsers(stages, 'wheel'), denominator: getStageUsers(stages, 'lead_magnet') }),
      sampleSize: getStageUsers(stages, 'lead_magnet'),
    },
    {
      key: 'wheel_to_trial' as const,
      conversion: getTransitionRate(analyticsFunnel, 'wheel', 'trial', { numerator: getStageUsers(stages, 'trial'), denominator: getStageUsers(stages, 'wheel') }),
      sampleSize: getStageUsers(stages, 'wheel'),
    },
    {
      key: 'trial_to_engagement' as const,
      conversion: getTransitionRate(analyticsFunnel, 'trial', 'engagement', { numerator: getStageUsers(stages, 'engagement'), denominator: getStageUsers(stages, 'trial') }),
      sampleSize: getStageUsers(stages, 'trial'),
    },
    {
      key: 'trial_to_purchase' as const,
      conversion: getTransitionRate(analyticsFunnel, 'trial', 'purchase', { numerator: getStageUsers(stages, 'purchase'), denominator: getStageUsers(stages, 'trial') }),
      sampleSize: getStageUsers(stages, 'trial'),
    },
  ]

  const eligible = transitionCandidates.filter((candidate) => isEligibleRate(candidate.conversion, candidate.sampleSize))
  const weakest = eligible.sort((left, right) => left.conversion - right.conversion || left.sampleSize - right.sampleSize)[0] ?? null

  const topCategoryLabel = analyticsInsights?.topCategories?.[0]?.label?.trim() ?? ''
  const topProblemLabel = analyticsInsights?.topProblems?.[0]?.label?.trim() ?? ''
  const topProblemReason = topProblemLabel && topProblemLabel.toLowerCase() !== 'general'
    ? `Система додатково бачить сигнал по проблемі: ${topProblemLabel}.`
    : ''
  const productLabel = inputs.product[0] ?? 'ABsystem'
  const audienceLabel = inputs.audience[0] ?? 'аудиторія'
  const goalLabel = inputs.goal[0] ?? 'sale'

  if (!weakest) {
  return {
      coreProblem: FALLBACK_META.coreProblem,
      weakestStep: null,
      conversion: 0,
      sampleSize: 0,
      reasons: FALLBACK_META.reasons,
      actions: FALLBACK_META.actions,
      contentFocus: FALLBACK_META.contentFocus,
      hookAngle: FALLBACK_META.hookAngle,
      ctaStrategy: FALLBACK_META.ctaStrategy,
      hookType: FALLBACK_META.hookType,
      emotion: FALLBACK_META.emotion,
      suggestedFormats: [...FALLBACK_META.suggestedFormats],
      formatReasoning: FALLBACK_META.formatReasoning,
      humanInsight: [
        `Ключова проблема: ${FALLBACK_META.coreProblem}.`,
        'Де ламається: поки немає достатньо вузького і стабільного патерну.',
        `Чому: ${FALLBACK_META.reasons.join(' · ')}.`,
        `Що робити: ${FALLBACK_META.actions.join(' · ')}.`,
      ].join('\n'),
      isFallback: true,
    }
  }

  const meta = STEP_META[weakest.key]
  const humanInsight = buildHumanInsight(meta, weakest.conversion, weakest.sampleSize)

  return {
    coreProblem: meta.coreProblem,
    weakestStep: weakest.key,
    conversion: weakest.conversion,
    sampleSize: weakest.sampleSize,
    reasons: [...meta.reasons],
    actions: [...meta.actions],
    contentFocus: meta.contentFocus,
    hookAngle: meta.hookAngle,
    ctaStrategy: meta.ctaStrategy,
    hookType: meta.hookType,
    emotion: meta.emotion,
    suggestedFormats: [...meta.suggestedFormats],
    formatReasoning: meta.formatReasoning,
    humanInsight: [
      humanInsight,
      `Контекст: ${productLabel} · ${audienceLabel} · ціль ${goalLabel}.`,
      topCategoryLabel && topCategoryLabel.toLowerCase() !== 'general' ? `Сигнал по аудиторії: ${topCategoryLabel}.` : null,
      topProblemReason || null,
      trackingIntegrity?.worstSource ? `Найгірше джерело: ${trackingIntegrity.worstSource} · конверсія ${trackingIntegrity.sourceConversion}%.` : null,
    ].filter(Boolean).join('\n'),
    isFallback: false,
    trackingDisconnected: false,
    worstSource: trackingIntegrity?.worstSource ?? null,
    sourceConversion: trackingIntegrity?.sourceConversion ?? 0,
  }
}

export function makeContentStudioStrategyFingerprint(strategy: ContentStudioAIStrategy | null) {
  if (!strategy) return 'strategy:none'
  return [
    strategy.coreProblem,
    strategy.weakestStep ?? 'none',
    strategy.conversion,
    strategy.sampleSize,
    strategy.contentFocus,
    strategy.hookAngle,
    strategy.ctaStrategy,
    strategy.suggestedFormats.join(','),
    strategy.isFallback ? 'fallback' : 'live',
  ].join('|')
}

export function formatContentStudioWeakestStep(step: ContentStudioWeakestStep | null) {
  return step ? STEP_META[step].displayLabel : FALLBACK_META.displayLabel
}
