import type { Prisma } from '@starway/db/prisma-client'

import {
  buildAbTestProgressPatch,
  resolveAbTestFlowTimerIdsForStage,
  type AbTestProgress,
  type AbTestStageId,
} from '../../../core/state-machine/abTestFoundation.js'
import { CANONICAL_FLOW_TIMER_REGISTRY } from '../../../core/state-machine/flowTimingFoundation.js'
import { prisma } from '../../../db/client.js'
import { NotificationEvent } from '../../../services/notifications/NotificationEvent.js'
import { notificationService } from '../../../services/notifications/NotificationService.js'
import { trackAbTestEvent } from './abTest.analytics.js'
import { getAbTestResultDefinition } from '../content/abTest.results.js'
import { resolveTestDriveVersion } from '@/products/ab-system/content/testDrive.content.js'

export async function scheduleFollowups(
  userId: string,
  progress: AbTestProgress,
  stage: AbTestStageId
) {
  const dojimImmediateTimerId = 'DOJIM_0_IMMEDIATE' as const
  const currentDojimTimers = new Set(progress.timers.dojim as string[])

  if (
    stage === 'S3_TEST_RESULT'
    && progress.result_key
    && (progress.email_stage === 'captured' || progress.email_stage === 'skipped')
    && !currentDojimTimers.has(dojimImmediateTimerId)
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, telegramUserName: true },
    })
    const resultDef = getAbTestResultDefinition(progress.result_key)
    const firstName = user?.firstName ?? user?.telegramUserName ?? null
    const resultName = resultDef.title.replace(/^Твоя точка зупинки —\s*/, '').replace(/[.。]$/, '')
    const dojim0Body = [
      `${firstName ? `${firstName}, ` : ''}ти вже побачила свій результат.`,
      '',
      `Твоя точка зупинки — ${resultName}.`,
      '',
      'Це не вирок — це точка, з якої починається зміна.',
      'У ФОКУСІ ми розбираємо саме те, що показав твій результат.',
      '',
      '1 місяць — 15 євро | 3 місяці — 39 євро',
    ].join('\n')

    const payload = {
      flow_timer_id: dojimImmediateTimerId,
      lifecycle_stage: 'S3_TEST_RESULT',
      delay_ms: 0,
      message_key: resultDef.message_key,
      ab_test_stage: stage,
      result_key: progress.result_key,
      content_version: resolveTestDriveVersion(progress.started_at),
      message_body: dojim0Body,
    } satisfies Prisma.JsonObject

    const runAt = new Date()
    await notificationService.schedule(
      NotificationEvent.AB_TEST_FOLLOWUP,
      userId,
      runAt,
      payload,
    )
    await trackAbTestEvent({
      userId,
      type: 'AB_TEST_FOLLOWUP_SCHEDULED',
      state: stage,
      payload,
    })

    currentDojimTimers.add(dojimImmediateTimerId)
    progress = buildAbTestProgressPatch(progress, {
      timers: {
        dojim: [...currentDojimTimers] as AbTestProgress['timers']['dojim'],
      },
    })
  }

  const timerIds = resolveAbTestFlowTimerIdsForStage(stage)
  if (!timerIds.length) {
    return progress
  }

  const groupKey =
    stage === 'S3_TEST_RESULT'
      ? 'result'
      : stage === 'S4_FOCUS_INVITE'
        ? 'dojim'
      : stage === 'S5_PAYMENT'
        ? 'payment'
        : stage === 'S6_ZOOM'
          ? 'zoom'
          : stage === 'S7_PLATFORM_INVITE' || stage === 'S8_PLATFORM_READY'
            ? 'platform'
            : 'retention'

  const currentTimers = new Set(progress.timers[groupKey])
  let nextProgress = progress

  for (const timerId of timerIds) {
    if (currentTimers.has(timerId)) {
      continue
    }

    const timer = CANONICAL_FLOW_TIMER_REGISTRY[timerId]
    if (!timer) {
      continue
    }

    const runAt = new Date(Date.now() + timer.delay_ms)
    const payload = {
      flow_timer_id: timer.id,
      lifecycle_stage: timer.source_stage,
      delay_ms: timer.delay_ms,
      message_key: timer.message_key,
      ab_test_stage: stage,
      result_key: nextProgress.result_key,
      content_version: resolveTestDriveVersion(nextProgress.started_at),
    } satisfies Prisma.JsonObject

    await notificationService.schedule(
      NotificationEvent.AB_TEST_FOLLOWUP,
      userId,
      runAt,
      payload
    )
    await trackAbTestEvent({
      userId,
      type: 'AB_TEST_FOLLOWUP_SCHEDULED',
      state: stage,
      payload,
    })

    currentTimers.add(timerId)
    nextProgress = buildAbTestProgressPatch(nextProgress, {
      timers: {
        [groupKey]: [...currentTimers],
      },
    })
  }

  return nextProgress
}
