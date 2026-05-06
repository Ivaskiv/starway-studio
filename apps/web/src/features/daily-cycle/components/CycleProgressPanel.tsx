type Metric = {
  value: string
  label: string
  sublabel?: string
  color?: string
}

function getMetricColorClass(color?: string) {
  switch (color) {
    case '#378ADD':
      return 'dc-metric-value--blue'
    case '#EF9F27':
      return 'dc-metric-value--gold'
    case '#F87171':
    case '#f87171':
      return 'dc-metric-value--danger'
    default:
      return 'text-[var(--text-primary)]'
  }
}

function buildPath(values: Array<number | null>, width: number, height: number) {
  const defined = values
    .map((value, index) => ({ value, index }))
    .filter((point): point is { value: number; index: number } => typeof point.value === 'number')

  if (defined.length < 2) return ''

  const maxValue = Math.max(...defined.map((point) => point.value), 1)
  const stepX = width / Math.max(values.length - 1, 1)

  return defined
    .map((point, index) => {
      const x = point.index * stepX
      const y = height - (point.value / maxValue) * (height - 10) - 5
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export default function CycleProgressPanel({
  metrics,
  points,
}: {
  metrics: Metric[]
  points: Array<number | null>
}) {
  const path = buildPath(points, 220, 70)
  const lastValueIndex = [...points].reverse().findIndex((value) => typeof value === 'number')
  const highlightedIndex = lastValueIndex === -1 ? -1 : points.length - 1 - lastValueIndex

  return (
    <section
      data-testid="cycle-progress"
      className="dashboard-liquid-card--soft overflow-hidden p-4"
    >
      <h3 className="text-[1.05rem] font-semibold text-[var(--text-primary)]">Прогрес циклу</h3>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.65fr] xl:items-center">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 xl:gap-3">
          {metrics.map((metric, index) => (
            <div
              key={`${metric.label}-${index}`}
              className={[
                'relative px-1',
                index < metrics.length - 1 ? 'xl:after:absolute xl:after:right-0 xl:after:top-1 xl:after:h-12 xl:after:w-px xl:after:bg-[rgba(255,255,255,0.08)]' : '',
              ].join(' ')}
            >
              <div className={`text-[1.65rem] font-semibold leading-none ${getMetricColorClass(metric.color)}`}>
                {metric.value}
              </div>
              <div className="mt-1 flex items-end gap-1 text-[12px] text-[var(--text-secondary)]">
                <span>{metric.label}</span>
                {metric.sublabel ? <span className="text-[var(--text-muted)]">{metric.sublabel}</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2">
          <svg viewBox="0 0 220 70" className="h-[70px] w-full">
            {Array.from({ length: points.length }).map((_, index) => {
              const x = (220 / Math.max(points.length - 1, 1)) * index
              return (
                <line
                  key={`grid-${index}`}
                  x1={x}
                  x2={x}
                  y1="8"
                  y2="62"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
              )
            })}
            {path ? (
              <path
                d={path}
                fill="none"
                stroke="#378ADD"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {highlightedIndex >= 0 && typeof points[highlightedIndex] === 'number' ? (
              <circle
                cx={(220 / Math.max(points.length - 1, 1)) * highlightedIndex}
                cy={70 - ((points[highlightedIndex] as number) / Math.max(...points.filter((value): value is number => typeof value === 'number'), 1)) * 60 - 5}
                r="4"
                fill="#378ADD"
              />
            ) : null}
          </svg>
          <div className="mt-1 flex items-center justify-between text-[9px] text-[var(--text-muted)]">
            <span>1</span>
            <span>15</span>
            <span>30</span>
          </div>
        </div>
      </div>
    </section>
  )
}
