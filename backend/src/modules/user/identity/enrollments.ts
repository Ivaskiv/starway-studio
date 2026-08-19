import type {
  Tx,
} from './types.js'
import {
  maxDate,
  mergeJsonValues,
  minDate,
  toJsonInput,
} from './values.js'

export async function mergeEnrollmentLike(
  tx: Tx,
  model: 'enrollment' | 'productSubscription' | 'courseEnrollment',
  sourceUserId: string,
  targetUserId: string,
) {
  if (model === 'enrollment') {
    const rows = await tx.enrollment.findMany({ where: { userId: sourceUserId } })
    for (const row of rows) {
      const existing = await tx.enrollment.findUnique({
        where: { userId_productId: { userId: targetUserId, productId: row.productId } },
      })
      if (!existing) {
        await tx.enrollment.update({ where: { id: row.id }, data: { userId: targetUserId } })
        continue
      }
      await tx.enrollment.update({
        where: { id: existing.id },
        data: {
          enrolledAt: minDate(existing.enrolledAt, row.enrolledAt) ?? existing.enrolledAt,
          purchased: existing.purchased || row.purchased,
          trialEnd: maxDate(existing.trialEnd, row.trialEnd),
          expiresAt: maxDate(existing.expiresAt, row.expiresAt),
          payRef: existing.payRef ?? row.payRef,
        },
      })
      await tx.enrollment.delete({ where: { id: row.id } })
    }
    return
  }

  if (model === 'productSubscription') {
    const rows = await tx.productSubscription.findMany({ where: { userId: sourceUserId } })
    for (const row of rows) {
      const existing = await tx.productSubscription.findUnique({
        where: { userId_productId: { userId: targetUserId, productId: row.productId } },
      })
      if (!existing) {
        await tx.productSubscription.update({ where: { id: row.id }, data: { userId: targetUserId } })
        continue
      }
      await tx.productSubscription.update({
        where: { id: existing.id },
        data: {
          status: existing.status === 'active' ? existing.status : row.status,
          trialEndsAt: maxDate(existing.trialEndsAt, row.trialEndsAt),
          expiresAt: maxDate(existing.expiresAt, row.expiresAt),
          paidAt: maxDate(existing.paidAt, row.paidAt),
          amount: existing.amount ?? row.amount,
        },
      })
      await tx.productSubscription.delete({ where: { id: row.id } })
    }
    return
  }

  const rows = await tx.courseEnrollment.findMany({ where: { userId: sourceUserId } })
  for (const row of rows) {
    const existing = await tx.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: targetUserId, courseId: row.courseId } },
    })
    if (!existing) {
      await tx.courseEnrollment.update({ where: { id: row.id }, data: { userId: targetUserId } })
      continue
    }
    await tx.courseEnrollment.update({
      where: { id: existing.id },
      data: {
        completedAt: existing.completedAt ?? row.completedAt,
        createdAt: minDate(existing.createdAt, row.createdAt) ?? existing.createdAt,
      },
    })
    await tx.courseEnrollment.delete({ where: { id: row.id } })
  }
}

export async function mergeFivePointsEnrollment(tx: Tx, sourceUserId: string, targetUserId: string) {
  const rows = await tx.fivePointsEnrollment.findMany({ where: { userId: sourceUserId } })

  for (const row of rows) {
    const existing = await tx.fivePointsEnrollment.findFirst({
      where: { userId: targetUserId, moduleId: row.moduleId },
      orderBy: { updatedAt: 'desc' },
    })

    if (!existing) {
      await tx.fivePointsEnrollment.update({
        where: { id: row.id },
        data: { userId: targetUserId },
      })
      continue
    }

    await tx.fivePointsEnrollment.update({
      where: { id: existing.id },
      data: {
        progress: toJsonInput(mergeJsonValues(row.progress, existing.progress) ?? existing.progress),
        completedAt: existing.completedAt ?? row.completedAt,
        enrolledAt: minDate(existing.enrolledAt, row.enrolledAt) ?? existing.enrolledAt,
      },
    })

    await tx.fivePointsEnrollment.delete({ where: { id: row.id } })
  }
}

export async function mergeStageProgress(
  tx: Tx,
  model: 'userFunnelStageProgress' | 'userVideoStageProgress' | 'userMiniCourseStageProgress',
  sourceUserId: string,
  targetUserId: string,
) {
  if (model === 'userFunnelStageProgress') {
    const rows = await tx.userFunnelStageProgress.findMany({ where: { userId: sourceUserId } })
    for (const row of rows) {
      const existing = await tx.userFunnelStageProgress.findUnique({
        where: { userId_funnelStageId: { userId: targetUserId, funnelStageId: row.funnelStageId } },
      })
      if (!existing) {
        await tx.userFunnelStageProgress.update({ where: { id: row.id }, data: { userId: targetUserId } })
        continue
      }
      await tx.userFunnelStageProgress.update({
        where: { id: existing.id },
        data: {
          status: existing.status === 'COMPLETED' ? existing.status : row.status,
          completedAt: existing.completedAt ?? row.completedAt,
          stageIndex: Math.max(existing.stageIndex, row.stageIndex),
        },
      })
      await tx.userFunnelStageProgress.delete({ where: { id: row.id } })
    }
    return
  }

  if (model === 'userVideoStageProgress') {
    const rows = await tx.userVideoStageProgress.findMany({ where: { userId: sourceUserId } })
    for (const row of rows) {
      const existing = await tx.userVideoStageProgress.findUnique({
        where: { userId_videoStageId: { userId: targetUserId, videoStageId: row.videoStageId } },
      })
      if (!existing) {
        await tx.userVideoStageProgress.update({ where: { id: row.id }, data: { userId: targetUserId } })
        continue
      }
      await tx.userVideoStageProgress.update({
        where: { id: existing.id },
        data: {
          status: existing.status === 'COMPLETED' ? existing.status : row.status,
          completedAt: existing.completedAt ?? row.completedAt,
          stageIndex: Math.max(existing.stageIndex, row.stageIndex),
        },
      })
      await tx.userVideoStageProgress.delete({ where: { id: row.id } })
    }
    return
  }

  const rows = await tx.userMiniCourseStageProgress.findMany({ where: { userId: sourceUserId } })
  for (const row of rows) {
    const existing = await tx.userMiniCourseStageProgress.findUnique({
      where: { userId_miniCourseStageId: { userId: targetUserId, miniCourseStageId: row.miniCourseStageId } },
    })
    if (!existing) {
      await tx.userMiniCourseStageProgress.update({ where: { id: row.id }, data: { userId: targetUserId } })
      continue
    }
    await tx.userMiniCourseStageProgress.update({
      where: { id: existing.id },
      data: {
        status: existing.status === 'COMPLETED' ? existing.status : row.status,
        completedAt: existing.completedAt ?? row.completedAt,
        stageIndex: Math.max(existing.stageIndex, row.stageIndex),
      },
    })
    await tx.userMiniCourseStageProgress.delete({ where: { id: row.id } })
  }
}
