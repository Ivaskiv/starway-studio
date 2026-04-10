import {
  useCreateManualMicroTaskMutation,
  useReplaceManualMicroTasksMutation,
  useCompleteMicroTaskMutation,
  useDeleteMicroTaskMutation,
  useGetMicroTasksQuery,
  useSkipMicroTaskMutation,
  useUpdateMicroTaskProgressMutation,
  useUpdateMicroTaskStepMutation,
} from '../services/microTask.api'

type UseMicroTasksOptions = {
  skip?: boolean
  pollingInterval?: number
  refetchOnFocus?: boolean
  refetchOnReconnect?: boolean
}

export function useMicroTasks(options: UseMicroTasksOptions = {}) {
  const query = useGetMicroTasksQuery(undefined, {
    skip: options.skip ?? false,
    pollingInterval: options.pollingInterval ?? 0,
    refetchOnFocus: options.refetchOnFocus ?? false,
    refetchOnReconnect: options.refetchOnReconnect ?? false,
  })
  const [createManual] = useCreateManualMicroTaskMutation()
  const [replaceManual] = useReplaceManualMicroTasksMutation()
  const [complete] = useCompleteMicroTaskMutation()
  const [remove] = useDeleteMicroTaskMutation()
  const [skip] = useSkipMicroTaskMutation()
  const [updateProgress] = useUpdateMicroTaskProgressMutation()
  const [updateStep] = useUpdateMicroTaskStepMutation()

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refresh: query.refetch,
    createManualTask: (input: {
      title: string
      description?: string
      why?: string
      steps?: string[]
      dueDate?: string
      replaceExisting?: boolean
      date?: string
    }) =>
      createManual(input),
    replaceManualTasks: (input: { date: string; tasks: string[] }) =>
      replaceManual(input),
    completeTask: (id: string) => complete(id),
    deleteTask: (id: string) => remove(id),
    skipTask: (id: string) => skip(id),
    updateProgress: (id: string, progressPercent: number) => updateProgress({ id, progressPercent }),
    updateStep: (id: string, stepIndex: number, done: boolean) =>
      updateStep({ id, stepIndex, done }),
  }
}

export default useMicroTasks
