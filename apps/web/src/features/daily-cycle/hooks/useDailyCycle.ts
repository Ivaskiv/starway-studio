/*
 * AUDIT (confirm block / незакритий вчорашній день)
 * - Source of truth for day data: RTK Query `getDailyHistory` + `getTodayEntry`.
 * - Existing yesterday check already lived here via `unresolvedYesterdayEntry`.
 * - Skip endpoint already exists: POST `/daily/skip` via `useSkipPreviousDayMutation`.
 * - This file is the safest single place for "чи блокує вчорашній день сьогодні" logic.
 */
import { useMemo, useRef, useState } from 'react'

import { useGetDailyHistoryQuery, useGetTodayEntryQuery } from '../services/daily.api'
import { DEFAULT_DAILY_CHOICE, DEFAULT_DAILY_STATE, type DailyCycleEntry } from '../types/daily.types'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import { useSkipPreviousDayMutation } from '../services/daily.api'
import { getDailyHistoryProgress, getEntryTaskStats } from '../utils/dashboard.utils'
import type { MicroTask as MicroTaskItem } from '@/features/microTask/types/types'

export type ActiveStep =
  | { step: 'morning'; resumeFrom: number }
  | { step: 'tasks' }
  | { step: 'evening'; isLocked: boolean; unlocksAt: string | null; resumeFrom: number }
  | { step: 'analysis' }
  | { step: 'done' }

export interface YesterdayBlockState {
  shouldBlock: boolean
  yesterdayDay: DailyCycleEntry | null
}

function toDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function getContentObject(content: DailyCycleEntry['content']) {
  return content && typeof content === 'object' && !Array.isArray(content) ? content : null
}

