import { Router, type NextFunction, type Request, type Response } from 'express'
import {
  buildAbTestProgressPatch,
  validateAbTestProgress,
  type AbTestAnswer,
} from '../../core/state-machine/abTestFoundation.js'
import { buildBehavioralNarrative } from '../../core/behavioral/buildBehavioralNarrative.js'
import { buildBehavioralSnapshot } from '../../core/behavioral/behavioralSnapshot.js'
import {
  resolveCanonicalTestResult,
  type CanonicalTestResult,
} from '../../core/state-machine/testFoundation.js'
import { testOrchestrator } from '../../core/orchestrator/testOrchestrator.js'
import { prisma } from '../../db/client.js'
import {
  AB_TEST_QUESTION_ORDER,
  getAbTestAnswer,
  getAbTestQuestion,
  type AbTestAnswerKey,
  type AbTestQuestionId,
} from '../../products/ab-system/content/abTest.questions.js'
import {
  getAbTestProgressFromUiSettings,
  loadAbTestProgress,
  loadUserUiSettings,
  saveAbTestProgress,
} from '../../products/ab-system/telegram/abTest.progress.js'
import { persistCanonicalCompletedAbTestProgress } from '../../products/ab-system/telegram/abTest.handlers.core.js'
import { resolveUserLifecycle } from '../users/runtime/resolveUserLifecycle.js'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { getServerUser } from '../auth/getServerUser.js'

type AbTestSubmissionAnswer = {
  questionId: AbTestQuestionId
  answerId: AbTestAnswerKey
}

type AbTestSubmitBody = {
  answers?: AbTestSubmissionAnswer[]
}

type AbTestPartialSubmitBody = {
  answers?: AbTestSubmissionAnswer[]
  partial?: boolean
}

type BehavioralBlock = 'state' | 'goal' | 'choice' | 'decision' | 'action'

type ResolvedAnswer = {
  questionId: AbTestQuestionId
  answerId: AbTestAnswerKey
  answerText: string
  score: number
  category: BehavioralBlock
}

const BEHAVIORAL_BLOCK_ORDER: BehavioralBlock[] = [
  'state',
  'goal',
  'choice',
  'decision',
  'action',
]
const QUESTION_ID_SET = new Set<AbTestQuestionId>(AB_TEST_QUESTION_ORDER)

const router = Router()
const CANONICAL_TEST_RESULT_TYPES = new Set<CanonicalTestResult['type']>([
  'STATE',
  'GOAL',
  'CHOICE',
  'DECISION',
  'ACTION',
])

async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    req.user = (await getServerUser(req)) ?? undefined
  } catch {
    req.user = undefined
  }
  next()
}

function toBehavioralBlock(type: CanonicalTestResult['type']): BehavioralBlock {
  return type.toLowerCase() as BehavioralBlock
}

function isCanonicalTestResultType(
  value: unknown
): value is CanonicalTestResult['type'] {
  return (
    typeof value === 'string' &&
    CANONICAL_TEST_RESULT_TYPES.has(value as CanonicalTestResult['type'])
  )
}

export async function persistTestOutcome(
  userId: string,
  result: CanonicalTestResult
): Promise<void> {
  await testOrchestrator.onTestCompleted(userId, result.type)
  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStep: 'START_FLOW',
    },
  })
}

async function loadStoredTestResult(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentState: true,
      currentStep: true,
      funnelStage: true,
      testResultType: true,
    },
  })

  if (!user || !isCanonicalTestResultType(user.testResultType)) {
    return null
  }

  const dominantBlock = toBehavioralBlock(user.testResultType)

  const resolvedLifecycle = resolveUserLifecycle(user ?? {}).value
  return {
    type: user.testResultType,
    dominantBlock,
    lifecycleState: resolvedLifecycle,
    nextAction: buildNextAction(dominantBlock),
    nextActionCta: resolveNextActionCtaLabel(dominantBlock),
  }
}

function isBehavioralBlock(value: unknown): value is BehavioralBlock {
  return (
    typeof value === 'string' &&
    BEHAVIORAL_BLOCK_ORDER.includes(value as BehavioralBlock)
  )
}

function normalizeAnswers(raw: unknown): AbTestSubmissionAnswer[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return []
    }

    const candidate = item as Partial<
      Record<'questionId' | 'answerId', unknown>
    >
    const questionId = candidate.questionId
    const answerId = candidate.answerId

    if (
      typeof questionId === 'string' &&
      typeof answerId === 'string' &&
      QUESTION_ID_SET.has(questionId as AbTestQuestionId) &&
      ['state', 'goal', 'choice', 'decision', 'action'].includes(answerId)
    ) {
      return [
        {
          questionId: questionId as AbTestQuestionId,
          answerId: answerId as AbTestAnswerKey,
        },
      ]
    }

    return []
  })
}

