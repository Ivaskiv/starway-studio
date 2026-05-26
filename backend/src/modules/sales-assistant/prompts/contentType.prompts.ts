import type { ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'

export type ContentTypeKey =
  | 'blog'
  | 'landing'
  | 'storytelling'
  | 'telegram_msg'
  | 'reels'
  | 'stories'
  | 'warmup'
  | 'webinar'
  | 'audit'
  | 'post'
  | 'email'
  | 'sales'

export type PromptTone = 'clear' | 'warm' | 'expert' | 'bold'
export type PromptProtocol = 'raw_truth' | 'architect' | 'psychology'
export type FreeFirstRoutingMode = 'FAST' | 'BALANCED' | 'PREMIUM'

export type PromptInput = {
  selectedProtocol: string
  tone?: PromptTone
  userContext: string
  userRequest: string
  selectedOutputs?: string[]
}

const FORBIDDEN_LEXICON = [
  'трансформація',
  'унікальна можливість',
  'успішний успіх',
  'дозволь собі',
  'інноваційний прорив',
  'давай зануримося',
]

const REQUIRED_MARKERS = [
  'тригер',
  'застрягла',
  'зливати',
  'тупняк',
  'внутрішній критик',
  'точка опори',
]

function resolveProtocolInstruction(protocol: string): string {
  const key = protocol.trim().toLowerCase()
  if (key === 'raw_truth') return 'Позиція: максимально пряма, чесна, без згладжувань.'
  if (key === 'architect') return 'Позиція: структурний архітектор рішень, кроки і системність.'
  if (key === 'psychology') return 'Позиція: поведінкова психологія, мотиви, опір, тригери.'
  return 'Позиція: збалансована, конкретна, без води.'
}

function resolveToneInstruction(tone?: PromptTone): string {
  if (tone === 'warm') return 'Тон: теплий, підтримуючий, без сюсюкання.'
  if (tone === 'expert') return 'Тон: експертний, точний, предметний.'
  if (tone === 'bold') return 'Тон: сміливий, рішучий, без пом’якшень.'
  return 'Тон: clear, лаконічний, кристально зрозумілий.'
}

const OUTPUT_SCHEMAS: Record<ContentTypeKey, string> = {
  blog: '{"h1":"string","readTime":0,"thesis_blocks":[{"title":"string","words":0}],"body":"string","cta":"string","seoMeta":"string"}',
  landing: '{"hero":"string","painBlock":"string","solutionBlock":"string","proofBlock":"string","offerBlock":"string","ctaBlock":"string","faqBlock":"string","blueprintBlocks":["string"]}',
  storytelling: '{"stories":[{"title":"string","sceneType":"string","text":"string"}]} // рівно 5',
  telegram_msg: '{"messages":[{"text":"string","symbolCount":0}],"ctaLink":"string"}',
  reels: '{"timeline":[{"start":"string","end":"string","type":"string","text":"string","visual":"string"}],"voiceover":"string","cta":"string"}',
  stories: '{"slides":[{"visual":"string","thesis":"string","stickerType":"string"}]}',
  warmup: '{"days":[{"day":0,"theme":"string","text":"string","tension":"string"}]}',
  webinar: '{"slides":[{"timing":"string","title":"string","speakerNotes":"string"}]}',
  audit: '{"issues":[{"marker":"string","severity":"string","original":"string","replacement":"string"}],"score":0,"axes":{"clarity":0,"context":0,"emotion":0,"action":0}}',
  post: '{"hook":"string","body":"string","hashtags":["string"],"cta":"string"}',
  email: '{"subject":"string","preheader":"string","body":"string","ctaText":"string","ps":"string"}',
  sales: '{"exchanges":[{"speaker":"manager|client","text":"string","triggerWords":["string"]}]}',
}

export function buildPromptForType(type: ContentTypeKey, input: PromptInput): { system: string; user: string } {
  const system = [
    'Ти — Sales Assistant для українського ринку.',
    resolveProtocolInstruction(input.selectedProtocol),
    resolveToneInstruction(input.tone),
    `FORBIDDEN лексикон: ${FORBIDDEN_LEXICON.join(', ')}.`,
    `REQUIRED маркери: ${REQUIRED_MARKERS.join(', ')}.`,
    'Відповідай ТІЛЬКИ валідним JSON. Нічого поза JSON.',
  ].join('\n')

  const user = [
    `contentType: ${type}`,
    `userContext: ${input.userContext || 'n/a'}`,
    `userRequest: ${input.userRequest || 'n/a'}`,
    'Сформуй відповідь строго за JSON schema:',
    OUTPUT_SCHEMAS[type],
  ].join('\n')

  return { system, user }
}

export function buildBannerPrompt(strategicOutput: string): { system: string; user: string } {
  return {
    system: [
      'Ти формуєш image-prompt карти для банерів.',
      'Відповідай ТІЛЬКИ валідним JSON. Нічого поза JSON.',
    ].join('\n'),
    user: [
      `strategicOutput: ${strategicOutput}`,
      'Поверни JSON: {"cards":[{"num":1,"prompt":"..."},{"num":2,"prompt":"..."},{"num":3,"prompt":"..."},{"num":4,"prompt":"..."},{"num":5,"prompt":"..."},{"num":6,"prompt":"..."}]}',
      'Зроби 6 промптів: по 2 на кожні 3 різні content types.',
    ].join('\n'),
  }
}

export function resolveFreeFirstRoutingMode(selectedProtocol: string): FreeFirstRoutingMode {
  const upper = selectedProtocol.trim().toUpperCase()
  if (upper.includes('FAST')) return 'FAST'
  if (upper.includes('BALANCED')) return 'BALANCED'
  return 'PREMIUM'
}

export function resolveProvidersForMode(mode: FreeFirstRoutingMode): ModelProvider[] {
  if (mode === 'FAST') return ['gemini']
  if (mode === 'BALANCED') return ['gpt', 'gemini']
  return ['claude', 'gpt', 'gemini']
}

