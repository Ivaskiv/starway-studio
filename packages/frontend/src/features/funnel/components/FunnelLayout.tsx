/** src/features/funnel/components/FunnelLayout.tsx */


import { ReactNode } from 'react'

export default function FunnelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr_380px] gap-6">
      {children}
    </div>
  )
}
