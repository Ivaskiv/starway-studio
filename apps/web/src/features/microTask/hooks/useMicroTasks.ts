import {
  useCompleteMicroTaskMutation,
  useGetMicroTasksQuery,
  useSkipMicroTaskMutation,
  useUpdateMicroTaskStepMutation,
} from '../services/microTask.api'

export function useMicroTasks() {
  const query = useGetMicroTasksQuery(undefined, {
    pollingInterval: 10_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })
  const [complete] = useCompleteMicroTaskMutation()
  const [skip] = useSkipMicroTaskMutation()
  const [updateStep] = useUpdateMicroTaskStepMutation()

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refresh: query.refetch,
    completeTask: (id: string) => complete(id),
    skipTask: (id: string) => skip(id),
    updateStep: (id: string, stepIndex: number, done: boolean) =>
      updateStep({ id, stepIndex, done }),
  }
}

export default useMicroTasks