function getMeta(
  entry: DailyCycleEntry | undefined,
  key: 'morningMeta' | 'eveningMeta',
): Record<string, unknown> | null {
  const content = getContentObject(entry?.content)
  const value = content?.[key]
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function getResumeFrom(entry: DailyCycleEntry | undefined, key: 'morningMeta' | 'eveningMeta') {
  const meta = getMeta(entry, key)
  return typeof meta?.lastQuestionIndex === 'number' ? meta.lastQuestionIndex : 0
}

function getCompletedAt(entry: DailyCycleEntry | undefined, key: 'morningMeta' | 'eveningMeta') {
  const meta = getMeta(entry, key)
  return typeof meta?.completedAt === 'string' ? meta.completedAt : null
}

export function getActiveStep(todayEntry: DailyCycleEntry | undefined, taskStates: string[]): ActiveStep {
  if (!getCompletedAt(todayEntry, 'morningMeta')) {
    return {
      step: 'morning',
      resumeFrom: getResumeFrom(todayEntry, 'morningMeta'),
    }
  }

  const allTasksDone = taskStates.length > 0 && taskStates.every(status => status === 'COMPLETED')
  const anyTaskDone = taskStates.some(status => status === 'COMPLETED')
  if (!anyTaskDone) return { step: 'tasks' }

  if (!getCompletedAt(todayEntry, 'eveningMeta')) {
    const now = new Date()
    const isAfter18 = now.getHours() >= 18
    return {
      step: 'evening',
      isLocked: !isAfter18 && !allTasksDone,
      unlocksAt: isAfter18 ? null : '18:00',
      resumeFrom: getResumeFrom(todayEntry, 'eveningMeta'),
    }
  }

  const content = getContentObject(todayEntry?.content)
  if (!todayEntry?.aiAnalysis && typeof content?.analysisGeneratedAt !== 'string') {
    return { step: 'analysis' }
  }

  return { step: 'done' }
}

function isEntryClosed(entry: DailyCycleEntry | undefined) {
  if (!entry) return false

  const finalStatuses: Array<NonNullable<DailyCycleEntry['status']>> = ['COMPLETED', 'COMPLETED_LATE', 'SKIPPED']
  return Boolean(entry.status && finalStatuses.includes(entry.status))
}

export function getYesterdayBlockState(
  days: DailyCycleEntry[],
  userId: string,
  today: Date = new Date(),
  hasTodayWork = false,
  tasks: MicroTaskItem[] = [],
): YesterdayBlockState {
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayKey = toDateKey(yesterday)

  const yesterdayDays = days.filter((entry) => toDateKey(entry.date) === yesterdayKey)

  if (yesterdayDays.length === 0) {
    if (!hasTodayWork) {
      return { shouldBlock: false, yesterdayDay: null }
    }

    return {
      shouldBlock: true,
      yesterdayDay: {
        id: `synthetic-yesterday-${yesterdayKey}`,
        userId,
        date: `${yesterdayKey}T12:00:00.000Z`,
        status: 'PENDING',
        state: DEFAULT_DAILY_STATE,
        choice: DEFAULT_DAILY_CHOICE,
        dayFact: '',
        aiAnalysis: null,
        content: null,
        lateCompletedAt: null,
        canCatchUpUntil: null,
        createdAt: `${yesterdayKey}T12:00:00.000Z`,
        updatedAt: `${yesterdayKey}T12:00:00.000Z`,
      },
    }
  }

  const unresolvedYesterdayDay = yesterdayDays.find((entry) => {
    const progress = getDailyHistoryProgress(entry, getEntryTaskStats(entry, tasks))
    return !(progress.morningDone && progress.tasksDone && progress.eveningDone)
  }) ?? null

  if (!unresolvedYesterdayDay) {
    return { shouldBlock: false, yesterdayDay: null }
  }

  return { shouldBlock: true, yesterdayDay: unresolvedYesterdayDay }
}

type UseTodayGuardParams = {
  days: DailyCycleEntry[]
  userId: string
  isEnabled: boolean
  hasTodayWork?: boolean
  tasks?: MicroTaskItem[]
  onCatchupDay: (day: DailyCycleEntry) => void
}

export function useTodayGuard({
  days,
  userId,
  isEnabled,
  hasTodayWork = false,
  tasks = [],
  onCatchupDay,
}: UseTodayGuardParams) {
  const [skipPreviousDay] = useSkipPreviousDayMutation()
  const [blockState, setBlockState] = useState<{
    isOpen: boolean
    yesterdayDay: DailyCycleEntry | null
  }>({ isOpen: false, yesterdayDay: null })
  const proceedRef = useRef<(() => void) | null>(null)

  function tryOpenToday(onProceed: () => void) {
    if (!isEnabled) {
      onProceed()
      return
    }

    const nextState = getYesterdayBlockState(days, userId, new Date(), hasTodayWork, tasks)

    if (!nextState.shouldBlock || !nextState.yesterdayDay) {
      onProceed()
      return
    }

    proceedRef.current = onProceed
    setBlockState({
      isOpen: true,
      yesterdayDay: nextState.yesterdayDay,
    })
  }

  function handleCatchup() {
    const yesterdayDay = blockState.yesterdayDay
    setBlockState({ isOpen: false, yesterdayDay: null })
    proceedRef.current = null
    if (yesterdayDay) {
      onCatchupDay(yesterdayDay)
    }
  }

  async function handleSkipYesterday() {
    const yesterdayDay = blockState.yesterdayDay
    if (!yesterdayDay) return

    await skipPreviousDay({ date: `${toDateKey(yesterdayDay.date)}T12:00:00.000Z` }).unwrap()
    sessionStorage.setItem('daily-cycle:last-skipped-yesterday', toDateKey(yesterdayDay.date))
    setBlockState({ isOpen: false, yesterdayDay: null })
    const proceed = proceedRef.current
    proceedRef.current = null
    proceed?.()
  }

  function handleDismiss() {
    setBlockState({ isOpen: false, yesterdayDay: null })
    proceedRef.current = null
  }

  return {
    blockState,
    tryOpenToday,
    handleCatchup,
    handleSkipYesterday,
    handleDismiss,
  }
}

export function useDailyCycle(userId: string) {
  const { data: todayEntry } = useGetTodayEntryQuery(undefined, { skip: !userId })
  const { data: history = [] } = useGetDailyHistoryQuery(undefined, { skip: !userId })
  const { tasks } = useMicroTasks({ skip: !userId })

  return useMemo(() => {
    const todayKey = toDateKey(new Date())
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = toDateKey(yesterday)

    const unresolvedYesterdayEntry = history.find(entry => {
      if (toDateKey(entry.date) !== yesterdayKey) return false
      return !isEntryClosed(entry)
    }) ?? null

    const todayTaskStates = tasks
      .filter(task => {
        if (todayEntry?.id) {
          return task.generatedFromEntryId === todayEntry.id
        }

        return task.createdAt?.slice(0, 10) === todayKey
      })
      .map(task => task.status ?? 'PENDING')

    const hasTodayWork = Boolean(todayEntry) || todayTaskStates.length > 0
    const yesterdayEntry = unresolvedYesterdayEntry ?? (
      hasTodayWork
        ? ({
            id: `synthetic-yesterday-${yesterdayKey}`,
            userId,
            date: `${yesterdayKey}T12:00:00.000Z`,
            status: 'PENDING',
            state: DEFAULT_DAILY_STATE,
            choice: DEFAULT_DAILY_CHOICE,
            dayFact: '',
            aiAnalysis: null,
            content: null,
            lateCompletedAt: null,
            canCatchUpUntil: null,
            createdAt: `${yesterdayKey}T12:00:00.000Z`,
            updatedAt: `${yesterdayKey}T12:00:00.000Z`,
          } satisfies DailyCycleEntry)
        : null
    )

    return {
      hasUnfinishedYesterday: Boolean(yesterdayEntry),
      yesterdayEntry,
      todayEntry: todayEntry ?? null,
      activeStep: getActiveStep(todayEntry, todayTaskStates),
    }
  }, [history, tasks, todayEntry])
}

export default useDailyCycle
