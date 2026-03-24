import { Bot, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export interface FloatingAIButtonProps {
  onOpenChat: () => void
  userName?: string
}

export default function FloatingAIButton({
  onOpenChat,
  userName,
}: FloatingAIButtonProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={wrapRef} className="miniapp-floating-ai">
      <div
        className={cn(
          'miniapp-floating-ai__tooltip ios-glass-soft',
          open && 'miniapp-floating-ai__tooltip--open',
        )}
        role="dialog"
        aria-hidden={!open}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Starway AI</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
              {userName
                ? `${userName}, можеш відкрити чат або повернутися пізніше.`
                : 'Можеш відкрити чат або повернутися пізніше.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn-icon h-8 w-8 rounded-full"
            aria-label="Закрити підказку"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onOpenChat()
            }}
            className="hero-cta-primary rounded-2xl px-4 py-3 text-xs font-semibold"
          >
            Відкрити чат
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="hero-cta-secondary rounded-2xl px-4 py-3 text-xs font-semibold"
          >
            Зрозуміло
          </button>
        </div>
      </div>

      <div className="miniapp-floating-ai__ring" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="miniapp-floating-ai__button"
        aria-label={open ? 'Сховати AI-підказку' : 'Відкрити AI-підказку'}
      >
        <span className="miniapp-floating-ai__shine" aria-hidden="true" />
        <span className="miniapp-floating-ai__content">
          <Bot className="h-[18px] w-[18px]" />
          <span className="text-sm font-bold">AI</span>
          <ChevronRight className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
        </span>
      </button>
    </div>
  )
}
