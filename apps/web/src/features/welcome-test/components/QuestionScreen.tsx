import type { CSSProperties } from 'react'

import type { WelcomeTestQuestion } from '@/features/welcome-test/types/welcomeTestQuestions.types'
import { WELCOME_TEST_QUESTION_ORDER } from '@/features/welcome-test/types/welcomeTest.types'

import { WelcomeTestShell } from './WelcomeTestShell'

type QuestionScreenProps = {
  question: WelcomeTestQuestion
  questionIndex: number
  totalQuestions: number
  selectedAnswerId?: string
  submitting: boolean
  errorMessage?: string | null
  onSelect: (answerId: string) => void
}

function getBallState(ballIndex: number, currentIndex: number): 'done' | 'active' | 'pending' {
  if (ballIndex < currentIndex) return 'done'
  if (ballIndex === currentIndex) return 'active'
  return 'pending'
}

export function QuestionScreen({
  question,
  questionIndex,
  totalQuestions,
  selectedAnswerId,
  submitting,
  errorMessage,
  onSelect,
}: QuestionScreenProps) {
  const totalBalls = WELCOME_TEST_QUESTION_ORDER.length

  return (
    <WelcomeTestShell
      kicker="Welcome test"
      title="Що зараз гальмує рух?"
      subtitle="Один екран — один вибір."
      footer={
        <p className="ab-test-question__counter">
          {submitting ? 'Зберігаємо відповідь...' : 'Оберіть варіант, щоб перейти далі'}
        </p>
      }
    >
      <div className="ab-test-progress">
        <div className="ab-test-progress__meta">
          <span className="ab-test-progress__label">Прогрес</span>
          <span className="ab-test-progress__counter">
            {Math.min(questionIndex + 1, totalQuestions)} / {totalQuestions}
          </span>
        </div>
        <div className="ab-test-progress__track" aria-hidden="true">
          {Array.from({ length: totalBalls }, (_, index) => (
            <span
              key={index}
              className="ab-test-progress__ball"
              data-state={getBallState(index, questionIndex)}
              data-num={index + 1}
            >
              {index + 1}
            </span>
          ))}
        </div>
      </div>

      <div className="ab-test-question">
        <div className="ab-test-question__meta">
          <p className="ab-test-question__kicker">
            Питання {questionIndex + 1} з {totalQuestions}
          </p>
        </div>
        <h2 className="ab-test-question__title">{question.prompt}</h2>
        <div className="ab-test-answers">
          {question.answers.map((answer) => {
            const isSelected = selectedAnswerId === answer.id
            const answerButtonStyle: CSSProperties = submitting
              ? { pointerEvents: 'none', cursor: 'wait' }
              : { whiteSpace: 'normal', alignItems: 'flex-start', textAlign: 'left' }
            return (
              <button
                key={answer.id}
                type="button"
                disabled={submitting}
                onClick={() => onSelect(answer.id)}
                data-selected={isSelected ? 'true' : 'false'}
                className="ab-test-answer"
                style={answerButtonStyle}
              >
                <span className="ab-test-answer__dot" aria-hidden="true" />
                <span
                  className="ab-test-answer__text"
                  style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {answer.text}
                </span>
              </button>
            )
          })}
        </div>
        {errorMessage ? <p className="ab-test-inline-error">{errorMessage}</p> : null}
      </div>
    </WelcomeTestShell>
  )
}
