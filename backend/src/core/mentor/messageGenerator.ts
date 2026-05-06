import { pickTemplate } from './templates.js'
import type {
  BehaviorInput,
  Intent,
  Intervention,
  MentorChannel,
  MentorMessage,
} from './types.js'

function formatScoreLabel(input: BehaviorInput) {
  if (input.patterns.includes('drop_off')) return 'просідання темпу'
  if (input.patterns.includes('inconsistency')) return 'нестабільний ритм'
  if (input.scores.procrastination >= 60) return 'відкладання'
  if (input.scores.avoidance >= 60) return 'уникання'
  if (input.scores.engagement < 30) return 'просідання темпу'
  if (input.scores.consistency < 40) return 'нестабільний ритм'
  return 'робочий рух'
}

function resolveChannel(
  intervention: Intervention,
  intent: Intent,
  preferredChannel?: MentorChannel,
): MentorChannel {
  if (preferredChannel) return preferredChannel

  if (intent === 'reengage' || intervention.priority === 'high') {
    return 'telegram'
  }

  if (intent === 'stabilize_habit') {
    return 'miniapp'
  }

  return 'web'
}

function truncateSentences(sentences: string[], maxLength: number) {
  const built: string[] = []

  for (const sentence of sentences) {
    const next = [...built, sentence].join(' ')
    if (next.length > maxLength && built.length > 0) break
    built.push(sentence)
  }

  return built.join(' ')
}

function adaptForChannel(text: string, channel: MentorChannel) {
  if (channel === 'telegram') {
    return truncateSentences(text.split('. ').map(part => part.trim()).filter(Boolean).map(part => (
      part.endsWith('.') ? part : `${part}.`
    )), 180)
  }

  if (channel === 'miniapp') {
    return truncateSentences(text.split('. ').map(part => part.trim()).filter(Boolean).map(part => (
      part.endsWith('.') ? part : `${part}.`
    )), 120)
  }

  return truncateSentences(text.split('. ').map(part => part.trim()).filter(Boolean).map(part => (
    part.endsWith('.') ? part : `${part}.`
  )), 220)
}

export function generateMessage(
  intervention: Intervention,
  intent: Intent,
  input: BehaviorInput,
  preferredChannel?: MentorChannel,
  meta?: MentorMessage['meta'],
): MentorMessage {
  const channel = resolveChannel(intervention, intent, preferredChannel)
  const template = pickTemplate(
    intent,
    `${input.userId}:${input.patterns.join('|')}:${Math.round(input.scores.procrastination + input.scores.avoidance)}`,
  )
  const behaviorLabel = formatScoreLabel(input)
  const observation = channel === 'web'
    ? `${template.observation} Найбільше зараз видно ${behaviorLabel}.`
    : template.observation

  const parts =
    channel === 'web'
      ? [observation, template.nextStep, template.followUp]
      : [observation, template.nextStep]

  return {
    channel,
    text: adaptForChannel(
      parts.filter((part): part is string => typeof part === 'string' && part.trim().length > 0).join(' '),
      channel,
    ),
    meta,
  }
}
