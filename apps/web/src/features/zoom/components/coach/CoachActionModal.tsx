import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { BaseModal } from '../../../modals/BaseModal'

export function CoachActionModal({
  title,
  onClose,
  onBack,
  children,
}: {
  title: string
  onClose: () => void
  onBack?: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      fitVisualViewport
      containerClassName="z-[80] items-center justify-center px-3 py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      overlayClassName="bg-black/70 backdrop-blur-sm"
      panelClassName="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,8,23,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.48)]"
    >
      <div role="dialog" aria-modal="true" aria-labelledby="coach-action-modal-title" className="flex min-h-0 flex-col">
        <div className="grid grid-cols-[2rem_1fr_2rem] items-center gap-3 border-b border-white/10 px-4 py-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Назад"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : <span aria-hidden="true" />}
          <h3 id="coach-action-modal-title" className="text-center text-base font-semibold text-white">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-lg leading-none text-white/70 transition hover:bg-white/[0.08] hover:text-white"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 pb-4 pt-1">
          {children}
        </div>
      </div>
    </BaseModal>
  )
}
