// frontend/src/features/auth/hooks/useAbility.ts
import { useAppSelector } from '@/app/hooks'
import type { Ability } from '@/features/auth/utils/abilities'
import { useMemo } from 'react'

export function useAbility() {
  const user = useAppSelector(s => s.auth.user)

  const abilities = useMemo(
    () => user?.abilities ?? [],
    [user?.abilities]
  )

  const can = (ability: Ability | string): boolean => {
    if (!user) return false
    return abilities.includes(ability as Ability)
  }

  return { can, abilities, isLoading: false }
}