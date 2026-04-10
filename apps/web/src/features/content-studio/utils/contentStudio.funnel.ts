import type { AnalyticsFunnel } from '../../analytics/types/types'

export type ContentStudioFunnelTransitionKey =
  | 'lead_magnet_to_wheel'
  | 'wheel_to_trial'
  | 'trial_to_engagement'
  | 'trial_to_purchase'

export interface ContentStudioFunnelStepInsight {
  step: ContentStudioFunnelTransitionKey
  fromLabel: string
  toLabel: string
  realUsers: number
  sampleSize: number
  realConversion: string
  idealConversion: string
  explanation: string
  arguments: string[]
  differencePoints: number | null
  isStable: boolean
}

export interface ContentStudioFunnelInsight {
  steps: ContentStudioFunnelStepInsight[]
  summary: string
  weakestStableStep: ContentStudioFunnelTransitionKey | null
  weakestStableConversion: number | null
}

type StepMeta = {
  step: ContentStudioFunnelTransitionKey
  fromStage: AnalyticsFunnel['stages'][number]['stage']
  toStage: AnalyticsFunnel['stages'][number]['stage']
  fromLabel: string
  toLabel: string
  idealRange: string
  idealTarget: number
  reasons: string[]
  arguments: string[]
  explanation: string
}

const STEP_META: readonly StepMeta[] = [
  {
    step: 'lead_magnet_to_wheel',
    fromStage: 'lead_magnet',
    toStage: 'wheel',
    fromLabel: 'Lead magnet',
    toLabel: 'Wheel',
    idealRange: '60–80%',
    idealTarget: 70,
    reasons: ['слабий CTA', 'немає ясного наступного кроку', 'немає миттєвої цінності'],
    arguments: ['простий CTA', 'миттєва цінність у першому кроці', 'людина одразу бачить наступну дію'],
    explanation: 'Це показує, наскільки lead magnet швидко переводить людину в наступну дію. Якщо нижче ідеалу, значить CTA або цінність не дотягують.',
  },
  {
    step: 'wheel_to_trial',
    fromStage: 'wheel',
    toStage: 'trial',
    fromLabel: 'Wheel',
    toLabel: 'Trial',
    idealRange: '50–70%',
    idealTarget: 60,
    reasons: ['занадто складно', 'немає емоційного хука'],
    arguments: ['зменшити когнітивне навантаження', 'додати емоційний тригер', 'показати результат до процесу'],
    explanation: 'Цей перехід має бути простим і зрозумілим. Якщо він слабкий, користувачі бачать складність раніше, ніж цінність.',
  },
  {
    step: 'trial_to_engagement',
    fromStage: 'trial',
    toStage: 'engagement',
    fromLabel: 'Trial',
    toLabel: 'Engagement',
    idealRange: '70–90%',
    idealTarget: 80,
    reasons: ['немає quick win', 'неясне використання'],
    arguments: ['quick win за 60 секунд', 'один зрозумілий flow', 'мінімум фрикції в UI'],
    explanation: 'Тут важливо втягнути людину в дію дуже швидко. Якщо крок просідає, trial не дає відчутної користі.',
  },
  {
    step: 'trial_to_purchase',
    fromStage: 'trial',
    toStage: 'purchase',
    fromLabel: 'Trial',
    toLabel: 'Purchase',
    idealRange: '30–50%',
    idealTarget: 40,
    reasons: ['немає відчутної цінності', 'слабкий офер'],
    arguments: ['прояснити цінність продукту', 'додати proof або кейси', 'підсилити офер бонусом або терміновістю'],
    explanation: 'Це вже зона монетизації. Якщо крок слабкий, людям не вистачає довіри, proof або сильнішої пропозиції.',
  },
]

function roundToOne(value: number) {
  return Math.round(value * 10) / 10
}

