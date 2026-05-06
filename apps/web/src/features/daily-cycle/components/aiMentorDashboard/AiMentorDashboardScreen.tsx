import AiMentorDashboardScreenContent from './AiMentorDashboardScreenContent'
import { useAiMentorDashboardScreenState } from '../../hooks/useAiMentorDashboardScreenState'

export default function AiMentorDashboardScreen() {
  const state = useAiMentorDashboardScreenState()

  return <AiMentorDashboardScreenContent state={state} />
}
