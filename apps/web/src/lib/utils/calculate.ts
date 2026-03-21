export const calculateConversion = (
  visitors: number,
  buyers: number
): number => {
  if (visitors <= 0) return 0
  return Math.round((buyers / visitors) * 100)
}