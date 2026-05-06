import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types'

export const REPORT_ACTION_CLASS =
  'inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.2)] bg-[rgb(var(--accent-rgb))] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60'

export const REPORT_ACTION_SECONDARY_CLASS =
  'inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[rgba(var(--accent-rgb),0.26)] hover:bg-[rgba(var(--accent-rgb),0.12)] disabled:cursor-not-allowed disabled:opacity-60'

export const SECTION_EYEBROW_CLASS =
  'text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]'

export const SURFACE_CARD_CLASS =
  'rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]'

export const SURFACE_BLOCK_CLASS =
  'border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]'

export const WHEEL_LABEL_MAP = new Map(WHEEL_CATEGORIES.map(item => [item.id, item.nameUk]))

export const STATE_SCORE_MAP: Record<string, number> = {
  INNER_SUPPORT: 4,
  STABILITY: 3,
  FEAR: 2,
  TENSION: 1,
  'внутрішня опора': 4,
  'стабільність': 3,
  'страх': 2,
  'напруга': 1,
}
