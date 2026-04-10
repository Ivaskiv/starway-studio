import { cacheGet, cacheSet } from '../../lib/cache/index.js'

export type UserStateChannel = 'site' | 'web' | 'miniapp' | 'telegram'
type TodayCycleStatus = 'not_started' | 'morning_done' | 'tasks_done' | 'completed'

export interface CrossChannelUserState {
  userId: string
  lastSeenAt: string
  lastChannel: UserStateChannel
  todayCycleStatus: TodayCycleStatus
  todayCycleDate: string
  sentNotificationsDate: string
  sentNotificationsToday: string[]
  updatedAt: string
}

const USER_STATE_TTL_SECONDS = 48 * 60 * 60

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function buildDefaultState(userId: string): CrossChannelUserState {
  const now = new Date().toISOString()
  const today = getDateKey()
  return {
    userId,
    lastSeenAt: now,
    lastChannel: 'web',
    todayCycleStatus: 'not_started',
    todayCycleDate: today,
    sentNotificationsDate: today,
    sentNotificationsToday: [],
    updatedAt: now,
  }
}

function normalizeChannel(channel: UserStateChannel): CrossChannelUserState['lastChannel'] {
  return channel === 'site' ? 'web' : channel
}

function normalizeState(userId: string, state: CrossChannelUserState | null): CrossChannelUserState {
  const next = state ?? buildDefaultState(userId)
  const today = getDateKey()

  if (next.sentNotificationsDate !== today) {
    return {
      ...next,
      sentNotificationsDate: today,
      sentNotificationsToday: [],
    }
  }

  return next
}

function getCacheKey(userId: string) {
  return `user_state:${userId}`
}

export async function getCrossChannelUserState(userId: string): Promise<CrossChannelUserState> {
  const cached = await cacheGet<CrossChannelUserState>(getCacheKey(userId))
  return normalizeState(userId, cached)
}

export async function updateCrossChannelUserState(
  userId: string,
  updates: Partial<CrossChannelUserState>,
  channel: UserStateChannel,
) {
  const current = await getCrossChannelUserState(userId)
  const now = new Date().toISOString()
  const next: CrossChannelUserState = {
    ...current,
    ...updates,
    lastChannel: normalizeChannel(channel),
    lastSeenAt: now,
    updatedAt: now,
  }

  await cacheSet(getCacheKey(userId), next, USER_STATE_TTL_SECONDS)
  return next
}

export async function canSendCrossChannelNotification(userId: string, triggerEvent: string) {
  const state = await getCrossChannelUserState(userId)
  return !state.sentNotificationsToday.includes(triggerEvent)
}

export async function markCrossChannelNotificationSent(
  userId: string,
  triggerEvent: string,
  channel: UserStateChannel,
) {
  const state = await getCrossChannelUserState(userId)
  const sentNotificationsToday = state.sentNotificationsToday.includes(triggerEvent)
    ? state.sentNotificationsToday
    : [...state.sentNotificationsToday, triggerEvent]

  return updateCrossChannelUserState(userId, {
    sentNotificationsDate: getDateKey(),
    sentNotificationsToday,
  }, channel)
}
