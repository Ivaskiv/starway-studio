import { runMentor } from '../../core/mentor/mentorEngine.js'
import type { BehaviorInput, MentorRunResult } from '../../core/mentor/types.js'

type ExpectedMentorOutput = {
  intent: MentorRunResult['intent']
  channel: MentorRunResult['message']['channel']
  type: MentorRunResult['intervention']['type']
}

export type MentorDebugTestCase = {
  name: string
  input: Omit<BehaviorInput, 'userId'>
  expected: ExpectedMentorOutput
}

export type MentorValidationResult = {
  passed: boolean
  errors: string[]
  checks: string[]
}

export const TEST_CASES: MentorDebugTestCase[] = [
  {
    name: 'procrastination',
    input: {
      patterns: ['procrastination'],
      scores: {
        procrastination: 85,
        avoidance: 20,
        engagement: 15,
        consistency: 30,
      },
    },
    expected: {
      intent: 'reduce_resistance',
      channel: 'telegram',
      type: 'micro_task',
    },
  },
  {
    name: 'avoidance',
    input: {
      patterns: ['avoidance'],
      scores: {
        procrastination: 20,
        avoidance: 75,
        engagement: 40,
        consistency: 50,
      },
    },
    expected: {
      intent: 'increase_clarity',
      channel: 'web',
      type: 'reflection',
    },
  },
  {
    name: 'drop_off',
    input: {
      patterns: ['drop_off'],
      scores: {
        procrastination: 30,
        avoidance: 30,
        engagement: 10,
        consistency: 20,
      },
    },
    expected: {
      intent: 'reengage',
      channel: 'telegram',
      type: 'nudge',
    },
  },
  {
    name: 'high_engagement',
    input: {
      patterns: ['high_engagement'],
      scores: {
        procrastination: 10,
        avoidance: 10,
        engagement: 80,
        consistency: 70,
      },
    },
    expected: {
      intent: 'motivate',
      channel: 'web',
      type: 'insight',
    },
  },
]

const ACTION_WORDS = [
  'обери',
  'зроби',
  'напиши',
  'визнач',
  'сформулюй',
  'почни',
] as const

const WEAK_PHRASES = ['можеш', 'спробуй', 'можливо'] as const

const EXPECTED_INTENT: Record<string, MentorRunResult['intent']> = {
  procrastination: 'reduce_resistance',
  avoidance: 'increase_clarity',
  drop_off: 'reengage',
  high_engagement: 'motivate',
}

const EXPECTED_CHANNEL: Record<string, MentorRunResult['message']['channel']> = {
  procrastination: 'telegram',
  avoidance: 'web',
  drop_off: 'telegram',
  high_engagement: 'web',
}

export function hasStrongAction(text: string) {
  const normalized = text.toLowerCase()
  return ACTION_WORDS.some(word => normalized.includes(word))
}

export function validateMentorOutput(
  input: Pick<BehaviorInput, 'patterns' | 'scores'>,
  output: MentorRunResult,
): MentorValidationResult {
  const errors: string[] = []
  const checks: string[] = []
  const text = output.message.text
  const pattern = input.patterns[0]

  if (output.intent && output.intervention?.type && text) {
    checks.push('Response structure')
  } else {
    errors.push('Missing required response structure fields')
  }

  if (text.length < 180) {
    checks.push('Message is short')
  } else {
    errors.push(`Message too long: ${text.length} characters`)
  }

  if (hasStrongAction(text)) {
    checks.push('Message has strong action')
  } else {
    errors.push('No strong action in message')
  }

  if (pattern && EXPECTED_INTENT[pattern]) {
    if (output.intent === EXPECTED_INTENT[pattern]) {
      checks.push('Intent matches pattern')
    } else {
      errors.push(`Intent mismatch for pattern "${pattern}": expected ${EXPECTED_INTENT[pattern]}, got ${output.intent}`)
    }
  }

  if (pattern && EXPECTED_CHANNEL[pattern]) {
    if (output.message.channel === EXPECTED_CHANNEL[pattern]) {
      checks.push('Channel matches delivery logic')
    } else {
      errors.push(`Channel mismatch for pattern "${pattern}": expected ${EXPECTED_CHANNEL[pattern]}, got ${output.message.channel}`)
    }
  }

  if (pattern) {
    const expectedType = TEST_CASES.find(testCase => testCase.name === pattern)?.expected.type
    if (expectedType) {
      if (output.intervention.type === expectedType) {
        checks.push('Intervention type matches pattern')
      } else {
        errors.push(`Intervention mismatch for pattern "${pattern}": expected ${expectedType}, got ${output.intervention.type}`)
      }
    }
  }

  const weak = text.length > 180
    || !hasStrongAction(text)
    || WEAK_PHRASES.some(phrase => text.toLowerCase().includes(phrase))

  if (weak) {
    errors.push('Weak AI response (not actionable)')
  } else {
    checks.push('Final quality check')
  }

  return {
    passed: errors.length === 0,
    errors,
    checks,
  }
}

export function runMentorValidationMatrix() {
  return TEST_CASES.map(testCase => {
    const output = runMentor({
      userId: `debug-${testCase.name}`,
      patterns: testCase.input.patterns,
      scores: testCase.input.scores,
    })
    const validation = validateMentorOutput(testCase.input, output)

    return {
      name: testCase.name,
      input: testCase.input,
      expected: testCase.expected,
      output,
      validation,
    }
  })
}
