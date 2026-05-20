export function composeFlowText(title: string, body: readonly string[]) {
  return [title, ...body].filter(Boolean).join('\n\n')
}
