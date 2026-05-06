import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { WheelSphere, WheelSphereId } from '@/features/wheel/types/wheel.types'
import { DEFAULT_SPHERES, ensureSphereActions } from '@/features/wheel/utils/wheel.utils'

type WheelStoreState = {
  spheres: WheelSphere[]
  activeSphereId: WheelSphereId | null
  insightReached: boolean
  setSpheres: (fn: (spheres: WheelSphere[]) => WheelSphere[]) => void
  setActiveSphere: (id: WheelSphereId | null) => void
  setInsightReached: () => void
  resetWheel: () => void
}

export const useWheelStore = create<WheelStoreState>()(
  persist(
    (set) => ({
      spheres: ensureSphereActions(DEFAULT_SPHERES),
      activeSphereId: null,
      insightReached: false,

      setSpheres: (fn) =>
        set((state) => ({ spheres: fn(state.spheres) })),

      setActiveSphere: (id) => set({ activeSphereId: id }),

      setInsightReached: () => set({ insightReached: true }),

      resetWheel: () =>
        set({
          spheres: ensureSphereActions(DEFAULT_SPHERES),
          activeSphereId: null,
          insightReached: false,
        }),
    }),
    { name: 'wheel_state_v2' }
  )
)

export const useWheelSpheres = () =>
  useWheelStore((s) => s.spheres)

export function useWheelActions(): Pick<WheelStoreState, 'setSpheres' | 'resetWheel'> {
  const setSpheres = useWheelStore((s) => s.setSpheres)
  const resetWheel = useWheelStore((s) => s.resetWheel)

  return { setSpheres, resetWheel }
}

export function useWheelMeta(): Pick<
  WheelStoreState,
  'activeSphereId' | 'setActiveSphere' | 'insightReached' | 'setInsightReached'
> {
  const activeSphereId = useWheelStore((s) => s.activeSphereId)
  const setActiveSphere = useWheelStore((s) => s.setActiveSphere)
  const insightReached = useWheelStore((s) => s.insightReached)
  const setInsightReached = useWheelStore((s) => s.setInsightReached)

  return {
    activeSphereId,
    setActiveSphere,
    insightReached,
    setInsightReached,
  }
}
