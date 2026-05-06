import {
  WheelInlineFrame,
  WheelStatusNotice,
} from '@/features/daily-cycle/components/DashboardChrome'
import ExpiredTrialModal from '@/features/daily-cycle/components/ExpiredTrialModal'
import ReportsTabContent from '@/features/daily-cycle/components/ReportsTabContent'
import CycleSummaryCard from '@/features/daily-cycle/components/CycleSummaryCard'
import JourneySection from '@/features/daily-cycle/components/JourneySection'
import WheelMonthlyBoard from '@/features/wheel/components/WheelMonthlyBoard'
import JournalPage from '@/features/journal/JournalPage'

import type { AiMentorDashboardScreenState } from '../../hooks/useAiMentorDashboardScreenState'

import AiMentorDashboardMicrotasksTab from './AiMentorDashboardMicrotasksTab'

type Props = {
  state: AiMentorDashboardScreenState
}

export default function AiMentorDashboardUserSection({ state }: Props) {
  return (
    <div className="space-y-6 lg:space-y-8">
      {state.activeTab === 'session' ? (
        <>
          <WheelStatusNotice onOpenInline={() => state.setShowWheelFrame(true)} />
          <WheelInlineFrame
            isOpen={state.showWheelFrame}
            onClose={() => state.setShowWheelFrame(false)}
          />
          <div className="h-px bg-white/10" />
          <div className="space-y-6">
            <JourneySection
              onOpenWheelFrame={() => state.setShowWheelFrame(true)}
              onOpenCycle={() => {
                state.openDashboardTab('cycle')
              }}
              onOpenMicroTasks={state.openMicrotasksTab}
              onLockedOpen={() => state.setIsExpiredTrialModalOpen(true)}
              onOpenRecoveryDay={state.openRecoveryDay}
              onOpenFirstIncompleteRecoveryStep={state.openFirstIncompleteRecoveryStep}
            />
          </div>
        </>
      ) : null}

      {state.activeTab === 'wheel' ? (
        <div className="space-y-6">
          {state.isPausedTrial ? (
            <div className="dashboard-liquid-card--soft p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">
                Колесо балансу · Пауза
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                Новий зріз поки недоступний без підписки
              </p>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Попередні звіти й підсумки залишилися доступними. Щоб пройти нове колесо й оновити аналіз, віднови доступ.
              </p>
              <div className="dashboard-card-actions mt-5">
                <button
                  type="button"
                  className="btn-liquid-dashboard btn-liquid-dashboard--ice"
                  onClick={state.openReportsTab}
                >
                  Відкрити звіти
                </button>
                <button
                  type="button"
                  className="btn-liquid-dashboard btn-liquid-dashboard--primary"
                  onClick={() => state.setIsExpiredTrialModalOpen(true)}
                >
                  Обрати підписку
                </button>
              </div>
            </div>
          ) : (
            <>
              <WheelMonthlyBoard
                onOpenInline={() => state.setShowWheelFrame(true)}
                onOpenReports={state.openReportsTab}
              />
              <WheelInlineFrame
                isOpen={state.showWheelFrame}
                onClose={() => state.setShowWheelFrame(false)}
              />
            </>
          )}
        </div>
      ) : null}

      {state.activeTab === 'cycle' ? (
        <div className="space-y-6">
          <CycleSummaryCard
            onLockedOpen={() => state.setIsExpiredTrialModalOpen(true)}
            onOpenWheelFrame={() => state.setShowWheelFrame(true)}
            onStartMorningSession={state.startMorningFromCycle}
            onStartEveningSession={state.startEveningFromCycle}
            onOpenRecoveryDay={state.openRecoveryDay}
            onOpenFirstIncompleteRecoveryStep={state.openFirstIncompleteRecoveryStep}
            onTryOpenToday={state.tryOpenToday}
            onShowTasks={state.showTasksFromCycle}
            onShowReports={state.openReportsTab}
            recoveryTargetDateKey={state.recoveryTarget?.dateKey ?? null}
            recoveryTargetSession={state.recoveryTarget?.session ?? null}
            onCloseMorningSession={() => {
              state.setShowMorningSession(false)
              state.setCycleRecoveryDateKey(null)
            }}
            onCloseEveningSession={() => {
              state.setShowEveningSession(false)
              state.setCycleRecoveryDateKey(null)
            }}
            onOpenMicroTasks={state.openMicrotasksTab}
            onOpenProgress={state.openReportsTab}
            onComplete={state.handleCycleComplete}
            onSkipPreviousDay={(dateKey: string) => {
              void state.handleSkipPreviousDay(dateKey)
            }}
            openDayNoticeKey={state.openDayNoticeKey}
            setOpenDayNoticeKey={state.setOpenDayNoticeKey}
            recoveryPromptDateKey={state.recoveryPromptDateKey}
            recoveryDateKey={state.cycleRecoveryDateKey}
            yesterdayDateKey={state.yesterdayDateKey}
            showMorningSession={state.showMorningSession}
            showEveningSession={state.showEveningSession}
            hasMorningProgress={state.showMorningSession || state.hasMorningAnswers}
            hasMorningAnswers={state.hasMorningAnswers}
            recoveryProgress={state.activeRecoveryProgress}
            hasActiveMicroTasks={state.hasActiveMicroTasks}
            hasTasksToday={state.hasTasksToday}
            todayMicroTaskCount={state.todayMicroTasks.length}
            activeTodayMicroTaskCount={state.activeTodayMicroTasks.length}
            completedTodayMicroTaskCount={state.completedTodayMicroTasks.length}
            resumeIntentAfterRecovery={state.resumeIntentAfterRecovery}
            onConsumeResumeIntent={() => state.setResumeIntentAfterRecovery(null)}
          />
        </div>
      ) : null}

      {state.activeTab === 'journal' ? (
        <div className="space-y-6">
          <JournalPage compact />
        </div>
      ) : null}

      {state.activeTab === 'microtasks' ? (
        <AiMentorDashboardMicrotasksTab state={state} />
      ) : null}

      {state.activeTab === 'reports' ? (
        <ReportsTabContent />
      ) : null}

      <ExpiredTrialModal
        isOpen={state.isExpiredTrialModalOpen}
        onClose={() => state.setIsExpiredTrialModalOpen(false)}
        onOpenReports={() => {
          state.setIsExpiredTrialModalOpen(false)
          state.openReportsTab()
        }}
        onOpenSubscription={() => {
          state.setIsExpiredTrialModalOpen(false)
          state.navigate('/dashboard/subscription')
        }}
      />
    </div>
  )
}
