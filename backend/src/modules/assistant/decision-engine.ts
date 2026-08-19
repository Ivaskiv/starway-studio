import type { TelegramIntelligenceMessageType } from '../telegram-mentor/services/context/intelligence.js'

export type AssistantDecisionIntent =
  | 'subscription_status'
  | 'focus_guidance'
  | 'progress_review'
  | 'next_step_guidance'
  | 'zoom_guidance'
  | 'sales_guidance'
  | 'content_guidance'
  | 'buying_support'
  | 'emotional_support'
  | 'follow_up'
  | 'general_support'

export type AssistantUserState =
  | 'exploring'
  | 'blocked'
  | 'planning'
  | 'learning'
  | 'buying'
  | 'active_focus_member'
  | 'inactive'
  | 'subscription_expiring'
  | 'goal_abandoned'

export type AssistantRecommendedAction =
  | 'continue_conversation'
  | 'ask_clarification'
  | 'book_zoom'
  | 'resume_goal'
  | 'open_focus'
  | 'show_progress'
  | 'recommend_lesson'
  | 'recommend_mentor'
  | 'recommend_subscription'
  | 'none'

export type AssistantDecisionInput = Readonly<{
  message: string
  messageType?: TelegramIntelligenceMessageType | string | null
  userState: string | null
  lifecycleState: string | null
  subscription: Readonly<{
    status: string
    daysLeft: number | null
  }>
  focusParticipation: Readonly<{
    isActive: boolean
    status: 'active' | 'trial' | 'inactive' | string
  }>
  primaryGoal: string | null
  unfinishedActions: ReadonlyArray<Readonly<{
    title: string
    status: string
    why: string | null
    createdAt: string
  }>>
  nextZoom: Readonly<{
    scheduledAt: string
    topic: string
  }> | null
  latestWheel: Readonly<{
    weakestSphere: string | null
    focusSphere: string | null
  }> | null
  recentConversation: ReadonlyArray<Readonly<{
    role: 'user' | 'assistant' | 'USER' | 'ASSISTANT'
    content: string
    createdAt?: string | null
  }>>
  lastInteraction: Readonly<{
    role: 'user' | 'assistant' | 'USER' | 'ASSISTANT'
    content: string
    createdAt?: string | null
  }> | null
}>

export type AssistantDecision = Readonly<{
  primaryIntent: AssistantDecisionIntent
  secondaryIntent: AssistantDecisionIntent | null
  userState: AssistantUserState
  recommendedAction: AssistantRecommendedAction
  confidence: number
}>

export type AssistantDecisionResolution = Readonly<{
  decision: AssistantDecision
  durationMs: number
}>

const NEXT_STEP_PATTERN = /(наступ|далі|що робити|куди|відкрити|почати|продовжити|який крок|що мені робити)/i
const PROGRESS_PATTERN = /(прогрес|рух|результат|статус|як я|що в мене|найслаб|слабке місце|колес|goal|ціл)/i
const SUBSCRIPTION_PATTERN = /(підпис|доступ|оплат|тариф|ціна|варт|прайс|subscription)/i
const BUYING_PATTERN = /(купит|оплат|тариф|ціна|скільки коштує|вартість|підписка)/i
const ZOOM_PATTERN = /(zoom|зум|зустріч|сесія|дзвінок|консультац)/i
const FOCUS_PATTERN = /(focus|фокус|absystem|абсистем|урок|lesson|модуль|програма)/i
const SALES_PATTERN = /(продаж|офер|cta|клієнт|лід|ліди|конверс|запереч|закрит|dm)/i
const CONTENT_PATTERN = /(контент|пост|рілс|reels|stories|сторіс|caption|хук|заголов)/i
const BLOCKED_PATTERN = /(не можу|застряг|стоп|блок|вигор|вигоран|страх|боюсь|тривог|не виходить|не знаю як)/i
const FOLLOW_UP_PATTERN = /^(а далі|і далі|що далі|ок|окей|добре|ясно|ага|так|ні|мм|що саме)\??$/i

export function resolveAssistantDecision(
  input: AssistantDecisionInput,
): AssistantDecisionResolution {
  const startedAt = Date.now()
  const normalizedMessage = input.message.trim().toLowerCase()
  const primaryIntent = resolvePrimaryIntent(normalizedMessage, input.messageType)
  const userState = resolveUserState(input, primaryIntent, normalizedMessage)
  const secondaryIntent = resolveSecondaryIntent(input, primaryIntent)
  const recommendedAction = resolveRecommendedAction(input, primaryIntent, userState)
  const confidence = resolveConfidence(input, primaryIntent, userState, recommendedAction, normalizedMessage)

  return {
    decision: {
      primaryIntent,
      secondaryIntent,
      userState,
      recommendedAction,
      confidence,
    },
    durationMs: Date.now() - startedAt,
  }
}

function resolvePrimaryIntent(
  message: string,
  messageType: AssistantDecisionInput['messageType'],
): AssistantDecisionIntent {
  const normalizedType = String(messageType ?? '').trim().toUpperCase()

  if (SUBSCRIPTION_PATTERN.test(message)) return 'subscription_status'
  if (ZOOM_PATTERN.test(message)) return 'zoom_guidance'
  if (SALES_PATTERN.test(message)) return 'sales_guidance'
  if (CONTENT_PATTERN.test(message)) return 'content_guidance'
  if (normalizedType === 'PERSONAL_SITUATION' || BLOCKED_PATTERN.test(message)) return 'emotional_support'
  if (FOCUS_PATTERN.test(message)) return 'focus_guidance'
  if (PROGRESS_PATTERN.test(message)) return 'progress_review'
  if (BUYING_PATTERN.test(message)) return 'buying_support'
  if (normalizedType === 'FOLLOWUP' || FOLLOW_UP_PATTERN.test(message)) return 'follow_up'
  if (NEXT_STEP_PATTERN.test(message)) return 'next_step_guidance'

  return 'general_support'
}

