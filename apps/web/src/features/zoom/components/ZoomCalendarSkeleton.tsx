import type { ReactNode } from 'react'

export function ZoomCalendarCard({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      {children}
    </div>
  )
}

function SkeletonLine({
  className,
}: {
  className: string
}) {
  return (
    <div
      className={`animate-pulse rounded-full bg-white/10 ${className}`}
    />
  )
}

export function ZoomCalendarSkeleton() {
  return (
    <div className="space-y-3">
      <ZoomCalendarCard>
        <div className="space-y-3">
          <SkeletonLine className="h-4 w-36" />
          <SkeletonLine className="h-8 w-56" />
          <SkeletonLine className="h-4 w-48" />
        </div>
      </ZoomCalendarCard>

      <ZoomCalendarCard>
        <div className="space-y-3">
          <SkeletonLine className="h-5 w-44" />
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-5/6" />

          <div className="grid gap-2 sm:grid-cols-2">
            <SkeletonLine className="h-12 w-full rounded-xl" />
            <SkeletonLine className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </ZoomCalendarCard>

      <ZoomCalendarCard>
        <div className="space-y-3">
          <SkeletonLine className="h-5 w-52" />
          <SkeletonLine className="h-4 w-40" />
          <SkeletonLine className="h-10 w-32 rounded-xl" />
        </div>
      </ZoomCalendarCard>
    </div>
  )
}