function getQuestionDeck() {
  return AB_TEST_QUESTION_ORDER.map((questionId) => {
    const question = getAbTestQuestion(questionId)
    return {
      id: question.question_id,
      prompt: question.prompt,
      behavioralType: question.behavioral_type,
      answers: question.answers.map((answer) => ({
        id: answer.id,
        text: answer.text,
      })),
      nextQuestionId: question.next_question_id,
    }
  })
}

function resolveAnswers(answers: AbTestSubmissionAnswer[]): ResolvedAnswer[] {
  return answers.flatMap((item) => {
    const answer = getAbTestAnswer(item.questionId, item.answerId)

    if (!answer) {
      return []
    }

    return [
      {
        questionId: item.questionId,
        answerId: item.answerId,
        answerText: answer.text,
        score: answer.score,
        category: isBehavioralBlock(answer.category)
          ? answer.category
          : 'state',
      },
    ]
  })
}

function buildProgressAnswers(
  resolvedAnswers: ResolvedAnswer[],
  answeredAt: string
): AbTestAnswer[] {
  return resolvedAnswers.map((answer) => {
    const question = getAbTestQuestion(answer.questionId)
    return {
      question_id: answer.questionId,
      answer_id: answer.answerId,
      score: answer.score,
      category: answer.category,
      behavioral_type: question.behavioral_type,
      analytics_hooks: question.analytics_hooks,
      answered_at: answeredAt,
      latency_ms: null,
    }
  })
}

function mergeProgressAnswers(
  currentAnswers: AbTestAnswer[],
  incomingAnswers: AbTestAnswer[]
): AbTestAnswer[] {
  const byQuestion = new Map<AbTestQuestionId, AbTestAnswer>()

  for (const answer of currentAnswers) {
    byQuestion.set(answer.question_id, answer)
  }

  for (const answer of incomingAnswers) {
    byQuestion.set(answer.question_id, answer)
  }

  return AB_TEST_QUESTION_ORDER.flatMap((questionId) => {
    const answer = byQuestion.get(questionId)
    return answer ? [answer] : []
  })
}

function toPublicResultType(
  resultKey: string | null | undefined
): CanonicalTestResult['type'] | null {
  const candidate = String(resultKey ?? '').toUpperCase()
  return isCanonicalTestResultType(candidate) ? candidate : null
}

function buildNextAction(dominantBlock: BehavioralBlock): string {
  const nextActionByBlock: Record<BehavioralBlock, string> = {
    state:
      'Спершу віднови ресурс: 10 хвилин без задач, а потім один маленький крок.',
    goal: 'Запиши одну ціль одним реченням і прибери все зайве.',
    choice: 'Обери лише один напрям і тимчасово закрий інші варіанти.',
    decision: 'Зафіксуй рішення одним конкретним реченням сьогодні.',
    action: 'Зроби перший крок сьогодні без додаткового планування.',
  }

  return nextActionByBlock[dominantBlock]
}

function resolveNextActionCtaLabel(dominantBlock: BehavioralBlock): string {
  switch (dominantBlock) {
    case 'state':
      return 'Почати м’яко'
    case 'goal':
      return 'Уточнити ціль'
    case 'choice':
      return 'Обрати напрям'
    case 'decision':
      return 'Зафіксувати рішення'
    case 'action':
    default:
      return 'Зробити крок'
  }
}

function buildInactivityDays(resolvedAnswers: ResolvedAnswer[]): number {
  if (!resolvedAnswers.length) {
    return 0
  }

  const totalScore = resolvedAnswers.reduce(
    (sum, answer) => sum + answer.score,
    0
  )
  return Math.max(
    0,
    Math.min(30, Math.round((resolvedAnswers.length * 5 - totalScore) * 1.5))
  )
}

function resolveSemanticFocus(
  resolvedAnswers: ResolvedAnswer[],
  dominantBlock: BehavioralBlock
): {
  unresolvedGoal: string
  repeatedPostponedAction: string
} {
  const goalAnswer = resolvedAnswers.find((item) => item.category === 'goal')
  const actionAnswer = [...resolvedAnswers].sort(
    (left, right) => left.score - right.score
  )[0]
  const dominantAnswer = resolvedAnswers.find(
    (item) => item.category === dominantBlock
  )

  return {
    unresolvedGoal:
      goalAnswer?.answerText ??
      dominantAnswer?.answerText ??
      'одну конкретну точку, яку потрібно зафіксувати',
    repeatedPostponedAction: actionAnswer
      ? actionAnswer.answerText
      : 'перший конкретний крок, який давно проситься в рух',
  }
}

router.get('/questions', (_req: Request, res: Response) => {
  // [FIX C] стабільний рендер — без async, без getQuestionDeck()
  return res.json({
    questions: AB_TEST_QUESTION_ORDER.map((id) => {
      const q = getAbTestQuestion(id)
      return {
        id: q.question_id,
        prompt: q.prompt,
        behavioralType: q.behavioral_type,
        answers: q.answers.map((a) => ({
          id: a.id,
          text: a.text,
        })),
        nextQuestionId: q.next_question_id,
      }
    }),
    total: AB_TEST_QUESTION_ORDER.length,
  })
})

