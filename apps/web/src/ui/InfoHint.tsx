import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'

type InfoHintProps = {
  label: string
  description: string
  instruction?: string
  align?: 'left' | 'right'
}

const TOOLTIP_WIDTH = 320
const VIEWPORT_GAP = 14

export function InfoHint({
  label,
  description,
  instruction,
  align = 'right',
}: InfoHintProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 })

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger || typeof window === 'undefined') return

    const rect = trigger.getBoundingClientRect()
    const estimatedWidth = Math.min(TOOLTIP_WIDTH, window.innerWidth - VIEWPORT_GAP * 2)
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 148

    const preferredLeft = align === 'left'
      ? rect.left
      : rect.right - estimatedWidth
    const left = Math.min(
      Math.max(VIEWPORT_GAP, preferredLeft),
      window.innerWidth - estimatedWidth - VIEWPORT_GAP,
    )

    const canOpenBelow = rect.bottom + 12 + tooltipHeight <= window.innerHeight - VIEWPORT_GAP
    const top = canOpenBelow
      ? rect.bottom + 12
      : Math.max(VIEWPORT_GAP, rect.top - tooltipHeight - 12)

    setStyle({
      position: 'fixed',
      top,
      left,
      width: estimatedWidth,
      zIndex: 9999,
      opacity: 1,
    })
  }, [align])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return

    const handleResize = () => updatePosition()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (
        target
        && !triggerRef.current?.contains(target)
        && !tooltipRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [open, updatePosition])

  const tooltip = useMemo(() => {
    if (!open || typeof document === 'undefined') return null

    return createPortal(
      <div
        ref={tooltipRef}
        style={style}
        className="rounded-[22px] border border-[rgba(255,255,255,0.16)] bg-[linear-gradient(180deg,rgba(12,18,34,0.98)_0%,rgba(8,12,22,0.99)_100%)] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04),0_0_28px_rgba(var(--accent-rgb),0.18)] ring-1 ring-[rgba(var(--accent-rgb),0.14)] backdrop-blur-xl"
        role="tooltip"
      >
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        {instruction ? (
          <div className="mt-3 rounded-2xl border border-[rgba(var(--accent-rgb),0.24)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.14)_0%,rgba(var(--accent-rgb),0.07)_100%)] px-3 py-2.5 text-xs leading-5 text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(4,10,22,0.28)]">
            {instruction}
          </div>
        ) : null}
      </div>,
      document.body,
    )
  }, [description, instruction, label, open, style])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Пояснення: ${label}`}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(current => !current)}
        className="relative -top-[0.35em] z-10 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.03)] text-[10px] font-semibold leading-none text-[rgb(var(--accent-soft-rgb))] shadow-[0_3px_12px_rgba(0,0,0,0.24)] transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out hover:-translate-y-[1px] hover:border-[rgba(255,255,255,0.32)] hover:bg-[rgba(var(--accent-rgb),0.12)] hover:shadow-[0_8px_20px_rgba(var(--accent-rgb),0.18)] focus:outline-none focus-visible:border-[rgba(var(--accent-rgb),0.44)] focus-visible:bg-[rgba(var(--accent-rgb),0.14)] focus-visible:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.12)]"
      >
        ?
      </button>
      {tooltip}
    </>
  )
}
