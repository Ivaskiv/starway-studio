export function resolveQueueLabel(progress: number, isBusy: boolean): string {
  const isReady = progress >= 100
  if (isReady) return 'Готово✓'
  if (isBusy) return `Processing ${progress}%`
  if (progress > 0) return 'Queued'
  return 'Не вибрано'
}
