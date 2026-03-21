// backend/src/modules/mentorship/service.ts

import { prisma } from '../../db/client.js'
import { MentorshipStatus } from '@prisma/client'

/**
 * Domain Errors
 */
export class MentorshipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MentorshipError'
  }
}

/**
 * DTOs returned to controllers (Dates stay Date on backend level)
 */
export type MentorshipDTO = {
  id: string
  expertId: string
  userId: string
  status: MentorshipStatus
  startsAt: Date
  endsAt: Date | null
  pausedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Internal mapper
 */
function mapMentorship(entity: any): MentorshipDTO {
  return {
    id: entity.id,
    expertId: entity.expertId,
    userId: entity.userId,
    status: entity.status,
    startsAt: entity.startsAt,
    endsAt: entity.endsAt,
    pausedAt: entity.pausedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}

/**
 * Create mentorship offer (creates PENDING contract)
 * Ensures no ACTIVE mentorship already exists
 */
export async function createMentorship(
  userId: string,
  expertId: string
): Promise<MentorshipDTO> {
  const active = await prisma.mentorship.findFirst({
    where: {
      userId,
      expertId,
      status: MentorshipStatus.ACTIVE,
    },
  })

  if (active) {
    throw new MentorshipError('Active mentorship already exists')
  }

  const pending = await prisma.mentorship.findFirst({
    where: {
      userId,
      expertId,
      status: MentorshipStatus.PENDING,
    },
  })

  if (pending) {
    return mapMentorship(pending)
  }

  const created = await prisma.mentorship.create({
    data: {
      userId,
      expertId,
      status: MentorshipStatus.PENDING,
      startsAt: new Date(),
    },
  })

  return mapMentorship(created)
}

/**
 * Activate mentorship
 * Transitions PENDING -> ACTIVE
 */
export async function activateMentorship(
  userId: string,
  expertId: string
): Promise<MentorshipDTO> {
  const mentorship = await prisma.mentorship.findFirst({
    where: {
      userId,
      expertId,
      status: MentorshipStatus.PENDING,
    },
  })

  if (!mentorship) {
    throw new MentorshipError('No pending mentorship found')
  }

  const updated = await prisma.mentorship.update({
    where: { id: mentorship.id },
    data: {
      status: MentorshipStatus.ACTIVE,
      startsAt: new Date(),
      pausedAt: null,
      endsAt: null,
    },
  })

  return mapMentorship(updated)
}

/**
 * Pause mentorship
 * ACTIVE -> PAUSED
 */
export async function pauseMentorship(
  id: string
): Promise<MentorshipDTO> {
  const mentorship = await prisma.mentorship.findUnique({
    where: { id },
  })

  if (!mentorship) {
    throw new MentorshipError('Mentorship not found')
  }

  if (mentorship.status !== MentorshipStatus.ACTIVE) {
    throw new MentorshipError('Only active mentorship can be paused')
  }

  const updated = await prisma.mentorship.update({
    where: { id },
    data: {
      status: MentorshipStatus.PAUSED,
      pausedAt: new Date(),
    },
  })

  return mapMentorship(updated)
}

/**
 * Resume mentorship
 * PAUSED -> ACTIVE
 */
export async function resumeMentorship(
  id: string
): Promise<MentorshipDTO> {
  const mentorship = await prisma.mentorship.findUnique({
    where: { id },
  })

  if (!mentorship) {
    throw new MentorshipError('Mentorship not found')
  }

  if (mentorship.status !== MentorshipStatus.PAUSED) {
    throw new MentorshipError('Only paused mentorship can be resumed')
  }

  const updated = await prisma.mentorship.update({
    where: { id },
    data: {
      status: MentorshipStatus.ACTIVE,
      pausedAt: null,
    },
  })

  return mapMentorship(updated)
}

/**
 * Complete mentorship
 * ACTIVE/PAUSED -> COMPLETED
 */
export async function completeMentorship(
  id: string
): Promise<MentorshipDTO> {
  const mentorship = await prisma.mentorship.findUnique({
    where: { id },
  })

  if (!mentorship) {
    throw new MentorshipError('Mentorship not found')
  }

  if (
    mentorship.status !== MentorshipStatus.ACTIVE &&
    mentorship.status !== MentorshipStatus.PAUSED
  ) {
    throw new MentorshipError('Only active or paused mentorship can be completed')
  }

  const updated = await prisma.mentorship.update({
    where: { id },
    data: {
      status: MentorshipStatus.COMPLETED,
      endsAt: new Date(),
    },
  })

  return mapMentorship(updated)
}

/**
 * Cancel mentorship
 * Any non-completed contract -> CANCELLED
 */
export async function cancelMentorship(
  id: string
): Promise<MentorshipDTO> {
  const mentorship = await prisma.mentorship.findUnique({
    where: { id },
  })

  if (!mentorship) {
    throw new MentorshipError('Mentorship not found')
  }

  if (mentorship.status === MentorshipStatus.COMPLETED) {
    throw new MentorshipError('Completed mentorship cannot be cancelled')
  }

  const updated = await prisma.mentorship.update({
    where: { id },
    data: {
      status: MentorshipStatus.CANCELLED,
      endsAt: new Date(),
    },
  })

  return mapMentorship(updated)
}

/**
 * Get active mentorship for user
 */
export async function getActiveMentorship(
  userId: string
): Promise<MentorshipDTO | null> {
  const mentorship = await prisma.mentorship.findFirst({
    where: {
      userId,
      status: MentorshipStatus.ACTIVE,
    },
  })

  if (!mentorship) return null

  return mapMentorship(mentorship)
}

/**
 * Check access flag
 */
export async function hasActiveMentorship(
  userId: string
): Promise<boolean> {
  const mentorship = await prisma.mentorship.findFirst({
    where: {
      userId,
      status: MentorshipStatus.ACTIVE,
    },
    select: { id: true },
  })

  return !!mentorship
}

/**
 * Get full mentorship history for user
 */
export async function getMentorshipHistory(
  userId: string
): Promise<MentorshipDTO[]> {
  const mentorships = await prisma.mentorship.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return mentorships.map(mapMentorship)
}