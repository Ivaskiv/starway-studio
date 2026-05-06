// frontend/src/features/modals/BaseModal.tsx
import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  overlayClassName?: string
  containerClassName?: string
  panelClassName?: string
}

export function BaseModal({
  isOpen,
  onClose,
  children,
  overlayClassName,
  containerClassName,
  panelClassName,
}: BaseModalProps) {
  useLockBodyScroll(isOpen)

  // Занадто рано в SSR — нічого не рендеримо
  if (typeof window === 'undefined') return null

  // Статичне відкриття/закриття модалки через CSS
  return createPortal(
    isOpen ? (
      <div
        className={cn('fixed inset-0 z-50 flex items-center justify-center p-4', containerClassName)}
      >
        {/* Overlay */}
        <div
          className={cn('absolute inset-0 bg-black/80', overlayClassName)}
          onClick={onClose}
        />

        {/* Контент модалки */}
        <div
          className={cn(
            'relative z-10 w-full opacity-100 transition-opacity duration-300',
            panelClassName ?? 'max-w-lg rounded-xl bg-slate-900 p-6',
          )}
        >
          {children}
        </div>
      </div>
    ) : null,
    document.body
  )
}
