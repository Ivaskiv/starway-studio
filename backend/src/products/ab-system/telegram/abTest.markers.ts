import type { Prisma } from '@starway/db/prisma-client'

import {
  buildAbTestProgressPatch,
  type AbTestProgress,
  type AbTestStageId,
} from '../../../core/state-machine/abTestFoundation.js'
import { trackAbTestEvent } from './abTest.analytics.js'
import { loadAbTestProgress, saveAbTestProgress } from './abTest.progress.js'

export async function markAbTestPaymentSuccess(userId: string): Promise<void> {
  const current = await loadAbTestProgress(userId)
  if (current.payment_success_at) return

  await saveAbTestProgress(
    userId,
    buildAbTestProgressPatch(current, {
      payment_success_at: new Date().toISOString(),
      stage: current.stage === 'S5_PAYMENT' ? 'S6_ZOOM' : current.stage,
      status: 'active',
    }),
  )
  await trackAbTestEvent({
    userId,
    type: 'AB_TEST_PAYMENT_SUCCESS',
    state: current.stage === 'S5_PAYMENT' ? 'S6_ZOOM' : current.stage,
    payload: { stage: current.stage } satisfies Prisma.JsonObject,
  })
}

export async function markAbTestZoomRegistered(
  userId: string,
  sessionId: string,
): Promise<void> {
  const current = await loadAbTestProgress(userId)
  const nextStage: AbTestStageId =
    current.stage === 'S5_PAYMENT' ? 'S6_ZOOM' : current.stage
  await saveAbTestProgress(
    userId,
    buildAbTestProgressPatch(current, {
      zoom_registered_at:
        current.zoom_registered_at ?? new Date().toISOString(),
      stage: nextStage,
      status: 'active',
    }),
  )
  await trackAbTestEvent({
    userId,
    type: 'AB_TEST_ZOOM_REGISTERED',
    state: nextStage,
    payload: {
      session_id: sessionId,
      stage: nextStage,
    } satisfies Prisma.JsonObject,
  })
}

export async function markAbTestZoomAttended(
  userId: string,
  sessionId: string,
): Promise<void> {
  const current = await loadAbTestProgress(userId)
  await saveAbTestProgress(
    userId,
    buildAbTestProgressPatch(current, {
      zoom_attended_at: current.zoom_attended_at ?? new Date().toISOString(),
      stage: 'S7_PLATFORM_INVITE',
      status: 'active',
    }),
  )
  await trackAbTestEvent({
    userId,
    type: 'AB_TEST_ZOOM_ATTENDED',
    state: 'S7_PLATFORM_INVITE',
    payload: {
      session_id: sessionId,
      stage: 'S7_PLATFORM_INVITE',
    } satisfies Prisma.JsonObject,
  })
}

export async function markAbTestPlatformReady(userId: string): Promise<void> {
  const current = await loadAbTestProgress(userId)
  await saveAbTestProgress(
    userId,
    buildAbTestProgressPatch(current, {
      platform_ready_at: current.platform_ready_at ?? new Date().toISOString(),
      stage: 'S8_PLATFORM_READY',
      status: 'completed',
    }),
  )
  await trackAbTestEvent({
    userId,
    type: 'AB_TEST_PLATFORM_READY',
    state: 'S8_PLATFORM_READY',
    payload: {
      stage: 'S8_PLATFORM_READY',
    } satisfies Prisma.JsonObject,
  })
}

export async function getAbTestProgress(
  userId: string,
): Promise<AbTestProgress> {
  return loadAbTestProgress(userId)
}

export async function validateAbTestRuntime(userId: string): Promise<boolean> {
  const progress = await loadAbTestProgress(userId)
  return progress.version === 1 && Boolean(progress.stage)
}
