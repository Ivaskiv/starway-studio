import { useMemo } from 'react'

import type { MicroTask as MicroTaskItem } from '@/features/microTask/types/types'
import type {
  CurrentFlow,
  DailyHistoryProgress,
  TaskDayStep,
} from '@/features/daily-cycle/utils/dashboard.types'
import {
  formatVerboseDate,
  getDailyHistoryProgress,
  getEntrySourceIds,
  getEntryTaskStats,
  getMorningMeta,
  resolveCurrentFlow,
  toDateKey,
} from '@/features/daily-cycle/utils/dashboard.utils'

import type { DashboardContext } from './useContext'

export function useDerived(
  context: DashboardContext,
) {
  const {
    location,
    todayEntry,
    dailyHistory,
    yesterdayDateKey,
    rawRecoveryTarget,
    microTasks,
    activeTab,
    showMorningSession,
    showEveningSession,
    cycleRecoveryDateKey,
    manualMicroTask,
    isRegeneratingMicroTasks,
    hasRegeneratedMicroTasks,
    recoveryPromptDateKey,
    optimisticTaskState,
    currentDay,
  } = context

  const todayDateKey = toDateKey(new Date())
  const activeMicrotaskDateKey = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const requestedDateKey = params.get('date')
    if (activeTab !== 'microtasks') return todayDateKey
    if (!requestedDateKey) return todayDateKey
    return requestedDateKey
  }, [activeTab, location.search, todayDateKey])
  const activeMicrotaskDateLabel = useMemo(() => {
    const [year, month, day] = activeMicrotaskDateKey.split('-').map(Number)
    if (!year || !month || !day) return activeMicrotaskDateKey
    return formatVerboseDate(new Date(year, month - 1, day))
  }, [activeMicrotaskDateKey])
  const isRecoveryMicrotaskDate = activeMicrotaskDateKey !== todayDateKey
  const microtaskContextEntry = useMemo(() => {
    if (activeMicrotaskDateKey === todayDateKey) {
      return todayEntry ?? dailyHistory.find(entry => toDateKey(entry.date) === activeMicrotaskDateKey) ?? null
    }

    return dailyHistory.find(entry => toDateKey(entry.date) === activeMicrotaskDateKey) ?? null
  }, [activeMicrotaskDateKey, dailyHistory, todayDateKey, todayEntry])
  const microtaskContextProgress = useMemo(
    () => (microtaskContextEntry
      ? getDailyHistoryProgress(microtaskContextEntry, getEntryTaskStats(microtaskContextEntry, microTasks))
      : null),
    [microTasks, microtaskContextEntry],
  )
  const microtaskContextEntryIds = useMemo(
    () => getEntrySourceIds(microtaskContextEntry),
    [microtaskContextEntry],
  )
  const morningAnswers = useMemo(() => {
    const content = microtaskContextEntry?.content
    if (!content || typeof content !== 'object' || Array.isArray(content)) return null
    const morning = (content as Record<string, unknown>).morning
    if (!morning || typeof morning !== 'object' || Array.isArray(morning)) return null
    return morning as Record<string, string>
  }, [microtaskContextEntry])
  const morningMeta = useMemo(
    () => getMorningMeta(microtaskContextEntry?.content),
    [microtaskContextEntry],
  )
  const applyOptimisticTask = (task: MicroTaskItem) => {
    const override = optimisticTaskState[task.id]
    if (!override) return task

    const mergedMeta = override.meta && typeof override.meta === 'object' && !Array.isArray(override.meta)
      ? {
          ...(task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta) ? task.meta : {}),
          ...override.meta,
        }
      : task.meta

    return {
      ...task,
      ...override,
      meta: mergedMeta,
    }
  }
  const visibleMicroTasks = useMemo(() => {
    const dayTasks = microTasks.filter(task => {
      const createdDateKey = typeof task.createdAt === 'string' ? task.createdAt.slice(0, 10) : null
      if (createdDateKey === activeMicrotaskDateKey) return true
      if (task.generatedFromEntryId && microtaskContextEntryIds.includes(task.generatedFromEntryId)) return true
      return false
    })
    const hasSavedManualTasks = dayTasks.some(task => task.status === 'manual')
    const merged = hasSavedManualTasks
      ? [...dayTasks]
      : manualMicroTask
        ? [manualMicroTask, ...dayTasks]
        : [...dayTasks]
    const seen = new Set<string>()
    return merged.filter(task => {
      if (seen.has(task.id)) return false
      seen.add(task.id)
      return true
    }).map(applyOptimisticTask)
  }, [activeMicrotaskDateKey, manualMicroTask, microTasks, microtaskContextEntryIds, optimisticTaskState])
  const todayMicroTasks = useMemo(() => {
    const todayEntryIds = todayEntry?.id ? [todayEntry.id] : []

    return microTasks
      .filter((task) => {
        const createdDateKey = typeof task.createdAt === 'string' ? task.createdAt.slice(0, 10) : null
        if (createdDateKey === todayDateKey) return true
        if (task.generatedFromEntryId && todayEntryIds.includes(task.generatedFromEntryId)) return true
        return false
      })
      .map(applyOptimisticTask)
  }, [applyOptimisticTask, microTasks, todayDateKey, todayEntry?.id])
  const activeTodayMicroTasks = useMemo(
    () => todayMicroTasks.filter(task => (task.status ?? 'PENDING') === 'PENDING' || (task.status === 'manual' && (task.meta as Record<string, unknown> | undefined)?.uiStatus !== 'done' && (task.meta as Record<string, unknown> | undefined)?.uiStatus !== 'skipped')),
    [todayMicroTasks],
  )
  const completedTodayMicroTasks = useMemo(
    () => todayMicroTasks.filter(task => {
      const manualUiStatus = task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta)
        ? (task.meta as Record<string, unknown>).uiStatus
        : null
      return task.status === 'COMPLETED' || (task.status === 'manual' && manualUiStatus === 'done')
    }),
    [todayMicroTasks],
  )
  const visibleMicroTaskProgress = useMemo(() => {
    const isDone = (task: MicroTaskItem) => {
      const manualUiStatus = task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta)
        ? (task.meta as Record<string, unknown>).uiStatus
        : null
      return task.status === 'COMPLETED'
        || (task.status === 'manual' && manualUiStatus === 'done')
    }

    const isSkipped = (task: MicroTaskItem) => {
      const manualUiStatus = task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta)
        ? (task.meta as Record<string, unknown>).uiStatus
        : null
      return task.status === 'skipped'
        || task.status === 'expired'
        || (task.status === 'manual' && manualUiStatus === 'skipped')
    }

    const activeCount = visibleMicroTasks.filter(task => !isDone(task) && !isSkipped(task)).length
    const completedCount = visibleMicroTasks.filter(task => isDone(task)).length

    return {
      activeCount,
      completedCount,
      message: null,
    }
  }, [visibleMicroTasks])
  const hasActiveMicroTasks = visibleMicroTaskProgress.activeCount > 0
  const hasTasksToday = visibleMicroTasks.length > 0
  const hasRegenEligibleTasks = visibleMicroTasks.some(task => task.taskKind !== 'manual')
  const hasMorningAnswers = Boolean(morningAnswers && Object.keys(morningAnswers).length > 0)
  const hasServerRegeneratedMicroTasks = typeof morningMeta?.microTasksRegeneratedAt === 'string'
  const canContinueToEvening = Boolean(hasMorningAnswers || visibleMicroTasks.length > 0)
  const canRegenerateTasks = hasRegenEligibleTasks && !hasRegeneratedMicroTasks && !hasServerRegeneratedMicroTasks && !isRegeneratingMicroTasks
  const taskDaySteps = useMemo<TaskDayStep[]>(() => {
    const morningDone = Boolean(microtaskContextProgress?.morningDone)
    const tasksDone = Boolean(microtaskContextProgress?.tasksDone)
    const eveningDone = Boolean(microtaskContextProgress?.eveningDone)
    const analysisDone = Boolean(microtaskContextProgress?.analysisDone)

    return [
      {
        id: 'morning',
        label: 'Ранок',
        status: morningDone ? 'done' : 'active',
      },
      {
        id: 'tasks',
        label: 'Мікрозавдання',
        status: tasksDone ? 'done' : morningDone ? 'active' : 'locked',
      },
      {
        id: 'evening',
        label: 'Вечір',
        status: eveningDone ? 'done' : morningDone ? 'active' : 'locked',
      },
      {
        id: 'analysis',
        label: 'Аналіз дня',
        status: analysisDone ? 'done' : morningDone ? 'active' : 'locked',
      },
    ]
  }, [microtaskContextProgress])
  const completedTaskDaySteps = taskDaySteps.filter(step => step.status === 'done').length
  const taskProgressPercent = Math.round((completedTaskDaySteps / 4) * 100)
  const taskRingRadius = 15
  const taskRingCircumference = 2 * Math.PI * taskRingRadius
  const taskRingOffset = taskRingCircumference * (1 - taskProgressPercent / 100)
  const taskXpToday = visibleMicroTasks.reduce((sum, task) => {
    const manualUiStatus = task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta)
      ? (task.meta as Record<string, unknown>).uiStatus
      : null
    const isDone = task.status === 'COMPLETED' || (task.status === 'manual' && manualUiStatus === 'done')
    return isDone ? sum + (task.xpReward ?? 20) : sum
  }, 0)
  const allTasksResolved = visibleMicroTasks.length > 0 && visibleMicroTaskProgress.activeCount === 0
  const dailyProgressByDate = useMemo(() => {
    return dailyHistory.reduce<Record<string, DailyHistoryProgress>>((acc, entry) => {
      acc[toDateKey(entry.date)] = getDailyHistoryProgress(entry, getEntryTaskStats(entry, microTasks))
      return acc
    }, {})
  }, [dailyHistory, microTasks])
  const yesterdayEntry = useMemo(
    () => dailyHistory.find((entry) => toDateKey(entry.date) === yesterdayDateKey) ?? null,
    [dailyHistory, yesterdayDateKey],
  )
  const yesterdayProgress = useMemo(
    () => (yesterdayEntry ? getDailyHistoryProgress(yesterdayEntry, getEntryTaskStats(yesterdayEntry, microTasks)) : null),
    [microTasks, yesterdayEntry],
  )
  const recoveryTarget = useMemo(() => {
    const unfinishedYesterday = !yesterdayProgress
      || (
        !yesterdayProgress.completed
        && !yesterdayProgress.completedLate
        && !yesterdayProgress.skipped
        && !yesterdayProgress.finalizedAt
      )

    if (currentDay > 1 && unfinishedYesterday) {
      return {
        dateKey: yesterdayDateKey,
        session: (yesterdayProgress?.morningDone ? 'evening' : 'morning') as 'morning' | 'evening',
      }
    }

    return rawRecoveryTarget
  }, [currentDay, rawRecoveryTarget, yesterdayDateKey, yesterdayProgress])
  const hasPendingYesterdayGate = useMemo(
    () => (
      recoveryTarget?.dateKey === yesterdayDateKey
      || recoveryPromptDateKey === yesterdayDateKey
      || cycleRecoveryDateKey === yesterdayDateKey
    ),
    [cycleRecoveryDateKey, recoveryPromptDateKey, recoveryTarget?.dateKey, yesterdayDateKey],
  )
  const activeRecoveryProgress = useMemo(
    () => (cycleRecoveryDateKey ? dailyProgressByDate[cycleRecoveryDateKey] ?? null : null),
    [cycleRecoveryDateKey, dailyProgressByDate],
  )
  const currentFlow = useMemo(() => resolveCurrentFlow({
    todayDateKey,
    yesterdayDateKey,
    reportDayKey: null,
    cycleRecoveryDateKey,
    recoveryPromptDateKey,
    recoveryTargetDateKey: recoveryTarget?.dateKey ?? null,
    showMorningSession,
    showEveningSession,
    hasMorningAnswers,
    hasTasksToday,
    hasActiveMicroTasks,
    yesterdayProgress,
    activeRecoveryProgress,
  }), [
    activeRecoveryProgress,
    cycleRecoveryDateKey,
    hasActiveMicroTasks,
    hasMorningAnswers,
    hasTasksToday,
    recoveryPromptDateKey,
    recoveryTarget?.dateKey,
    showEveningSession,
    showMorningSession,
    todayDateKey,
    yesterdayDateKey,
    yesterdayProgress,
  ])

  return {
    todayDateKey,
    activeMicrotaskDateKey,
    activeMicrotaskDateLabel,
    isRecoveryMicrotaskDate,
    microtaskContextEntry,
    microtaskContextProgress,
    microtaskContextEntryIds,
    morningAnswers,
    morningMeta,
    visibleMicroTasks,
    todayMicroTasks,
    activeTodayMicroTasks,
    completedTodayMicroTasks,
    visibleMicroTaskProgress,
    hasActiveMicroTasks,
    hasTasksToday,
    hasRegenEligibleTasks,
    hasMorningAnswers,
    hasServerRegeneratedMicroTasks,
    canContinueToEvening,
    canRegenerateTasks,
    taskDaySteps,
    completedTaskDaySteps,
    taskProgressPercent,
    taskRingRadius,
    taskRingCircumference,
    taskRingOffset,
    taskXpToday,
    allTasksResolved,
    dailyProgressByDate,
    yesterdayEntry,
    yesterdayProgress,
    recoveryTarget,
    hasPendingYesterdayGate,
    activeRecoveryProgress,
    currentFlow,
  }
}

export type DashboardDerived = ReturnType<typeof useDerived>
