import { cn } from '@/lib/utils'
import { dashboardDesignSystem, segmentedTabClass } from '@/styles/design-system'

type TabOption<T extends string> = {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: TabOption<T>[]
  className?: string
}

export function Tabs<T extends string>({
  value,
  onValueChange,
  options,
  className,
}: TabsProps<T>) {
  return (
    <div className={cn(dashboardDesignSystem.surfaces.segmented, className)}>
      <div className={dashboardDesignSystem.tabs.track}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            className={segmentedTabClass(option.value === value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Tabs
