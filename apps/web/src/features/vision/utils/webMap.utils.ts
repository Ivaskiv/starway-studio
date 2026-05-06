import type { MonthPlan, WebMap } from "@/features/web-map/services/web-map.api"

function compareMonthPlans(left: MonthPlan, right: MonthPlan) {
  if (left.year !== right.year) {
    return left.year - right.year
  }

  return left.month - right.month
}

export function getCurrentMonth(map: WebMap | null) {
  if (!map || map.months.length === 0) return null

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const exactMatch =
    map.months.find(month => month.month === currentMonth && month.year === currentYear) ?? null

  if (exactMatch) return exactMatch

  const sameYearMonths = map.months
    .filter(month => month.year === currentYear)
    .sort(compareMonthPlans)

  const latestPastMonth =
    [...sameYearMonths].reverse().find(month => month.month < currentMonth) ?? null

  if (latestPastMonth) return latestPastMonth

  const earliestFutureMonth = sameYearMonths.find(month => month.month > currentMonth) ?? null

  if (earliestFutureMonth) return earliestFutureMonth

  const sortedMonths = [...map.months].sort(compareMonthPlans)
  return sortedMonths[sortedMonths.length - 1] ?? null
}
