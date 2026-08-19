import { FOCUS_ROUTE } from '@/features/landings/focus/content/constants'
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import { Button } from '@/ui'

import { useTest } from '../hooks/useTest'
import {
  BLOCK9_CONTENT,
  DOMINANT_BLOCK_LABELS,
  TOTAL_BALLS,
} from '../model/config'
import {
  getBallState,
  getProgressLabel,
} from '../model/progress'

export default function TestPage() {
  const {
    loading,
    error,
    questions,
    result,
    showBlock9,
    isAuthenticated,
    navigate,
    currentIndex,
    totalQuestions,
    currentBallIndex,
    isResultView,
    currentQuestion,
    selectedAnswerId,
    submitting,
    canAdvance,
    isLastQuestion,
    handleResultCta,
    handleRestart,
    handleSelectAnswer,
    handleBack,
    handleNext,
  } = useTest()

  if (loading) {
    return (
      <div className="ab-test-page">
        {/* [DESIGN] Loading state */}
        <div className="ab-test-page__frame">
          <div className="ab-test-shell ab-test-shell--loading">
            <div className="ab-test-skeleton ab-test-skeleton--eyebrow" />
            <div className="ab-test-skeleton ab-test-skeleton--title" />
            <div className="ab-test-skeleton ab-test-skeleton--line" />
            <div className="ab-test-skeleton ab-test-skeleton--line ab-test-skeleton--wide" />
            <div className="ab-test-skeleton ab-test-skeleton--track" />
            <div className="ab-test-skeleton ab-test-skeleton--button" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !questions.length) {
    return (
      <div className="ab-test-page">
        {/* [DESIGN] Error state */}
        <div className="ab-test-page__frame">
          <div className="ab-test-shell ab-test-shell--error">
            <p className="ab-test-kicker">ABSystem</p>
            <h1 className="ab-test-title">Не вдалося завантажити тест</h1>
            <p className="ab-test-subtitle">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ab-test-retry"
            >
              Спробувати ще раз
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (result) {
    if (showBlock9) {
      return (
        <div className="ab-test-page">
          <div className="ab-test-page__frame">
            <div className="ab-test-shell ab-test-shell--result">
              <div className="ab-test-shell__header">
                <p className="ab-test-kicker">ABSystem</p>
                <h1 className="ab-test-title">Що з цим робити далі</h1>
              </div>
              <div className="ab-test-shell__body">
                <div className="ab-test-result-card">
                  <p className="ab-test-result-text ab-test-result-text--narrative">
                    {BLOCK9_CONTENT.text}
                  </p>
                </div>
              </div>
              <div className="ab-test-shell__footer">
                <button
                  type="button"
                  onClick={() => navigate(FOCUS_ROUTE)}
                  className="ab-test-result-cta"
                >
                  {BLOCK9_CONTENT.cta}
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="ab-test-nav-button ab-test-nav-button--back"
                >
                  Почати тест заново
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="ab-test-page">
        {/* [DESIGN] Result state */}
        <div className="ab-test-page__frame">
          <div className="ab-test-shell ab-test-shell--result">
            <div className="ab-test-shell__header">
              <p className="ab-test-kicker">Інтерпретація</p>
              <h1 className="ab-test-title">Ми побачили твій рух</h1>
              <p className="ab-test-subtitle">
                Нижче зібрано короткий behavioral recap та наступний крок.
              </p>
            </div>

            <div className="ab-test-shell__body">
              <div className="ab-test-result-card">
                <div className="ab-test-result-grid">
                  <div className="ab-test-result-block">
                    <p className="ab-test-result-label">Провідний блок</p>
                    <p className="ab-test-result-value">
                      {DOMINANT_BLOCK_LABELS[result.dominantBlock]}
                    </p>
                  </div>
                  <div className="ab-test-result-block">
                    <p className="ab-test-result-label">Дні паузи</p>
                    <p className="ab-test-result-value">
                      {result.inactivityDays}
                    </p>
                  </div>
                </div>

                <div className="ab-test-result-copy">
                  <div className="ab-test-result-copy-block">
                    <p className="ab-test-result-label">Незавершена ціль</p>
                    <p className="ab-test-result-text">
                      {result.unresolvedGoal}
                    </p>
                  </div>
                  <div className="ab-test-result-copy-block">
                    <p className="ab-test-result-label">
                      Повторювана відкладена дія
                    </p>
                    <p className="ab-test-result-text">
                      {result.repeatedPostponedAction}
                    </p>
                  </div>
                  <div className="ab-test-result-copy-block">
                    <p className="ab-test-result-label">Наратив</p>
                    <p className="ab-test-result-text ab-test-result-text--narrative">
                      {result.narrative}
                    </p>
                  </div>
                  <div className="ab-test-result-copy-block">
                    <p className="ab-test-result-label">Наступний крок</p>
                    <p className="ab-test-result-text">{result.nextAction}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="ab-test-shell__footer">
              {!isAuthenticated ? (
                <Button
                  type="button"
                  onClick={() => navigate(isTelegramMiniApp() ? '/miniapp/zoom-calendar' : '/register?from=ab-test')}
                  variant="glass"
                  fullWidth
                >
                  Зберегти результат і отримати план
                </Button>
              ) : null}
              <button
                type="button"
                onClick={handleResultCta}
                className="ab-test-result-cta"
              >
                {result.nextActionCta}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ab-test-page">
      {/* [DESIGN] Main question shell */}
      <div className="ab-test-page__frame">
        <div className="ab-test-shell">
          <div className="ab-test-shell__header">
            <p className="ab-test-kicker">ABSystem loop</p>
            <h1 className="ab-test-title">Що зараз гальмує рух?</h1>
            <p className="ab-test-subtitle">
              Один екран, один вибір, одна точка інтерпретації.
            </p>

            <div className="ab-test-progress">
              <div className="ab-test-progress__meta">
                <span className="ab-test-progress__label">Прогрес</span>
                <span className="ab-test-progress__counter">
                  {getProgressLabel(currentIndex, totalQuestions)}
                </span>
              </div>
              <div className="ab-test-progress__track" aria-hidden="true">
                {Array.from({ length: TOTAL_BALLS }, (_, index) => {
                  const ballState = getBallState(
                    index,
                    currentBallIndex,
                    isResultView
                  )

                  return (
                    <span
                      key={index}
                      className="ab-test-progress__ball"
                      data-state={ballState}
                      data-num={index + 1}
                    >
                      {index + 1}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="ab-test-shell__body">
            {currentQuestion ? (
              <div className="ab-test-question">
                <div className="ab-test-question__meta">
                  <p className="ab-test-question__kicker">
                    Питання {currentIndex + 1} з {questions.length}
                  </p>
                  <p className="ab-test-question__counter">
                    Оберіть варіант, який зараз найближчий до вашого руху.
                  </p>
                </div>

                <h2 className="ab-test-question__title">
                  {currentQuestion.prompt}
                </h2>

                <div className="ab-test-answers">
                  {currentQuestion.answers.map((answer) => {
                    const isSelected = selectedAnswerId === answer.id

                    return (
                      <button
                        key={answer.id}
                        type="button"
                        onClick={() => handleSelectAnswer(answer.id)}
                        data-selected={isSelected ? 'true' : 'false'}
                        className="ab-test-answer"
                        style={{ whiteSpace: 'normal', alignItems: 'flex-start', textAlign: 'left' }}
                      >
                        <span
                          className="ab-test-answer__dot"
                          aria-hidden="true"
                        />
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

                {error ? <p className="ab-test-inline-error">{error}</p> : null}
              </div>
            ) : null}
          </div>

          <div className="ab-test-shell__footer">
            <div className="ab-test-nav">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentIndex === 0 || submitting}
                className="ab-test-nav-button ab-test-nav-button--back"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={() => void handleNext()}
                disabled={!canAdvance || submitting}
                className="ab-test-nav-button ab-test-nav-button--next"
              >
                {submitting
                  ? 'Обробка...'
                  : isLastQuestion
                    ? 'Показати результат'
                    : 'Далі'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
