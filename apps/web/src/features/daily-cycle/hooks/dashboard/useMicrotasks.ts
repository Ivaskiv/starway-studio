import toast from 'react-hot-toast'

import type { MicroTask as MicroTaskItem } from '@/features/microTask/types/types'
import type { MicrotaskPromptIntent } from '@/features/daily-cycle/utils/dashboard.types'
import {
  buildManualMicroTask,
  getMicrotaskProgressToast,
  saveManualMicroTask,
  saveMicrotaskRegenerationFlag,
  serializeMicroTaskList,
} from '@/features/daily-cycle/utils/dashboard.utils'

import type { DashboardContext } from './useContext'
import type { DashboardDerived } from './useDerived'
import type { DashboardRecovery } from './useRecovery'

export function useMicrotasks(
  context: DashboardContext,
  derived: DashboardDerived,
  recovery: DashboardRecovery,
) {
  const {
    dashboardUser,
    refetchTodayEntry,
    refetchDailyHistory,
    refetchMicroTasks,
    createManualTask,
    replaceManualTasks,
    completeTask,
    skipTask,
    submitDailyCycle,
    setShowMorningSession,
    setShowEveningSession,
    manualTaskText,
    setManualTaskText,
    setManualMicroTask,
    isRegeneratingMicroTasks,
    setIsRegeneratingMicroTasks,
    hasRegeneratedMicroTasks,
    setHasRegeneratedMicroTasks,
    microtaskPromptIntent,
    setMicrotaskPromptIntent,
    setMicrotaskPromptStage,
    setMicrotaskNotice,
    setOptimisticTaskState,
    regenerationTimerRef,
    regenerationTickerRef,
    microtaskNoticeTimerRef,
  } = context

  const {
    todayDateKey,
    activeMicrotaskDateKey,
    activeMicrotaskDateLabel,
    isRecoveryMicrotaskDate,
    morningAnswers,
    visibleMicroTasks,
    visibleMicroTaskProgress,
    hasMorningAnswers,
    hasServerRegeneratedMicroTasks,
  } = derived

  const {
    openDashboardTab,
  } = recovery

  const microtaskPromptActive = Boolean(microtaskPromptIntent)
  const microtaskPromptTitle = isRecoveryMicrotaskDate
    ? `Мікродія за ${activeMicrotaskDateLabel}`
    : 'Мікрозавдання на сьогодні'
  const microtaskPromptBody = microtaskPromptIntent === 'regenerate'
    ? 'Новий аналіз замінить старі авто-завдання цього дня. Ручні записи залишаться як є.'
    : isRecoveryMicrotaskDate
      ? 'Для дозавершення вчорашнього дня авто-мікрозавдання не генеруються. Зафіксуй свою мікродію або свідомо переходь до вечірньої сесії.'
      : 'Найчастіше це одне завдання на день, інколи два. Або можеш відредагувати список вручну.'

  const openMicrotaskPrompt = (intent: MicrotaskPromptIntent) => {
    setMicrotaskPromptIntent(intent)
    setMicrotaskPromptStage('choice')
  }

  const closeMicrotaskPrompt = () => {
    setMicrotaskPromptIntent(null)
    setMicrotaskPromptStage('choice')
  }

  const clearMicrotaskNotice = () => {
    if (microtaskNoticeTimerRef.current) {
      window.clearTimeout(microtaskNoticeTimerRef.current)
      microtaskNoticeTimerRef.current = null
    }
    setMicrotaskNotice(null)
  }

  const announceMicrotaskProgress = (message: string) => {
    clearMicrotaskNotice()
    setMicrotaskNotice(message)
    toast.success(message)
    microtaskNoticeTimerRef.current = window.setTimeout(() => {
      setMicrotaskNotice(null)
      microtaskNoticeTimerRef.current = null
    }, 8000)
  }

  const handleGenerateMicroTasks = async () => {
    if (!hasMorningAnswers || !morningAnswers) {
      openDashboardTab('cycle', {
        session: 'morning',
        dateKey: activeMicrotaskDateKey !== todayDateKey ? activeMicrotaskDateKey : null,
      })
      return
    }

    closeMicrotaskPrompt()

    await submitDailyCycle({
      session: 'morning',
      answers: morningAnswers,
      date: `${activeMicrotaskDateKey}T12:00:00.000Z`,
    }).unwrap()
  }

  const handleRegenerateMicroTasks = async () => {
    if (!hasMorningAnswers || !morningAnswers) {
      openDashboardTab('cycle', {
        session: 'morning',
        dateKey: activeMicrotaskDateKey !== todayDateKey ? activeMicrotaskDateKey : null,
      })
      return
    }

    if (hasRegeneratedMicroTasks || hasServerRegeneratedMicroTasks || isRegeneratingMicroTasks) {
      setHasRegeneratedMicroTasks(true)
      saveMicrotaskRegenerationFlag(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, true)
      return
    }

    setIsRegeneratingMicroTasks(true)
    closeMicrotaskPrompt()

    try {
      await submitDailyCycle({
        session: 'morning',
        answers: morningAnswers,
        date: `${activeMicrotaskDateKey}T12:00:00.000Z`,
        regenerateMicroTasks: true,
      }).unwrap()
      setHasRegeneratedMicroTasks(true)
      saveMicrotaskRegenerationFlag(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, true)
      await Promise.all([
        refetchMicroTasks(),
        refetchDailyHistory(),
        refetchTodayEntry(),
      ])
      setShowMorningSession(false)
      setShowEveningSession(false)
      announceMicrotaskProgress('Мікрозавдання оновлено. Працюй уже з новим списком.')
      openDashboardTab('microtasks', { dateKey: activeMicrotaskDateKey, replace: true })
    } catch (error) {
      const errorData =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { error?: string } }).data
          : null
      if (errorData?.error === 'microtasks_regeneration_limit_reached') {
        setHasRegeneratedMicroTasks(true)
        saveMicrotaskRegenerationFlag(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, true)
        toast.error('Перегенерацію вже використано сьогодні. Доступна лише одна спроба.')
      } else {
        console.error('[AiMentorDashboard] microtask regeneration failed', error)
        toast.error('Не вдалося оновити мікрозавдання.')
      }
    } finally {
      setIsRegeneratingMicroTasks(false)
      if (regenerationTimerRef.current) {
        window.clearTimeout(regenerationTimerRef.current)
        regenerationTimerRef.current = null
      }
      if (regenerationTickerRef.current) {
        window.clearInterval(regenerationTickerRef.current)
        regenerationTickerRef.current = null
      }
    }
  }

  const handleSaveManualTask = async () => {
    const lines = manualTaskText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
    if (!lines.length) return

    setMicrotaskPromptIntent(null)
    setMicrotaskPromptStage('choice')
    setManualTaskText('')

    try {
      if (lines.length === 1) {
        const task = buildManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, lines[0] ?? '')
        await createManualTask({
          title: task.title,
          description: task.description,
          why: task.why,
          steps: task.steps,
          dueDate: task.dueAt,
          replaceExisting: true,
          date: activeMicrotaskDateKey,
        })
      } else {
        await replaceManualTasks({
          date: activeMicrotaskDateKey,
          tasks: lines,
        })
      }
      setManualMicroTask(null)
      saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, null)
      await refetchMicroTasks()
      await refetchDailyHistory()
      setShowMorningSession(false)
      setShowEveningSession(false)
      announceMicrotaskProgress('Список мікрозавдань оновлено. Працюй уже з новою версією.')
      openDashboardTab('microtasks', { dateKey: activeMicrotaskDateKey, replace: true })
    } catch (error) {
      console.error('[AiMentorDashboard] failed to save manual microtask list', error)
      if (lines.length === 1) {
        const task = buildManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, lines[0] ?? '')
        setManualMicroTask(task)
        saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, task)
      }
      setManualTaskText(lines.join('\n'))
      setMicrotaskPromptIntent('generate')
      setMicrotaskPromptStage('edit')
    }
  }

  const openEditMicrotaskList = () => {
    setMicrotaskPromptIntent('generate')
    setManualTaskText(
      visibleMicroTasks.length > 0
        ? serializeMicroTaskList(visibleMicroTasks)
        : '',
    )
    setMicrotaskPromptStage('edit')
  }

  const openManualTaskComposer = () => {
    setMicrotaskPromptIntent('generate')
    setManualTaskText('')
    setMicrotaskPromptStage('edit')
  }

  const handleCompleteMicroTask = async (taskId: string) => {
    const manualTask = visibleMicroTasks.find(task => task.id === taskId && task.status === 'manual')
    if (manualTask) {
      if (manualTask.persist === false) {
        const updated: MicroTaskItem = {
          ...manualTask,
          completedAt: new Date().toISOString(),
          meta: {
            ...(manualTask.meta ?? {}),
            uiStatus: 'done',
          },
        }
        setManualMicroTask(updated)
        saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, updated)
        announceMicrotaskProgress(getMicrotaskProgressToast('done', visibleMicroTaskProgress.activeCount - 1))
        return
      }

      void completeTask(taskId)
      announceMicrotaskProgress(getMicrotaskProgressToast('done', visibleMicroTaskProgress.activeCount - 1))
      return
    }

    const previousTask = visibleMicroTasks.find(task => task.id === taskId)
    if (!previousTask) return

    const optimisticCompletedAt = new Date().toISOString()
    setOptimisticTaskState(prev => ({
      ...prev,
      [taskId]: {
        status: 'COMPLETED',
        completedAt: optimisticCompletedAt,
      },
    }))
    announceMicrotaskProgress(getMicrotaskProgressToast('done', visibleMicroTaskProgress.activeCount - 1))

    try {
      await completeTask(taskId).unwrap()
    } catch (error) {
      console.error('[AiMentorDashboard] complete microtask failed', error)
      setOptimisticTaskState(prev => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
      toast.error('Не вдалося позначити завдання виконаним.')
      return
    }

    setOptimisticTaskState(prev => {
      const next = { ...prev }
      delete next[taskId]
      return next
    })
  }

  const handleSkipMicroTask = async (taskId: string) => {
    const manualTask = visibleMicroTasks.find(task => task.id === taskId && task.status === 'manual')
    if (manualTask) {
      if (manualTask.persist === false) {
        const updated: MicroTaskItem = {
          ...manualTask,
          meta: {
            ...(manualTask.meta ?? {}),
            uiStatus: 'skipped',
          },
        }
        setManualMicroTask(updated)
        saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, updated)
        window.setTimeout(() => {
          setManualMicroTask(null)
          saveManualMicroTask(dashboardUser?.id ?? 'guest', activeMicrotaskDateKey, null)
        }, 1500)
        announceMicrotaskProgress(getMicrotaskProgressToast('skipped', visibleMicroTaskProgress.activeCount - 1))
        return
      }

      void skipTask(taskId)
      announceMicrotaskProgress(getMicrotaskProgressToast('skipped', visibleMicroTaskProgress.activeCount - 1))
      return
    }

    const previousTask = visibleMicroTasks.find(task => task.id === taskId)
    if (!previousTask) return

    setOptimisticTaskState(prev => ({
      ...prev,
      [taskId]: {
        status: 'skipped',
      },
    }))
    announceMicrotaskProgress(getMicrotaskProgressToast('skipped', visibleMicroTaskProgress.activeCount - 1))

    try {
      await skipTask(taskId).unwrap()
    } catch (error) {
      console.error('[AiMentorDashboard] skip microtask failed', error)
      setOptimisticTaskState(prev => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
      toast.error('Не вдалося пропустити завдання.')
      return
    }

    setOptimisticTaskState(prev => {
      const next = { ...prev }
      delete next[taskId]
      return next
    })
  }


  return {
    microtaskPromptActive,
    microtaskPromptTitle,
    microtaskPromptBody,
    openMicrotaskPrompt,
    closeMicrotaskPrompt,
    clearMicrotaskNotice,
    announceMicrotaskProgress,
    handleGenerateMicroTasks,
    handleRegenerateMicroTasks,
    handleSaveManualTask,
    openEditMicrotaskList,
    openManualTaskComposer,
    handleCompleteMicroTask,
    handleSkipMicroTask,
  }
}

export type DashboardMicrotasks = ReturnType<typeof useMicrotasks>
