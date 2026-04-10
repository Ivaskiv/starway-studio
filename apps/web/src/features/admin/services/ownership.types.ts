export interface AdminUser {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  role: string
  createdAt: string
  expertId?: string | null
}

export interface AdminUserInsight {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  lastLoginAt: string | null
  lastSeenAt: string | null
  telegramUserName: string | null
  source: string
  accessLabel: string
  activityLabel: string
  viewedSummary: string
  risk: 'low' | 'medium' | 'high'
  riskLabel: string
  nextAction: string
  streakDays: number
  actions7d: number
  activeDays7d: number
  estimatedMinutes7d: number
  botMessagesEnabled: boolean
  isLeadOnly: boolean
}

export interface OwnershipInfo {
  expert: {
    user?: { id: string; email: string; firstName?: string | null; lastName?: string | null; role: string }
    products?: { id: string; name: string }[]
  } | null
  mentorConfigs: Array<{ user?: { id: string; email: string; firstName?: string | null; role: string } }>
}

export interface TransferPayload {
  targetUserId: string
  transferType: 'EXPERT' | 'ADMIN'
}

export interface OwnershipTransferMigrationSummary {
  reassignedUsers: number
  updatedSubscriptions: number
  updatedPaymentLogs: number
  updatedPurchaseHistory: number
  sourceExpertId: string | null
}

export type ProductAccessProduct = 'AI_MENTOR' | 'AI_ASSISTANT'
export type ProductAccessRole = 'ADMIN' | 'EXPERT'

export interface ProductAccessAssignment {
  id: string
  userId: string
  product: ProductAccessProduct
  role: ProductAccessRole
  createdAt: string
}

export interface ProductAccessUserResponse {
  user: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
    role: string
    telegramUserName?: string | null
    telegramChatId?: string | null
    telegramUserId?: string | null
    telegramLinkedAt?: string | null
    telegramLinks?: Array<{
      id: string
      chatId: string | null
      isActive: boolean
      createdAt: string
      updatedAt: string
    }>
  }
  accesses: ProductAccessAssignment[]
}

export interface GrantProductAccessPayload {
  userId: string
  product: ProductAccessProduct
  role: ProductAccessRole
}

export interface RevokeProductAccessPayload {
  userId: string
  product: ProductAccessProduct
}

export interface ProductAccessNotificationPreview {
  channel: 'telegram'
  delivered: boolean
  recipient: {
    email: string | null
    chatId: string | null
  }
  product: ProductAccessProduct
  role: ProductAccessRole
  text: string
  cta: {
    label: string
    type: 'web_app' | 'url'
    url: string
  }
}

export interface GrantProductAccessResponse {
  ok: boolean
  assignment: ProductAccessAssignment
  migration?: OwnershipTransferMigrationSummary | null
  notified: boolean
  notification: ProductAccessNotificationPreview
}
