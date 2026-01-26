import { forwardRef, HTMLAttributes} from 'react'
import { cn } from '../lib/utils'

// ===========================
// SKELETON - Placeholder
// ===========================
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string
  height?: string
  circle?: boolean
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width, height, circle = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-white/10 animate-pulse',
        circle ? 'rounded-full' : 'rounded-lg',
        className
      )}
      style={{ width, height }}
      {...props}
    />
  )
)

Skeleton.displayName = 'Skeleton'