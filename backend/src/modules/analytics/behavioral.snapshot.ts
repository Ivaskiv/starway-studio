import type { Prisma } from '@starway/db/prisma-client'
import { EVENT_ALIASES, resolveCanonicalEvent, type BehavioralDropOffPattern, type BehavioralEventType, type BehavioralMetricKey } from './behavioral.catalog.js'
import { asBoolean, asNumber, asString, getNumberField, getStringField, isJsonObject } from './behavioral.utils.js'

export type BehavioralEventRecord = {
  userId: string | null
  type: string
  state: string | null
  payload: Prisma.JsonValue | null
  createdAt: Date
}

export type BehavioralAnalyticsSnapshot = {
  metrics: Record<BehavioralMetricKey, number | string | Record<string, number>>
  dropOffPatterns: Record<BehavioralDropOffPattern, number>
  readiness: {
    low: number
    medium: number
    high: number
  }
  retentionMarkers: {
    inactivity_days_avg: number
    missed_zoom_count: number
    no_reply_streak: number
    unpaid_after_offer: number
    abandoned_payment: number
  }
}

function getBehavioralPayload(payload: Prisma.JsonValue | null): Prisma.JsonObject {
  if (!isJsonObject(payload)) {
    return {}
  }

  return isJsonObject(payload.behavioral) ? (payload.behavioral as Prisma.JsonObject) : payload
}

function getBehavioralCanonicalEvent(record: BehavioralEventRecord): BehavioralEventType | null {
  const payload = getBehavioralPayload(record.payload)
  const canonicalFromPayload = asString(payload.canonical_event)
  if (canonicalFromPayload && EVENT_ALIASES[canonicalFromPayload]) {
    return EVENT_ALIASES[canonicalFromPayload]
  }

  return resolveCanonicalEvent(record.type)
}

function getEventMetricValue(record: BehavioralEventRecord, metric: BehavioralMetricKey): number | null {
  const payload = getBehavioralPayload(record.payload)

  switch (metric) {
    case 'answer_latency_avg':
      return getNumberField(payload, ['latency_ms', 'answer_latency_ms'])
    case 'result_LTV':
      return getNumberField(payload, ['amount', 'amount_cents', 'amountCents'])
    case 'time_to_purchase':
      return getNumberField(payload, ['time_from_test_ms', 'timeFromTestMs'])
    default:
      return null
  }
}

