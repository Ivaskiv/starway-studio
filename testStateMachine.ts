// import { TestStatus, UserTestContext } from './schema.ts'
import { AB_TEST_QUESTION_ORDER } from './backend/src/products/ab-system/content/abTest.questions';
import { TestStatus, UserTestContext } from './backend/src/products/absystem/config/schema';

/**
 * Encapsulates state transition logic and DTO mapping for the test flow.
 */
export class TestStateMachine {
  /**
   * Maps internal database context to the canonical public state object.
   * This ensures we never leak internal scores or tiebreaker details.
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

  static getNextExpectedQuestionId(currentIndex: number): string | null {
    if (currentIndex < 0 || currentIndex >= AB_TEST_QUESTION_ORDER.length)
      return null
    return AB_TEST_QUESTION_ORDER[currentIndex]
  }
}
