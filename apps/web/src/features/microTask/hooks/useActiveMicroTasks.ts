import { useGetActiveMicroTasksQuery } from '../api/api'

export const useActiveMicroTasks = () => {
  return useGetActiveMicroTasksQuery()
}
