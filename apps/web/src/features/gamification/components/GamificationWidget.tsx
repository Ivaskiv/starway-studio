import type { ReactNode } from 'react'
import { Flame, Gem, Sparkles, Zap } from 'lucide-react'

import { InfoHint } from '@/ui'
import { GAMIFICATION_GLOSSARY } from '../content/gamificationGlossary'
import { useGetSummaryQuery } from '../services/gamification.api'
const METRIC_STYLES = {
  bitmind: {
    icon: Zap,
    iconClass: 'text-[rgb(255,193,92)]',
  },
  mindxp: {
    icon: Sparkles,
    iconClass: 'text-[rgb(233,137,201)]',
  },
  neurogems: {
    icon: Gem,
    iconClass: 'text-[rgb(109,190,255)]',
  },
  level: {
    icon: Flame,
    iconClass: 'text-[rgb(255,141,87)]',
  },
} as const

const SECTION_EYEBROW_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]'
const WIDTH_CLASS_BY_PROGRESS = [
  'w-0',
  'w-[5%]',
  'w-[10%]',
  'w-[15%]',
  'w-[20%]',
  'w-[25%]',
  'w-[30%]',
  'w-[35%]',
  'w-[40%]',
  'w-[45%]',
  'w-[50%]',
  'w-[55%]',
  'w-[60%]',
  'w-[65%]',
  'w-[70%]',
  'w-[75%]',
  'w-[80%]',
  'w-[85%]',
  'w-[90%]',
  'w-[95%]',
  'w-full',
] as const

function getProgressWidthClass(percent: number) {
  const normalized = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0
  return WIDTH_CLASS_BY_PROGRESS[Math.round(normalized / 5)]
}

function MetricRow(props: {
  label: string
  value: string | number
  caption: string
  description: string
  instruction: string
  tone: keyof typeof METRIC_STYLES
  extra?: ReactNode
}) {
  const tone = METRIC_STYLES[props.tone]
  const Icon = tone.icon

  return (
    <div className="border-b border-[rgba(255,255,255,0.06)] py-2.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.03)] ${tone.iconClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <p className={SECTION_EYEBROW_CLASS}>
              {props.label}
            </p>
            <InfoHint
              label={props.label}
              description={props.description}
              instruction={props.instruction}
            />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-base font-semibold leading-none text-[var(--text-primary)]">
              {props.value}
            </p>
            <p className="mt-1 text-[12px] leading-4 text-[var(--text-muted)]">
              {props.caption}
            </p>
          </div>
        </div>
      </div>
      {props.extra ? <div className="mt-2 pl-11">{props.extra}</div> : null}
    </div>
  )
}

export default function GamificationWidget() {
  const { data: summary, isLoading } = useGetSummaryQuery(undefined, { pollingInterval: 0 })

  if (isLoading || !summary) {
    return null
  }

  const streakDays = Math.max(0, summary.streak.current ?? 0)
  const nextBonusMilestone = streakDays >= 14 ? 30 : streakDays >= 7 ? 14 : 7
  const bonusDaysLeft = Math.max(0, nextBonusMilestone - streakDays)
  const levelProgress = summary.xp.nextLevelXp <= 0
    ? 100
    : Math.min(100, Math.round((summary.xp.currentLevelXp / summary.xp.nextLevelXp) * 100))
  const xpToNext = summary.xp.nextLevelXp > 0
    ? Math.max(summary.xp.nextLevelXp - summary.xp.currentLevelXp, 0)
    : 0

  return (
    <div className="dashboard-liquid-card overflow-hidden">
      <div className="dashboard-liquid-edge--top p-4">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={SECTION_EYEBROW_CLASS}>
              Ритм і прогрес
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div>
          <MetricRow
            label="BITMIND"
            value={summary.rewards.bitMind}
            caption="преміум-валюта"
            description={GAMIFICATION_GLOSSARY.bitmind.description}
            instruction={GAMIFICATION_GLOSSARY.bitmind.instruction}
            tone="bitmind"
          />
          <MetricRow
            label="MINDXP"
            value={summary.xp.total}
            caption={`${streakDays} ${streakDays === 1 ? 'день' : streakDays >= 2 && streakDays <= 4 ? 'дні' : 'днів'} у ритмі`}
            description={GAMIFICATION_GLOSSARY.mindxp.description}
            instruction={GAMIFICATION_GLOSSARY.mindxp.instruction}
            tone="mindxp"
            extra={(
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <p className={SECTION_EYEBROW_CLASS}>БОНУС РИТМУ</p>
                  <InfoHint
                    label={GAMIFICATION_GLOSSARY.streakBonus.label}
                    description={GAMIFICATION_GLOSSARY.streakBonus.description}
                    instruction={GAMIFICATION_GLOSSARY.streakBonus.instruction}
                    align="left"
                  />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <span className="text-[12px] font-semibold text-[var(--text-secondary)]">
                    {bonusDaysLeft === 0 ? '+30 XP готово' : `Ще ${bonusDaysLeft} ${bonusDaysLeft === 1 ? 'день' : bonusDaysLeft >= 2 && bonusDaysLeft <= 4 ? 'дні' : 'днів'} → +30 XP`}
                  </span>
                </div>
              </div>
            )}
          />
          <MetricRow
            label="NEUROGEMS"
            value={summary.rewards.neuroGems}
            caption="для бонусних механік"
            description={GAMIFICATION_GLOSSARY.neurogems.description}
            instruction={GAMIFICATION_GLOSSARY.neurogems.instruction}
            tone="neurogems"
          />
          <MetricRow
            label="РІВЕНЬ"
            value={summary.xp.level}
            caption="поточний рівень"
            description={GAMIFICATION_GLOSSARY.level.description}
            instruction={GAMIFICATION_GLOSSARY.level.instruction}
            tone="level"
            extra={(
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <p className={SECTION_EYEBROW_CLASS}>ПРОГРЕС РІВНЯ</p>
                    <InfoHint
                      label={GAMIFICATION_GLOSSARY.levelProgress.label}
                      description={GAMIFICATION_GLOSSARY.levelProgress.description}
                      instruction={GAMIFICATION_GLOSSARY.levelProgress.instruction}
                      align="left"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-right text-[12px] text-[var(--text-secondary)]">
                    {summary.xp.nextLevelXp > 0 ? `${xpToNext} XP до ➜` : 'Максимальний рівень'}
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full bg-[linear-gradient(90deg,rgba(97,167,255,0.95)_0%,rgba(255,181,92,0.95)_100%)] transition-all ${getProgressWidthClass(levelProgress)}`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>{levelProgress}% прогрес</span>
                  <span>XP {summary.xp.total}</span>
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  )
}
