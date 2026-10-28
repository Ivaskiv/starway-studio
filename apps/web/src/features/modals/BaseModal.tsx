// frontend/src/features/modals/BaseModal.tsx
import { ReactNode, useEffect, useState } from 'react'
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
  fitVisualViewport?: boolean
}

export function BaseModal({
  isOpen,
  onClose,
  children,
  overlayClassName,
  containerClassName,
  panelClassName,
  fitVisualViewport = false,
}: BaseModalProps) {
  useLockBodyScroll(isOpen)
  const [visualViewport, setVisualViewport] = useState<{ height: number; offsetTop: number } | null>(null)

  useEffect(() => {
    if (!isOpen || !fitVisualViewport || typeof window === 'undefined' || !window.visualViewport) {
      setVisualViewport(null)
      return
    }

    const viewport = window.visualViewport
    const syncViewport = () => {
      setVisualViewport({
        height: Math.round(viewport.height),
        offsetTop: Math.round(viewport.offsetTop),
      })
    }

    syncViewport()
    viewport.addEventListener('resize', syncViewport)
    viewport.addEventListener('scroll', syncViewport)

    return () => {
      viewport.removeEventListener('resize', syncViewport)
      viewport.removeEventListener('scroll', syncViewport)
    }
  }, [fitVisualViewport, isOpen])

  // Занадто рано в SSR — нічого не рендеримо
  if (typeof window === 'undefined') return null

  // Статичне відкриття/закриття модалки через CSS
  return createPortal(
    isOpen ? (
      <div
        className={cn('fixed inset-0 z-50 flex items-center justify-center p-4', containerClassName)}
        style={visualViewport ? {
          top: `${visualViewport.offsetTop}px`,
          bottom: 'auto',
          height: `${visualViewport.height}px`,
        } : undefined}
      >
        {/* Overlay */}
        <div
          className={cn('fixed inset-0 bg-black/80', overlayClassName)}
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
