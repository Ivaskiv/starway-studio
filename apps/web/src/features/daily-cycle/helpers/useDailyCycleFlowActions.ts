import toast from 'react-hot-toast'
import type { NavigateFunction } from 'react-router-dom'

import type { DailyQuestion } from './dailyCycleFlow.types'
import { clearDraft } from './dailyCycleFlow.utils'

type SubmitDailyCycle = (payload: {
  session: 'morning' | 'evening'
  answers: Record<string, string>
  date: string
  finalize?: boolean
}) => { unwrap: () => Promise<{ id: string }> }

type SaveSessionAnswer = (payload: {
  entryId: string
  session: 'morning' | 'evening'
  questionId: string
  answer: string
  date: string
  lastQuestionIndex: number
}) => { unwrap: () => Promise<unknown> }

type SaveMorningAnswer = (payload: {
  date: string
  answers: Record<string, string>
}) => { unwrap: () => Promise<unknown> }

type GenerateDeepLink = (payload: {
  action: 'resume_task'
  source: 'web'
  target: 'telegram'
  payload: {
    session: 'morning' | 'evening'
    step: number
    answers: Record<string, string>
    date: string
  }
}) => { unwrap: () => Promise<{ telegramUrl: string }> }

type UseDailyCycleFlowActionsParams = {
  session: 'morning' | 'evening'
  dateKey: string
  recoveryMode: boolean
  step: number
  currentQuestionId: string
  currentQuestionAnswer: string
  questions: DailyQuestion[]
  sessionAlreadyCompleted: boolean
  submitted: boolean
  submittedEntryId: string | null
  sessionEntryId: string | null
  answers: Record<string, string>
  sessionAnswersFromContent: Record<string, string> | null
  hasAccess: boolean
  userId: string
  embedded: boolean
  telegramBotActive: boolean
  telegramLinkUrl?: string
  submitDailyCycle: SubmitDailyCycle
  saveSessionAnswer: SaveSessionAnswer
  saveMorningAnswer: SaveMorningAnswer
  generateDeepLink: GenerateDeepLink
  refetchTodayEntry: () => Promise<unknown> | unknown
  refetchRequestedEntry?: () => Promise<unknown> | unknown
  refetchDailyHistory: () => Promise<unknown> | unknown
  refetchMicroTasks: () => Promise<unknown> | unknown
  onComplete?: () => void
  onOpenMicroTasks?: (dateKey?: string) => void
  navigate: NavigateFunction
  setValidationMessage: (value: string | null) => void
  setIsSubmitting: (value: boolean) => void
  setSubmittedEntryId: (value: string | null) => void
  setEveningAnalysisPending: (value: boolean) => void
  setSubmitted: (value: boolean) => void
  setStep: (updater: (current: number) => number) => void
}

