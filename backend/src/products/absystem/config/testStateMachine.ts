import { TestStatus, type UserTestContext } from '../../../database/schema.js'
import { AB_TEST_QUESTION_ORDER } from '../../ab-system/content/abTest.questions.js'

/**
 * Encapsulates state transition logic and DTO mapping for the test flow.
 */
export class TestStateMachine {
  /**
   * Maps internal database context to the canonical public state object.
   * Never exposes internal scores or tiebreaker details.
   */
  static mapContextToState(context: UserTestContext) {
    return {
      status: context.status,
      currentQuestionIndex: context.currentQuestionIndex,
      totalQuestions: AB_TEST_QUESTION_ORDER.length,
      answeredQuestions: context.answers.map((a) => ({
        questionId: a.questionId,
        answerId: a.answerId,
      })),
      result: context.status === TestStatus.COMPLETED ? context.result : null,
    }
  }
}
