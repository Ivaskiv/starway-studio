// frontend/src/shared/hooks/useLockBodyScroll.ts
import { useLayoutEffect } from 'react'

export function useLockBodyScroll(isLocked: boolean) {
  useLayoutEffect(() => {
    if (!isLocked) return

    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = original
    }
  }, [isLocked])
}