export function useDailyCycleFlowActions({
  session,
  dateKey,
  recoveryMode,
  step,
  currentQuestionId,
  currentQuestionAnswer,
  questions,
  sessionAlreadyCompleted,
  submitted,
  submittedEntryId,
  sessionEntryId,
  answers,
  sessionAnswersFromContent,
  hasAccess,
  userId,
  embedded,
  telegramBotActive,
  telegramLinkUrl,
  submitDailyCycle,
  saveSessionAnswer,
  saveMorningAnswer,
  generateDeepLink,
  refetchTodayEntry,
  refetchRequestedEntry,
  refetchDailyHistory,
  refetchMicroTasks,
  onComplete,
  onOpenMicroTasks,
  navigate,
  setValidationMessage,
  setIsSubmitting,
  setSubmittedEntryId,
  setEveningAnalysisPending,
  setSubmitted,
  setStep,
}: UseDailyCycleFlowActionsParams) {
  const submitDate = `${dateKey}T12:00:00.000Z`
  const effectiveAnswers = Object.keys(answers).length > 0 ? answers : (sessionAnswersFromContent ?? {})

  const handleFinishDay = async () => {
    try {
      await submitDailyCycle({
        session,
        answers: effectiveAnswers,
        date: submitDate,
        finalize: true,
      }).unwrap()
    } catch {
      toast.error('Не вдалося завершити день. Спробуйте ще раз.')
      return
    }

    try {
      await Promise.all([
        refetchTodayEntry(),
        refetchRequestedEntry?.(),
        refetchDailyHistory(),
        refetchMicroTasks(),
      ])
    } catch {
      // ignore refresh issues
    }

    if (embedded) {
      await Promise.resolve(onComplete?.())
      return
    }

    navigate('/dashboard/ai-mentor?section=cycle')
  }

  const handleNext = async () => {
    console.info('[DailyCycle] next clicked', {
      session,
      dateKey,
      recoveryMode,
      step,
      currentQuestionId,
      answerPresent: Boolean(currentQuestionAnswer.trim()),
      sessionAlreadyCompleted,
      submitted,
      submittedEntryId,
      sessionEntryId,
    })

    if (!currentQuestionAnswer.trim()) {
      setValidationMessage('Потрібно відповісти на питання, щоб перейти далі.')
      return
    }

    setValidationMessage(null)

    if (sessionEntryId) {
      try {
        await saveSessionAnswer({
          entryId: sessionEntryId,
          session,
          questionId: currentQuestionId,
          answer: currentQuestionAnswer.trim(),
          date: submitDate,
          lastQuestionIndex: Math.min(step + 1, questions.length - 1),
        }).unwrap()
      } catch (error) {
        console.warn('[DailyCycle] step autosave failed', { session, dateKey, step, error })
      }
    }

    const isLastStep = step === questions.length - 1
    if (!isLastStep) {
      setStep(current => current + 1)
      return
    }

    setIsSubmitting(true)
    try {
      const saved = await submitDailyCycle({
        session,
        answers: effectiveAnswers,
        date: submitDate,
        finalize: session === 'morning',
      }).unwrap()
      setSubmittedEntryId(saved.id)

      clearDraft(userId, session, dateKey)
      if (hasAccess && !recoveryMode) {
        await refetchTodayEntry()
      }

      if (session === 'evening') {
        setEveningAnalysisPending(true)
        setSubmitted(true)
        return
      }

      void refetchMicroTasks()
      setSubmitted(true)
    } catch (error) {
      console.error('[DailyCycle] submit failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenTelegram = async () => {
    if (!telegramBotActive) {
      if (telegramLinkUrl) {
        window.open(telegramLinkUrl, '_blank', 'noopener,noreferrer')
      }
      return
    }

    try {
      const result = await generateDeepLink({
        action: 'resume_task',
        source: 'web',
        target: 'telegram',
        payload: { session, step, answers: effectiveAnswers, date: submitDate },
      }).unwrap()
      window.open(result.telegramUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('[DailyCycle] telegram resume link failed:', error)
      if (telegramLinkUrl) {
        window.open(telegramLinkUrl, '_blank', 'noopener,noreferrer')
      }
    }
  }

  const handleAnswerBlur = () => {
    if (session !== 'morning') return
    void saveMorningAnswer({
      date: submitDate,
      answers,
    }).unwrap().catch(error => {
      console.warn('[DailyCycle] morning autosave failed', {
        session,
        dateKey,
        error,
      })
    })
  }

  const handleGoToTasks = () => {
    if (embedded) {
      onOpenMicroTasks?.(dateKey)
      return
    }
    navigate(`/dashboard/tasks?date=${dateKey}`)
  }

  const handleGoToAllTasks = () => {
    if (embedded) {
      onOpenMicroTasks?.()
      return
    }
    navigate('/dashboard/tasks')
  }

  const handleFinalizeEvening = async () => {
    try {
      await submitDailyCycle({
      session: 'evening',
      answers: effectiveAnswers,
      date: submitDate,
      finalize: true,
    }).unwrap()
      await Promise.all([refetchTodayEntry(), refetchDailyHistory()])
      setEveningAnalysisPending(false)
      if (embedded) {
        await Promise.resolve(onComplete?.())
        return
      }
      if (recoveryMode) {
        navigate('/dashboard/cycle?session=morning')
        return
      }
      navigate('/dashboard/ai-mentor?section=cycle')
    } catch (error) {
      console.error('[DailyCycle] finalize evening failed', { session, dateKey, error })
      toast.error('Не вдалося завершити вечір. Спробуйте ще раз.')
    }
  }

  return {
    handleAnswerBlur,
    handleFinishDay,
    handleFinalizeEvening,
    handleGoToAllTasks,
    handleGoToTasks,
    handleNext,
    handleOpenTelegram,
  }
}
