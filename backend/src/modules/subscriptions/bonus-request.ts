import { prisma } from '../../db/client.js'

export const BONUS_SUBSCRIPTION_REQUEST_TYPE = 'BONUS_SUBSCRIPTION' as const
export const BONUS_SUBSCRIPTION_FOCUS_JULY_2026 = 'FOCUS_JULY_2026' as const

export type BonusSubscriptionRequestCampaign = string

export type BonusSubscriptionRequestRecord = {
  id: string
  userId: string
  type: typeof BONUS_SUBSCRIPTION_REQUEST_TYPE
  campaign: BonusSubscriptionRequestCampaign
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  dedupKey: string
  requestedAt: Date
  approvedAt: Date | null
  approvedById: string | null
  rejectedAt: Date | null
  rejectedById: string | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}

export type BonusSubscriptionRequestReadState =
  | 'NONE'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'

export type BonusSubscriptionRequestStateDto = {
  campaign: BonusSubscriptionRequestCampaign
  status: BonusSubscriptionRequestReadState
  requestedAt: Date | null
  decidedAt: Date | null
}

export type CreateBonusSubscriptionRequestResult = {
  created: boolean
  request: BonusSubscriptionRequestRecord
}

export class BonusSubscriptionRequestUserNotFoundError extends Error {
  constructor(userId: string) {
    super(`BONUS_SUBSCRIPTION_REQUEST_USER_NOT_FOUND:${userId}`)
    this.name = 'BonusSubscriptionRequestUserNotFoundError'
  }
}

const requestSelect = {
  id: true,
  userId: true,
  type: true,
  campaign: true,
  status: true,
  dedupKey: true,
  requestedAt: true,
  approvedAt: true,
  approvedById: true,
  rejectedAt: true,
  rejectedById: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} as const

function buildDedupKey(userId: string, campaign: BonusSubscriptionRequestCampaign) {
  return `bonus-subscription:${campaign}:${userId}`
}

function isUniqueConflict(error: unknown): error is { code: 'P2002' } {
  return !!error
    && typeof error === 'object'
    && 'code' in error
    && (error as { code?: string }).code === 'P2002'
}

function mapRequestRecord(record: {
  id: string
  userId: string
  type: string
  campaign: string
  status: string
  dedupKey: string
  requestedAt: Date
  approvedAt: Date | null
  approvedById: string | null
  rejectedAt: Date | null
  rejectedById: string | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}): BonusSubscriptionRequestRecord {
  return {
    id: record.id,
    userId: record.userId,
    type: BONUS_SUBSCRIPTION_REQUEST_TYPE,
    campaign: record.campaign,
    status: record.status as BonusSubscriptionRequestRecord['status'],
    dedupKey: record.dedupKey,
    requestedAt: record.requestedAt,
    approvedAt: record.approvedAt,
    approvedById: record.approvedById,
    rejectedAt: record.rejectedAt,
    rejectedById: record.rejectedById,
    rejectionReason: record.rejectionReason,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function toStateDto(
  campaign: BonusSubscriptionRequestCampaign,
  record: BonusSubscriptionRequestRecord | null,
): BonusSubscriptionRequestStateDto {
  if (!record) {
    return {
      campaign,
      status: 'NONE',
      requestedAt: null,
      decidedAt: null,
    }
  }

  return {
    campaign,
    status: record.status,
    requestedAt: record.requestedAt,
    decidedAt: record.approvedAt ?? record.rejectedAt ?? null,
  }
}

async function findExistingRequest(
  userId: string,
  campaign: BonusSubscriptionRequestCampaign,
): Promise<BonusSubscriptionRequestRecord | null> {
  const existing = await prisma.bonusSubscriptionRequest.findUnique({
    where: {
      userId_type_campaign: {
        userId,
        type: BONUS_SUBSCRIPTION_REQUEST_TYPE,
        campaign,
      },
    },
    select: requestSelect,
  })

  return existing ? mapRequestRecord(existing) : null
}

export async function createBonusSubscriptionRequest(input: {
  userId: string
  campaign: BonusSubscriptionRequestCampaign
}): Promise<CreateBonusSubscriptionRequestResult> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  })

  if (!user) {
    throw new BonusSubscriptionRequestUserNotFoundError(input.userId)
  }

  try {
    const created = await prisma.bonusSubscriptionRequest.create({
      data: {
        userId: input.userId,
        type: BONUS_SUBSCRIPTION_REQUEST_TYPE,
        campaign: input.campaign,
        status: 'PENDING',
        dedupKey: buildDedupKey(input.userId, input.campaign),
      },
      select: requestSelect,
    })

    return {
      created: true,
      request: mapRequestRecord(created),
    }
  } catch (error) {
    if (!isUniqueConflict(error)) {
      throw error
    }

    const existing = await findExistingRequest(input.userId, input.campaign)
    if (!existing) {
      throw error
    }

    return {
      created: false,
      request: existing,
    }
  }
}

export async function getBonusSubscriptionRequestState(input: {
  userId: string
  campaign: BonusSubscriptionRequestCampaign
}): Promise<BonusSubscriptionRequestStateDto> {
  const existing = await findExistingRequest(input.userId, input.campaign)
  return toStateDto(input.campaign, existing)
}
