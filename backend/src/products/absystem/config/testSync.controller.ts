import { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../../../types/globalTypes.js'
import { resolveCanonicalTestResult } from '../../../core/state-machine/testFoundation.js'
import { TestStateMachine } from './testStateMachine.js'
import { TestStatus, type UserTestAnswer } from '../../../database/schema.js'
import { loadUserUiSettings } from '../../ab-system/telegram/abTest.progress.js'
import {
  getWelcomeTestPaymentFromUiSettings,
  isFocusSubscriptionActive,
  markWelcomeTestPaymentPaid,
} from './welcomeTest.payment.js'
import { prisma } from '../../../db/client.js'
import {
  AB_TEST_QUESTION_ORDER,
  type AbTestAnswerKey,
  type AbTestQuestionId,
} from '../../ab-system/content/abTest.questions.js'

export class TestSyncController {
  /**
   * GET /api/test/:linkToken/state
   */
  static async getTestState(req: Request, res: Response): Promise<Response> {
    const { linkToken } = req.params

    const context = await (prisma as any).userTestContext.findUnique({
      where: { linkToken },
    })

    if (!context) {
      return res.status(404).json({ error: 'TEST_CONTEXT_NOT_FOUND' })
    }

    // Map to spec shape (id, status, index, total, answers, result)
    return res.json(TestStateMachine.mapContextToState(context as any))
  }

  /**
   * POST /api/test/:linkToken/submit-answer
   */
  static async submitAnswer(req: Request, res: Response): Promise<Response> {
    const { linkToken } = req.params
    const { questionId, answerId } = req.body

    if (!questionId || !answerId) {
      return res.status(400).json({ error: 'MISSING_REQUIRED_FIELDS' })
    }

    const context = await (prisma as any).userTestContext.findUnique({
      where: { linkToken },
    })

    if (!context) {
      return res.status(404).json({ error: 'TEST_CONTEXT_NOT_FOUND' })
    }

    // 1. Status Guard
    if (context.status === TestStatus.COMPLETED) {
      return res.status(409).json({ error: 'TEST_ALREADY_COMPLETED' })
    }

    const currentAnswers = context.answers as unknown as UserTestAnswer[]

    // 2. Idempotency Check
    const existingAnswer = currentAnswers.find(
      (a) => a.questionId === questionId
    )
    if (existingAnswer && existingAnswer.answerId === answerId) {
      return res.json(TestStateMachine.mapContextToState(context as any))
    }

    // 3. Order Validation
    const expectedQuestionId =
      AB_TEST_QUESTION_ORDER[context.currentQuestionIndex]
    if (questionId !== expectedQuestionId) {
      return res.status(422).json({
        error: 'QUESTION_ORDER_VIOLATION',
        expected: expectedQuestionId,
      })
    }

    // 4. State Transition
    const updatedAnswers = [...currentAnswers, { questionId, answerId }]
    const nextIndex = context.currentQuestionIndex + 1
    const isComplete = nextIndex === AB_TEST_QUESTION_ORDER.length

    let finalResult = context.result
    let nextStatus = TestStatus.IN_PROGRESS
    let completedAt = context.completedAt

    if (isComplete) {
      const resolution = resolveCanonicalTestResult(
        updatedAnswers.map((a) => ({
          questionId: a.questionId as AbTestQuestionId,
          answerId: a.answerId as AbTestAnswerKey,
        }))
      )
      finalResult = resolution.type
      nextStatus = TestStatus.COMPLETED
      completedAt = new Date()
    }

    const updatedContext = await (prisma as any).userTestContext.update({
      where: { linkToken },
      data: {
        answers: updatedAnswers as any,
        currentQuestionIndex: nextIndex,
        status: nextStatus,
        result: finalResult,
        completedAt,
      },
    })

    return res.json(TestStateMachine.mapContextToState(updatedContext as any))
  }

  static async getPaymentStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const uiSettings = await loadUserUiSettings(userId)
    let payment = getWelcomeTestPaymentFromUiSettings(uiSettings)
    const focusPaid = await isFocusSubscriptionActive(userId)

    if (focusPaid) {
      if (payment?.status !== 'PAID') {
        await markWelcomeTestPaymentPaid(userId)
        const refreshed = await loadUserUiSettings(userId)
        payment = getWelcomeTestPaymentFromUiSettings(refreshed)
      }
      return res.json({ payment, focusPaid: true, paid: true })
    }

    return res.json({
      payment,
      focusPaid: false,
      paid: payment?.status === 'PAID',
    })
  }
}
