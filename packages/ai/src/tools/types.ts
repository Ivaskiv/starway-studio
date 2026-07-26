export type ToolParamsSchema<TParams> = {
  parse(input: unknown): TParams
}

export interface Tool<TParams, TResult> {
  id: string
  description: string
  paramsSchema: ToolParamsSchema<TParams>
  execute(params: TParams): Promise<TResult>
}
