// frontend/src/features/ai-generator/components/ProducerIcon.tsx
// Анімований чоловічок-продюсер з тултіпом. Підключається до будь-якого блоку.
// Глобальне вимкнення: useProducerStore().mascotsEnabled

import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleMascots } from '@/features/ai-generator/services/slice'
import { RootState } from '@/app/store'

interface Props {
  tip:       string          // текст підказки
  side?:    'left' | 'right' // де з'являється тултіп
  size?:    number
}

export function ProducerIcon({ tip, side = 'right', size = 40 }: Props) {
  const dispatch = useDispatch()
  const enabled  = useSelector((s: RootState) => s.producer.mascotsEnabled)
  const [open, setOpen] = useState(false)

  if (!enabled) return null

  const tipSide = side === 'right'
    ? 'left-full ml-3'
    : 'right-full mr-3'

  return (
    <div className="relative inline-flex items-center flex-shrink-0">

      {/* ── SVG Чоловічок-продюсер ──────────────────────────── */}
      <button
        className={
          `relative animate-producer focus:outline-none group
          w-[${size}px] h-[${size}px]`
        }
        onClick={() => setOpen(v => !v)}
        title="AI-підказка"
        aria-label="Підказка продюсера"
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-lg"
        >
          {/* ── Ambient glow ── */}
          <circle cx="20" cy="20" r="19" className="fill-[rgba(var(--accent-rgb),.08)]" />

          {/* ── Body ── */}
          <rect x="12" y="22" width="16" height="12" rx="4"
            className="fill-[rgba(var(--accent-rgb),.90)]" />

          {/* ── Suit lines ── */}
          <path d="M18 22 L20 27 L22 22" strokeWidth="1.2"
            className="stroke-[rgba(255,255,255,.40)]" strokeLinecap="round" />

          {/* ── Head ── */}
          <circle cx="20" cy="15" r="7" className="fill-[#fbbf7a]" />

          {/* ── Hair ── */}
          <path d="M13 13 Q14 8 20 8 Q26 8 27 13"
            className="fill-[#92400e]" />

          {/* ── Eyes — blink ── */}
          <ellipse cx="17.5" cy="14.5" rx="1.2" ry="1.4"
            className="fill-[#1e1005] animate-blink" />
          <ellipse cx="22.5" cy="14.5" rx="1.2" ry="1.4"
            className="fill-[#1e1005] animate-blink" />

          {/* ── Pupils ── */}
          <circle cx="17.8" cy="14.8" r=".4" className="fill-white" />
          <circle cx="22.8" cy="14.8" r=".4" className="fill-white" />

          {/* ── Mouth (smile / speaking) ── */}
          <path d={open ? "M16.5 17.5 Q20 20.5 23.5 17.5" : "M16.5 17.5 Q20 19.5 23.5 17.5"}
            strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-all duration-300 ${open ? 'stroke-[var(--accent)]' : 'stroke-[#92400e]'}`}
            fill="none" />

          {/* ── Headset / earpiece ── */}
          <path d="M13 14 Q12 9 20 8 Q28 9 27 14"
            strokeWidth="1.5" strokeLinecap="round"
            className="stroke-[var(--accent)] fill-none" />
          <circle cx="13" cy="15" r="2" className="fill-[var(--accent)]" />
          <circle cx="27" cy="15" r="2" className="fill-[var(--accent)]" />

          {/* ── Mic boom ── */}
          <path d="M13 15 L10 19" strokeWidth="1.2" strokeLinecap="round"
            className="stroke-[var(--accent)]" />
          <circle cx="10" cy="19.5" r="1.3" className="fill-[var(--accent-strong)]" />

          {/* ── Star badge on suit ── */}
          <circle cx="20" cy="27" r="2" className="fill-[var(--gold)]" />
          <path d="M20 25.5 L20.5 26.7 L21.8 26.7 L20.8 27.5 L21.2 28.7 L20 28 L18.8 28.7 L19.2 27.5 L18.2 26.7 L19.5 26.7 Z"
            className="fill-[rgba(255,255,255,.80)]" />

          {/* ── Talking indicator (visible when open) ── */}
          {open && (
            <>
              <circle cx="31" cy="8" r="3" className="fill-[var(--accent)] animate-pulse" />
              <circle cx="31" cy="8" r="1.5" className="fill-white" />
            </>
          )}
        </svg>

        {/* ── Hover ring ── */}
        <span className="absolute inset-0 rounded-full border border-[var(--border-accent)] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </button>

      {/* ── Tooltip ─────────────────────────────────────────── */}
      {open && (
        <div className={`
          absolute top-1/2 -translate-y-1/2 ${tipSide}
          z-50 w-56 animate-bounce-in
        `}>
          <div className="liquid-glass p-3 text-xs text-[var(--text-secondary)] leading-relaxed">
            {/* Triangle pointer */}
            <span className={`
              absolute top-1/2 -translate-y-1/2
              ${side === 'right' ? '-left-1.5' : '-right-1.5'}
              w-3 h-3 rotate-45
              bg-[var(--bg-card)] border border-[var(--border-glass)]
            `} />
            <p>{tip}</p>
            <button
              className="mt-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              onClick={e => { e.stopPropagation(); setOpen(false) }}
            >
              Зрозуміло ✓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Global toggle (Settings) ──────────────────────────────────
export function ProducerMascotToggle() {
  const dispatch = useDispatch()
  const enabled  = useSelector((s: RootState) => s.producer.mascotsEnabled)

  return (
    <button
      className={`
        flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg
        border transition-all duration-200
        ${enabled
          ? 'bg-[rgba(var(--accent-rgb),.12)] border-[var(--border-accent)] text-[var(--accent-soft)]'
          : 'bg-[var(--glass-bg)] border-[var(--border-primary)] text-[var(--text-muted)]'
        }
      `}
      onClick={() => dispatch(toggleMascots())}
    >
      <span>{enabled ? '🎙️' : '🔇'}</span>
      <span>{enabled ? 'Продюсер увімкнений' : 'Продюсер вимкнений'}</span>
    </button>
  )
}
