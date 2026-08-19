import { absystemContent } from '../../products/absystem/config/content.js'
import { buildBehavioralNarrative } from '../behavioral/behavioralNarrative.js'
import type { BehavioralContinuityResolution } from '../continuity/behavioralContinuity.js'
import { buildContinuityBlocks, createTelegramFlow, type TelegramButton, type TelegramFlow } from './flowTemplates.js'
import type { AbTestProgress } from '../state-machine/abTestFoundation.js'
import { getAbTestQuestion, type AbTestQuestionId } from '../../products/ab-system/content/abTest.questions.js'
import { resolveAbTestQuestionOrder, resolveAbTestResultDefinition } from '../state-machine/abTestFoundation.js'
import { AB_TEST_SHOW_INSIDE_CTA_MULTILINE_TEXT, abTestContent } from '../../products/ab-system/content/abTest.shared.js'

function buttonRow(...buttons: TelegramButton[]): TelegramButton[][] {
  return [buttons]
}

export function buildBehavioralTelegramFlow(resolution: BehavioralContinuityResolution, surface: 'start' | 'status' | 'recovery' | 'focus' | 'ai' = 'start'): TelegramFlow {
  const narrative = buildBehavioralNarrative(resolution.snapshot, surface)
  return createTelegramFlow({
    id: `behavioral_${surface}`,
    title: narrative.title,
    body: narrative.body,
    buttons: buttonRow({
      text: narrative.cta.text,
      callback_data: narrative.cta.callback_data,
    }),
    blocks: buildContinuityBlocks(resolution),
  })
}

export function buildAbsystemStartFlow(resolution: BehavioralContinuityResolution): TelegramFlow {
  const title = absystemContent.start.title
  const narrative = buildBehavioralNarrative(resolution.snapshot, 'start')
  return createTelegramFlow({
    id: 'start_returning_user',
    title,
    body: resolution.continuityMode === 'generic'
      ? absystemContent.start.firstEntry
      : narrative.body,
    buttons: buttonRow({
      text: narrative.cta.text,
      callback_data: narrative.cta.callback_data,
    }),
    blocks: buildContinuityBlocks(resolution),
  })
}

export function buildAbsystemStatusFlow(resolution: BehavioralContinuityResolution): TelegramFlow {
  const narrative = buildBehavioralNarrative(resolution.snapshot, 'status')
  return createTelegramFlow({
    id: 'after_focus',
    title: narrative.title,
    body: narrative.body,
    buttons: buttonRow({
      text: absystemContent.behavioral.cta.continue,
      callback_data: 'continue_ai_mentor',
    }),
    blocks: buildContinuityBlocks(resolution),
  })
}

export function buildAbTestQuestionFlow(progress: AbTestProgress, questionId: AbTestQuestionId, revision: number): TelegramFlow {
  const question = getAbTestQuestion(questionId)
  const questionOrder = resolveAbTestQuestionOrder()
  const questionIndex = Math.max(0, questionOrder.indexOf(questionId))
  const body = [
    `*Питання ${questionIndex + 1} з ${questionOrder.length}*`,
    '',
    question.prompt,
  ]

  const buttons = [
    ...question.answers.map(answer => ([{
      text: answer.text,
      callback_data: `ab_test_answer:${question.question_id}:${answer.id}:${revision}`,
    }])),
  ]

  return createTelegramFlow({
    id: 'ab_test_question',
    title: '',
    body,
    buttons,
    blocks: [
      { type: 'continuity_reentry', tone: 'soft', priority: 1, body: [] },
      { type: 'next_step', tone: 'focused', priority: 2, body: [question.prompt] },
    ],
  })
}

export function buildAbTestResultFlow(progress: AbTestProgress): TelegramFlow {
  const result = progress.result_key ? resolveAbTestResultDefinition(progress.result_key) : null
  if (!result) {
    return createTelegramFlow({
      id: 'ab_test_result',
      title: '',
      body: abTestContent.menu.body,
      buttons: [[{ text: abTestContent.buttons.continueFlow, callback_data: 'return_main_menu' }]],
      blocks: [{ type: 'context_reconnection', tone: 'soft', priority: 1, body: abTestContent.menu.body }],
    })
  }

  const buttons: TelegramButton[][] = [
    [{ text: AB_TEST_SHOW_INSIDE_CTA_MULTILINE_TEXT, callback_data: `show_inside_${progress.result_key?.toUpperCase() ?? 'STATE'}` }],
  ]

  return createTelegramFlow({
    id: 'ab_test_result',
    title: '',
    body: [result.msg1],
    buttons,
    blocks: [
      { type: 'movement_interpretation', tone: 'behavioral', priority: 1, body: [result.msg1] },
    ],
  })
}