router.post(
  '/submit',
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id

    const body = req.body as AbTestSubmitBody | undefined
    const normalizedAnswers = normalizeAnswers(body?.answers)
    if (!normalizedAnswers.length) {
      return res.status(400).json({ error: 'no answers' })
    }
    if (normalizedAnswers.length < AB_TEST_QUESTION_ORDER.length) {
      return res.status(400).json({ error: 'incomplete_answers' })
    }

    const resolvedAnswers = resolveAnswers(normalizedAnswers)
    if (!resolvedAnswers.length) {
      return res.status(400).json({ error: 'no answers' })
    }

    const canonical = resolveCanonicalTestResult(normalizedAnswers)
    const dominantBlock = toBehavioralBlock(canonical.type)
    const semantic = resolveSemanticFocus(resolvedAnswers, dominantBlock)
    const inactivityDays = buildInactivityDays(resolvedAnswers)

    const snapshot = buildBehavioralSnapshot({
      answers: resolvedAnswers.map((answer) => ({
        category: answer.category,
        text: answer.answerText,
        score: answer.score,
        questionId: answer.questionId,
        answerId: answer.answerId,
      })),
      userState: {
        dominantBlock,
        inactivityDays,
      },
    })

    if (userId) {
      const nowIso = new Date().toISOString()
      const current = await loadAbTestProgress(userId)
      const incomingAnswers = buildProgressAnswers(resolvedAnswers, nowIso)
      const mergedAnswers = mergeProgressAnswers(current.answers, incomingAnswers)
      await persistCanonicalCompletedAbTestProgress({
        userId,
        progress: current,
        answers: mergedAnswers,
        occurredAt: new Date(nowIso),
        questionsShown: AB_TEST_QUESTION_ORDER.slice(),
        lastCallbackKey: 'web:ab_test_submit',
      })
      await persistTestOutcome(userId, canonical)
    }

    return res.json({
      type: canonical.type,
      dominantScore: canonical.dominantScore,
      categoryBreakdown: canonical.categoryBreakdown,
      dominantBlock,
      unresolvedGoal: semantic.unresolvedGoal,
      repeatedPostponedAction: semantic.repeatedPostponedAction,
      inactivityDays,
      narrative: buildBehavioralNarrative(snapshot),
      nextAction: buildNextAction(dominantBlock),
      nextActionCta: resolveNextActionCtaLabel(dominantBlock),
    })
  }
)

router.get(
  '/progress',
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id
    if (!userId) {
      return res.json({
        answers: [],
        currentIndex: 0,
        resultType: null,
        status: 'idle',
        flowState: 'IDLE',
      })
    }

    const uiSettings = await loadUserUiSettings(userId)
    const progress = getAbTestProgressFromUiSettings(uiSettings)

    return res.json({
      answers: progress.answers.map((answer) => ({
        questionId: answer.question_id,
        answerId: answer.answer_id,
        question_id: answer.question_id,
        answer_id: answer.answer_id,
      })),
      currentIndex: progress.answers.length,
      resultType: toPublicResultType(progress.result_key),
      status: progress.status,
      flowState: progress.flow_state,
      resumable: validateAbTestProgress(progress).resumable,
    })
  }
)

router.post(
  '/submit-partial',
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id

    const body = req.body as AbTestPartialSubmitBody | undefined
    const normalizedAnswers = normalizeAnswers(body?.answers)

    if (!normalizedAnswers.length) {
      return res.status(400).json({ error: 'no answers' })
    }

    const resolvedAnswers = resolveAnswers(normalizedAnswers)
    if (!resolvedAnswers.length) {
      return res.status(400).json({ error: 'no answers' })
    }

    if (!userId) {
      return res.json({
        saved: resolvedAnswers.length,
        currentIndex: resolvedAnswers.length,
        status: 'active',
      })
    }

    const current = await loadAbTestProgress(userId)
    const nowIso = new Date().toISOString()
    const incomingAnswers = buildProgressAnswers(resolvedAnswers, nowIso)
    const mergedAnswers = mergeProgressAnswers(current.answers, incomingAnswers)
    const nextQuestionId = AB_TEST_QUESTION_ORDER[mergedAnswers.length] ?? null

    const next = buildAbTestProgressPatch(current, {
      status: 'active',
      stage: 'S2_TEST_QUESTIONS',
      answers: mergedAnswers,
      current_question_id: nextQuestionId,
      updated_at: nowIso,
      last_event_at: nowIso,
    })

    await saveAbTestProgress(userId, next)

    return res.json({
      saved: mergedAnswers.length,
      currentIndex: mergedAnswers.length,
      status: next.status,
    })
  }
)

router.get(
  '/result',
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id
    if (!userId) {
      return res.status(404).json({ error: 'result_not_found' })
    }

    const storedResult = await loadStoredTestResult(userId)
    if (!storedResult) {
      return res.status(404).json({ error: 'result_not_found' })
    }

    return res.json(storedResult)
  }
)

export default router
