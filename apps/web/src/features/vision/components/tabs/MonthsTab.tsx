import type { MonthPlan } from '@/features/web-map/services/web-map.api'

export function MonthsTab({ months }: { months: MonthPlan[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {months.map(m => (
        <div key={m.id}>
          {m.month}/{m.year}
          <div>{m.focus}</div>
        </div>
      ))}
    </div>
  )
}
