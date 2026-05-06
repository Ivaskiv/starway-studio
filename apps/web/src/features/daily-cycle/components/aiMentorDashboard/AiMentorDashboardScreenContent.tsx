import { ExpertStatsSection, Greeting } from '@/features/daily-cycle/components/DashboardChrome'

import type { AiMentorDashboardScreenState } from '../../hooks/useAiMentorDashboardScreenState'

import AiMentorDashboardLevelUpCallout from './AiMentorDashboardLevelUpCallout'
import AiMentorDashboardTodayGuardModal from './AiMentorDashboardTodayGuardModal'
import AiMentorDashboardUserSection from './AiMentorDashboardUserSection'

type Props = {
  state: AiMentorDashboardScreenState
}

export default function AiMentorDashboardScreenContent({ state }: Props) {
  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:space-y-10 lg:px-8">
      <AiMentorDashboardLevelUpCallout
        visible={state.showLevelUpCallout}
        onClose={() => state.setShowLevelUpCallout(false)}
      />

      <Greeting
        name={state.name}
        isExpert={state.isExpert}
        isSuperAdmin={state.isSuperAdmin}
        mode={state.activeTab === 'cycle' ? 'cycle' : 'default'}
      />

      {state.isExpert ? (
        <div className="space-y-6">
          <div className="space-y-6 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,32,54,0.9),rgba(10,18,36,0.95))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
                {state.isSuperAdmin ? 'Аналітика платформи' : 'Аналітика коуча'}
              </p>
              <p className="mt-2 text-sm text-white/50">
                {state.isSuperAdmin ? 'Усі коучі · всі учні' : 'Starway by Nadya · поточний період'}
              </p>
            </div>
            <ExpertStatsSection isSuperAdmin={state.isSuperAdmin} />
          </div>
        </div>
      ) : (
        <AiMentorDashboardUserSection state={state} />
      )}

      <AiMentorDashboardTodayGuardModal state={state} />
    </div>
  )
}
