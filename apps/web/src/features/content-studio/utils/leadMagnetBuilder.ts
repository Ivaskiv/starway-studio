import type {
  ContentStudioAIStrategy,
  ContentStudioFunnelInsight,
  ContentStudioLeadMagnetPayload,
  LeadMagnet,
  LeadMagnetDestination,
  LeadMagnetFormat,
} from '../types/contentStudio.types'

const FORMAT_BY_KEY: Record<string, LeadMagnetFormat> = {
  checklist: 'checklist',
  guide: 'guide',
  quiz: 'quiz',
  exercise: 'exercise',
  'bot-flow': 'bot-flow',
  mini_practice: 'exercise',
  micro_wheel: 'bot-flow',
  pdf: 'guide',
  video: 'guide',
}

export function normalizeLeadMagnetFormat(value: string): LeadMagnetFormat {
  return FORMAT_BY_KEY[value] ?? 'checklist'
}

export function generateLeadMagnet(params: {
  insight: Pick<ContentStudioAIStrategy, 'coreProblem' | 'weakestStep' | 'reasons' | 'actions' | 'contentFocus' | 'hookAngle' | 'ctaStrategy'>
  funnelInsight?: ContentStudioFunnelInsight | null
  formatKey: string
  productLabel: string
}): LeadMagnet {
  const { insight, funnelInsight, formatKey, productLabel } = params
  const format = normalizeLeadMagnetFormat(formatKey)
  const coreProblem = insight.coreProblem || funnelInsight?.summary || 'після lead magnet людина не бачить ясного наступного кроку'
  const weakStep = funnelInsight?.weakestStableStep ?? insight.weakestStep ?? 'lead_magnet_to_wheel'
  const stepLabel = weakStep === 'lead_magnet_to_wheel'
    ? 'Після lead magnet людина не бачить ясного наступного кроку'
    : weakStep === 'lead_magnet_to_app_entry'
      ? 'Після lead magnet людина не переходить у продукт'
      : 'Лідмагніт не підштовхує до наступної дії'
  const stepSeed = insight.actions.length > 0 ? insight.actions : ['Спростити onboarding до 1 дії', 'Додати миттєву цінність у першій взаємодії', 'Підсилити CTA']
  const steps = stepSeed.slice(0, 5)
  const promise = 'Перший результат за 10 хвилин'

  return {
    id: `${Date.now()}`,
    title: `${productLabel} · Lead magnet`,
    promise,
    format,
    structure: {
      hook: insight.hookAngle || `Ти відчуваєш, що ${coreProblem}?`,
      explanation: stepLabel,
      steps,
      result: `За кілька хвилин людина бачить перший практичний зсув і розуміє, що ${productLabel} може дати їй наступний крок.`,
      transitionToProduct: insight.ctaStrategy || `Перейди в ${productLabel} і забери наступний крок одразу.`,
    },
    status: 'review',
    destinations: ['telegram_bot'],
    createdAt: new Date(),
  }
}

export function leadMagnetToPayload(params: {
  leadMagnet: LeadMagnet
  insight: Pick<ContentStudioAIStrategy, 'coreProblem' | 'weakestStep' | 'reasons' | 'actions'>
  formatLabel: string
  formatKey: string
  funnelStepLabel: string
  realConversion: string
  idealConversion: string
  sampleSize: number
  aiInsight: string
  confirmations: string[]
  productLabel: string
}): ContentStudioLeadMagnetPayload {
  const { leadMagnet, insight } = params

  const previewText = [
    leadMagnet.title,
    `Обіцянка: ${leadMagnet.promise}`,
    `Формат: ${leadMagnet.format}`,
    `Ключова проблема: ${leadMagnet.structure.explanation}`,
    `Кроки: ${leadMagnet.structure.steps.join(' · ')}`,
    `Результат: ${leadMagnet.structure.result}`,
  ].join('\n')

  const telegramMessage = [
    `🎁 ${leadMagnet.title}`,
    leadMagnet.structure.hook,
    leadMagnet.structure.explanation,
    ...leadMagnet.structure.steps.map((step, index) => `${index + 1}. ${step}`),
    leadMagnet.structure.result,
    leadMagnet.structure.transitionToProduct,
  ].join('\n\n')

  return {
    id: leadMagnet.id,
    productLabel: params.productLabel,
    status: leadMagnet.status,
    destinations: leadMagnet.destinations,
    promise: leadMagnet.promise,
    format: leadMagnet.format,
    structure: leadMagnet.structure,
    title: leadMagnet.title,
    formatKey: params.formatKey,
    formatLabel: params.formatLabel,
    previewText,
    contentText: previewText,
    telegramMessage,
    aiInsight: params.aiInsight,
    funnelStepLabel: params.funnelStepLabel,
    realConversion: params.realConversion,
    idealConversion: params.idealConversion,
    sampleSize: params.sampleSize,
    explanation: insight.coreProblem,
    arguments: insight.actions,
    confirmations: params.confirmations,
  }
}

export function buildLeadMagnetDestinationsLabel(destinations: LeadMagnetDestination[]) {
  return destinations.length > 0 ? destinations.join(' · ') : 'Не вибрано'
}
