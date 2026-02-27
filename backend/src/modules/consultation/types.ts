// backend/src/modules/consultation/types.ts
/**
 * Consultation Types
 */

import { ConsultationStatus } from '@/db/generated/prisma/enums.js'

export interface Consultation {
  id: string
  userId: string
  scheduledAt: Date
  status: ConsultationStatus
  notes?: string
  triggerReason?: string
  createdAt: Date
}

export interface ConsultationTrigger {
  userId: string
  reason: string
  patternDays: number
  severity: 'low' | 'medium' | 'high'
}
