import type { Prisma } from '@starway/db/prisma-client'

import {
  buildAbTestProgressPatch,
  resolveAbTestFlowTimerIdsForStage,
  type AbTestProgress,
  type AbTestStageId,
} from '../../../core/state-machine/abTestFoundation.js'
import { CANONICAL_FLOW_TIMER_REGISTRY } from '../../../core/state-machine/flowTimingFoundation.js'
import { NotificationEvent } from '../../../services/notifications/NotificationEvent.js'
import { notificationService } from '../../../services/notifications/NotificationService.js'
import { trackAbTestEvent } from './abTest.analytics.js'
import { resolveTestDriveVersion } from '@/products/ab-system/content/abTest.results.js'

export async function scheduleFollowups(
  userId: string,
  progress: AbTestProgress,
  stage: AbTestStageId
) {
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
