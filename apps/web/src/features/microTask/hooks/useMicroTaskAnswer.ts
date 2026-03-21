import { useAnswerMicroTaskMutation } from '../api/api'

export const useMicroTaskAnswer = () => {
  const [answer] = useAnswerMicroTaskMutation()
  return { answer }
}
