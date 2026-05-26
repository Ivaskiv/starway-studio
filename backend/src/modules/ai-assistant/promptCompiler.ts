import { prisma } from '../../db/client.js'
import {
  CLAUDE_SYSTEM_PROMPT,
  GEMINI_SYSTEM_PROMPT,
  GPT_SYSTEM_PROMPT,
} from '@starway/ai/prompts/salesPsychologist'

export type ModelProvider = 'claude' | 'gpt' | 'gemini'

export type AiBehaviorProfile = {
  id?: string
  key: string
  systemAnchor: string
  supportedProtocols: unknown
  supportedOutputs: string[]
}

export interface CompilePromptDto {
  userId: string
  selectedOutputs: string[]
  selectedProtocol: string
  userContext: string
  userRequest: string  // pain + goal + custom joined
}

export function getSystemPrompt(model: ModelProvider): string {
  if (model === 'claude') return CLAUDE_SYSTEM_PROMPT
  if (model === 'gemini') return GEMINI_SYSTEM_PROMPT
  return GPT_SYSTEM_PROMPT
}

export async function compilePrompt(
  profile: AiBehaviorProfile,
  dto: CompilePromptDto,
  model: ModelProvider,
): Promise<string> {
  const startedAt = Date.now()
  console.log('[DNA][prompt] compile start', {
    profileKey: profile.key,
    provider: model,
    protocol: dto.selectedProtocol,
    outputs: dto.selectedOutputs,
    userId: dto.userId,
    userRequestLength: dto.userRequest?.length ?? 0,
  })
  const [lexicon, memory] = await Promise.all([
    prisma.lexicon.findMany({ where: { profileKey: profile.key } }),
    prisma.campaignMemory.findFirst({ where: { userId: dto.userId, isActive: true } }),
  ])

  const required = lexicon
.filter((l: { type: string }) => l.type === 'REQUIRED')
    .map(l => l.word)
    .join(' · ')
  const forbidden = lexicon
    .filter(l => l.type === 'FORBIDDEN')
    .map(l => l.word)
    .join(' · ')

  const memCtx = memory
    ? `КАМПАНІЯ: ${memory.launchContext} · Аудиторія: ${memory.audienceTemp} · Заперечення: ${memory.objections} · Опір: ${memory.resistance}`
    : ''

  const protocols = profile.supportedProtocols as Record<string, string>
  const anchor = protocols[dto.selectedProtocol] ?? protocols['SYSTEM'] ?? ''
  const outputs = dto.selectedOutputs
    .filter(o => (profile.supportedOutputs as string[]).includes(o))
    .join(', ')

  const prompt = getSystemPrompt(model)
    .replace('{PROTOCOL_ANCHOR}', anchor)
    .replace('{SELECTED_FORMATS}', outputs || dto.selectedOutputs.join(', '))
    .replace('{USER_CONTEXT}', `${dto.userRequest}${memCtx ? ' | ' + memCtx : ''}`)
    .replace('{LEXICON_REQUIRED}', required || 'тригер · масштаб · застрягла')
    .replace('{LEXICON_FORBIDDEN}', forbidden || 'трансформація · успішний успіх')

  console.log('[DNA][prompt] compile done', {
    provider: model,
    protocol: dto.selectedProtocol,
    outputs: dto.selectedOutputs,
    lexiconRequiredCount: lexicon.filter((l: { type: string }) => l.type === 'REQUIRED').length,
    lexiconForbiddenCount: lexicon.filter((l: { type: string }) => l.type === 'FORBIDDEN').length,
    memoryFound: Boolean(memory),
    finalPromptSize: prompt.length,
    preview: prompt.slice(0, 300),
    durationMs: Date.now() - startedAt,
  })

  return prompt
}