function resolveSecondaryIntent(
  input: AssistantDecisionInput,
  primaryIntent: AssistantDecisionIntent,
): AssistantDecisionIntent | null {
  if (
    (input.unfinishedActions.length > 0 || input.primaryGoal)
    && primaryIntent !== 'next_step_guidance'
  ) {
    return 'next_step_guidance'
  }

  if (input.nextZoom && primaryIntent !== 'zoom_guidance') {
    return 'zoom_guidance'
  }

  if (
    (input.subscription.status !== 'active' || isSubscriptionExpiring(input.subscription.daysLeft))
    && primaryIntent !== 'subscription_status'
  ) {
    return 'subscription_status'
  }

  return null
}

function resolveUserState(
  input: AssistantDecisionInput,
  primaryIntent: AssistantDecisionIntent,
  message: string,
): AssistantUserState {
  if (isSubscriptionExpiring(input.subscription.daysLeft)) {
    return 'subscription_expiring'
  }

  if (input.focusParticipation.isActive) {
    return 'active_focus_member'
  }

  if (primaryIntent === 'emotional_support' || BLOCKED_PATTERN.test(message)) {
    return 'blocked'
  }

  if (
    (primaryIntent === 'buying_support' || primaryIntent === 'subscription_status')
    && input.subscription.status !== 'active'
  ) {
    return 'buying'
  }

  if (input.primaryGoal && isGoalAbandoned(input)) {
    return 'goal_abandoned'
  }

  if (input.unfinishedActions.length > 0 || input.nextZoom || NEXT_STEP_PATTERN.test(message)) {
    return 'planning'
  }

  if (primaryIntent === 'focus_guidance' || primaryIntent === 'progress_review') {
    return 'learning'
  }

  if (input.subscription.status !== 'active' && !input.recentConversation.length) {
    return 'exploring'
  }

  if (input.subscription.status !== 'active') {
    return 'inactive'
  }

  return 'exploring'
}

function resolveRecommendedAction(
  input: AssistantDecisionInput,
  primaryIntent: AssistantDecisionIntent,
  userState: AssistantUserState,
): AssistantRecommendedAction {
  if (primaryIntent === 'emotional_support') {
    return input.focusParticipation.isActive || input.subscription.status === 'active'
      ? 'recommend_mentor'
      : 'ask_clarification'
  }

  if (primaryIntent === 'subscription_status' && input.subscription.status !== 'active') {
    return 'recommend_subscription'
  }

  if (primaryIntent === 'zoom_guidance' && !input.nextZoom) {
    return 'book_zoom'
  }

  if (primaryIntent === 'focus_guidance' && input.focusParticipation.isActive) {
    return 'open_focus'
  }

  if (primaryIntent === 'progress_review') {
    return 'show_progress'
  }

  if (
    primaryIntent === 'next_step_guidance'
    && (input.unfinishedActions.length > 0 || input.primaryGoal)
  ) {
    return 'resume_goal'
  }

  if (userState === 'blocked') {
    return input.focusParticipation.isActive || input.subscription.status === 'active'
      ? 'recommend_mentor'
      : 'ask_clarification'
  }

  if (userState === 'planning') {
    return 'resume_goal'
  }

  if (userState === 'learning' && input.focusParticipation.isActive) {
    return 'recommend_lesson'
  }

  if (userState === 'buying') {
    return 'recommend_subscription'
  }

  if (primaryIntent === 'follow_up') {
    return 'continue_conversation'
  }

  return 'none'
}

function resolveConfidence(
  input: AssistantDecisionInput,
  primaryIntent: AssistantDecisionIntent,
  userState: AssistantUserState,
  recommendedAction: AssistantRecommendedAction,
  message: string,
): number {
  let confidence = 0.58

  if (
    primaryIntent === 'subscription_status'
    || primaryIntent === 'zoom_guidance'
    || primaryIntent === 'focus_guidance'
    || primaryIntent === 'emotional_support'
  ) {
    confidence += 0.18
  }

  if (
    userState === 'active_focus_member'
    || userState === 'subscription_expiring'
    || userState === 'buying'
    || userState === 'blocked'
  ) {
    confidence += 0.12
  }

  if (
    recommendedAction === 'resume_goal'
    && (input.unfinishedActions.length > 0 || input.primaryGoal)
  ) {
    confidence += 0.08
  }

  if (recommendedAction === 'book_zoom' && !input.nextZoom) {
    confidence += 0.05
  }

  if (message.length <= 3 || FOLLOW_UP_PATTERN.test(message)) {
    confidence -= 0.08
  }

  return Number(Math.max(0.35, Math.min(0.96, confidence)).toFixed(2))
}

function isSubscriptionExpiring(daysLeft: number | null): boolean {
  return typeof daysLeft === 'number' && daysLeft >= 0 && daysLeft <= 3
}

function isGoalAbandoned(input: AssistantDecisionInput): boolean {
  const lastInteractionAt = resolveLastInteractionAt(input)
  if (!lastInteractionAt) {
    return false
  }

  const daysSinceLastInteraction = (Date.now() - lastInteractionAt.getTime()) / 86_400_000
  return daysSinceLastInteraction >= 14 && input.unfinishedActions.length === 0
}

function resolveLastInteractionAt(input: AssistantDecisionInput): Date | null {
  const createdAt = input.lastInteraction?.createdAt
    ?? [...input.recentConversation].reverse().find((item) => typeof item.createdAt === 'string')?.createdAt

  if (!createdAt) {
    return null
  }

  const date = new Date(createdAt)
  return Number.isNaN(date.getTime()) ? null : date
}
