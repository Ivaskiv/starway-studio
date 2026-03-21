// backend/src/modules/mentorship/types.ts
import { MentorshipStatus } from '@starway/db/prisma-client'

export interface Mentorship {
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

export interface MentorshipOffer {
  id: string
  expertId: string
  userId: string
  status: MentorshipStatus
  createdAt: Date
}