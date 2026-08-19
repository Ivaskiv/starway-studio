import AiMentorDashboardScreenContent from './AiMentorDashboardScreenContent'
import { useDashboardState } from '../../hooks/dashboard/useDashboardState'

export default function AiMentorDashboardScreen() {
  const state = useDashboardState()

  return <AiMentorDashboardScreenContent state={state} />
}
