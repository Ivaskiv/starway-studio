import SessionSuccess from '@/features/daily-cycle/components/session/SessionSuccess'
import type { DayAnalysis } from '@/features/daily-cycle/types/daily.types'

type DailyCycleCompletionStateProps = {
  session: 'morning' | 'evening'
  embedded: boolean
  loadingTasks: boolean
  tasksReady: boolean
  analysis: DayAnalysis | null
  onGoToTasks: () => void
  onFinishDay: () => void
  onFinalizeEvening: () => void
  eveningAnalysisPending: boolean
}

export function DailyCycleCompletionState({
  session,
  embedded,
  loadingTasks,
  tasksReady,
  analysis,
  onGoToTasks,
  onFinishDay,
  onFinalizeEvening,
  eveningAnalysisPending,
}: DailyCycleCompletionStateProps) {
  if (session === 'evening' && eveningAnalysisPending) {
    return (
      <SessionSuccess
        session="evening"
        embedded={embedded}
        stage="analysis"
        analysis={analysis}
        onGoToTasks={onGoToTasks}
        onFinishDay={() => {
          void onFinalizeEvening()
        }}
      />
    )
  }

  return (
    <SessionSuccess
      session={session}
      loadingTasks={session === 'morning' && loadingTasks}
      tasksReady={session !== 'morning' || tasksReady}
      allowContinueWhileLoading={session === 'morning' && !tasksReady}
      embedded={embedded}
      analysis={session === 'evening' ? analysis : null}
      onGoToTasks={onGoToTasks}
      onFinishDay={() => {
        void onFinishDay()
      }}
    />
  )
}
