type HistoryEntry = {
  date?: string | null
}

type TodayEntry = {
  date?: string | null
}

type GoalsSet = {
  goals?: unknown[] | null
} | null | undefined

type WebMap = {
  status?: string | null
} | null | undefined

type WheelSnapshot = {
  id?: string | null
} | null | undefined

type ProgressInput = {
  wheelSnapshot: WheelSnapshot
  goalsSet: GoalsSet
  webMap: WebMap
  dailyHistory: HistoryEntry[]
  todayEntry?: TodayEntry | null
}

export type CoreUserProgress = {
  wheelDone: boolean
  goalsDone: boolean
  visionDone: boolean
  cycleDays: number
}

export function getUserProgress(input: ProgressInput): CoreUserProgress {
  const wheelDone = Boolean(input.wheelSnapshot)
  const goalsDone = Boolean(input.goalsSet?.goals?.length)
  const visionDone = Boolean(input.webMap && input.webMap.status !== 'draft')

  const historyDays = new Set(
    input.dailyHistory
      .map((entry) => (typeof entry.date === 'string' ? entry.date.slice(0, 10) : ''))
      .filter(Boolean)
  )

  const todayDateKey =
    typeof input.todayEntry?.date === 'string'
      ? input.todayEntry.date.slice(0, 10)
      : null

  const cycleDays = todayDateKey && !historyDays.has(todayDateKey)
    ? historyDays.size + 1
    : historyDays.size

  return {
    wheelDone,
    goalsDone,
    visionDone,
    cycleDays,
  }
}

export default getUserProgress
