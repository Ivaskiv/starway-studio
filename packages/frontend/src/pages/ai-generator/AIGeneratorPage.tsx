// packages/frontend/src/pages/ai-generator/AIGeneratorPage.tsx
import { AIGeneratorPageHeader } from '@/features/ai-generator/components/AIGeneratorPageHeader'
import FunnelCard from '@/features/funnels/components/FunnelCard'
import type { Funnel } from '@/features/funnels/types/funnel.types'
import { useEffect, useState } from 'react'

export function AIGeneratorPage() {
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFunnels = async () => {
      try {
        const res = await fetch('/api/funnels')
        const data = await res.json()
        setFunnels(Array.isArray(data) ? data : [])
      } catch {
        setFunnels([])
      } finally {
        setLoading(false)
      }
    }

    fetchFunnels()
  }, [])

  return (
    <div className="space-y-6">
      <AIGeneratorPageHeader />

      {loading ? (
        <p>Завантаження...</p>
      ) : funnels.length === 0 ? (
        <p>У вас ще немає воронок. Створіть першу!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funnels.map(f => (
            <FunnelCard key={f.id} funnel={f} />
          ))}
        </div>
      )}
    </div>
  )
}
