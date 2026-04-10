import type { FunnelEntity } from '@/features/funnels/services/funnels.api'
import {
  FUNNEL_CHANNEL_META,
  FUNNEL_SCREEN_TYPE_META,
  type FunnelScreen,
  type FunnelTargetSegment,
} from '@/features/funnels/types/funnel.types'

export type FunnelStatus = 'draft' | 'active' | 'archived'
export type FunnelTrafficVisual = 'cold' | 'warm' | 'hot' | 'reactivation'

export const STATUS_OPTIONS: Array<{ value: FunnelStatus; label: string }> = [
  { value: 'draft', label: 'Чернетка' },
  { value: 'active', label: 'Активна' },
  { value: 'archived', label: 'Архів' },
]

export function normalizeStatus(status: string): FunnelStatus {
  if (status === 'active' || status === 'archived') return status
  return 'draft'
}

export function statusTone(status: FunnelStatus) {
  if (status === 'active') return 'success'
  if (status === 'archived') return 'warning'
  return 'info'
}

export function formatTargetSegment(value?: string | null): FunnelTargetSegment {
  if (!value) return 'free_practice'
  if (value === 'trial' || value === 'monthly' || value === 'yearly' || value === 'mentor' || value === 'free_practice') {
    return value
  }
  return 'free_practice'
}

export function funnelTypeLabel(funnel: FunnelEntity | null) {
  const source = `${funnel?.name ?? ''} ${funnel?.code ?? ''}`.toLowerCase()
  if (source.includes('trial')) return 'Trial'
  if (source.includes('mentor')) return 'Mentor'
  if (source.includes('diagnostic') || source.includes('diagnost') || source.includes('lead')) return 'Lead'
  return 'Flow'
}

export function inferTrafficVisual(funnel: FunnelEntity | null): FunnelTrafficVisual {
  const source = `${funnel?.name ?? ''} ${funnel?.code ?? ''}`.toLowerCase()
  if (/(pause|пауза|reactivation|повернення|return|d6)/i.test(source)) return 'reactivation'
  if (/(mentor|наставниц|year|річн|personal|особист)/i.test(source)) return 'hot'
  if (/(monthly|місячн|paid|платн|subscription|апсейл)/i.test(source)) return 'warm'
  return 'cold'
}

export function trafficBadgeClass(traffic: FunnelTrafficVisual) {
  if (traffic === 'warm') return 'border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.1)] text-[rgb(134,239,172)]'
  if (traffic === 'hot') return 'border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.1)] text-[rgb(253,224,71)]'
  if (traffic === 'reactivation') return 'border-[rgba(var(--accent-rgb),0.2)] bg-[rgba(var(--accent-rgb),0.12)] text-[rgb(var(--accent-soft-rgb))]'
  return 'border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.1)] text-[rgb(147,197,253)]'
}

export function trafficLabel(traffic: FunnelTrafficVisual) {
  if (traffic === 'warm') return 'Теплий трафік'
  if (traffic === 'hot') return 'Гарячий трафік'
  if (traffic === 'reactivation') return 'Реактивація'
  return 'Холодний трафік'
}

export function landingLabel(traffic: FunnelTrafficVisual) {
  if (traffic === 'warm' || traffic === 'reactivation') return 'лендінг не потрібен'
  if (traffic === 'hot') return 'простий лендінг або анкета'
  return 'потрібен лендінг'
}

export function formatEntryChannels(screens: FunnelScreen[]) {
  const unique = Array.from(new Set(screens.flatMap((screen) => screen.channels)))
  return unique.length
    ? unique.map((channel) => FUNNEL_CHANNEL_META[channel]).join(' · ')
    : 'TG · Mini · Site'
}

export function sumMetrics(screens: FunnelScreen[], key: keyof NonNullable<FunnelScreen['metrics']>) {
  return screens.reduce((total, screen) => total + Number(screen.metrics?.[key] ?? 0), 0)
}

export function funnelScreenTypeLabel(type: FunnelScreen['type']) {
  return FUNNEL_SCREEN_TYPE_META[type].label
}
