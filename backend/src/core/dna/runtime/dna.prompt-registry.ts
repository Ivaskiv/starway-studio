import { buildTaskPrompt } from '@/modules/ai-mentor/prompt.js'
import { buildPromptForType, type ContentTypeKey } from '@/modules/sales-assistant/prompts/contentType.prompts.js'
import { getDnaPreset } from '@/core/dna/presets/dna.presets.js'
import type { DnaPipelineInput, DnaPresetId } from '@/core/dna/contracts/dna.contracts.js'

export type PromptRegistryEntry = {
  id: string
  version: string
  system: string
  user: string
}

export function buildDnaPrompt(input: DnaPipelineInput, presetId: DnaPresetId): PromptRegistryEntry {
  const base = buildPromptForType(input.contentType as ContentTypeKey, {
    selectedProtocol: input.selectedProtocol,
    tone: input.tone,
    userContext: input.userContext,
    userRequest: input.userRequest,
    selectedOutputs: input.selectedOutputs,
  })

  const preset = getDnaPreset(presetId)
  const presetBlock = [
    `DNA_PRESET: ${preset.label}`,
    `Tone modifiers: ${preset.toneModifiers.join(', ')}`,
    `Psycholinguistic triggers: ${preset.psycholinguisticTriggers.join(', ')}`,
    `Pacing: ${preset.pacing}`,
    `Pressure: ${preset.pressureLevel}`,
    `CTA style: ${preset.ctaStyle}`,
    `Hook style: ${preset.hookStyle}`,
  ].join('\n')

  return {
    id: `sales-assistant/${input.contentType}`,
    version: 'v1-dna-registry',
    system: `${base.system}\n\n${presetBlock}`,
    user: base.user,
  }
}

export function buildMentorPromptForDna(input: DnaPipelineInput, presetId: DnaPresetId): PromptRegistryEntry {
  const preset = getDnaPreset(presetId)
  const mentorTask = buildTaskPrompt('chat', { message: input.userRequest })

  return {
    id: 'ai-mentor/chat',
    version: 'v1-dna-registry',
    system: [
      'Ти модуль AI-mentor у DNA orchestration runtime.',
      `Preset: ${preset.label}`,
      `Pressure: ${preset.pressureLevel}, Pacing: ${preset.pacing}`,
      `Tone modifiers: ${preset.toneModifiers.join(', ')}`,
      'Відповідь має бути JSON.',
    ].join('\n'),
    user: `${mentorTask}\n\nКонтекст: ${input.userContext}\nЗапит: ${input.userRequest}`,
  }
}

export function buildContentStudioTemplatePrompt(input: DnaPipelineInput, presetId: DnaPresetId): PromptRegistryEntry {
  const preset = getDnaPreset(presetId)

  return {
    id: `content-studio/${input.contentType}`,
    version: 'v1-dna-registry',
    system: [
      'Ти Content Studio strategy engine.',
      `Preset: ${preset.label}`,
      'Фокус: practical GTM content artifacts.',
      'Відповідь тільки JSON.',
    ].join('\n'),
    user: [
      `Тип: ${input.contentType}`,
      `Контекст: ${input.userContext}`,
      `Запит: ${input.userRequest}`,
      'Поверни JSON із полями: hook, structure, cta, distribution.',
    ].join('\n'),
  }
}