function formatPercent(value: number) {
  const rounded = roundToOne(value)
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}%` : `${rounded.toFixed(1)}%`
}

function getStageUsers(stages: AnalyticsFunnel['stages'], stage: AnalyticsFunnel['stages'][number]['stage']) {
  return stages.find((entry) => entry.stage === stage)?.users ?? 0
}

function getTransitionConversion(
  funnel: AnalyticsFunnel | null,
  fromStage: AnalyticsFunnel['stages'][number]['stage'],
  toStage: AnalyticsFunnel['stages'][number]['stage'],
) {
  if (!funnel) return 0

  if (fromStage === 'lead_magnet' && toStage === 'wheel') return funnel.conversions.leadMagnetToWheel
  if (fromStage === 'wheel' && toStage === 'trial') return funnel.conversions.wheelToTrial
  if (fromStage === 'trial' && toStage === 'purchase') return funnel.conversions.trialToPurchase
  if (fromStage === 'trial' && toStage === 'engagement') {
    const fromUsers = getStageUsers(funnel.stages, fromStage)
    const toUsers = getStageUsers(funnel.stages, toStage)
    if (!fromUsers) return 0
    return roundToOne((toUsers / fromUsers) * 100)
  }

  const fromUsers = getStageUsers(funnel.stages, fromStage)
  const toUsers = getStageUsers(funnel.stages, toStage)
  if (!fromUsers) return 0
  return roundToOne((toUsers / fromUsers) * 100)
}

function getRealUsers(
  funnel: AnalyticsFunnel | null,
  stage: AnalyticsFunnel['stages'][number]['stage'],
) {
  if (!funnel) return 0
  return getStageUsers(funnel.stages, stage)
}

function isStableSample(sampleSize: number, conversion: number) {
  if (sampleSize < 10) return false
  if (conversion === 100 && sampleSize < 20) return false
  return true
}

function buildRealConversionLabel(conversion: number, realUsers: number, sampleSize: number, isStable: boolean) {
  if (sampleSize <= 0) return 'немає даних'
  const stabilityLabel = isStable ? '' : ' · нестабільно'
  return `${formatPercent(conversion)} · ${realUsers} з ${sampleSize}${stabilityLabel}`
}

export function buildContentStudioFunnelInsight(funnel: AnalyticsFunnel | null): ContentStudioFunnelInsight {
  const steps = STEP_META.map((meta) => {
    const sampleSize = getStageUsers(funnel?.stages ?? [], meta.fromStage)
    const realUsers = getRealUsers(funnel, meta.toStage)
    const realConversion = getTransitionConversion(funnel, meta.fromStage, meta.toStage)
    const isStable = isStableSample(sampleSize, realConversion)
    const differencePoints = sampleSize > 0 ? roundToOne(realConversion - meta.idealTarget) : null
    const gapText = differencePoints === null
      ? 'немає достатньо даних'
      : differencePoints === 0
        ? 'на рівні ідеалу'
        : differencePoints > 0
          ? `на ${formatPercent(differencePoints)} вище ідеалу`
          : `на ${formatPercent(Math.abs(differencePoints))} нижче ідеалу`

    const explanation = sampleSize < 10
      ? `Вибірка ${sampleSize} користувачів занадто мала, тому сигнал нестабільний. Ідеал для цього кроку: ${meta.idealRange}.`
      : `${meta.fromLabel} → ${meta.toLabel}: реально ${formatPercent(realConversion)} (${realUsers} з ${sampleSize}). Ідеал: ${meta.idealRange}. Різниця: ${gapText}.`

    return {
      step: meta.step,
      fromLabel: meta.fromLabel,
      toLabel: meta.toLabel,
      realUsers,
      sampleSize,
      realConversion: buildRealConversionLabel(realConversion, realUsers, sampleSize, isStable),
      idealConversion: `${meta.idealRange} (ціль ${meta.idealTarget}%)`,
      explanation,
      arguments: [...meta.arguments],
      differencePoints,
      isStable,
    }
  })

  const stableSteps = steps.filter((step) => step.isStable && step.sampleSize > 0)
  const weakestStableStep = stableSteps
    .slice()
    .sort((left, right) => (left.differencePoints ?? 0) - (right.differencePoints ?? 0) || left.sampleSize - right.sampleSize)[0] ?? null

  const weakestStableConversion = weakestStableStep?.differencePoints ?? null

  const summary = !funnel || steps.every((step) => step.sampleSize === 0)
    ? 'Недостатньо даних, щоб чесно порахувати воронку.'
    : weakestStableStep
      ? `Найслабший стабільний крок: ${weakestStableStep.fromLabel} → ${weakestStableStep.toLabel}. Реально ${weakestStableStep.realConversion}, ідеал ${weakestStableStep.idealConversion}.`
      : 'Є дані, але вибірки занадто малі або нестабільні, щоб чесно виділити bottleneck.'

  return {
    steps,
    summary,
    weakestStableStep: weakestStableStep?.step ?? null,
    weakestStableConversion,
  }
}
