const PROGRESS_WIDTH_CLASSES = [
  'w-0',
  'w-[5%]',
  'w-[10%]',
  'w-[15%]',
  'w-[20%]',
  'w-[25%]',
  'w-[30%]',
  'w-[35%]',
  'w-[40%]',
  'w-[45%]',
  'w-1/2',
  'w-[55%]',
  'w-[60%]',
  'w-[65%]',
  'w-[70%]',
  'w-[75%]',
  'w-[80%]',
  'w-[85%]',
  'w-[90%]',
  'w-[95%]',
  'w-full',
] as const

export function getProgressWidthClass(value: number) {
  const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
  const roundedStep = Math.round(safeValue / 5)
  return PROGRESS_WIDTH_CLASSES[roundedStep] ?? 'w-0'
}
