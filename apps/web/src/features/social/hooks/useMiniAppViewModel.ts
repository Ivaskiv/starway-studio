import { useMemo } from 'react'

import type { MiniAppTrackerItem } from '@/features/social/types/miniapp'
import { clampTrialDay, getTrialCompletionPercent } from '@/features/trial/utils/trialProgress'

interface TelegramUserLike {
  first_name?: string
}

interface TrialLike {
  isActive?: boolean
  isPaid?: boolean
  currentDay?: number
}

interface SubscriptionLike {
  isActive?: boolean
  currentPeriodStart?: string | null
}

interface ProfileLike {
  rewards?: {
    bitMind?: number
    neuroGems?: number
  }
  xp?: {
    level?: number
  }
  streak?: {
    current?: number
  }
}

interface WheelScoreLike {
  categoryId: string
  score: number
}

interface LatestWheelLike {
  averageScore?: number
  scores?: WheelScoreLike[]
}

interface UseMiniAppViewModelOptions {
  latestWheel?: LatestWheelLike | null
  profile?: ProfileLike | null
  telegramUser?: TelegramUserLike | null
  trial?: TrialLike | null
  subscription?: SubscriptionLike | null
  userName: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function getMonthlyDay(startAt?: string | null) {
  if (!startAt) return 1
  const started = new Date(startAt)
  if (Number.isNaN(started.getTime())) return 1
  return Math.max(1, Math.floor((Date.now() - started.getTime()) / MS_PER_DAY) + 1)
}

export function useMiniAppViewModel({
  latestWheel,
  profile,
  telegramUser,
  trial,
  subscription,
  userName,
}: UseMiniAppViewModelOptions) {
  return useMemo(() => {
    const isPaidCycle = Boolean(subscription?.isActive || trial?.isPaid)
    const hasAccess = (trial?.isActive ?? false) || (trial?.isPaid ?? false) || isPaidCycle
    const paidCycleDay = getMonthlyDay(subscription?.currentPeriodStart)
    const trialDay = isPaidCycle
      ? paidCycleDay
      : clampTrialDay(trial?.currentDay ?? 0)
    const trackerProgress = isPaidCycle
      ? Math.min(100, Math.round((trialDay / 30) * 100))
      : getTrialCompletionPercent(trial?.currentDay ?? 0)
    const displayName = telegramUser?.first_name ?? userName
    const profileStreak = profile?.streak?.current ?? 0
    const profileBitMind = profile?.rewards?.bitMind ?? 0
    const profileLevel = profile?.xp?.level ?? 1
    const profileNeuroGems = profile?.rewards?.neuroGems ?? 0

    const scoreById = new Map((latestWheel?.scores ?? []).map(item => [item.categoryId, item.score * 10]))
    const trackerData: MiniAppTrackerItem[] = [
      { id: 'energy', label: 'Енергія', value: Math.round(scoreById.get('energy') ?? 0) },
      { id: 'focus', label: 'Фокус', value: Math.round(((scoreById.get('realization') ?? 0) + (scoreById.get('growth') ?? 0)) / 2) },
      { id: 'awareness', label: 'Усвідомленість', value: Math.round(scoreById.get('innerSupport') ?? 0) },
      { id: 'action', label: 'Дія', value: Math.round(scoreById.get('money') ?? 0) },
      { id: 'balance', label: 'Баланс', value: Math.round((latestWheel?.averageScore ?? 0) * 10) },
    ]

    return {
      displayName,
      hasAccess,
      isTrialActive: trial?.isActive ?? false,
      profileBitMind,
      profileLevel,
      profileNeuroGems,
      profileStreak,
      trackerData,
      trackerProgress,
      trialDay,
    }
  }, [latestWheel, profile, subscription?.currentPeriodStart, subscription?.isActive, telegramUser, trial, userName])
}
