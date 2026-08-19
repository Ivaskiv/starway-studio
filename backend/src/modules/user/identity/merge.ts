import type {
  MergeReason,
  Tx,
} from './types.js'
import {
  buildArchivedEmail,
  chooseRole,
  isGuestEmail,
  maxDate,
  mergeJsonValues,
  minDate,
  toNullableJsonInput,
} from './values.js'
import {
  canAutoMerge,
  getMergeCandidate,
} from './candidates.js'
import {
  mergeDailyCycleLogs,
  mergeDailyEntries,
  mergeGoalsSets,
  mergeSimpleByUserId,
  mergeStreaks,
  mergeTrialMirrors,
  mergeUserBalanceEntries,
  mergeVisionStatements,
  mergeWheelAssessments,
} from './activity.js'
import {
  mergeCycleStreakMetric,
  mergeGamificationProfile,
  mergeGenerationQuota,
  mergeMentorConfig,
  mergeUserMentorConfig,
  mergeUserProgress,
} from './progress.js'
import {
  mergeEnrollmentLike,
  mergeFivePointsEnrollment,
  mergeStageProgress,
} from './enrollments.js'
import {
  mergeAimentorSession,
  mergeAimemory,
  mergeMentorWeeklyProfiles,
  mergeUserAiMentors,
  mergeUserMentorStates,
  mergeWeeklyReports,
} from './mentor.js'

export async function mergeUsersTx(
  tx: Tx,
  params: {
    sourceUserId: string
    targetUserId: string
    normalizedEmail?: string
    reason: MergeReason
  },
): Promise<{ userId: string; merged: boolean }> {
  const { sourceUserId, targetUserId, normalizedEmail } = params

  if (sourceUserId === targetUserId) {
    if (normalizedEmail) {
      await tx.user.update({
        where: { id: targetUserId },
        data: { email: normalizedEmail },
      })
    }
    return { userId: targetUserId, merged: false }
  }

  const [source, target] = await Promise.all([
    getMergeCandidate(tx, sourceUserId),
    getMergeCandidate(tx, targetUserId),
  ])

  if (!canAutoMerge(target, source)) {
    throw new Error('IDENTITY_MERGE_CONFLICT')
  }

  const nextEmail = normalizedEmail
    ?? (!isGuestEmail(target.email) ? target.email : !isGuestEmail(source.email) ? source.email : target.email)

  await tx.user.update({
    where: { id: sourceUserId },
    data: {
      email: buildArchivedEmail(sourceUserId),
      telegramUserId: null,
      telegramUserName: null,
      telegramChatId: null,
      phone: null,
      deletedAt: new Date(),
    },
  })

  const mergedRole = chooseRole(target.role, source.role)
  await tx.user.update({
    where: { id: targetUserId },
    data: {
      email: nextEmail,
      role: mergedRole,
      activeRole: mergedRole,
      firstName: target.firstName ?? source.firstName,
      lastName: target.lastName ?? source.lastName,
      passwordHash: target.passwordHash ?? source.passwordHash,
      phone: target.phone ?? source.phone,
      telegramUserId: target.telegramUserId ?? source.telegramUserId,
      telegramUserName: target.telegramUserName ?? source.telegramUserName,
      telegramChatId: target.telegramChatId ?? source.telegramChatId,
      telegramLinkedAt: minDate(target.telegramLinkedAt, source.telegramLinkedAt),
      currentState: target.currentState ?? source.currentState,
      currentStep: target.currentStep ?? source.currentStep,
      onboardingStartedAt: minDate(target.onboardingStartedAt, source.onboardingStartedAt),
      trialStartsAt: minDate(target.trialStartsAt, source.trialStartsAt),
      trialEndsAt: maxDate(target.trialEndsAt, source.trialEndsAt),
      settings: toNullableJsonInput(mergeJsonValues(source.settings, target.settings)),
      lastLoginAt: maxDate(target.lastLoginAt, source.lastLoginAt),
    },
  })

  await mergeSimpleByUserId(tx, 'refreshToken', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'subscription', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'paymentLog', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'purchaseHistory', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'aiRecommendation', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'ctaInteraction', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'reminder', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'microTask', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'microSupportItem', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'notification', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'report', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'telegramLink', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'deepLinkToken', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'assistantSession', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'assistantMemory', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'generationLog', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'affiliateLink', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'aiConversation', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'contentItem', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'funnelLead', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'event', sourceUserId, targetUserId)

  await mergeDailyEntries(tx, sourceUserId, targetUserId)
  await mergeDailyCycleLogs(tx, sourceUserId, targetUserId)
  await mergeTrialMirrors(tx, sourceUserId, targetUserId)
  await mergeStreaks(tx, sourceUserId, targetUserId)
  await mergeVisionStatements(tx, sourceUserId, targetUserId)
  await mergeWheelAssessments(tx, sourceUserId, targetUserId)
  await mergeUserBalanceEntries(tx, sourceUserId, targetUserId)
  await mergeGoalsSets(tx, sourceUserId, targetUserId)

  await mergeUserProgress(tx, sourceUserId, targetUserId)
  await mergeCycleStreakMetric(tx, sourceUserId, targetUserId)
  await mergeGamificationProfile(tx, sourceUserId, targetUserId)
  await mergeGenerationQuota(tx, sourceUserId, targetUserId)
  await mergeUserMentorConfig(tx, sourceUserId, targetUserId)
  await mergeMentorConfig(tx, sourceUserId, targetUserId)

  await mergeEnrollmentLike(tx, 'enrollment', sourceUserId, targetUserId)
  await mergeEnrollmentLike(tx, 'productSubscription', sourceUserId, targetUserId)
  await mergeEnrollmentLike(tx, 'courseEnrollment', sourceUserId, targetUserId)
  await mergeFivePointsEnrollment(tx, sourceUserId, targetUserId)

  await mergeStageProgress(tx, 'userFunnelStageProgress', sourceUserId, targetUserId)
  await mergeStageProgress(tx, 'userVideoStageProgress', sourceUserId, targetUserId)
  await mergeStageProgress(tx, 'userMiniCourseStageProgress', sourceUserId, targetUserId)

  await mergeWeeklyReports(tx, sourceUserId, targetUserId)
  await mergeMentorWeeklyProfiles(tx, sourceUserId, targetUserId)
  await mergeAimemory(tx, sourceUserId, targetUserId)

  const { idMap: mentorIdMap, duplicateSourceIdsToDelete } = await mergeUserAiMentors(tx, sourceUserId, targetUserId)
  await mergeUserMentorStates(tx, sourceUserId, targetUserId)
  await mergeAimentorSession(tx, sourceUserId, targetUserId, mentorIdMap)
  for (const sourceId of duplicateSourceIdsToDelete) {
    await tx.userAiMentor.delete({ where: { id: sourceId } })
  }

  await tx.user.delete({ where: { id: sourceUserId } })

  return { userId: targetUserId, merged: true }
}