function safeAverage(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

export function buildBehavioralAnalyticsSnapshot(events: BehavioralEventRecord[]): BehavioralAnalyticsSnapshot {
  const readinessBuckets = { low: 0, medium: 0, high: 0 }
  const dropOffPatterns: Record<BehavioralDropOffPattern, number> = {
    exited_on_question: 0,
    exited_after_result: 0,
    exited_after_offer: 0,
    payment_abandoned: 0,
    joined_no_zoom: 0,
    focus_no_upgrade: 0,
  }
  const retentionMarkerTotals = {
    inactivityDays: [] as number[],
    missedZoomCount: 0,
    noReplyStreak: 0,
    unpaidAfterOffer: 0,
    abandonedPayment: 0,
  }

  const startedUsers = new Set<string>()
  const completedUsers = new Set<string>()
  const questionUsers = new Set<string>()
  const exitUsers = new Set<string>()
  const resultUsers = new Set<string>()
  const focusUsers = new Set<string>()
  const messageOpenUsers = new Set<string>()
  const ctaClickUsers = new Set<string>()
  const paymentStartedUsers = new Set<string>()
  const paymentSuccessUsers = new Set<string>()
  const paymentFailedUsers = new Set<string>()
  const zoomRegisteredUsers = new Set<string>()
  const zoomAttendedUsers = new Set<string>()
  const returnAfterMessageUsers = new Set<string>()
  const resultTypes = new Map<string, number>()
  const answerLatencies: number[] = []
  const purchaseDurationsByUser = new Map<string, number>()
  const ltvValues: number[] = []

  const eventsByUser = new Map<string, BehavioralEventRecord[]>()
  for (const event of events) {
    if (event.userId) {
      const bucket = eventsByUser.get(event.userId) ?? []
      bucket.push(event)
      eventsByUser.set(event.userId, bucket)
    }
  }

  for (const event of events) {
    const canonical = getBehavioralCanonicalEvent(event)
    const payload = getBehavioralPayload(event.payload)
    const userId = event.userId

    if (canonical === 'QUESTION_ANSWERED' && userId) {
      questionUsers.add(userId)
      const latency = getEventMetricValue(event, 'answer_latency_avg')
      if (latency !== null) {
        answerLatencies.push(latency)
      }
    }

    if (canonical === 'TEST_STARTED' && userId) {
      startedUsers.add(userId)
    }

    if (canonical === 'TEST_COMPLETED' && userId) {
      completedUsers.add(userId)
      const resultType = getStringField(payload, ['result_type']) ?? 'default'
      resultTypes.set(resultType, (resultTypes.get(resultType) ?? 0) + 1)
    }

    if (canonical === 'RESULT_OPENED' && userId) {
      resultUsers.add(userId)
      const resultType = getStringField(payload, ['result_type']) ?? 'default'
      resultTypes.set(resultType, (resultTypes.get(resultType) ?? 0) + 1)
    }

    if (canonical === 'CTA_FOCUS_CLICKED' && userId) {
      focusUsers.add(userId)
    }

    if (canonical === 'CTA_CLICKED' && userId) {
      ctaClickUsers.add(userId)
    }

    if (canonical === 'MESSAGE_OPENED' && userId) {
      messageOpenUsers.add(userId)
    }

    if (canonical === 'PAYMENT_STARTED' && userId) {
      paymentStartedUsers.add(userId)
    }

    if (canonical === 'PAYMENT_SUCCESS' && userId) {
      paymentSuccessUsers.add(userId)
      const duration = getEventMetricValue(event, 'time_to_purchase')
      if (duration !== null) {
        purchaseDurationsByUser.set(userId, duration)
      }
      const amount = getEventMetricValue(event, 'result_LTV')
      if (amount !== null) {
        ltvValues.push(amount)
      }
    }

    if (canonical === 'PAYMENT_FAILED' && userId) {
      paymentFailedUsers.add(userId)
    }

    if (canonical === 'ZOOM_REGISTERED' && userId) {
      zoomRegisteredUsers.add(userId)
    }

    if (canonical === 'ZOOM_ATTENDED' && userId) {
      zoomAttendedUsers.add(userId)
    }

    const dropOff = payload.drop_off_pattern
    if (typeof dropOff === 'string' && dropOff in dropOffPatterns) {
      dropOffPatterns[dropOff as BehavioralDropOffPattern] += 1
    }

    const readiness = isJsonObject(payload.readiness) ? payload.readiness as Prisma.JsonObject : null
    const level = readiness && asString(readiness.level)
    if (level === 'low' || level === 'medium' || level === 'high') {
      readinessBuckets[level] += 1
    }

    const retention = isJsonObject(payload.retention_markers) ? payload.retention_markers as Prisma.JsonObject : null
    const inactivityDays = retention ? asNumber(retention.inactivity_days) : null
    const missedZoomCount = retention ? asNumber(retention.missed_zoom_count) : null
    const noReplyStreak = retention ? asNumber(retention.no_reply_streak) : null
    const unpaidAfterOffer = retention ? asBoolean(retention.unpaid_after_offer) : null
    const abandonedPayment = retention ? asBoolean(retention.abandoned_payment) : null

    if (inactivityDays !== null) {
      retentionMarkerTotals.inactivityDays.push(inactivityDays)
    }
    if (missedZoomCount !== null) {
      retentionMarkerTotals.missedZoomCount += missedZoomCount
    }
    if (noReplyStreak !== null) {
      retentionMarkerTotals.noReplyStreak += noReplyStreak
    }
    if (unpaidAfterOffer) {
      retentionMarkerTotals.unpaidAfterOffer += 1
    }
    if (abandonedPayment) {
      retentionMarkerTotals.abandonedPayment += 1
    }

    const readinessSignals = isJsonObject(payload.readiness) ? payload.readiness as Prisma.JsonObject : null
    const readinessSignalValues = readinessSignals && isJsonObject(readinessSignals.signals)
      ? readinessSignals.signals as Prisma.JsonObject
      : null
    if (readinessSignalValues && asBoolean(readinessSignalValues.returned_after_24h)) {
      if (event.userId) {
        returnAfterMessageUsers.add(event.userId)
      }
    }
  }

  for (const userId of paymentSuccessUsers) {
    if (purchaseDurationsByUser.has(userId)) {
      continue
    }

    const userEvents = eventsByUser.get(userId) ?? []
    const firstTestStarted = userEvents.find((event) => getBehavioralCanonicalEvent(event) === 'TEST_STARTED')
    const firstPaymentSuccess = userEvents.find((event) => getBehavioralCanonicalEvent(event) === 'PAYMENT_SUCCESS')
    if (firstTestStarted && firstPaymentSuccess) {
      purchaseDurationsByUser.set(userId, Math.max(0, firstPaymentSuccess.createdAt.getTime() - firstTestStarted.createdAt.getTime()))
    }
  }

  dropOffPatterns.joined_no_zoom = Math.max(0, zoomRegisteredUsers.size - zoomAttendedUsers.size)
  dropOffPatterns.focus_no_upgrade = Math.max(0, resultUsers.size - focusUsers.size)
  dropOffPatterns.payment_abandoned = Math.max(dropOffPatterns.payment_abandoned, Math.max(0, paymentStartedUsers.size - paymentSuccessUsers.size))

  const focusPaymentConversion = safeAverage([
    focusUsers.size > 0 ? (paymentSuccessUsers.size / focusUsers.size) * 100 : 0,
  ])
  const resultToFocusCtr = safeAverage([
    resultUsers.size > 0 ? (focusUsers.size / resultUsers.size) * 100 : 0,
  ])
  const paymentAbandonmentRate = safeAverage([
    paymentStartedUsers.size > 0 ? (paymentFailedUsers.size / paymentStartedUsers.size) * 100 : 0,
  ])
  const zoomAttendanceRate = safeAverage([
    zoomRegisteredUsers.size > 0 ? (zoomAttendedUsers.size / zoomRegisteredUsers.size) * 100 : 0,
  ])
  const channelJoinRate = safeAverage([
    resultUsers.size > 0 ? (zoomRegisteredUsers.size / resultUsers.size) * 100 : 0,
  ])
  const testCompletionRate = safeAverage([
    startedUsers.size > 0 ? (completedUsers.size / startedUsers.size) * 100 : 0,
  ])
  const questionDropoffRate = safeAverage([
    questionUsers.size > 0 ? ((questionUsers.size - completedUsers.size) / questionUsers.size) * 100 : 0,
  ])
  const focusToPlatformConversion = safeAverage([
    focusUsers.size > 0 ? (paymentSuccessUsers.size / focusUsers.size) * 100 : 0,
  ])
  const resultLtv = safeAverage(ltvValues)
  const timeToPurchase = safeAverage([...purchaseDurationsByUser.values()])
  const answerLatencyAvg = safeAverage(answerLatencies)
  const retentionRiskScore = safeAverage([
    retentionMarkerTotals.inactivityDays.length > 0
      ? retentionMarkerTotals.inactivityDays.reduce((sum, value) => sum + Math.min(100, value * 6), 0) / retentionMarkerTotals.inactivityDays.length
      : 0,
    retentionMarkerTotals.missedZoomCount * 14,
    retentionMarkerTotals.noReplyStreak * 12,
    retentionMarkerTotals.unpaidAfterOffer * 18,
    retentionMarkerTotals.abandonedPayment * 20,
  ])
  const returnAfterMessageRate = safeAverage([
    messageOpenUsers.size > 0 ? (returnAfterMessageUsers.size / messageOpenUsers.size) * 100 : 0,
  ])
  const ctaConversionRate = safeAverage([
    messageOpenUsers.size > 0 ? (ctaClickUsers.size / messageOpenUsers.size) * 100 : 0,
  ])
  const messageFatigueRate = safeAverage([
    Math.max(0, 100 - returnAfterMessageRate),
  ])
  const recoverySuccessRate = safeAverage([
    returnAfterMessageRate,
  ])
  const orphanRecoveryRate = safeAverage([
    returnAfterMessageRate,
  ])
  const followupEffectiveness = safeAverage([
    ctaConversionRate,
  ])
  const conversationInterruptionRate = safeAverage([
    questionDropoffRate,
  ])
  const humanizedRecoverySuccess = safeAverage([
    returnAfterMessageRate,
  ])
  const relationshipDepthScore = safeAverage([
    testCompletionRate,
    zoomAttendanceRate,
    returnAfterMessageRate,
    focusToPlatformConversion,
  ])
  const continuityRetentionScore = Math.max(0, Math.round(100 - retentionRiskScore))
  const behavioralStabilityScore = safeAverage([
    testCompletionRate,
    returnAfterMessageRate,
    Math.max(0, 100 - questionDropoffRate),
    Math.max(0, 100 - paymentAbandonmentRate),
  ])
  const relapseFrequency = safeAverage([
    Math.min(
      100,
      (dropOffPatterns.joined_no_zoom * 12)
        + (dropOffPatterns.focus_no_upgrade * 10)
        + (dropOffPatterns.payment_abandoned * 15)
        + ((100 - returnAfterMessageRate) * 0.4),
    ),
  ])
  const stagnationDuration = safeAverage(retentionMarkerTotals.inactivityDays)
  const trustProgression = safeAverage([
    relationshipDepthScore,
    continuityRetentionScore,
    behavioralStabilityScore,
  ])
  const returnContextSuccess = returnAfterMessageRate
  const contextualRecoverySuccess = humanizedRecoverySuccess
  const totalReadinessSignals = readinessBuckets.low + readinessBuckets.medium + readinessBuckets.high
  const upgradeReadinessProgression = totalReadinessSignals > 0
    ? Math.round((((readinessBuckets.medium * 50) + (readinessBuckets.high * 100)) / totalReadinessSignals) * 10) / 10
    : 0
  const crossProductProgression = safeAverage([
    resultToFocusCtr,
    focusToPlatformConversion,
    channelJoinRate,
  ])
  const conversationRelevanceScore = safeAverage([
    returnAfterMessageRate,
    ctaConversionRate,
    contextualRecoverySuccess,
  ])

  return {
    metrics: {
      test_completion_rate: testCompletionRate,
      question_dropoff_rate: questionDropoffRate,
      answer_latency_avg: answerLatencyAvg,
      result_distribution: Object.fromEntries(resultTypes.entries()),
      result_to_focus_ctr: resultToFocusCtr,
      focus_payment_conversion: focusPaymentConversion,
      payment_abandonment_rate: paymentAbandonmentRate,
      channel_join_rate: channelJoinRate,
      zoom_attendance_rate: zoomAttendanceRate,
      focus_to_platform_conversion: focusToPlatformConversion,
      retention_risk_score: retentionRiskScore,
      return_after_message_rate: returnAfterMessageRate,
      CTA_conversion_rate: ctaConversionRate,
      result_LTV: resultLtv,
      time_to_purchase: timeToPurchase,
      message_fatigue_rate: messageFatigueRate,
      recovery_success_rate: recoverySuccessRate,
      orphan_recovery_rate: orphanRecoveryRate,
      followup_effectiveness: followupEffectiveness,
      conversation_interruption_rate: conversationInterruptionRate,
      humanized_recovery_success: humanizedRecoverySuccess,
      relationship_depth_score: relationshipDepthScore,
      continuity_retention_score: continuityRetentionScore,
      behavioral_stability_score: behavioralStabilityScore,
      relapse_frequency: relapseFrequency,
      stagnation_duration: stagnationDuration,
      trust_progression: trustProgression,
      return_context_success: returnContextSuccess,
      contextual_recovery_success: contextualRecoverySuccess,
      upgrade_readiness_progression: upgradeReadinessProgression,
      cross_product_progression: crossProductProgression,
      conversation_relevance_score: conversationRelevanceScore,
    },
    dropOffPatterns,
    readiness: readinessBuckets,
    retentionMarkers: {
      inactivity_days_avg: safeAverage(retentionMarkerTotals.inactivityDays),
      missed_zoom_count: retentionMarkerTotals.missedZoomCount,
      no_reply_streak: retentionMarkerTotals.noReplyStreak,
      unpaid_after_offer: retentionMarkerTotals.unpaidAfterOffer,
      abandoned_payment: retentionMarkerTotals.abandonedPayment,
    },
  }
}
