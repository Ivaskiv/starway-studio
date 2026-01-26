// frontend/src/features/auth/components/FormLayout.tsx

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  subtitle?: string
  error?: string
  children: ReactNode
}

export function FormLayout({ title, subtitle, error, children }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-white/60">{subtitle}</p>
        )}
      </div>

      {/* Server error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Form content */}
      <div
        className={cn(
          'flex flex-col',
          // гумовий принцип
          'gap-4 sm:gap-3'
        )}
      >
        {children}
      </div>
    </div>
  )
}
