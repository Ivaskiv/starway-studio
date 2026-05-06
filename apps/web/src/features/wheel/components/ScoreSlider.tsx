interface ScoreSliderProps {
  value: number
  onChange: (value: number) => void
  tone: 'critical' | 'warning' | 'good'
  testId?: string
}

const toneClassMap = {
  critical: 'accent-[rgb(226,75,74)]',
  warning: 'accent-[rgb(239,159,39)]',
  good: 'accent-[rgb(29,158,117)]',
} as const

export const ScoreSlider = ({ value, onChange, tone, testId }: ScoreSliderProps) => (
  <div className="space-y-3">
    <input
      type="range"
      min={0}
      max={10}
      step={1}
      value={value}
      onChange={event => onChange(Number(event.target.value))}
      aria-label="Оцінка сфери від 0 до 10"
      data-testid={testId}
      className={`h-2.5 w-full cursor-pointer rounded-full bg-white/10 ${toneClassMap[tone]}`}
    />
    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
      <span>0</span>
      <span>1</span>
      <span>2</span>
      <span>3</span>
      <span>4</span>
      <span>5</span>
      <span>6</span>
      <span>7</span>
      <span>8</span>
      <span>9</span>
      <span>10</span>
    </div>
  </div>
)
