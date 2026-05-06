import WheelSphereCard from '@/features/wheel/components/WheelSphereCard'
import type { WheelCategory, WheelSphere } from '@/features/wheel/types/wheel.types'
import type { MutableRefObject } from 'react'

type Props = {
  spheres: WheelSphere[]
  weakest: WheelSphere[]
  strongest?: WheelSphere
  gap: number
  categoryMap: Map<WheelSphere['id'], WheelCategory>
  onScoreChange: (id: WheelSphere['id'], value: number) => void
  onActionChange: (sphereId: WheelSphere['id'], index: number, value: string) => void
  onAddAction: (sphereId: WheelSphere['id']) => void
  onRemoveAction: (sphereId: WheelSphere['id'], index: number) => void
  actionInputRefs: MutableRefObject<Record<string, HTMLTextAreaElement | null>>
}

export default function WheelSpheresSection({
  spheres,
  weakest,
  strongest,
  gap,
  categoryMap,
  onScoreChange,
  onActionChange,
  onAddAction,
  onRemoveAction,
  actionInputRefs,
}: Props) {
  return (
    <div className="card-surface liquid-glass min-h-0 h-full flex flex-col rounded-2xl p-5 xl:min-h-[560px]">
      <div className="min-h-0 overflow-y-auto pr-2 pt-1 max-h-[324px] xl:h-full xl:max-h-none [contain:content]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-max">
          {spheres.map((sphere) => {
            const isWeak = weakest.some((w) => w.id === sphere.id)
            const isStrong = sphere.id === strongest?.id
            const isGap = gap > 3 && sphere.score < (strongest?.score ?? 10) && !isWeak
            const category = categoryMap.get(sphere.id)

            return (
              <WheelSphereCard
                key={sphere.id}
                sphere={sphere}
                category={category}
                isWeak={isWeak}
                isStrong={isStrong}
                isGap={isGap}
                onScoreChange={onScoreChange}
                onActionChange={onActionChange}
                onAddAction={onAddAction}
                onRemoveAction={onRemoveAction}
                actionInputRefs={actionInputRefs}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
