export interface AdminUser {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  role: string
  createdAt: string
  expertId?: string | null
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
