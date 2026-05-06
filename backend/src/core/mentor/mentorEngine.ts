import { resolveIntent } from './intentResolver.js'
import { selectIntervention } from './interventionSelector.js'
import { generateMessage } from './messageGenerator.js'
import type {
  BehaviorInput,
  BehaviorScores,
  MentorMessage,
  MentorRunOptions,
  MentorRunResult,
} from './types.js'

export function runMentor(
  input: BehaviorInput,
  options: MentorRunOptions = {},
): MentorRunResult {
  const intent = options.overrideIntent ?? resolveIntent(input)
  const intervention = options.overrideIntervention ?? selectIntervention(intent, input)
  const message = generateMessage(intervention, intent, input, options.channel, options.meta)

  return {
    intent,
    intervention,
    message,
  }
}

export async function generateMentorMessage(input: {
  pattern?: string | null
  scores: Partial<BehaviorScores>
}): Promise<MentorMessage> {
  const result = runMentor({
    userId: 'marketplace-orchestrator',
    patterns: input.pattern ? [input.pattern] : [],
    scores: {
      procrastination: Number(input.scores.procrastination ?? 0),
      avoidance: Number(input.scores.avoidance ?? 0),
      engagement: Number(input.scores.engagement ?? 0),
      consistency: Number(input.scores.consistency ?? 0),
    },
  })

  return result.message
}

function printSimulation(label: string, result: MentorRunResult) {
  console.log(`\n[MentorSimulation] ${label}`)
  console.log('Intent:', result.intent)
  console.log('Intervention:', result.intervention)
  console.log('Message:', result.message)
}

export function simulateMentor() {
  const procrastination = runMentor({
    userId: 'mentor-procrastination',
    patterns: ['procrastination'],
    scores: {
      procrastination: 78,
      avoidance: 34,
      engagement: 42,
      consistency: 38,
    },
  })

  const avoidance = runMentor({
    userId: 'mentor-avoidance',
    patterns: ['avoidance'],
    scores: {
      procrastination: 26,
      avoidance: 81,
      engagement: 45,
      consistency: 51,
    },
  })

  const lowEngagement = runMentor({
    userId: 'mentor-low-engagement',
    patterns: ['drop_off'],
    scores: {
      procrastination: 20,
      avoidance: 24,
      engagement: 18,
      consistency: 33,
    },
  })

  printSimulation('procrastination', procrastination)
  printSimulation('avoidance', avoidance)
  printSimulation('low engagement', lowEngagement)

  return {
    procrastination,
    avoidance,
    lowEngagement,
  }
}
