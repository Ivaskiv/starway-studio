import {
  AGENTS_REGISTRY,
  type AgentConfig,
  type AgentTone,
  type AgentType,
  type GenerationMode,
  type ProtocolMode,
  type SharedContext,
} from '@/modules/sales-assistant/agents/agents.registry.js'
import { getPresetInstructions } from '@/modules/sales-assistant/agents/preset.modifiers.js'

export type BuildPromptInput = {
  agent: AgentType
  contentType?: string
  dna?: {
    protocol?: ProtocolMode
    tone?: AgentTone
    generationMode?: GenerationMode
  }
  strategy?: {
    lexiconRequired?: string[]
    lexiconForbidden?: string[]
  }
  sharedContext: SharedContext
  preset?: import('@/modules/sales-assistant/agents/agents.registry.js').PresetType
}

const DEFAULT_REQUIRED = ['тригер', 'застрягла', 'масштаб', 'зливати', 'тупняк', 'готово']
const DEFAULT_FORBIDDEN = [
  'трансформація',
  'унікальна можливість',
  'успішний успіх',
  'результат гарантовано',
  'просто почни',
  'не хочу',
]

const TONE_RULES: Record<AgentTone, string> = {
  clear: 'Тон: чіткий, прямий, без зайвих метафор.',
  warm: 'Тон: теплий, емпатійний, підтримуючий без сюсюкання.',
  expert: 'Тон: експертний, структурний, доказовий.',
  bold: 'Тон: сміливий, рішучий, без мʼяких відступів.',
}

const PROTOCOL_RULES: Record<ProtocolMode, string> = {
  raw_truth: 'Протокол: RAW TRUTH. Ніяких прикрас, тільки діагноз і дія.',
  architect: 'Протокол: ARCHITECT. Проєктуй системно, блоками і сценаріями.',
  psychology: 'Протокол: PSYCHOLOGY. Враховуй страхи, когнітивні барʼєри і мотивацію.',
}

const MODE_RULES: Record<GenerationMode, string> = {
  FAST: 'Mode FAST: короткі, високошвидкісні формулювання.',
  BALANCED: 'Mode BALANCED: баланс глибини і швидкості.',
  DEEP: 'Mode DEEP: максимальна деталізація і обґрунтування.',
}

function fillTemplate(template: string, context: SharedContext, required: string, forbidden: string, presetInstructions: string): string {
  return template
    .replaceAll('{audiencePain}', context.audiencePain ?? '')
    .replaceAll('{targetAction}', context.targetAction ?? '')
    .replaceAll('{product}', context.product ?? '')
    .replaceAll('{preset_instructions}', presetInstructions)
    .replaceAll('{lexicon_required}', required)
    .replaceAll('{lexicon_forbidden}', forbidden)
}

function buildBehaviorSection(config: AgentConfig, contentType?: string): string {
  const modifiers = contentType
    ? config.outputModifiers[(contentType as keyof typeof config.outputModifiers)] ?? []
    : []

  return [
    `PERSUASION STYLE: ${config.persuasionStyle}`,
    `EMOTIONAL STRATEGY: ${config.emotionalStrategy}`,
    `CTA BEHAVIOR: ${config.ctaBehavior}`,
    `TONE RULES: ${config.toneRules.join('; ')}`,
    `STRUCTURE RULES: ${config.structureRules.join('; ')}`,
    `FORBIDDEN PATTERNS: ${config.forbiddenPatterns.join('; ')}`,
    modifiers.length > 0 ? `OUTPUT MODIFIERS (${contentType}): ${modifiers.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildPrompt(input: BuildPromptInput): { systemPrompt: string; userPrompt: string; config: AgentConfig } {
  const config = AGENTS_REGISTRY[input.agent]
  const required = (input.strategy?.lexiconRequired ?? DEFAULT_REQUIRED).join(', ')
  const forbidden = (input.strategy?.lexiconForbidden ?? DEFAULT_FORBIDDEN).join(', ')
  const presetInstructions = getPresetInstructions(input.preset)

  const protocol = input.dna?.protocol ?? 'raw_truth'
  const tone = input.dna?.tone ?? 'clear'
  const generationMode = input.dna?.generationMode ?? 'BALANCED'

  const systemPrompt = [
    fillTemplate(config.systemPromptTemplate, input.sharedContext, required, forbidden, presetInstructions),
    '',
    buildBehaviorSection(config, input.contentType),
    PROTOCOL_RULES[protocol],
    TONE_RULES[tone],
    MODE_RULES[generationMode],
  ]
    .filter(Boolean)
    .join('\n')

  const userPrompt = [
    `Біль аудиторії: ${input.sharedContext.audiencePain ?? ''}`,
    `Цільова дія: ${input.sharedContext.targetAction ?? ''}`,
    `Продукт: ${input.sharedContext.product ?? ''}`,
    input.sharedContext.additionalNotes ? `Додатково: ${input.sharedContext.additionalNotes}` : '',
    input.contentType ? `Цільовий формат: ${input.contentType}` : '',
    'Поверни відповідь строго у форматі JSON згідно schema агента.',
  ]
    .filter(Boolean)
    .join('\n')

  return { systemPrompt, userPrompt, config }
}
